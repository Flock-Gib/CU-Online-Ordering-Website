import { z } from "zod";

export const itemSchema = z.object({
  id: z.uuid(),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500),
  price: z.number().int().min(0).max(100000),
  category: z.string().trim().min(1).max(60),
  dietary: z.array(z.enum(["Vegetarian", "Vegan", "Gluten-free"])).max(3),
  available: z.boolean(),
});
export const menuSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1).max(100),
  serviceDate: z.iso.date(),
  orderDeadline: z.iso.datetime({ offset: true }),
  pickupStart: z.string().regex(/^\d{2}:\d{2}$/),
  pickupEnd: z.string().regex(/^\d{2}:\d{2}$/),
  location: z.string().trim().min(1).max(100),
  notes: z.string().trim().max(1000),
  status: z.enum(["draft", "published"]),
  items: z.array(itemSchema).max(100),
});
export const orderSchema = z.object({
  id: z.uuid(),
  reference: z.string(),
  menuId: z.uuid(),
  menuTitle: z.string(),
  teacherName: z.string(),
  email: z.string(),
  room: z.string(),
  note: z.string(),
  status: z.enum(["new", "ready", "collected", "cancelled"]),
  items: z.array(
    z.object({
      itemId: z.uuid(),
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPrice: z.number().int().nonnegative(),
    }),
  ),
  total: z.number().int().nonnegative(),
  createdAt: z.iso.datetime({ offset: true }),
});
export const customerSchema = z.object({
  teacherName: z
    .string()
    .trim()
    .min(2, "Please enter your full name.")
    .max(100),
  email: z.email("Please enter a valid school email address.").max(254),
  room: z.string().trim().max(60),
  note: z.string().trim().max(500),
});
export type MenuItem = z.infer<typeof itemSchema>;
export type Menu = z.infer<typeof menuSchema>;
export type Order = z.infer<typeof orderSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Cart = Record<string, number>;
export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const displayDate = (date: string) =>
  new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
export const displayTime = (time: string) =>
  new Date(`2000-01-01T${time}`).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
export const deadlineInput = (iso: string) => {
  const date = new Date(iso);
  return `${localDate(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
};
export const isOpen = (menu: Menu, now = Date.now()) =>
  menu.status === "published" &&
  Date.parse(menu.orderDeadline) > now &&
  menu.serviceDate >= localDate(new Date(now));
export function newMenu(): Menu {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);
  return {
    id: crypto.randomUUID(),
    title: "Fresh from the Cove",
    serviceDate: localDate(tomorrow),
    orderDeadline: tomorrow.toISOString(),
    pickupStart: "11:30",
    pickupEnd: "13:00",
    location: "The Cove",
    notes: "",
    status: "draft",
    items: [],
  };
}
export function validateMenu(menu: Menu): Menu {
  const parsed = menuSchema.parse(menu);
  if (!parsed.items.length)
    throw new Error("Add at least one menu item before saving.");
  if (new Set(parsed.items.map((item) => item.id)).size !== parsed.items.length)
    throw new Error("Menu items must have unique IDs.");
  if (
    parsed.pickupStart >= parsed.pickupEnd ||
    parsed.pickupEnd > "23:59" ||
    parsed.pickupStart > "23:59"
  )
    throw new Error("Pickup end must be after pickup start.");
  const pickup = new Date(`${parsed.serviceDate}T${parsed.pickupStart}`);
  if (Date.parse(parsed.orderDeadline) > pickup.getTime())
    throw new Error("The order deadline must be before pickup begins.");
  if (parsed.status === "published" && !isOpen(parsed))
    throw new Error("Choose a future order deadline before publishing.");
  return parsed;
}
export function cartLines(menu: Menu, cart: Cart) {
  const entries = Object.entries(cart);
  if (!entries.length)
    throw new Error("Add something delicious to your order first.");
  let count = 0;
  const lines = entries.map(([itemId, quantity]) => {
    const item = menu.items.find(
      (item) => item.id === itemId && item.available,
    );
    if (!item)
      throw new Error(
        "A selected item is no longer available. Please refresh the menu.",
      );
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20)
      throw new Error("Choose between 1 and 20 of each item.");
    count += quantity;
    return { itemId, name: item.name, quantity, unitPrice: item.price };
  });
  if (count > 60) throw new Error("Please limit each order to 60 items.");
  return lines;
}
export function ordersCsv(orders: Order[]) {
  const cell = (value: string | number) => {
    const text = String(value);
    return `"${(/^[\s]*[=+\-@\t\r]/.test(text) ? "'" + text : text).replaceAll('"', '""')}"`;
  };
  const rows = [
    [
      "Order",
      "Menu",
      "Name",
      "Email",
      "Room",
      "Items",
      "Total (USD)",
      "Status",
      "Notes",
      "Placed",
    ],
    ...orders.map((order) => [
      order.reference,
      order.menuTitle,
      order.teacherName,
      order.email,
      order.room,
      order.items.map((item) => `${item.quantity} x ${item.name}`).join("; "),
      (order.total / 100).toFixed(2),
      order.status,
      order.note,
      order.createdAt,
    ]),
  ];
  return "\uFEFF" + rows.map((row) => row.map(cell).join(",")).join("\r\n");
}
