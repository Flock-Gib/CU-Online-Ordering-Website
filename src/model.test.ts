import { describe, expect, it } from "vitest";
import {
  cartLines,
  customerSchema,
  isOpen,
  localDate,
  money,
  newMenu,
  ordersCsv,
  validateMenu,
} from "./model";
import type { Menu, MenuItem, Order } from "./model";

const item: MenuItem = {
  id: crypto.randomUUID(),
  name: "Soup",
  description: "Tomato & basil",
  price: 450,
  category: "Mains",
  dietary: ["Vegetarian"],
  available: true,
};
const makeMenu = (): Menu => ({ ...newMenu(), items: [item] });

describe("menus", () => {
  it("creates tomorrow’s menu and validates a complete draft", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    expect(makeMenu().serviceDate).toBe(localDate(tomorrow));
    expect(validateMenu(makeMenu()).items).toHaveLength(1);
  });
  it("rejects empty menus, duplicate IDs and invalid price precision", () => {
    expect(() => validateMenu(newMenu())).toThrow("at least one");
    expect(() => validateMenu({ ...makeMenu(), items: [item, item] })).toThrow(
      "unique IDs",
    );
    expect(() =>
      validateMenu({ ...makeMenu(), items: [{ ...item, price: 4.5 }] }),
    ).toThrow();
  });
  it("checks pickup range, cutoff and publication deadline", () => {
    expect(() => validateMenu({ ...makeMenu(), pickupEnd: "10:00" })).toThrow(
      "Pickup end",
    );
    expect(() =>
      validateMenu({
        ...makeMenu(),
        orderDeadline: new Date("2100-01-01").toISOString(),
      }),
    ).toThrow("deadline must be before");
    const old = {
      ...makeMenu(),
      serviceDate: "2000-01-01",
      orderDeadline: "2000-01-01T10:00:00Z",
    };
    expect(() => validateMenu({ ...old, status: "published" })).toThrow(
      "future",
    );
    expect(isOpen({ ...makeMenu(), status: "published" })).toBe(true);
    expect(isOpen(makeMenu())).toBe(false);
    expect(isOpen({ ...old, status: "published" })).toBe(false);
  });
});
describe("orders", () => {
  it("builds authoritative integer-cent line totals", () => {
    const lines = cartLines(makeMenu(), { [item.id]: 3 });
    expect(lines[0]).toEqual({
      itemId: item.id,
      name: "Soup",
      quantity: 3,
      unitPrice: 450,
    });
    expect(money(lines[0].quantity * lines[0].unitPrice)).toBe("$13.50");
  });
  it("rejects empty, missing, unavailable and invalid quantities", () => {
    expect(() => cartLines(makeMenu(), {})).toThrow("Add something");
    expect(() => cartLines(makeMenu(), { nope: 1 })).toThrow(
      "no longer available",
    );
    expect(() =>
      cartLines(
        { ...makeMenu(), items: [{ ...item, available: false }] },
        { [item.id]: 1 },
      ),
    ).toThrow("no longer available");
    for (const quantity of [-1, 0, 0.5, 21, NaN])
      expect(() => cartLines(makeMenu(), { [item.id]: quantity })).toThrow(
        "between 1 and 20",
      );
    const items = Array.from({ length: 4 }, () => ({
      ...item,
      id: crypto.randomUUID(),
    }));
    expect(() =>
      cartLines(
        { ...makeMenu(), items },
        Object.fromEntries(items.map((item) => [item.id, 20])),
      ),
    ).toThrow("60 items");
  });
  it("validates customer contact details", () => {
    expect(
      customerSchema.safeParse({
        teacherName: "A",
        email: "bad",
        room: "",
        note: "",
      }).success,
    ).toBe(false);
    expect(
      customerSchema.safeParse({
        teacherName: "Alex Teacher",
        email: "alex@school.edu",
        room: "B12",
        note: "",
      }).success,
    ).toBe(true);
  });
  it("quotes CSV and neutralizes spreadsheet formulas", () => {
    const order: Order = {
      id: crypto.randomUUID(),
      reference: "CV-123",
      menuId: crypto.randomUUID(),
      menuTitle: "Lunch",
      teacherName: '  =HYPERLINK("bad")',
      email: "teacher@example.test",
      room: "+1",
      note: "Line 1,\nLine 2",
      status: "new",
      items: [
        { itemId: item.id, name: item.name, quantity: 2, unitPrice: 450 },
      ],
      total: 900,
      createdAt: new Date().toISOString(),
    };
    const csv = ordersCsv([order]);
    expect(csv).toContain(`"'  =HYPERLINK(""bad"")"`);
    expect(csv).toContain(`"'+1"`);
    expect(csv).toContain('"9.00"');
    expect(csv).toContain('"Line 1,\nLine 2"');
  });
});
