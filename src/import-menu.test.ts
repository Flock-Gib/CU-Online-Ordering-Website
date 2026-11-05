import { describe, expect, it } from "vitest";
import { parseMenu } from "./import-menu";

describe("menu import", () => {
  it("preserves all 18 dish and size prices from the Cove menu OCR regression", () => {
    const result = parseMenu(`# GRILL & SANDWICHES
CCT BLT $8
Classic Chicken Salad $6
Curried Chickpea Salad $6
Ham + Swiss $6
# THE COVE CUSTOM SALAD
THE COVE CUSTOM SALAD (base) | $4
Add to your salad ($1.50 each)
Add to your salad ($2.00 each)
# SIDES + FAVORITES
Crusader Fries $3
Gluten Free Tenders $4
Lemon Pepper Wings (6 pc) $5
# SOUP + SWEET
Soup of the Day $3
Fresh-Baked Cookies $1
Blueberry Muffins $1.50
# GRAB + GO
Curried Chickpea Harvest Salad $5
Mediterranean Orzo Salad with Feta $2.50
# COFFEE + COLD DRINKS
Hot Coffee Small $1.50 Large $2.50
Cold Brew $3.00
House-Brewed Hibiscus Iced Tea $1.50
Polar Seltzer $1.00`);
    expect(result.items.map((item) => [item.name, item.price])).toEqual([
      ["CCT BLT", 800],
      ["Classic Chicken Salad", 600],
      ["Curried Chickpea Salad", 600],
      ["Ham + Swiss", 600],
      ["THE COVE CUSTOM SALAD (base)", 400],
      ["Crusader Fries", 300],
      ["Gluten Free Tenders", 400],
      ["Lemon Pepper Wings (6 pc)", 500],
      ["Soup of the Day", 300],
      ["Fresh-Baked Cookies", 100],
      ["Blueberry Muffins", 150],
      ["Curried Chickpea Harvest Salad", 500],
      ["Mediterranean Orzo Salad with Feta", 250],
      ["Hot Coffee (Small)", 150],
      ["Hot Coffee (Large)", 250],
      ["Cold Brew", 300],
      ["House-Brewed Hibiscus Iced Tea", 150],
      ["Polar Seltzer", 100],
    ]);
    expect(result.skipped).toHaveLength(2);
  });
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
  it("does not turn trailing OCR noise or multiple prices into a new price", () => {
    const result = parseMenu(
      "Cold Brew $3.00 p v. 0\nHot Coffee Small $1.50 Large $2.50 Will 67\n[Needs review] Soup $8\nSoup $3.00 $0\nCCT BLT ............ $8",
    );
    expect(result.items.map((item) => [item.name, item.price])).toEqual([
      ["CCT BLT", 800],
    ]);
    expect(result.skipped).toHaveLength(4);
  });
  it("splits clearly labeled sizes without guessing ambiguous price choices", () => {
    const result = parseMenu(
      "# Drinks\nHot Coffee Small $1.50 | Large $2.50\nSpecial $3 or $5\nAdd to salad ($1.50 each)",
    );
    expect(
      result.items.map((item) => [item.name, item.price, item.category]),
    ).toEqual([
      ["Hot Coffee (Small)", 150, "Drinks"],
      ["Hot Coffee (Large)", 250, "Drinks"],
    ]);
    expect(result.skipped).toHaveLength(2);
  });
});
