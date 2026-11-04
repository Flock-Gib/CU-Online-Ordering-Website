import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Storefront from "./Storefront";
import { localDate } from "./model";
import type { Menu, Order } from "./model";
import { placeOrder } from "./repository";

vi.mock("./repository", () => ({ placeOrder: vi.fn() }));
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

const itemId = "22222222-2222-4222-8222-222222222222";
function openMenu(): Menu {
  const serviceDate = new Date();
  serviceDate.setDate(serviceDate.getDate() + 1);
  const deadline = new Date(serviceDate);
  deadline.setHours(8, 0, 0, 0);
  return {
    id: "11111111-1111-4111-8111-111111111111",
    title: "Lunch menu",
    serviceDate: localDate(serviceDate),
    orderDeadline: deadline.toISOString(),
    pickupStart: "11:30",
    pickupEnd: "13:00",
    location: "The Cove",
    notes: "",
    status: "published",
    items: [
      {
        id: itemId,
        name: "Club sandwich",
        description: "Turkey, bacon, lettuce and tomato.",
        price: 800,
        category: "Mains",
        dietary: [],
        available: true,
      },
    ],
  };
}

describe("teacher meal change requests", () => {
  it("submits open-response requests with the existing order and pickup flow", async () => {
    const menu = openMenu();
    const order: Order = {
      id: "33333333-3333-4333-8333-333333333333",
      reference: "CV-123456",
      menuId: menu.id,
      menuTitle: menu.title,
      teacherName: "Alex Teacher",
      email: "alex@school.example",
      room: "",
      note: "No bacon, please.",
      status: "new",
      items: [{ itemId, name: "Club sandwich", quantity: 1, unitPrice: 800 }],
      total: 800,
      createdAt: new Date().toISOString(),
    };
    vi.mocked(placeOrder).mockResolvedValue(order);
    render(<Storefront menus={[menu]} refresh={async () => {}} />);

    fireEvent.click(screen.getByRole("button", { name: "Add Club sandwich" }));
    fireEvent.click(screen.getByRole("button", { name: "Continue to order" }));
    fireEvent.change(screen.getByLabelText("Full name"), {
      target: { value: order.teacherName },
    });
    fireEvent.change(screen.getByLabelText("School email"), {
      target: { value: order.email },
    });
    const request = screen.getByLabelText(/Meal changes or requests/);
    fireEvent.change(request, { target: { value: "No bacon, please." } });
    expect(
      screen.getByText(
        /Requests are open response and will be passed to the kitchen/,
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Place order" }));

    expect(await screen.findByText("CV-123456")).toBeTruthy();
    expect(placeOrder).toHaveBeenCalledWith(
      menu,
      { [itemId]: 1 },
      {
        teacherName: "Alex Teacher",
        email: "alex@school.example",
        room: "",
        note: "No bacon, please.",
      },
      expect.any(String),
    );
    expect(screen.getByText("Pay at pickup")).toBeTruthy();
  });
});
