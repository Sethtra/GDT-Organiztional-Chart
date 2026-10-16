import { FunctionsHttpError } from "@supabase/supabase-js";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc, invoke } = vi.hoisted(() => ({ rpc: vi.fn(), invoke: vi.fn() }));

vi.mock("../src/supabaseClient", () => ({
  supabase: { rpc, functions: { invoke } },
}));

import {
  approveAccessRequest,
  listAccessRequests,
  rejectAccessRequest,
  submitAccessRequest,
} from "../src/services/accessRequestService";

const pendingRequest = {
  id: "00000000-0000-4000-8000-0000000000a1",
  fullName: "Sok Dara",
  email: "dara@tax.gov.kh",
  employeeId: "GDT-001",
  status: "pending",
  reviewNote: null,
  reviewedAt: null,
  createdAt: "2026-10-16T04:00:00+00:00",
  matchedStaff: {
    id: "00000000-0000-4000-8000-000000000001",
    name: "សុខ ដារ៉ា",
    nameEn: "Sok Dara",
    status: "active",
  },
  accountStatus: "none",
};

describe("accessRequestService", () => {
  beforeEach(() => {
    rpc.mockReset();
    invoke.mockReset();
  });

  it("submits normalized details to the public RPC", async () => {
    rpc.mockResolvedValue({ data: null, error: null });

    await submitAccessRequest({
      fullName: " Sok Dara ",
      email: "Dara@Tax.gov.kh",
      employeeId: " GDT-001 ",
    });

    expect(rpc).toHaveBeenCalledWith("submit_access_request", {
      full_name_value: "Sok Dara",
      email_value: "dara@tax.gov.kh",
      employee_id_value: "GDT-001",
    });
  });

  it("passes visitor-facing database messages through and hides others", async () => {
    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "54000", message: "Too many access requests right now. Please try again later." },
    });
    await expect(
      submitAccessRequest({ fullName: "A", email: "a@tax.gov.kh", employeeId: "1" }),
    ).rejects.toThrow("Too many access requests");

    rpc.mockResolvedValueOnce({
      data: null,
      error: { code: "XX000", message: "internal relation detail" },
    });
    await expect(
      submitAccessRequest({ fullName: "A", email: "a@tax.gov.kh", employeeId: "1" }),
    ).rejects.toThrow("Your request could not be sent");
  });

  it("parses the HR review list and rejects malformed responses", async () => {
    rpc.mockResolvedValueOnce({ data: [pendingRequest], error: null });
    await expect(listAccessRequests("pending")).resolves.toEqual([pendingRequest]);
    expect(rpc).toHaveBeenCalledWith("list_access_requests", { status_filter: "pending" });

    rpc.mockResolvedValueOnce({ data: [{ ...pendingRequest, accountStatus: "unknown" }], error: null });
    await expect(listAccessRequests("pending")).rejects.toThrow("malformed");
  });

  it("sends an empty rejection note as null", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await rejectAccessRequest(pendingRequest.id, "   ");
    expect(rpc).toHaveBeenCalledWith("reject_access_request", {
      target_request_id: pendingRequest.id,
      note_value: null,
    });
  });

  it("approves through the Edge Function and surfaces its error message", async () => {
    invoke.mockResolvedValueOnce({ data: { approved: true }, error: null });
    await approveAccessRequest(pendingRequest.id);
    expect(invoke).toHaveBeenCalledWith("approve-access-request", {
      body: { requestId: pendingRequest.id },
    });

    const response = new Response(
      JSON.stringify({ error: "An active account already uses this email." }),
      { status: 409 },
    );
    invoke.mockResolvedValueOnce({ data: null, error: new FunctionsHttpError(response) });
    await expect(approveAccessRequest(pendingRequest.id)).rejects.toThrow(
      "An active account already uses this email.",
    );
  });
});
