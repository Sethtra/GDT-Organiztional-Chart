import { z } from "zod";

import { UuidSchema } from "./hr";
import type { BadgeTone } from "../components/admin/dashboard/dashboardPreviewData";

// ─── Event types ─────────────────────────────────────────────────────────────

export const ActivityEventTypeSchema = z.enum([
  "officer_created",
  "profile_updated",
  "promoted",
  "transferred",
  "assigned",
  "position_vacated",
  "skills_updated",
]);

export type ActivityEventType = z.infer<typeof ActivityEventTypeSchema>;

// ─── Event record ─────────────────────────────────────────────────────────────

export const ActivityEventSchema = z.object({
  id: UuidSchema,
  staffId: UuidSchema.nullable(),
  staffName: z.string().min(1).max(200),
  staffNameEn: z.string().max(200).nullable(),
  photoUrl: z.string().max(2048).nullable(),
  eventType: ActivityEventTypeSchema,
  description: z.string().min(1).max(500),
  departmentName: z.string().max(300).nullable(),
  officeName: z.string().max(300).nullable(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  occurredAt: z.string(),
});

export type ActivityEvent = z.infer<typeof ActivityEventSchema>;

const ActivityEventListSchema = z.array(ActivityEventSchema);

// ─── Display helpers ──────────────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
  officer_created:  "New officer",
  profile_updated:  "Profile updated",
  promoted:         "Promotion",
  transferred:      "Transfer",
  assigned:         "Assignment",
  position_vacated: "Position vacated",
  skills_updated:   "Skills updated",
};

export const EVENT_TYPE_TONES: Record<ActivityEventType, BadgeTone> = {
  officer_created:  "success",
  profile_updated:  "info",
  promoted:         "success",
  transferred:      "warning",
  assigned:         "info",
  position_vacated: "neutral",
  skills_updated:   "info",
};

/** Derive two-letter initials from a Khmer or English name. */
export function getInitials(name: string, nameEn: string | null): string {
  const source = nameEn ?? name;
  const words = source.trim().split(/\s+/);
  if (words.length >= 2) {
    return `${words[0]![0]}${words[words.length - 1]![0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

/** Parse and return the validated list, or throw on schema mismatch. */
export function parseActivityEvents(raw: unknown): ActivityEvent[] {
  const result = ActivityEventListSchema.safeParse(raw);
  if (!result.success) {
    throw new Error("Activity log response was malformed.");
  }
  return result.data;
}
