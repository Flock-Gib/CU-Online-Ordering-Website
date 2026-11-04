import { describe, expect, it } from "vitest";
import {
  demoMode,
  listMenus,
  listOrders,
  placeOrder,
  resetDemo,
  saveMenu,
  unpublishMenu,
  updateOrder,
} from "./repository";

const customer = {
  teacherName: "Demo Teacher",
  email: "demo@example.test",
  room: "B12",
  note: "",
};

describe("local demo lifecycle", () => {
  it("seeds a published menu and persists a new order without duplicate retries", async () => {
    expect(demoMode).toBe(true);
    const menu = (await listMenus())[0];
    expect(menu.items).toHaveLength(6);
    const id = crypto.randomUUID();
    const order = await placeOrder(
      menu,
      { [menu.items[0].id]: 2 },
      customer,
      id,
    );
    expect(order.total).toBe(1700);
    expect(
      await placeOrder(menu, { [menu.items[0].id]: 2 }, customer, id),
    ).toEqual(order);
    expect(await listOrders()).toHaveLength(1);
    await updateOrder(id, "ready");
    expect((await listOrders())[0].status).toBe("ready");
    resetDemo();
    expect(await listOrders()).toEqual([]);
  });
  it("rejects stale prices, sold-out items and unpublished menus", async () => {
    const menu = (await listMenus())[0];
    const cart = { [menu.items[0].id]: 1 };
    await saveMenu({
      ...menu,
      items: menu.items.map((item, index) =>
        index ? item : { ...item, price: item.price + 100 },
      ),
    });
    await expect(
      placeOrder(menu, cart, customer, crypto.randomUUID()),
    ).rejects.toThrow("price has changed");
    await saveMenu({
      ...menu,
      items: menu.items.map((item, index) =>
        index ? item : { ...item, available: false },
      ),
    });
    await expect(
      placeOrder(menu, cart, customer, crypto.randomUUID()),
    ).rejects.toThrow("no longer available");
    await unpublishMenu(menu);
    await expect(
      placeOrder(menu, cart, customer, crypto.randomUUID()),
    ).rejects.toThrow("closed");
  });
  it("reports corrupt demo data explicitly", async () => {
    localStorage.setItem("cove-demo-menus-v1", "{broken");
    await expect(listMenus()).rejects.toThrow("Reset demo");
  });
});
