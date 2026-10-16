import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { z } from "npm:zod@4.4.3";

// Approves a pending access request (or re-sends the invitation for an
// approved one whose account was never activated). Only HR administrators
// may call it; the service role is used solely to send the Supabase invite.

const RequestSchema = z.object({
  requestId: z.string().uuid(),
}).strict();

const AccessRequestRowSchema = z.object({
  id: z.string().uuid(),
  full_name: z.string(),
  email: z.string().email(),
  status: z.enum(["pending", "approved", "rejected"]),
});

function allowedOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? "*";
  const configuredOrigins = (Deno.env.get("GDT_APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configuredOrigins.length === 0 || configuredOrigins.includes(origin)
    ? origin
    : configuredOrigins[0];
}

function corsHeaders(request: Request): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(request),
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(request: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(request), "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(request) });
  }
  if (request.method !== "POST") {
    return json(request, 405, { error: "Method not allowed." });
  }

  const parsedBody = RequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) {
    return json(request, 400, { error: "A valid access request ID is required." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json(request, 401, { error: "A verified HR administrator session is required." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json(request, 401, { error: "The account session could not be verified." });
  }

  const { data: isHrAdmin, error: roleError } = await userClient.rpc("is_hr_admin");
  if (roleError || isHrAdmin !== true) {
    return json(request, 403, { error: "HR administrator access required." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: rowData, error: rowError } = await admin
    .from("access_requests")
    .select("id, full_name, email, status")
    .eq("id", parsedBody.data.requestId)
    .maybeSingle();
  if (rowError) {
    return json(request, 500, { error: "The access request could not be loaded." });
  }
  const row = AccessRequestRowSchema.safeParse(rowData);
  if (!row.success) {
    return json(request, 404, { error: "This access request no longer exists." });
  }
  if (row.data.status === "rejected") {
    return json(request, 409, { error: "This request was rejected and cannot be approved." });
  }

  // The invitation email's link is defined by the Supabase "Invite user"
  // template (token_hash flow); redirectTo is kept for templates that use it.
  const { data: inviteData, error: inviteError } =
    await admin.auth.admin.inviteUserByEmail(row.data.email, {
      data: { display_name: row.data.full_name, full_name: row.data.full_name },
      redirectTo: `${allowedOrigin(request)}/reset-password`,
    });
  if (inviteError) {
    const alreadyActive = /already been registered|already registered|already exists/i
      .test(inviteError.message);
    return json(request, alreadyActive ? 409 : 502, {
      error: alreadyActive
        ? "An active account already uses this email. Ask the officer to sign in or reset their password."
        : "The invitation email could not be sent. Try again shortly.",
    });
  }

  if (row.data.status === "pending") {
    const { data: updated, error: updateError } = await admin
      .from("access_requests")
      .update({
        status: "approved",
        reviewed_by: userData.user.id,
        reviewed_at: new Date().toISOString(),
        invited_user_id: inviteData.user?.id ?? null,
      })
      .eq("id", row.data.id)
      .eq("status", "pending")
      .select("id");
    if (updateError || !updated?.length) {
      return json(request, 500, {
        error: "The invitation was sent, but the request could not be marked approved. Refresh and check the request.",
      });
    }
  }

  return json(request, 200, {
    approved: true,
    resent: row.data.status === "approved",
  });
});
