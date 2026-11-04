import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Admin from "./Admin";
import type { Order } from "./model";
import { listOrders } from "./repository";

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
