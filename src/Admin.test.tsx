import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Admin from "./Admin";
import type { Order } from "./model";
import { listOrders } from "./repository";
import { extractPng } from "./image-menu";

vi.mock("./image-menu", () => ({ extractPng: vi.fn() }));
vi.mock("./repository", () => ({
  listOrders: vi.fn(),
  saveMenu: vi.fn(),
  unpublishMenu: vi.fn(),
  updateOrder: vi.fn(),
}));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("culinary order board", () => {
  it("opens a practical staff guide and returns to menu creation without losing the guide", async () => {
    vi.mocked(listOrders).mockResolvedValue([]);
    render(<Admin menus={[]} refresh={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: "Quick guide" }));
    expect(
      screen.getByRole("heading", { name: "Culinary quick guide" }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Two menus on the same day" }),
    ).toBeTruthy();
    expect(screen.getByText("Restaurant / Sit-Down")).toBeTruthy();
    fireEvent.click(
      screen.getByText("Upload a menu, paste text or enter dishes manually"),
    );
    expect(screen.getByText(/OCR is not perfect/)).toBeTruthy();
    const guide = screen.getByRole("region", { name: "Culinary quick guide" });
    const create = [...guide.querySelectorAll("button")].find(
      (button) => button.textContent === "Create a menu",
    )!;
    fireEvent.click(create);
    expect(
      screen.getByRole("heading", { name: "What’s on the menu?" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "All menus" }));
    expect(
      screen.getByRole("heading", { name: "Culinary quick guide" }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Open orders" }));
    expect(
      await screen.findByRole("heading", { name: "No orders on the board." }),
    ).toBeTruthy();
    expect(listOrders).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: /Menus/ }));
    expect(
      screen.getByRole("heading", { name: "Your first menu starts here." }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("heading", { name: "Culinary quick guide" }),
    ).toBeNull();
  });
  it("reports failed PNG recognition without adding or publishing dishes", async () => {
    vi.mocked(listOrders).mockResolvedValue([]);
    vi.mocked(extractPng).mockRejectedValue(
      new Error("No readable text was found."),
    );
    render(<Admin menus={[]} refresh={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Create a menu/ }));
    fireEvent.change(document.querySelector("#menu-file")!, {
      target: { files: [new File(["bad"], "menu.png", { type: "image/png" })] },
    });
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "No readable text was found.",
    );
    expect(screen.queryByLabelText("Item name")).toBeNull();
    expect(screen.queryByText(/items detected/)).toBeNull();
  });
  it("extracts a PNG and requires staff review before adding any dishes", async () => {
    vi.mocked(listOrders).mockResolvedValue([]);
    vi.mocked(extractPng).mockResolvedValue("Soup $4.50\nCookie $2.00");
    render(<Admin menus={[]} refresh={async () => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Create a menu/ }));
    const upload = document.querySelector<HTMLInputElement>("#menu-file")!;
    expect(upload.accept).toContain(".png");
    fireEvent.change(upload, {
      target: { files: [new File(["png"], "menu.png", { type: "image/png" })] },
    });
    expect(
      await screen.findByText(
        /Check every dish and price against the original/,
      ),
    ).toBeTruthy();
    expect(screen.queryByLabelText("Item name")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Review items" }));
    expect(screen.getByText("2 items detected")).toBeTruthy();
    expect(screen.queryByLabelText("Item name")).toBeNull();
    expect(
      screen.getByRole<HTMLButtonElement>("button", {
        name: "Add 2 items to menu",
      }).disabled,
    ).toBe(true);
    fireEvent.click(screen.getByLabelText(/I checked every dish and price/));
    fireEvent.click(
      screen.getByRole("button", { name: "Add 2 items to menu" }),
    );
    expect(screen.getAllByLabelText("Item name")).toHaveLength(2);
  });
  it("shows free-response meal requests on the order card", async () => {
    const order: Order = {
      id: "33333333-3333-4333-8333-333333333333",
      reference: "CV-ABC123",
      menuId: "11111111-1111-4111-8111-111111111111",
      menuTitle: "Lunch menu",
      teacherName: "Alex Teacher",
      email: "alex@school.example",
      room: "B12",
      note: "No ketchup, no bacon, please.",
      status: "new",
      items: [
        {
          itemId: "22222222-2222-4222-8222-222222222222",
          name: "Club sandwich",
          quantity: 1,
          unitPrice: 800,
        },
      ],
      total: 800,
      createdAt: new Date().toISOString(),
    };
    vi.mocked(listOrders).mockResolvedValue([order]);
    render(
      <Admin
        menus={[]}
        refresh={async () => {}}
        staffName="Cape Cod Tech Culinary Team"
      />,
    );
    fireEvent.click(await screen.findByRole("button", { name: /Orders/ }));
    expect(await screen.findByText(order.note)).toBeTruthy();
    expect(screen.getByText("Teacher meal request:")).toBeTruthy();
    expect(
      screen.getByRole("heading", {
        name: "Welcome, Cape Cod Tech Culinary Team.",
      }),
    ).toBeTruthy();
  });
});
