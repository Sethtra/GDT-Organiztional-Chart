import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/services/accessRequestService", () => ({
  submitAccessRequest: vi.fn(async () => undefined),
}));

import RequestAccessPage from "../src/pages/RequestAccessPage";
import { submitAccessRequest } from "../src/services/accessRequestService";

function renderPage() {
  return render(
    <MemoryRouter>
      <RequestAccessPage />
    </MemoryRouter>,
  );
}

describe("RequestAccessPage", () => {
  beforeEach(() => {
    vi.mocked(submitAccessRequest).mockClear();
  });

  it("asks for name, work email, and employee ID instead of a password", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Request access" })).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toBeInTheDocument();
    expect(screen.getByLabelText("Work email")).toBeInTheDocument();
    expect(screen.getByLabelText("Employee ID")).toBeInTheDocument();
    expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/google/i)).not.toBeInTheDocument();
  });

  it("shows field errors and does not submit an incomplete request", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Work email"), "not-an-email");
    await user.click(screen.getByRole("button", { name: /send request/i }));

    expect(screen.getByText("Enter your full name.")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid work email address.")).toBeInTheDocument();
    expect(screen.getByText("Enter your employee ID.")).toBeInTheDocument();
    expect(screen.getByLabelText("Full name")).toHaveAttribute("aria-invalid", "true");
    expect(submitAccessRequest).not.toHaveBeenCalled();
  });

  it("confirms the request and explains that HR will send an invitation", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Full name"), "  Sok Dara ");
    await user.type(screen.getByLabelText("Work email"), "Dara.Sok@Tax.gov.kh");
    await user.type(screen.getByLabelText("Employee ID"), "GDT-001");
    await user.click(screen.getByRole("button", { name: /send request/i }));

    expect(submitAccessRequest).toHaveBeenCalledWith({
      fullName: "Sok Dara",
      email: "dara.sok@tax.gov.kh",
      employeeId: "GDT-001",
    });
    const heading = await screen.findByRole("heading", { name: "Request submitted" });
    expect(heading).toHaveFocus();
    expect(screen.getByText(/once your request is accepted/i)).toBeInTheDocument();
    expect(screen.getByText("dara.sok@tax.gov.kh")).toBeInTheDocument();
  });

  it("keeps the form and shows the reason when submission fails", async () => {
    vi.mocked(submitAccessRequest).mockRejectedValueOnce(
      new Error("Too many access requests right now. Please try again later."),
    );
    const user = userEvent.setup();
    renderPage();

    await user.type(screen.getByLabelText("Full name"), "Sok Dara");
    await user.type(screen.getByLabelText("Work email"), "dara@tax.gov.kh");
    await user.type(screen.getByLabelText("Employee ID"), "GDT-001");
    await user.click(screen.getByRole("button", { name: /send request/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/too many access requests/i);
    expect(screen.getByLabelText("Full name")).toHaveValue("Sok Dara");
  });
});
