import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { z } from "npm:zod@4.4.3";

// Removes every two-step sign-in factor from one account so an officer who
// lost their authenticator app can set it up again at their next sign-in.
// Only HR administrators (themselves signed in with two-step sign-in) may call it.

const RequestSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
}).strict();

const PAGE_SIZE = 1000;

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "*";
  const configuredOrigins = (Deno.env.get("GDT_APP_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  const allowedOrigin =
    configuredOrigins.length === 0 || configuredOrigins.includes(origin)
      ? origin
      : configuredOrigins[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
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
    return json(request, 400, { error: "Enter the officer's account email address." });
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
  const { data: callerData, error: callerError } = await userClient.auth.getUser();
  if (callerError || !callerData.user) {
    return json(request, 401, { error: "The account session could not be verified." });
  }

  // Runs through the API, so the caller's own two-step sign-in is enforced too.
  const { data: isHrAdmin, error: roleError } = await userClient.rpc("is_hr_admin");
  if (roleError || isHrAdmin !== true) {
    return json(request, 403, { error: "HR administrator access required." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let targetUserId: string | null = null;
  for (let page = 1; targetUserId === null; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) {
      return json(request, 500, { error: "Accounts could not be searched. Try again shortly." });
    }
    targetUserId =
      data.users.find((account) => account.email?.toLowerCase() === parsedBody.data.email)?.id ??
      null;
    if (data.users.length < PAGE_SIZE) break;
  }
  if (!targetUserId) {
    return json(request, 404, { error: "No account uses this email address." });
  }

  const { data: factorData, error: factorError } = await admin.auth.admin.mfa.listFactors({
    userId: targetUserId,
  });
  if (factorError) {
    return json(request, 500, { error: "Two-step sign-in settings could not be loaded." });
  }

  for (const factor of factorData.factors) {
    const { error } = await admin.auth.admin.mfa.deleteFactor({
      id: factor.id,
      userId: targetUserId,
    });
    if (error) {
      return json(request, 500, { error: "Two-step sign-in could not be fully reset. Try again." });
    }
  }

  return json(request, 200, { reset: true, removedFactors: factorData.factors.length });
});
