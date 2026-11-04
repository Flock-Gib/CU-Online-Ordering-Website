import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "./database";
import {
  cartLines,
  customerSchema,
  isOpen,
  menuSchema,
  newMenu,
  orderSchema,
  validateMenu,
} from "./model";
import type { Cart, Customer, Menu, Order } from "./model";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
export const demoMode = !url && !key;
export const configError =
  !demoMode && (!url || !key || !URL.canParse(url))
    ? "Site configuration is incomplete. Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then rebuild."
    : null;
export const supabase =
  !demoMode && !configError && url && key
    ? createClient<Database>(url, key)
    : null;
const MENU_KEY = "cove-demo-menus-v1";
const ORDER_KEY = "cove-demo-orders-v1";

function readLocal<T>(key: string, schema: z.ZodType<T>, fallback: () => T): T {
  const stored = localStorage.getItem(key);
  if (stored === null) {
    const value = fallback();
    localStorage.setItem(key, JSON.stringify(value));
    return value;
  }
  try {
    return schema.parse(JSON.parse(stored));
  } catch {
    throw new Error(
      'Saved demo data could not be read. Use "Reset demo" in the header to start fresh.',
    );
  }
}
function seedMenus(): Menu[] {
  const base = newMenu();
  return [
    {
      ...base,
      status: "published",
      title: "A little comfort. A lot of flavor.",
      notes:
        "Made with care by our culinary students. Please speak with our team about food allergies before ordering.",
      items: [
        {
          id: crypto.randomUUID(),
          name: "Roasted chicken bowl",
          description:
            "Herb-roasted chicken, fluffy rice, seasonal vegetables & a bright lemon dressing.",
          price: 850,
          category: "Mains",
          dietary: ["Gluten-free"],
          available: true,
        },
        {
          id: crypto.randomUUID(),
          name: "Garden pesto pasta",
          description:
            "Penne tossed with house-made basil pesto, cherry tomatoes & shaved parmesan.",
          price: 750,
          category: "Mains",
          dietary: ["Vegetarian"],
          available: true,
        },
        {
          id: crypto.randomUUID(),
          name: "The Cove club",
          description:
            "Roasted turkey, crisp bacon, lettuce & tomato on toasted sourdough. Served with chips.",
          price: 800,
          category: "Mains",
          dietary: [],
          available: true,
        },
        {
          id: crypto.randomUUID(),
          name: "Harvest garden salad",
          description:
            "Mixed greens, crunchy cucumber, roasted chickpeas & our citrus vinaigrette.",
          price: 650,
          category: "Mains",
          dietary: ["Vegan", "Gluten-free"],
          available: true,
        },
        {
          id: crypto.randomUUID(),
          name: "Chocolate chip cookie",
          description:
            "Golden edges, a soft center & plenty of chocolate. Baked fresh in our kitchen.",
          price: 200,
          category: "Something sweet",
          dietary: ["Vegetarian"],
          available: true,
        },
        {
          id: crypto.randomUUID(),
          name: "Freshly brewed iced tea",
          description:
            "Our refreshing house-brewed black tea, served over ice with a slice of lemon.",
          price: 150,
          category: "Drinks",
          dietary: ["Vegan"],
          available: true,
        },
      ],
    },
  ];
}
export function resetDemo() {
  localStorage.removeItem(MENU_KEY);
  localStorage.removeItem(ORDER_KEY);
}
export async function listMenus(): Promise<Menu[]> {
  if (demoMode) return readLocal(MENU_KEY, z.array(menuSchema), seedMenus);
  if (!supabase)
    throw new Error(configError || "The ordering service is unavailable.");
  const menus: Menu[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
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
  const value = validateMenu(menu);
  if (demoMode) {
    const menus = await listMenus();
    localStorage.setItem(
      MENU_KEY,
      JSON.stringify([...menus.filter((menu) => menu.id !== value.id), value]),
    );
    return;
  }
  if (!supabase) throw new Error("The ordering service is unavailable.");
  const { error } = await supabase
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
  if (demoMode) {
    const menus = await listMenus();
    localStorage.setItem(
      MENU_KEY,
      JSON.stringify(
        menus.map((value) =>
          value.id === menu.id ? { ...value, status: "draft" } : value,
        ),
      ),
    );
    return;
  }
  if (!supabase) throw new Error("The ordering service is unavailable.");
  const { error } = await supabase
    .from("menus")
    .update({ status: "draft" })
    .eq("id", menu.id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
export async function listOrders(): Promise<Order[]> {
  if (demoMode) return readLocal(ORDER_KEY, z.array(orderSchema), () => []);
  if (!supabase) throw new Error("The ordering service is unavailable.");
  const orders = new Map<string, Order>();
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await supabase
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
  const details = customerSchema.parse(customer);
  const items = cartLines(menu, cart);
  if (demoMode) {
    const orders = await listOrders();
    const existing = orders.find((order) => order.id === requestId);
    if (existing) return existing;
    const currentMenu = (await listMenus()).find(
      (value) => value.id === menu.id,
    );
    if (!currentMenu || !isOpen(currentMenu))
      throw new Error("Ordering has closed for this menu.");
    const currentItems = cartLines(currentMenu, cart);
    if (
      currentItems.some(
        (item, index) => item.unitPrice !== items[index].unitPrice,
      )
    )
      throw new Error(
        "A menu price has changed. Please refresh the menu before ordering.",
      );
    const order: Order = {
      id: requestId,
      reference: `CV-${requestId.replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      menuId: currentMenu.id,
      menuTitle: currentMenu.title,
      ...details,
      items: currentItems,
      status: "new",
      total: currentItems.reduce(
        (sum, item) => sum + item.unitPrice * item.quantity,
        0,
      ),
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(ORDER_KEY, JSON.stringify([order, ...orders]));
    return order;
  }
  if (!supabase) throw new Error("The ordering service is unavailable.");
  const { data, error } = await supabase.rpc("place_order", {
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
  if (demoMode) {
    const orders = await listOrders();
    localStorage.setItem(
      ORDER_KEY,
      JSON.stringify(
        orders.map((order) => (order.id === id ? { ...order, status } : order)),
      ),
    );
    return;
  }
  if (!supabase) throw new Error("The ordering service is unavailable.");
  const { error } = await supabase
    .from("orders")
    .update({ status })
    .eq("id", id)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
}
