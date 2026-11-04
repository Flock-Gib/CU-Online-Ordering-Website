import { describe, expect, it } from "vitest";
import { configError, listMenus, listOrders } from "./repository";

describe("live data repository", () => {
  it("requires a configured shared database and never creates local orders", async () => {
    expect(configError).toContain("Live ordering is not connected");
    await expect(listMenus()).rejects.toThrow("Live ordering is not connected");
    await expect(listOrders()).rejects.toThrow(
      "Live ordering is not connected",
    );
    expect(localStorage.length).toBe(0);
  });
});
