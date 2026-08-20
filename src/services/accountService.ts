import { z } from "zod";

import { clearAuthStorage, supabase } from "../supabaseClient";

const DeleteAccountResponseSchema = z.object({
  deleted: z.literal(true),
  cleanupWarning: z.string().optional(),
});

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error && typeof error === "object" && "context" in error) {
    const context = (error as { context?: Response }).context;
    if (context && typeof context.clone === "function") {
      try {
        const payload = (await context.clone().json()) as { error?: unknown };
        if (typeof payload.error === "string" && payload.error.trim()) {
          return payload.error;
        }
      } catch {
        // Fall through to the SDK message when the response is not JSON.
      }
    }
  }
  return error instanceof Error
    ? error.message
    : "The account could not be deleted.";
}

export async function deleteCurrentAccount(): Promise<{
  cleanupWarning?: string;
}> {
  const { data, error } = await supabase.functions.invoke("delete-account", {
    body: { confirmation: "DELETE" },
  });
  if (error) throw new Error(await getFunctionErrorMessage(error));

  const parsed = DeleteAccountResponseSchema.safeParse(data);
  if (!parsed.success) {
    throw new Error("The account deletion response was malformed.");
  }

  clearAuthStorage();
  return parsed.data.cleanupWarning
    ? { cleanupWarning: parsed.data.cleanupWarning }
    : {};
}
