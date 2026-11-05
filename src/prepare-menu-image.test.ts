import { describe, expect, it } from "vitest";
import { menuImageRegions, removePriceLeaders } from "./prepare-menu-image";

function paper(width: number, height: number) {
  return new Uint8ClampedArray(width * height * 4).fill(255);
}
function rectangle(
  pixels: Uint8ClampedArray,
  width: number,
  left: number,
  top: number,
  right: number,
  bottom: number,
  color: number[],
) {
  for (let y = top; y < bottom; y++)
    for (let x = left; x < right; x++)
      pixels.set([...color, 255], (y * width + x) * 4);
}

describe("menu image preparation", () => {
  it("detects shifted colored section panels and reads down each column", () => {
    const pixels = paper(600, 800);
    for (const [left, top, right, bottom] of [
      [20, 200, 280, 220],
      [20, 400, 280, 420],
      [320, 200, 570, 220],
      [320, 500, 570, 520],
      [0, 740, 590, 780],
    ])
      rectangle(pixels, 600, left, top, right, bottom, [110, 10, 20]);
    const regions = menuImageRegions(pixels, 600, 800, "auto");
    expect(regions).toHaveLength(4);
    expect(regions.map((region) => [region.left, region.top])).toEqual([
      [20, 200],
      [20, 400],
      [320, 200],
      [320, 500],
    ]);
    expect(regions[1].top + regions[1].height).toBe(740);
  });
  it("supports plain single-column images and explicit two-column overrides", () => {
    const pixels = paper(600, 800);
    expect(menuImageRegions(pixels, 600, 800, "auto")).toEqual([
      { left: 0, top: 0, width: 600, height: 800, headingHeight: 0 },
    ]);
    expect(
      menuImageRegions(pixels, 600, 800, "columns").map(
        (region) => region.width,
      ),
    ).toEqual([300, 300]);
  });
  it("removes repeated price leaders but leaves isolated decimal dots intact", () => {
    const pixels = paper(200, 80);
    for (let x = 20; x < 100; x += 8)
      rectangle(pixels, 200, x, 20, x + 2, 22, [0, 0, 0]);
    rectangle(pixels, 200, 150, 20, 152, 22, [0, 0, 0]);
    removePriceLeaders(pixels, 200, 80, 1);
    expect(pixels[(20 * 200 + 20) * 4]).toBe(255);
    expect(pixels[(20 * 200 + 150) * 4]).toBe(0);
  });
});
