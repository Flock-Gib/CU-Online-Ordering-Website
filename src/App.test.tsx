import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("live ordering setup", () => {
  it("uses the supplied café artwork and retains school identification", () => {
    render(<App />);
    const logo = screen.getByRole("img", {
      name: "The Cove Café lighthouse artwork",
    });
    expect(logo.getAttribute("src")).toBe(
      `${import.meta.env.BASE_URL}cove-cafe-mark.png`,
    );
    expect(screen.getByText("CAPE COD TECH CULINARY ARTS")).toBeTruthy();
    expect(
      screen.getByText("Cape Cod Regional Technical High School"),
    ).toBeTruthy();
    expect(screen.queryByText("CCT")).toBeNull();
  });
  it("explains no-cost setup instead of displaying sample menus or fake orders", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Online ordering is being set up.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(/No paid database plan is required to start/),
    ).toBeTruthy();
    expect(screen.queryByText("Demo kitchen")).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "What’s cooking?" }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: /View culinary admin setup/ }),
    );
    expect(
      screen.getByRole("heading", { name: "Set up the culinary admin." }),
    ).toBeTruthy();
    expect(screen.getByText(/Free plan \(\$0\/month\)/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: /Step-by-step setup guide/ }),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sign in" })).toBeNull();
  });
});
