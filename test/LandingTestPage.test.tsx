import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useHrAdminMock, useChartMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useHrAdminMock: vi.fn(),
  useChartMock: vi.fn(),
}));

vi.mock("../src/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("../src/hooks/useHrAdmin", () => ({ useHrAdmin: useHrAdminMock }));
vi.mock("../src/hooks/useChart", () => ({ useChart: useChartMock }));

import LandingTestPage from "../src/pages/LandingTestPage";

const signOutMock = vi.fn();

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/test-landing"]}>
      <Routes>
        <Route path="/test-landing" element={<LandingTestPage />} />
        <Route path="/login" element={<h1>Login destination</h1>} />
        <Route path="/dashboard" element={<h1>Charts destination</h1>} />
        <Route path="/admin" element={<h1>Admin destination</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

function setAuth(overrides = {}) {
  useAuthMock.mockReturnValue({
    user: null,
    loading: false,
    displayName: "User",
    avatarUrl: null,
    signOut: signOutMock,
    ...overrides,
  });
}

function setCharts(overrides = {}) {
  useChartMock.mockReturnValue({
    charts: [],
    folders: [],
    loading: false,
    ...overrides,
  });
}

const SIGNED_IN = {
  user: { id: "user-1", email: "member@gdt.gov.kh" },
  displayName: "Sokchea An",
};

describe("LandingTestPage (register)", () => {
  beforeEach(() => {
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    setAuth();
    setCharts();
    useHrAdminMock.mockReturnValue({ isHrAdmin: false, loading: false, error: null });
  });

  it("gives an anonymous visitor the access extract and a sign-in path, with no account menu", () => {
    renderLanding();

    const main = screen.getByRole("main");
    expect(
      within(main).getByRole("link", { name: /Sign in to the register/ }),
    ).toHaveAttribute("href", "/login");
    expect(within(main).getByText("How you get an entry")).toBeInTheDocument();
    // The tier table belongs to the closing article only — it must not be
    // duplicated into the hero extract.
    expect(within(main).getAllByText("Invited viewer")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /User/ })).not.toBeInTheDocument();
    // The signed-in entries section must not render for anonymous visitors.
    expect(screen.queryByText("Your charts")).not.toBeInTheDocument();
  });

  it("never exposes an admin destination anywhere on the page for a non-admin", async () => {
    const user = userEvent.setup();
    setAuth(SIGNED_IN);
    renderLanding();

    await user.click(screen.getByRole("button", { name: /Sokchea An/ }));
    expect(screen.queryByRole("link", { name: /Admin portal/ })).not.toBeInTheDocument();
    expect(
      screen.queryAllByRole("link").filter((link) =>
        (link.getAttribute("href") ?? "").startsWith("/admin"),
      ),
    ).toHaveLength(0);
  });

  it("puts the admin portal only inside the profile menu for an HR administrator", async () => {
    const user = userEvent.setup();
    setAuth(SIGNED_IN);
    useHrAdminMock.mockReturnValue({ isHrAdmin: true, loading: false, error: null });

    renderLanding();

    // Closed menu: no admin link anywhere in the document.
    expect(screen.queryByRole("link", { name: /Admin portal/ })).not.toBeInTheDocument();

    const profileTrigger = screen.getByRole("button", { name: /Sokchea An/ });
    await user.click(profileTrigger);

    expect(screen.getByRole("link", { name: /Admin portal/ })).toHaveAttribute(
      "href",
      "/admin",
    );
    // Staff directory, org structure and job architecture stay off this page.
    for (const path of ["/admin/staff", "/admin/org-structure", "/admin/job-architecture"]) {
      expect(
        screen.queryAllByRole("link").filter((l) => l.getAttribute("href") === path),
      ).toHaveLength(0);
    }

    await user.keyboard("{Escape}");
    expect(profileTrigger).toHaveAttribute("aria-expanded", "false");
    expect(profileTrigger).toHaveFocus();
  });

  it("lists the signed-in officer's charts as numbered entries", () => {
    setAuth(SIGNED_IN);
    setCharts({
      charts: [
        {
          id: "chart-a",
          name: "Large Taxpayer Operations",
          updated_at: "2026-07-31T10:00:00.000Z",
          owner_id: "user-1",
          is_public: false,
          folder_id: "folder-1",
        },
        {
          id: "chart-b",
          name: "Provincial Offices",
          updated_at: "2026-07-20T10:00:00.000Z",
          owner_id: "someone-else",
          is_public: true,
          folder_id: null,
        },
      ],
      folders: [{ id: "folder-1", name: "2026 Structure" }],
    });

    renderLanding();

    const entries = screen.getByRole("region", { name: "Your charts" });
    expect(
      within(entries).getAllByRole("link", { name: /Large Taxpayer Operations/ })[0],
    ).toHaveAttribute("href", "/chart/chart-a");
    expect(within(entries).getAllByText("Owner").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("Shared").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("Public link").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("2026 Structure").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("31 Jul 2026").length).toBeGreaterThan(0);
  });

  it("pages the register four entries at a time, numbering them continuously", async () => {
    const user = userEvent.setup();
    setAuth(SIGNED_IN);
    // Ordered newest-first, the way useChart returns them.
    setCharts({
      charts: Array.from({ length: 10 }, (_, i) => ({
        id: `chart-${i + 1}`,
        name: `Chart ${i + 1}`,
        updated_at: "2026-07-31T10:00:00.000Z",
        owner_id: "user-1",
        is_public: false,
        folder_id: null,
      })),
    });

    renderLanding();
    const entries = screen.getByRole("region", { name: "Your charts" });

    // Page 1 — the four most recent, numbered 01–04.
    expect(within(entries).getAllByRole("link", { name: /Chart 1(\s|$)/ }).length).toBeGreaterThan(0);
    expect(within(entries).queryByRole("link", { name: /Chart 5/ })).not.toBeInTheDocument();
    expect(within(entries).getAllByText("Entries 01–04 of 10").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("01").length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("04").length).toBeGreaterThan(0);

    const pages = within(entries).getByRole("navigation", { name: "Register pages" });
    expect(within(pages).getByRole("button", { name: "Previous entries" })).toBeDisabled();
    // 10 charts / 4 per page = 3 pages.
    expect(within(pages).getAllByRole("button", { name: /^Page \d$/ })).toHaveLength(3);

    // Page 2 — the next four, numbered 05–08.
    await user.click(within(pages).getByRole("button", { name: "Next entries" }));
    expect(within(entries).queryByRole("link", { name: /Chart 1(\s|$)/ })).not.toBeInTheDocument();
    expect(within(entries).getAllByRole("link", { name: /Chart 5/ }).length).toBeGreaterThan(0);
    expect(within(entries).getAllByText("Entries 05–08 of 10").length).toBeGreaterThan(0);
    expect(within(pages).getByRole("button", { name: "Page 2" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    // Page 3 — the remainder, and next becomes unavailable.
    await user.click(within(pages).getByRole("button", { name: "Page 3" }));
    expect(within(entries).getAllByText("Entries 09–10 of 10").length).toBeGreaterThan(0);
    expect(within(pages).getByRole("button", { name: "Next entries" })).toBeDisabled();
  });

  it("hides pagination when the register fits on one page", () => {
    setAuth(SIGNED_IN);
    setCharts({
      charts: Array.from({ length: 4 }, (_, i) => ({
        id: `chart-${i + 1}`,
        name: `Chart ${i + 1}`,
        updated_at: "2026-07-31T10:00:00.000Z",
        owner_id: "user-1",
        is_public: false,
        folder_id: null,
      })),
    });

    renderLanding();

    expect(
      screen.queryByRole("navigation", { name: "Register pages" }),
    ).not.toBeInTheDocument();
  });

  it("offers a first-chart action when the register holds no entries", () => {
    setAuth(SIGNED_IN);
    renderLanding();

    const entries = screen.getByRole("region", { name: "Your charts" });
    expect(within(entries).getByText("No charts on record yet")).toBeInTheDocument();
    expect(
      within(entries).getByRole("link", { name: /Create your first chart/ }),
    ).toHaveAttribute("href", "/dashboard");
  });

  it("keeps the loading flag from leaking into the signed-out view", () => {
    // useChart never clears `loading` without a session; the page must not
    // render skeletons at an anonymous visitor.
    setCharts({ loading: true });
    renderLanding();

    expect(screen.queryByText("Reading the register…")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".rg-skeleton")).toHaveLength(0);
  });

  it("shows a recoverable error when logout fails", async () => {
    const user = userEvent.setup();
    signOutMock.mockResolvedValue({ error: new Error("offline") });
    setAuth(SIGNED_IN);

    renderLanding();

    await user.click(screen.getByRole("button", { name: /Sokchea An/ }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not sign you out. Check your connection and try again.",
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });
});
