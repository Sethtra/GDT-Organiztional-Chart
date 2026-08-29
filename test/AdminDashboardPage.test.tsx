import { render, screen, within } from "@testing-library/react";
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

vi.mock("../src/services/staffService", () => ({
  listHrStaff: vi.fn(async () => [
    { id: "active-male-1", gender: "male", status: "active" },
    { id: "active-male-2", gender: "male", status: "active" },
    { id: "active-female-1", gender: "female", status: "active" },
    { id: "active-unspecified-1", gender: "unspecified", status: "active" },
    { id: "archived-female-1", gender: "female", status: "archived" },
  ]),
}));

vi.mock("../src/services/activityLogService", () => ({
  listRecentActivity: vi.fn(async () => [
    {
      id: "00000000-0000-4000-8000-aaa000000001",
      staffId: "00000000-0000-4000-8000-000000000001",
      staffName: "Chantha Sok",
      staffNameEn: "Sok Chantha",
      photoUrl: null,
      eventType: "promoted",
      description: "Promoted to new position",
      departmentName: "Digital Tax Department",
      officeName: "Tax Office",
      metadata: {},
      occurredAt: new Date().toISOString(),
    },
    {
      id: "00000000-0000-4000-8000-aaa000000002",
      staffId: "00000000-0000-4000-8000-000000000002",
      staffName: "Sreyneang Ros",
      staffNameEn: null,
      photoUrl: null,
      eventType: "transferred",
      description: "Transferred to new position",
      departmentName: "Finance Department",
      officeName: null,
      metadata: {},
      occurredAt: new Date().toISOString(),
    },
  ]),
}));

import AdminDashboardPage from "../src/pages/AdminDashboardPage";
import { listPromotionReadiness } from "../src/services/promotionReadinessService";
import { listHrStaff } from "../src/services/staffService";

describe("AdminDashboardPage", () => {
  it("renders live active-officer workforce metrics", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Executive overview" }),
    ).toBeInTheDocument();
    const navigation = screen.getByRole("navigation", {
      name: "Admin navigation",
    });
    expect(navigation).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Executive overview/i }),
    ).toHaveAttribute("aria-current", "page");
    const overviewToggle = screen.getByRole("button", {
      name: "Expand Executive overview",
    });
    expect(overviewToggle).toHaveAttribute("aria-expanded", "false");
    expect(
      within(navigation).queryByRole("link", { name: "Recent activity" }),
    ).not.toBeInTheDocument();
    await user.click(overviewToggle);
    expect(overviewToggle).toHaveAttribute("aria-expanded", "true");
    const navigationLinks = within(navigation).getAllByRole("link");
    expect(navigationLinks.map((link) => link.textContent?.trim())).toEqual([
      expect.stringContaining("Executive overview"),
      "Recent activity",
      expect.stringContaining("Staff directory"),
      expect.stringContaining("Organization"),
      expect.stringContaining("Job architecture"),
    ]);
    const metrics = within(
      screen.getByRole("region", { name: "Key workforce metrics" }),
    );
    expect(metrics.getByText("Total workforce")).toBeInTheDocument();
    expect(metrics.getByText("Male officers")).toBeInTheDocument();
    expect(metrics.getByText("Female officers")).toBeInTheDocument();
    expect(await metrics.findByText("4")).toBeInTheDocument();
    expect(metrics.getByText("2")).toBeInTheDocument();
    expect(metrics.getByText("1")).toBeInTheDocument();
    expect(metrics.queryByText("Position coverage")).not.toBeInTheDocument();
    expect(metrics.queryByText("Open positions")).not.toBeInTheDocument();
    expect(
      screen.getByText(
        "Workforce totals are live — remaining analytics are illustrative",
      ),
    ).toBeInTheDocument();
    expect(listHrStaff).toHaveBeenCalledWith(true);
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

  it("does not present a failed workforce request as zero officers", async () => {
    vi.mocked(listHrStaff).mockRejectedValueOnce(new Error("RPC unavailable"));
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    const metrics = within(
      screen.getByRole("region", { name: "Key workforce metrics" }),
    );
    expect(
      await metrics.findAllByText("Live workforce data unavailable"),
    ).toHaveLength(3);
    expect(metrics.getAllByText("—")).toHaveLength(3);
  });

  it("shows live recent activity with the all-years trend by default", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>,
    );

    expect(
      await screen.findByText(/All recorded years/, { selector: "p" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Filter headcount by year range" }),
    ).toHaveTextContent("All years");

    // Live recent activity entries should appear
    expect(await screen.findByText("Chantha Sok")).toBeInTheDocument();
    expect(screen.getByText("Sreyneang Ros")).toBeInTheDocument();

    // Search filters down to matching events
    const search = screen.getByRole("searchbox", {
      name: "Search recent activity",
    });
    await user.type(search, "Digital Tax");
    expect(screen.getByText("Chantha Sok")).toBeInTheDocument();
    expect(screen.queryByText("Sreyneang Ros")).not.toBeInTheDocument();

    // "View all" link should be present
    expect(
      screen.getByRole("link", { name: /View all activity/i }),
    ).toHaveAttribute("href", "/admin/activity");
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
