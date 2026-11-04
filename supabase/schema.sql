-- Run once in a new Supabase project's SQL Editor, as the project owner.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.culinary_staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.culinary_staff enable row level security;

create function private.is_culinary_staff()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.culinary_staff where user_id = (select auth.uid()));
$$;
revoke all on function private.is_culinary_staff() from public, anon, authenticated;
grant execute on function private.is_culinary_staff() to authenticated;

create function private.valid_menu_items(items jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  item jsonb;
  tag jsonb;
  ids text[] := '{}';
begin
  if jsonb_typeof(items) is distinct from 'array' then return false; end if;
  if jsonb_array_length(items) not between 1 and 100 then return false; end if;
  for item in select value from jsonb_array_elements(items) loop
    if jsonb_typeof(item) is distinct from 'object'
      or jsonb_typeof(item->'id') is distinct from 'string'
      or (item->>'id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (item->>'id') = any(ids)
      or jsonb_typeof(item->'name') is distinct from 'string'
      or length(btrim(item->>'name')) not between 1 and 100
      or jsonb_typeof(item->'description') is distinct from 'string'
      or length(item->>'description') > 500
      or jsonb_typeof(item->'category') is distinct from 'string'
      or length(btrim(item->>'category')) not between 1 and 60
      or jsonb_typeof(item->'price') is distinct from 'number'
      or (item->>'price') !~ '^[0-9]{1,6}$'
      or jsonb_typeof(item->'available') is distinct from 'boolean'
      or jsonb_typeof(item->'dietary') is distinct from 'array'
    then return false; end if;
    if (item->>'price')::integer > 100000 or jsonb_array_length(item->'dietary') > 3 then return false; end if;
    for tag in select value from jsonb_array_elements(item->'dietary') loop
      if jsonb_typeof(tag) is distinct from 'string' or tag #>> '{}' not in ('Vegetarian', 'Vegan', 'Gluten-free') then return false; end if;
    end loop;
    ids := array_append(ids, item->>'id');
  end loop;
  return true;
end;
$$;
revoke all on function private.valid_menu_items(jsonb) from public, anon, authenticated;
grant execute on function private.valid_menu_items(jsonb) to authenticated;

create table public.menus (
  id uuid primary key,
  title text not null check (length(btrim(title)) between 1 and 100),
  service_date date not null,
  order_deadline timestamptz not null,
  pickup_start time not null,
  pickup_end time not null check (pickup_end > pickup_start),
  location text not null check (length(btrim(location)) between 1 and 100),
  notes text not null default '' check (length(notes) <= 1000),
  status text not null check (status in ('draft', 'published')),
  items jsonb not null check (private.valid_menu_items(items)),
  created_at timestamptz not null default now()
);
alter table public.menus enable row level security;
create index menus_service_date_idx on public.menus (service_date);

create table public.orders (
  id uuid primary key,
  reference text not null unique,
  menu_id uuid not null references public.menus(id),
  menu_title text not null,
  teacher_name text not null check (length(btrim(teacher_name)) between 2 and 100),
  email text not null check (length(email) between 3 and 254),
  room text not null default '' check (length(room) <= 60),
  note text not null default '' check (length(note) <= 500),
  status text not null default 'new' check (status in ('new', 'ready', 'collected', 'cancelled')),
  items jsonb not null,
  total integer not null check (total between 0 and 6000000),
  created_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create index orders_menu_idx on public.orders(menu_id, created_at desc);
create index orders_rate_idx on public.orders(email, created_at desc);

revoke all on public.culinary_staff, public.menus, public.orders from public, anon, authenticated;
grant select on public.culinary_staff to authenticated;
grant select on public.menus to anon, authenticated;
grant insert, update on public.menus to authenticated;
grant select on public.orders to authenticated;
grant update (status) on public.orders to authenticated;

create policy "Staff can check their own membership" on public.culinary_staff
  for select to authenticated using (user_id = (select auth.uid()));
create policy "Anyone can browse published menus" on public.menus
  for select to anon, authenticated using (status = 'published');
create policy "Staff can browse drafts" on public.menus
  for select to authenticated using ((select private.is_culinary_staff()));
create policy "Staff can create menus" on public.menus
  for insert to authenticated with check ((select private.is_culinary_staff()));
create policy "Staff can update menus" on public.menus
  for update to authenticated using ((select private.is_culinary_staff())) with check ((select private.is_culinary_staff()));
create policy "Staff can read orders" on public.orders
  for select to authenticated using ((select private.is_culinary_staff()));
create policy "Staff can update order status" on public.orders
  for update to authenticated using ((select private.is_culinary_staff())) with check ((select private.is_culinary_staff()));

create function public.place_order(
  p_menu_id uuid,
  p_teacher_name text,
  p_email text,
  p_room text,
  p_note text,
  p_items jsonb,
  p_request_id uuid
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  current_menu public.menus%rowtype;
  placed public.orders%rowtype;
  requested jsonb;
  current_item jsonb;
  lines jsonb := '[]'::jsonb;
  ids text[] := '{}';
  quantity integer;
  item_count integer := 0;
  amount integer := 0;
  clean_name text := btrim(p_teacher_name);
  clean_email text := lower(btrim(p_email));
  clean_room text := btrim(p_room);
  clean_note text := btrim(p_note);
begin
  if p_menu_id is null or p_request_id is null then raise exception 'Missing menu or request ID.'; end if;
  if clean_name is null or length(clean_name) not between 2 and 100
    or clean_email is null or length(clean_email) > 254
    or clean_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or clean_room is null or length(clean_room) > 60
    or clean_note is null or length(clean_note) > 500
  then raise exception 'Please check your name, email and order details.'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Choose at least one menu item.'; end if;
  if jsonb_array_length(p_items) not between 1 and 60 then raise exception 'Choose between 1 and 60 items.'; end if;

  -- Serialize retries so a lost response cannot create a duplicate order.
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 0));
  select * into placed from public.orders where id = p_request_id;
  if found then
    if placed.menu_id <> p_menu_id or placed.teacher_name <> clean_name or placed.email <> clean_email
      or placed.room <> clean_room or placed.note <> clean_note
      or p_items <> (select jsonb_agg(value - 'name') from jsonb_array_elements(placed.items))
    then raise exception 'This request ID has already been used for a different order.'; end if;
  else
    -- Lock the published snapshot while validating prices and writing the order.
    select * into current_menu from public.menus where id = p_menu_id for share;
    if not found or current_menu.status <> 'published' or current_menu.order_deadline <= now() then
      raise exception 'Ordering has closed for this menu. Please refresh the menu.';
    end if;
    for requested in select value from jsonb_array_elements(p_items) loop
      if jsonb_typeof(requested) is distinct from 'object'
        or jsonb_typeof(requested->'itemId') is distinct from 'string'
        or jsonb_typeof(requested->'quantity') is distinct from 'number'
        or (requested->>'quantity') !~ '^[0-9]{1,2}$'
        or jsonb_typeof(requested->'unitPrice') is distinct from 'number'
        or (requested->>'unitPrice') !~ '^[0-9]{1,6}$'
      then raise exception 'Invalid item or quantity.'; end if;
      quantity := (requested->>'quantity')::integer;
      if quantity not between 1 and 20 or (requested->>'itemId') = any(ids) then
        raise exception 'Choose between 1 and 20 of each item, without duplicate lines.';
      end if;
      select value into current_item from jsonb_array_elements(current_menu.items)
        where value->>'id' = requested->>'itemId' and value->>'available' = 'true';
      if not found then raise exception 'An item is no longer available. Please refresh the menu.'; end if;
      if (requested->>'unitPrice')::integer <> (current_item->>'price')::integer then
        raise exception 'A menu price has changed. Please refresh the menu before ordering.';
      end if;
      item_count := item_count + quantity;
      if item_count > 60 then raise exception 'Please limit each order to 60 items.'; end if;
      amount := amount + quantity * (current_item->>'price')::integer;
      ids := array_append(ids, requested->>'itemId');
      lines := lines || jsonb_build_array(jsonb_build_object(
        'itemId', current_item->>'id', 'name', current_item->>'name',
        'quantity', quantity, 'unitPrice', (current_item->>'price')::integer
      ));
    end loop;

    -- Basic per-email throttling, not a replacement for school-network access controls.
    perform pg_advisory_xact_lock(hashtextextended(clean_email, 1));
    if (select count(*) from public.orders where email = clean_email and created_at > now() - interval '10 minutes') >= 5 then
      raise exception 'Too many recent orders for this email. Please wait 10 minutes or contact culinary staff.';
    end if;
    insert into public.orders(id, reference, menu_id, menu_title, teacher_name, email, room, note, items, total)
    values(p_request_id, 'CV-' || upper(substr(replace(p_request_id::text, '-', ''), 1, 12)),
      current_menu.id, current_menu.title, clean_name, clean_email, clean_room, clean_note, lines, amount)
    returning * into placed;
  end if;
  return jsonb_build_object(
    'id', placed.id, 'reference', placed.reference, 'menuId', placed.menu_id, 'menuTitle', placed.menu_title,
    'teacherName', placed.teacher_name, 'email', placed.email, 'room', placed.room, 'note', placed.note,
    'status', placed.status, 'items', placed.items, 'total', placed.total, 'createdAt', placed.created_at
  );
end;
$$;
revoke all on function public.place_order(uuid,text,text,text,text,jsonb,uuid) from public, anon, authenticated;
grant execute on function public.place_order(uuid,text,text,text,text,jsonb,uuid) to anon, authenticated;

commit;
