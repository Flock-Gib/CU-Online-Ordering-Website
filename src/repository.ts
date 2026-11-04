import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database";
import {
  cartLines,
  customerSchema,
  menuSchema,
  orderSchema,
  validateMenu,
} from "./model";
import type { Cart, Customer, Menu, Order } from "./model";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const configError =
  !url || !key || !URL.canParse(url)
    ? "Live ordering is not connected yet. The site administrator must configure the school's Supabase project before teachers can order or culinary staff can sign in."
    : null;
export const supabase =
  !configError && url && key ? createClient<Database>(url, key) : null;

function requireSupabase() {
  if (!supabase)
    throw new Error(
      configError || "The ordering service is unavailable. Please try again.",
    );
  return supabase;
}

export async function listMenus(): Promise<Menu[]> {
  const client = requireSupabase();
  const menus: Menu[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("menus")
      .select("*")
      .order("service_date")
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    menus.push(
      ...data.map((row) =>
        menuSchema.parse({
          id: row.id,
          title: row.title,
          serviceDate: row.service_date,
          orderDeadline: row.order_deadline,
          pickupStart: row.pickup_start.slice(0, 5),
          pickupEnd: row.pickup_end.slice(0, 5),
          location: row.location,
          notes: row.notes,
          status: row.status,
          items: row.items,
        }),
      ),
    );
    if (data.length < 500) return menus;
  }
}

export async function saveMenu(menu: Menu) {
  const client = requireSupabase();
  const value = validateMenu(menu);
  const { error } = await client
    .from("menus")
    .upsert({
      id: value.id,
      title: value.title,
      service_date: value.serviceDate,
      order_deadline: value.orderDeadline,
      pickup_start: value.pickupStart,
      pickup_end: value.pickupEnd,
      location: value.location,
      notes: value.notes,
      status: value.status,
      items: value.items,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}

export async function unpublishMenu(menu: Menu) {
  const client = requireSupabase();
  const { error } = await client
    .from("menus")
    .update({ status: "draft" })
    .eq("id", menu.id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}

export async function listOrders(): Promise<Order[]> {
  const client = requireSupabase();
  const orders = new Map<string, Order>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await client
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false })
      .order("id")
      .range(offset, offset + 499);
    if (error) throw new Error(error.message);
    for (const row of data) {
      orders.set(
        row.id,
        orderSchema.parse({
          id: row.id,
          reference: row.reference,
          menuId: row.menu_id,
          menuTitle: row.menu_title,
          teacherName: row.teacher_name,
          email: row.email,
          room: row.room,
          note: row.note,
          status: row.status,
          items: row.items,
          total: row.total,
          createdAt: row.created_at,
        }),
      );
    }
    if (data.length < 500) return [...orders.values()];
  }
}

export async function placeOrder(
  menu: Menu,
  cart: Cart,
  customer: Customer,
  requestId: string,
): Promise<Order> {
  const client = requireSupabase();
  const details = customerSchema.parse(customer);
  const items = cartLines(menu, cart);
  const { data, error } = await client.rpc("place_order", {
    p_menu_id: menu.id,
    p_teacher_name: details.teacherName,
    p_email: details.email,
    p_room: details.room,
    p_note: details.note,
    p_items: items.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
  return orderSchema.parse(data);
}

export async function updateOrder(id: string, status: Order["status"]) {
  const client = requireSupabase();
  const { error } = await client
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
