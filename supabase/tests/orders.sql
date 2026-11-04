-- Run against an isolated test database after bootstrap.sql and schema.sql.
\set ON_ERROR_STOP on
begin;
insert into auth.users values ('11111111-1111-4111-8111-111111111111'), ('22222222-2222-4222-8222-222222222222');
insert into public.culinary_staff values ('11111111-1111-4111-8111-111111111111');

set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
insert into public.menus (id,title,service_date,order_deadline,pickup_start,pickup_end,location,notes,status,items)
values ('33333333-3333-4333-8333-333333333333', 'Test lunch', current_date+1, now()+interval '1 day', '11:30', '13:00', 'Cove', '', 'published',
  '[{"id":"44444444-4444-4444-8444-444444444444","name":"Soup","description":"Tomato","category":"Mains","price":450,"dietary":[],"available":true},
    {"id":"55555555-5555-4555-8555-555555555555","name":"Cookie","description":"","category":"Dessert","price":200,"dietary":[],"available":false}]');
insert into public.menus (id,title,service_date,order_deadline,pickup_start,pickup_end,location,notes,status,items)
select '66666666-6666-4666-8666-666666666666', 'Draft', service_date, order_deadline, pickup_start, pickup_end, location, notes, 'draft', items from public.menus;

-- A signed-in non-staff user cannot see drafts, read orders or edit menus.
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
do $$ begin
  if (select count(*) from public.menus) <> 1 then raise exception 'Drafts are exposed'; end if;
  if exists(select from public.culinary_staff) then raise exception 'Staff list is exposed'; end if;
  if exists(select from public.orders) then raise exception 'Orders are exposed'; end if;
  update public.menus set title = 'Unauthorized change';
  if found then raise exception 'Unauthorized menu update'; end if;
  begin
    insert into public.culinary_staff values ('22222222-2222-4222-8222-222222222222');
    raise exception 'Unauthorized membership insert';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
set role anon;
do $$ begin
  if (select count(*) from public.menus) <> 1 then raise exception 'Anonymous draft access'; end if;
  begin
    perform * from public.orders;
    raise exception 'Anonymous order read succeeded';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Server-generated prices and totals; retries return one order.
do $$
declare receipt jsonb; retry jsonb;
begin
  receipt := public.place_order('33333333-3333-4333-8333-333333333333', 'Test Teacher', 'teacher@example.test', 'B12', 'No bacon, please.',
    '[{"itemId":"44444444-4444-4444-8444-444444444444","quantity":2,"unitPrice":450}]', '77777777-7777-4777-8777-777777777777');
  if (receipt->>'total')::integer <> 900 or receipt->>'teacherName' <> 'Test Teacher'
    or receipt->>'note' <> 'No bacon, please.' then raise exception 'Wrong receipt or lost meal request'; end if;
  retry := public.place_order('33333333-3333-4333-8333-333333333333', 'Test Teacher', 'teacher@example.test', 'B12', 'No bacon, please.',
    '[{"itemId":"44444444-4444-4444-8444-444444444444","quantity":2,"unitPrice":450}]', '77777777-7777-4777-8777-777777777777');
  if receipt <> retry then raise exception 'Idempotency failed'; end if;
end $$;

-- Each rejected payload must raise, not return a success-shaped response.
do $$
declare payload jsonb; caught boolean;
begin
  for payload in select value from jsonb_array_elements('[
    [],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":2,"unitPrice":1}],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":21,"unitPrice":450}],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":-1,"unitPrice":450}],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":1.5,"unitPrice":450}],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":null,"unitPrice":450}],
    [{"itemId":"55555555-5555-4555-8555-555555555555","quantity":1,"unitPrice":200}],
    [{"itemId":"00000000-0000-4000-8000-000000000000","quantity":1,"unitPrice":200}],
    [{"itemId":"44444444-4444-4444-8444-444444444444","quantity":1,"unitPrice":450},{"itemId":"44444444-4444-4444-8444-444444444444","quantity":1,"unitPrice":450}]
  ]') loop
    caught := false;
    begin
      perform public.place_order('33333333-3333-4333-8333-333333333333', 'Teacher', 'test@example.test', '', '', payload, gen_random_uuid());
    exception when raise_exception then caught := true;
    end;
    if not caught then raise exception 'Invalid payload accepted: %', payload; end if;
  end loop;
  caught := false;
  begin
    perform public.place_order('66666666-6666-4666-8666-666666666666', 'Teacher', 'test@example.test', '', '',
      '[{"itemId":"44444444-4444-4444-8444-444444444444","quantity":1,"unitPrice":450}]', gen_random_uuid());
  exception when raise_exception then caught := true;
  end;
  if not caught then raise exception 'Draft order accepted'; end if;
  caught := false;
  begin
    perform public.place_order('33333333-3333-4333-8333-333333333333', 'Different Teacher', 'teacher@example.test', '', '',
      '[{"itemId":"44444444-4444-4444-8444-444444444444","quantity":2,"unitPrice":450}]', '77777777-7777-4777-8777-777777777777');
  exception when raise_exception then caught := true;
  end;
  if not caught then raise exception 'Reused request exposed an order'; end if;
end $$;

reset role;
set role authenticated;
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
do $$ begin
  if (select count(*) from public.orders) <> 1 then raise exception 'Wrong order count'; end if;
  update public.orders set status = 'ready';
  if not found then raise exception 'Staff cannot update status'; end if;
  begin
    update public.orders set total = 0;
    raise exception 'Staff can alter order totals';
  exception when insufficient_privilege then null;
  end;
end $$;
update public.menus set order_deadline = now()-interval '1 minute';
reset role;
set role anon;
do $$
declare caught boolean := false;
begin
  begin
    perform public.place_order('33333333-3333-4333-8333-333333333333', 'Teacher', 'test@example.test', '', '',
      '[{"itemId":"44444444-4444-4444-8444-444444444444","quantity":1,"unitPrice":450}]', gen_random_uuid());
  exception when raise_exception then caught := true;
  end;
  if not caught then raise exception 'Expired order accepted'; end if;
end $$;
rollback;
\echo 'Cove database permission and order tests passed.'
