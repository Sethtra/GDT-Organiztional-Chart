import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import AdminDashboardTestPage from "../src/pages/AdminDashboardTestPage";

describe("AdminDashboardTestPage", () => {
  it("renders the isolated admin preview with semantic navigation and metrics", () => {
    render(
      <MemoryRouter>
        <AdminDashboardTestPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Executive overview" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Admin navigation" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Executive overview/i }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("region", { name: "Key workforce metrics" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Design preview · Sample data")).toBeInTheDocument();
  });

  it("switches trend periods and filters recent activity", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboardTestPage />
      </MemoryRouter>,
    );

    const twelveMonths = screen.getByRole("button", { name: "12m" });
    await user.click(twelveMonths);
    expect(twelveMonths).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Last 12 months · Active officer records")).toBeInTheDocument();

    const search = screen.getByRole("searchbox", {
      name: "Search recent activity",
    });
    await user.type(search, "Digital Tax");
    expect(screen.getByText("Chantha Sok")).toBeInTheDocument();
    expect(screen.queryByText("Sreyneang Ros")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboardTestPage />
      </MemoryRouter>,
    );

    const openMenu = screen.getByRole("button", {
      name: "Open admin navigation",
    });
    expect(openMenu).toHaveAttribute("aria-expanded", "false");

    await user.click(openMenu);
    expect(openMenu).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByRole("button", { name: "Close menu" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close menu" }));
    expect(openMenu).toHaveAttribute("aria-expanded", "false");
  });
});

