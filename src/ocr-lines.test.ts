import { describe, expect, it } from "vitest";
import { ocrMenuLines } from "./ocr-lines";
import { parseMenu } from "./import-menu";

function word(text: string, left: number, top: number, confidence = 96) {
  return `5\t1\t1\t1\t1\t1\t${left}\t${top}\t70\t20\t${confidence}\t${text}`;
}

describe("positional menu OCR", () => {
  it("joins names and prices across OCR blocks without mixing adjacent rows", () => {
    const text = ocrMenuLines(
      [
        word("CCT BLT", 10, 10),
        word("$8", 400, 12),
        word("Classic Chicken Salad", 10, 60),
        word("$6", 400, 60),
      ].join("\n"),
    );
    expect(
      parseMenu(text).items.map((item) => [item.name, item.price]),
    ).toEqual([
      ["CCT BLT", 800],
      ["Classic Chicken Salad", 600],
    ]);
  });
  it("flags uncertain prices or names instead of importing them", () => {
    const text = ocrMenuLines(
      [
        word("Soup", 10, 10),
        word("$67", 400, 10, 50),
        word("Garbled", 10, 60, 25),
        word("$3", 400, 60),
      ].join("\n"),
    );
    expect(parseMenu(text).items).toHaveLength(0);
    expect(parseMenu(text).skipped).toHaveLength(2);
    expect(text.match(/\[Needs review\]/g)).toHaveLength(2);
  });
  it("retains categories and explicit salad base pricing without inventing add-ons", () => {
    const text = ocrMenuLines(
      [
        word("CUSTOM SALAD", 10, 10),
        word("$4 BASE", 10, 60),
        word("Add to your salad ($1.50 each)", 10, 110),
      ].join("\n"),
    );
    expect(
      parseMenu(text).items.map((item) => [
        item.name,
        item.price,
        item.category,
      ]),
    ).toEqual([["CUSTOM SALAD (base)", 400, "CUSTOM SALAD"]]);
    expect(parseMenu(text).skipped).toEqual(["Add to your salad ($1.50 each)"]);
  });
});
