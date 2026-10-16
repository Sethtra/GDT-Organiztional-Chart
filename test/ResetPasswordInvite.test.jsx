import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { acceptInvite, updatePassword } = vi.hoisted(() => ({
  acceptInvite: vi.fn(),
  updatePassword: vi.fn(),
}));

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ acceptInvite, updatePassword }),
}));

import ResetPasswordPage from "../src/pages/ResetPasswordPage";

function renderAt(url) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ResetPasswordPage invitation links", () => {
  beforeEach(() => {
    acceptInvite.mockReset();
  });

  it("redeems the invitation token once and asks the officer to set a password", async () => {
    acceptInvite.mockResolvedValue({ data: {}, error: null });
    renderAt("/reset-password?token_hash=abc123&type=invite");

    expect(
      await screen.findByRole("heading", { name: "Welcome — set your password" }),
    ).toBeInTheDocument();
    expect(acceptInvite).toHaveBeenCalledTimes(1);
    expect(acceptInvite).toHaveBeenCalledWith("abc123");
    expect(screen.getByRole("button", { name: "Set Password" })).toBeInTheDocument();
  });

  it("explains an expired or used invitation", async () => {
    acceptInvite.mockResolvedValue({ data: null, error: { message: "Token has expired" } });
    renderAt("/reset-password?token_hash=old&type=invite");

    expect(
      await screen.findByRole("heading", { name: "This invitation link no longer works" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/ask hr to resend your invitation/i)).toBeInTheDocument();
  });

  it("keeps the ordinary password reset unchanged", () => {
    renderAt("/reset-password");

    expect(screen.getByRole("heading", { name: "Choose a new password" })).toBeInTheDocument();
    expect(acceptInvite).not.toHaveBeenCalled();
  });
});
