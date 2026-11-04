import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "./App";

afterEach(cleanup);

describe("live ordering setup", () => {
  it("explains the required service setup instead of displaying sample menus", async () => {
    render(<App />);
    expect(
      await screen.findByRole("heading", {
        name: "Online ordering is being set up.",
      }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Connect the school’s Supabase project and run the database setup.",
      ),
    ).toBeTruthy();
    expect(screen.queryByText("Demo kitchen")).toBeNull();
    expect(
      screen.queryByRole("button", { name: /Place demo order/i }),
    ).toBeNull();
    expect(
      screen.queryByRole("heading", { name: "What’s cooking?" }),
    ).toBeNull();
  });
});
