import { describe, expect, it } from "vitest";
import { parseMenu } from "./import-menu";

describe("menu import", () => {
  it("parses pipe-separated items, integer and decimal dollar amounts, and categories", () => {
    const result = parseMenu(
      "# Mains\nChicken bowl | Rice & vegetables | $8.50\nSoup | $4\nDesserts:\nCookie | Warm & gooey | 2.00",
    );
    expect(
      result.items.map((item) => [
        item.name,
        item.description,
        item.price,
        item.category,
      ]),
    ).toEqual([
      ["Chicken bowl", "Rice & vegetables", 850, "Mains"],
      ["Soup", "", 400, "Mains"],
      ["Cookie", "Warm & gooey", 200, "Desserts"],
    ]);
    expect(result.skipped).toEqual([]);
    expect(new Set(result.items.map((item) => item.id)).size).toBe(3);
    expect(result.items.every((item) => item.dietary.length === 0)).toBe(true);
  });
  it("handles simple PDF-extracted priced lines and bullet lists", () => {
    expect(
      parseMenu("• Roasted chicken $8.50\nPasta - $7.50\nSalad 6.00").items.map(
        (item) => [item.name, item.price],
      ),
    ).toEqual([
      ["Roasted chicken", 850],
      ["Pasta", 750],
      ["Salad", 600],
    ]);
  });
  it("surfaces unrecognized lines instead of silently inventing dishes", () => {
    const result = parseMenu(
      "Menu for November 4\nContains nuts\nSoup | $4.50\nCall room 201\nPasta $7.5\nPrice $9999.99",
    );
    expect(result.items).toHaveLength(1);
    expect(result.skipped).toEqual([
      "Menu for November 4",
      "Contains nuts",
      "Call room 201",
      "Pasta $7.5",
      "Price $9999.99",
    ]);
  });
  it("supports zero-cost items and bounds item counts", () => {
    expect(parseMenu("Water | $0.00").items[0].price).toBe(0);
    const result = parseMenu(
      Array.from({ length: 101 }, () => "Cookie | $2.00").join("\n"),
    );
    expect(result.items).toHaveLength(100);
    expect(result.skipped).toHaveLength(1);
  });
});
