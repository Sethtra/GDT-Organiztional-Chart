import { FunctionsHttpError } from "@supabase/supabase-js";

import {
  AccessRequestInputSchema,
  parseAccessRequests,
  type AccessRequest,
  type AccessRequestInput,
  type AccessRequestStatus,
} from "../contracts/accessRequest";
import { supabase } from "../supabaseClient";

const SUBMIT_FALLBACK_ERROR =
  "Your request could not be sent. Check your connection and try again.";

/** Public: queue a request for an account. Throws a user-facing message. */
export async function submitAccessRequest(input: AccessRequestInput): Promise<void> {
  const validated = AccessRequestInputSchema.parse(input);
  const { error } = await supabase.rpc("submit_access_request", {
    full_name_value: validated.fullName,
    email_value: validated.email,
    employee_id_value: validated.employeeId,
  });
  if (error) {
    // Validation and rate-limit messages from the database are written for visitors.
    const visitorFacing = error.code === "22023" || error.code === "54000";
    throw new Error(visitorFacing ? error.message : SUBMIT_FALLBACK_ERROR);
  }
}

export async function listAccessRequests(
  status: AccessRequestStatus,
): Promise<AccessRequest[]> {
  const { data, error } = await supabase.rpc("list_access_requests", {
    status_filter: status,
  });
  if (error) throw new Error(error.message);
  return parseAccessRequests(data ?? []);
}

export async function rejectAccessRequest(
  requestId: string,
  note: string,
): Promise<void> {
  const { error } = await supabase.rpc("reject_access_request", {
    target_request_id: requestId,
    note_value: note.trim() || null,
  });
  if (error) throw new Error(error.message);
}

/**
 * Approves a pending request, or re-sends the invitation for an approved one,
 * through the approve-access-request Edge Function.
 */
export async function approveAccessRequest(requestId: string): Promise<void> {
  const { error } = await supabase.functions.invoke("approve-access-request", {
    body: { requestId },
  });
  if (!error) return;

  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null);
    if (body && typeof body.error === "string") throw new Error(body.error);
  }
  throw new Error("The invitation could not be sent. Try again shortly.");
}
