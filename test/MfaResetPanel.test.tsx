import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("../src/services/mfaService", () => ({
  resetUserMfa: vi.fn(async () => undefined),
}));

import MfaResetPanel from "../src/components/admin/MfaResetPanel";
import { resetUserMfa } from "../src/services/mfaService";

describe("MfaResetPanel", () => {
  it("requires an identity confirmation before resetting", async () => {
    const user = userEvent.setup();
    render(<MfaResetPanel />);

    await user.type(screen.getByLabelText("Account email"), "Dara@Tax.gov.kh");
    await user.click(screen.getByRole("button", { name: "Reset…" }));

    expect(resetUserMfa).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/confirm the officer's identity first/i);

    await user.click(screen.getByRole("button", { name: /identity confirmed — reset/i }));

    expect(resetUserMfa).toHaveBeenCalledWith("Dara@Tax.gov.kh");
    expect(
      await screen.findByText(/two-step sign-in was reset for dara@tax\.gov\.kh/i),
    ).toBeInTheDocument();
  });

  it("validates the email before asking for confirmation", async () => {
    const user = userEvent.setup();
    render(<MfaResetPanel />);

    await user.type(screen.getByLabelText("Account email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "Reset…" }));

    expect(screen.getByText("Enter the officer's account email address.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /identity confirmed/i })).not.toBeInTheDocument();
  });
});
