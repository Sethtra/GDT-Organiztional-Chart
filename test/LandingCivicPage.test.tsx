import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, useHrAdminMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useHrAdminMock: vi.fn(),
}));

vi.mock("../src/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("../src/hooks/useHrAdmin", () => ({ useHrAdmin: useHrAdminMock }));

import LandingCivicPage from "../src/pages/LandingCivicPage";

const signOutMock = vi.fn();

function renderLanding() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<LandingCivicPage />} />
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

describe("LandingCivicPage", () => {
  beforeEach(() => {
    window.localStorage.removeItem("gdt_landing_theme");
    signOutMock.mockReset();
    signOutMock.mockResolvedValue({ error: null });
    setAuth();
    useHrAdminMock.mockReturnValue({ isHrAdmin: false, loading: false, error: null });
  });

  it("routes anonymous visitors to sign-in without exposing an account menu", () => {
    renderLanding();

    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("link", { name: "Sign in to the portal" })[0]).toHaveAttribute(
      "href",
      "/login",
    );
    expect(within(main).getByRole("link", { name: "See the structure" })).toHaveAttribute(
      "href",
      "/login",
    );

    const modules = screen.getByRole("region", {
      name: "Explore the connected GDT work areas",
    });
    expect(within(modules).getAllByRole("link")).toHaveLength(3);
    for (const link of within(modules).getAllByRole("link")) {
      expect(link).toHaveAttribute("href", "/login");
    }
    expect(screen.queryByRole("button", { name: /User/i })).not.toBeInTheDocument();
  });

  it("keeps HR-only destinations disabled while a signed-in role is unresolved", () => {
    setAuth({
      user: { email: "member@gdt.gov.kh" },
      displayName: "Sokchea",
    });
    useHrAdminMock.mockReturnValue({ isHrAdmin: false, loading: true, error: null });

    renderLanding();

    expect(screen.getAllByRole("button", { name: /Checking access/i }).length).toBeGreaterThan(1);
    const modules = screen.getByRole("region", {
      name: "Explore the connected GDT work areas",
    });
    expect(within(modules).queryAllByRole("link")).toHaveLength(0);
    expect(within(modules).getAllByText(/Staff Directory|Organization|Job Architecture/).length).toBeGreaterThan(0);
  });

  it("uses real admin destinations and includes the admin portal for an HR administrator", async () => {
    const user = userEvent.setup();
    setAuth({
      user: { email: "hr@gdt.gov.kh" },
      displayName: "Sokchea An",
    });
    useHrAdminMock.mockReturnValue({ isHrAdmin: true, loading: false, error: null });

    renderLanding();

    const modules = screen.getByRole("region", {
      name: "Explore the connected GDT work areas",
    });
    expect(within(modules).getByRole("link", { name: /Staff Directory/ })).toHaveAttribute(
      "href",
      "/admin/staff",
    );
    expect(within(modules).getByRole("link", { name: /Organization/ })).toHaveAttribute(
      "href",
      "/admin/org-structure",
    );
    expect(within(modules).getByRole("link", { name: /Job Architecture/ })).toHaveAttribute(
      "href",
      "/admin/job-architecture",
    );

    const profileTrigger = screen.getByRole("button", { name: /Sokchea An/ });
    await user.click(profileTrigger);
    expect(screen.getByRole("link", { name: "Admin portal" })).toHaveAttribute("href", "/admin");
    expect(profileTrigger).toHaveAttribute("aria-expanded", "true");

    await user.keyboard("{Escape}");
    expect(profileTrigger).toHaveAttribute("aria-expanded", "false");
    expect(profileTrigger).toHaveFocus();
  });

  it("switches the isolated preview theme and pairs it with the correct logo", async () => {
    window.localStorage.setItem("gdt_landing_theme", "dark");
    const user = userEvent.setup();

    renderLanding();

    const page = document.querySelector(".landing-civic-page");
    const brand = screen.getByRole("link", { name: "GDT organizational chart home" });
    expect(page).toHaveAttribute("data-landing-theme", "dark");
    expect(within(brand).getByRole("img")).toHaveAttribute("src", "/GDT-Logo (Dark).png");

    await user.click(screen.getByRole("button", { name: "Switch to light appearance" }));
    expect(page).toHaveAttribute("data-landing-theme", "light");
    expect(within(brand).getByRole("img")).toHaveAttribute("src", "/GDT-Logo (Light).png");
    expect(window.localStorage.getItem("gdt_landing_theme")).toBe("light");
  });

  it("shows a recoverable error when logout fails", async () => {
    const user = userEvent.setup();
    signOutMock.mockResolvedValue({ error: new Error("offline") });
    setAuth({
      user: { email: "member@gdt.gov.kh" },
      displayName: "Sokchea",
    });

    renderLanding();

    await user.click(screen.getByRole("button", { name: /Sokchea/ }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We could not sign you out. Check your connection and try again.",
    );
    expect(screen.getByRole("button", { name: "Sign out" })).toBeEnabled();
  });

  it("prevents duplicate logout requests and navigates after success", async () => {
    const user = userEvent.setup();
    let resolveSignOut: (value: { error: null }) => void = () => {};
    signOutMock.mockReturnValue(
      new Promise((resolve) => {
        resolveSignOut = resolve;
      }),
    );
    setAuth({
      user: { email: "member@gdt.gov.kh" },
      displayName: "Sokchea",
    });

    renderLanding();

    await user.click(screen.getByRole("button", { name: /Sokchea/ }));
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    expect(screen.getByRole("button", { name: "Signing out…" })).toBeDisabled();
    expect(signOutMock).toHaveBeenCalledTimes(1);

    await act(async () => resolveSignOut({ error: null }));
    expect(await screen.findByRole("heading", { name: "Login destination" })).toBeInTheDocument();
  });
});
