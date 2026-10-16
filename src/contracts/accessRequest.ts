import { z } from "zod";

import { DatabaseTimestampSchema, UuidSchema } from "./hr";

// ─── Visitor submission ──────────────────────────────────────────────────────

export const AccessRequestInputSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Enter your full name.")
    .max(200, "Keep your name under 200 characters."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Enter your work email address.")
    .max(320, "This email address is too long.")
    .email("Enter a valid work email address."),
  employeeId: z
    .string()
    .trim()
    .min(1, "Enter your employee ID.")
    .max(64, "Keep the employee ID under 64 characters."),
});

export type AccessRequestInput = z.infer<typeof AccessRequestInputSchema>;
export type AccessRequestField = keyof AccessRequestInput;

// ─── HR review ───────────────────────────────────────────────────────────────

export const AccessRequestStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type AccessRequestStatus = z.infer<typeof AccessRequestStatusSchema>;

export const AccessRequestSchema = z.object({
  id: UuidSchema,
  fullName: z.string().min(1).max(200),
  email: z.string().max(320),
  employeeId: z.string().min(1).max(64),
  status: AccessRequestStatusSchema,
  reviewNote: z.string().max(500).nullable(),
  reviewedAt: DatabaseTimestampSchema.nullable(),
  createdAt: DatabaseTimestampSchema,
  matchedStaff: z
    .object({
      id: UuidSchema,
      name: z.string(),
      nameEn: z.string().nullable(),
      status: z.string(),
    })
    .nullable(),
  accountStatus: z.enum(["none", "invited", "active"]),
});

export type AccessRequest = z.infer<typeof AccessRequestSchema>;

const AccessRequestListSchema = z.array(AccessRequestSchema);

export function parseAccessRequests(raw: unknown): AccessRequest[] {
  const result = AccessRequestListSchema.safeParse(raw);
  if (!result.success) {
    throw new Error("Access request response was malformed.");
  }
  return result.data;
}
