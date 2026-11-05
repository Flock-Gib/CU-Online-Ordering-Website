import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FoodArt } from "./Artwork";

afterEach(cleanup);

describe("food artwork", () => {
  it("renders a detailed decorative hero with unique paint references", () => {
    const { container } = render(
      <>
        <FoodArt name="chicken bowl" hero />
        <FoodArt name="chicken bowl" hero />
      </>,
    );
    const illustrations = container.querySelectorAll("svg");
    expect(illustrations).toHaveLength(2);
    const ids = [...container.querySelectorAll("[id]")].map((node) => node.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const illustration of illustrations) {
      expect(illustration.getAttribute("aria-hidden")).toBe("true");
      expect(illustration.querySelectorAll("radialGradient")).toHaveLength(3);
      expect(illustration.querySelectorAll("clipPath")).toHaveLength(1);
      for (const node of illustration.querySelectorAll(
        "[fill], [filter], [clip-path]",
      )) {
        for (const attribute of ["fill", "filter", "clip-path"]) {
          const value = node.getAttribute(attribute);
          if (value?.startsWith("url(#")) {
            expect(ids).toContain(value.slice(5, -1));
          }
        }
      }
    }
  });
});
