import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  user: { id: "user-1" } as { id: string } | null,
  loading: false,
  mfaStatus: "required",
  signOut: vi.fn(async () => ({ error: null })),
}));

vi.mock("../src/hooks/useAuth", () => ({ useAuth: () => auth }));

vi.mock("../src/services/mfaService", () => ({
  getVerifiedTotpFactorId: vi.fn(async () => null),
  startTotpEnrollment: vi.fn(async () => ({
    factorId: "factor-new",
    qrCode: "data:image/svg+xml;utf8,<svg></svg>",
    secret: "JBSWY3DPEHPK3PXP",
  })),
  verifyTotpCode: vi.fn(async () => undefined),
}));

import MfaPage from "../src/pages/MfaPage";
import ProtectedRoute from "../src/components/editor/ProtectedRoute";
import {
  getVerifiedTotpFactorId,
  startTotpEnrollment,
  verifyTotpCode,
} from "../src/services/mfaService";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/mfa" element={<MfaPage />} />
        <Route path="/login" element={<p>Login page</p>} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <p>Dashboard content</p>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe("two-step sign-in", () => {
  beforeEach(() => {
    auth.user = { id: "user-1" };
    auth.mfaStatus = "required";
    vi.mocked(getVerifiedTotpFactorId).mockClear().mockResolvedValue(null);
    vi.mocked(startTotpEnrollment).mockClear();
    vi.mocked(verifyTotpCode).mockClear().mockResolvedValue(undefined);
  });

  it("keeps signed-in users without two-step sign-in out of protected pages", async () => {
    renderAt("/dashboard");

    expect(await screen.findByRole("heading", { name: "Set up two-step sign-in" })).toBeInTheDocument();
    expect(screen.queryByText("Dashboard content")).not.toBeInTheDocument();
  });

  it("lets verified sessions through", () => {
    auth.mfaStatus = "verified";
    renderAt("/dashboard");

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("sends signed-out visitors to the login page", () => {
    auth.user = null;
    auth.mfaStatus = "none";
    renderAt("/dashboard");

    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("shows the QR code and manual key when setting up for the first time", async () => {
    const user = userEvent.setup();
    renderAt("/mfa");

    expect(await screen.findByAltText(/QR code to add GDT Org Chart/)).toBeInTheDocument();
    expect(screen.getByText("JBSWY3DPEHPK3PXP")).toBeInTheDocument();
    expect(startTotpEnrollment).toHaveBeenCalledTimes(1);

    const submit = screen.getByRole("button", { name: /turn on two-step sign-in/i });
    expect(submit).toBeDisabled();
    await user.type(screen.getByLabelText("6-digit code"), "12a34 56");
    expect(screen.getByLabelText("6-digit code")).toHaveValue("123456");
    await user.click(submit);

    expect(verifyTotpCode).toHaveBeenCalledWith("factor-new", "123456");
    expect(
      await screen.findByRole("heading", { name: "Verified. Opening GDT Org Chart…" }),
    ).toBeInTheDocument();
  });

  it("returns to the page the user asked for once the session is verified", () => {
    auth.mfaStatus = "verified";
    render(
      <MemoryRouter initialEntries={[{ pathname: "/mfa", state: { from: "/dashboard" } }]}>
        <Routes>
          <Route path="/mfa" element={<MfaPage />} />
          <Route path="/dashboard" element={<p>Dashboard content</p>} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });

  it("asks returning users for a code instead of setting up again", async () => {
    vi.mocked(getVerifiedTotpFactorId).mockResolvedValue("factor-existing");
    renderAt("/mfa");

    expect(
      await screen.findByRole("heading", { name: "Enter your verification code" }),
    ).toBeInTheDocument();
    expect(startTotpEnrollment).not.toHaveBeenCalled();
  });

  it("explains a wrong code and lets the user retry", async () => {
    vi.mocked(getVerifiedTotpFactorId).mockResolvedValue("factor-existing");
    vi.mocked(verifyTotpCode).mockRejectedValueOnce(
      new Error("That code didn't match. Codes change every 30 seconds — enter the newest one."),
    );
    const user = userEvent.setup();
    renderAt("/mfa");

    await user.type(await screen.findByLabelText("6-digit code"), "000000");
    await user.click(screen.getByRole("button", { name: "Verify" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/didn't match/);
    expect(screen.getByLabelText("6-digit code")).toHaveValue("");
  });
});
