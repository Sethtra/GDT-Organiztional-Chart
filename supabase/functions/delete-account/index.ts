import { createClient } from "npm:@supabase/supabase-js@2.110.0";
import { z } from "npm:zod@4.4.3";

const RequestSchema = z.object({
  confirmation: z.literal("DELETE"),
}).strict();

const PreparationSchema = z.object({
  email: z.string().email(),
  thumbnailPaths: z.array(z.string()),
  avatarUrl: z.string().url().nullable(),
  preserveAvatar: z.boolean(),
});

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

function profileObjectPath(url: string | null): string | null {
  if (!url) return null;
  const marker = "/storage/v1/object/public/Profile/";
  const markerIndex = url.indexOf(marker);
  if (markerIndex < 0) return null;
  const path = url.slice(markerIndex + marker.length).split("?")[0];
  try {
    return decodeURIComponent(path);
  } catch {
    return null;
  }
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
    return json(request, 400, { error: "Type DELETE exactly to confirm account deletion." });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authorization = request.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !serviceRoleKey || !authorization) {
    return json(request, 401, { error: "A verified account session is required." });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) {
    return json(request, 401, { error: "The account session could not be verified." });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: preparationData, error: preparationError } = await admin.rpc(
    "prepare_account_deletion",
    { target_user_id: userData.user.id },
  );
  if (preparationError) {
    return json(request, 409, { error: preparationError.message });
  }

  const preparation = PreparationSchema.safeParse(preparationData);
  if (!preparation.success) {
    return json(request, 500, { error: "Account deletion preparation returned invalid data." });
  }

  const { error: deletionError } = await admin.auth.admin.deleteUser(
    userData.user.id,
    false,
  );
  if (deletionError) {
    return json(request, 500, { error: deletionError.message });
  }

  const cleanupErrors: string[] = [];
  if (preparation.data.thumbnailPaths.length > 0) {
    const { error } = await admin.storage
      .from("thumbnails")
      .remove(preparation.data.thumbnailPaths);
    if (error) cleanupErrors.push("chart thumbnails");
  }

  const avatarPath = preparation.data.preserveAvatar
    ? null
    : profileObjectPath(preparation.data.avatarUrl);
  if (avatarPath) {
    const { error } = await admin.storage.from("Profile").remove([avatarPath]);
    if (error) cleanupErrors.push("account profile image");
  }

  const cleanupWarning = cleanupErrors.length
    ? `The account was deleted, but cleanup is still required for: ${cleanupErrors.join(", ")}.`
    : undefined;
  return json(request, 200, { deleted: true, cleanupWarning });
});
