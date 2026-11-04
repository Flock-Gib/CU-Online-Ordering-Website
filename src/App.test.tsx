import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("teacher and kitchen workflows", () => {
  it("places an order, shows the receipt and lets culinary staff mark it ready", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Roasted chicken bowl" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Continue to order" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: "Demo Teacher" },
    });
    fireEvent.change(screen.getByLabelText("School email"), {
      target: { value: "demo@example.test" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Place demo order" }));
    expect(
      await screen.findByRole("heading", { name: "Lunch, sorted." }),
    ).toBeTruthy();
    expect(screen.getByText("Demo Teacher")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Culinary staff" }));
    fireEvent.click(screen.getByRole("button", { name: "Explore demo admin" }));
    fireEvent.click(await screen.findByRole("button", { name: /Orders/ }));
    const status = await screen.findByRole("combobox", {
      name: /Status for CV-/,
    });
    fireEvent.change(status, { target: { value: "ready" } });
    await waitFor(() => {
      expect(
        JSON.parse(localStorage.getItem("cove-demo-orders-v1")!)[0].status,
      ).toBe("ready");
    });
  });
  it("requires review before typed menu items are added and published", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Culinary staff" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Explore demo admin" }));
    fireEvent.click(screen.getByRole("button", { name: "Create a menu" }));
    fireEvent.change(screen.getByLabelText("Or type / paste a menu"), {
      target: {
        value:
          "# Mains\nSoup | Tomato and basil | $4.50\nKitchen note without a price",
      },
    });
    expect(screen.queryByLabelText("Item name")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));
    expect(screen.getByText("1 items detected")).toBeTruthy();
    expect(screen.getByText(/1 unrecognized lines/)).toBeTruthy();
    expect(screen.queryByLabelText("Item name")).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Add 1 items to menu" }),
    );
    expect((screen.getByLabelText("Item name") as HTMLInputElement).value).toBe(
      "Soup",
    );
    fireEvent.change(screen.getByLabelText("Menu title"), {
      target: { value: "Soup day" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save & publish" }));
    expect(
      await screen.findByRole("heading", { name: "Soup day" }),
    ).toBeTruthy();
    const menus = JSON.parse(localStorage.getItem("cove-demo-menus-v1")!);
    expect(
      menus.find((menu: { title: string }) => menu.title === "Soup day").status,
    ).toBe("published");
  });
  it("filters dishes by category and search without changing the order", async () => {
    const { container } = render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Add Roasted chicken bowl" }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Drinks" }));
    const grid = within(container.querySelector(".food-grid")! as HTMLElement);
    expect(grid.getAllByRole("article")).toHaveLength(1);
    expect(
      grid.getByRole("heading", { name: "Freshly brewed iced tea" }),
    ).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Search menu" }), {
      target: { value: "does not exist" },
    });
    expect(
      screen.getByRole("heading", { name: "No matching bites" }),
    ).toBeTruthy();
    expect(
      within(container.querySelector(".cart-items")! as HTMLElement).getByText(
        "Roasted chicken bowl",
      ),
    ).toBeTruthy();
  });
});
