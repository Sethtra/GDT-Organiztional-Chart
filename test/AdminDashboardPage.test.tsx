import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

vi.mock("../src/services/promotionReadinessService", () => ({
  listPromotionReadiness: vi.fn(async () => [
    {
      staffId: "00000000-0000-4000-8000-000000000001",
      employeeId: "GDT-001",
      name: "Sok Dara",
      nameEn: "Dara Sok",
      photoUrl: null,
      departmentName: "Finance and Personnel",
      officeName: "Personnel Office",
      currentJobTitle: {
        id: "00000000-0000-4000-8000-000000000014",
        name: "មន្ត្រី",
        nameEn: "Officer",
        rankOrder: 50,
        positionScope: "individual",
      },
      targetJobTitle: {
        id: "00000000-0000-4000-8000-000000000013",
        name: "អនុប្រធានការិយាល័យ",
        nameEn: "Deputy Office Chief",
        rankOrder: 40,
        positionScope: "office",
      },
      requiredSkillCount: 3,
      metSkillCount: 3,
      status: "ready",
    },
  ]),
}));

import AdminDashboardPage from "../src/pages/AdminDashboardPage";
import { listPromotionReadiness } from "../src/services/promotionReadinessService";

describe("AdminDashboardPage", () => {
  it("renders the admin dashboard with semantic navigation and metrics", () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
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
    expect(
      screen.getByText("Illustrative — not yet wired to live data"),
    ).toBeInTheDocument();
    expect(screen.getByText("HR administrator")).toBeInTheDocument();
    expect(screen.queryByText("sethtragame@gmail.com")).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("searchbox", { name: "Search recent activity" }),
    ).toHaveLength(1);
  });

  it("shows one-level promotion candidates in the decision queue", async () => {
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    const candidateLink = await screen.findByRole("link", {
      name: /Open profile for Sok Dara/,
    });
    expect(candidateLink).toHaveAttribute(
      "href",
      "/admin/staff?profile=00000000-0000-4000-8000-000000000001",
    );
    expect(candidateLink).toHaveTextContent("មន្ត្រី");
    expect(candidateLink).toHaveTextContent("អនុប្រធានការិយាល័យ");
    expect(candidateLink).toHaveTextContent("3/3 required skills met");
    expect(screen.getByText("1 ready")).toBeInTheDocument();
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(
      screen.getByRole("button", {
        name: "Previous promotion candidates page",
      }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Next promotion candidates page" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("link", { name: "View all promotion-ready officers" }),
    ).toHaveAttribute("href", "/admin/staff?promotion=ready");
    expect(screen.queryByText("Position assignments")).not.toBeInTheDocument();
    expect(screen.queryByText("Transfer requests")).not.toBeInTheDocument();
    expect(screen.queryByText("Profile updates")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Five assignments affect priority service teams/),
    ).not.toBeInTheDocument();
  });

  it("does not present a failed readiness request as zero candidates", async () => {
    vi.mocked(listPromotionReadiness).mockRejectedValueOnce(
      new Error("RPC unavailable"),
    );
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText("Promotion data unavailable"),
    ).toBeInTheDocument();
    expect(screen.queryByText("0 promotion ready")).not.toBeInTheDocument();
  });

  it("switches trend periods and filters recent activity", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboardPage />
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
        <AdminDashboardPage />
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
