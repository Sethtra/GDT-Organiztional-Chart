import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, session: null, loading: false }),
}));

const pendingRequest = {
  id: "00000000-0000-4000-8000-0000000000a1",
  fullName: "Sok Dara",
  email: "dara@tax.gov.kh",
  employeeId: "GDT-001",
  status: "pending" as const,
  reviewNote: null,
  reviewedAt: null,
  createdAt: "2026-10-16T04:00:00+00:00",
  matchedStaff: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "សុខ ដារ៉ា",
    nameEn: "Sok Dara",
    status: "active",
  },
  accountStatus: "none" as const,
};

const unmatchedRequest = {
  ...pendingRequest,
  id: "00000000-0000-4000-8000-0000000000a2",
  fullName: "Unknown Person",
  email: "someone@example.com",
  employeeId: "X-9",
  matchedStaff: null,
};

vi.mock("../src/services/accessRequestService", () => ({
  listAccessRequests: vi.fn(async () => [pendingRequest, unmatchedRequest]),
  approveAccessRequest: vi.fn(async () => undefined),
  rejectAccessRequest: vi.fn(async () => undefined),
}));

import AdminAccessRequestsPage from "../src/pages/AdminAccessRequestsPage";
import {
  approveAccessRequest,
  listAccessRequests,
  rejectAccessRequest,
} from "../src/services/accessRequestService";

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminAccessRequestsPage />
    </MemoryRouter>,
  );
}

describe("AdminAccessRequestsPage", () => {
  beforeEach(() => {
    vi.mocked(approveAccessRequest).mockClear();
    vi.mocked(rejectAccessRequest).mockClear();
  });

  it("lists pending requests with their staff-record match", async () => {
    renderPage();

    expect(await screen.findByText("Sok Dara")).toBeInTheDocument();
    expect(screen.getByText("Matches staff record: សុខ ដារ៉ា")).toBeInTheDocument();
    expect(screen.getByText("No staff record with this employee ID")).toBeInTheDocument();
    expect(listAccessRequests).toHaveBeenCalledWith("pending");
    expect(screen.getByRole("link", { name: /Access requests/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("approves a request, sends the invite, and removes it from the queue", async () => {
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Sok Dara")).closest("li")!;
    await user.click(within(row).getByRole("button", { name: /approve & send invite/i }));

    expect(approveAccessRequest).toHaveBeenCalledWith(pendingRequest.id);
    expect(
      await screen.findByText("Approved. An invitation was sent to dara@tax.gov.kh."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Sok Dara")).not.toBeInTheDocument();
  });

  it("asks for an optional reason before rejecting", async () => {
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Unknown Person")).closest("li")!;
    await user.click(within(row).getByRole("button", { name: "Reject" }));
    expect(rejectAccessRequest).not.toHaveBeenCalled();

    await user.type(within(row).getByLabelText(/reason/i), "Not GDT staff");
    await user.click(within(row).getByRole("button", { name: /confirm rejection/i }));

    expect(rejectAccessRequest).toHaveBeenCalledWith(unmatchedRequest.id, "Not GDT staff");
    expect(
      await screen.findByText("Request from Unknown Person was rejected."),
    ).toBeInTheDocument();
  });

  it("shows the server's reason when an approval fails", async () => {
    vi.mocked(approveAccessRequest).mockRejectedValueOnce(
      new Error("An active account already uses this email."),
    );
    const user = userEvent.setup();
    renderPage();

    const row = (await screen.findByText("Sok Dara")).closest("li")!;
    await user.click(within(row).getByRole("button", { name: /approve & send invite/i }));

    expect(
      await screen.findByText("An active account already uses this email."),
    ).toBeInTheDocument();
    expect(screen.getByText("Sok Dara")).toBeInTheDocument();
  });
});
