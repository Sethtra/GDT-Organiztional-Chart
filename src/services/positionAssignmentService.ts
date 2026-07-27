import { z } from "zod";

import { PositionSummarySchema, UuidSchema } from "../contracts/hr";
import { supabase } from "../supabaseClient";

const CandidateSchema = z.object({
  id: UuidSchema,
  employeeId: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().nullable(),
  currentPosition: PositionSummarySchema.nullable(),
});

const OccupantSchema = z.object({
  assignmentId: UuidSchema,
  staffId: UuidSchema,
  employeeId: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().nullable(),
  joinedDate: z.string().nullable(),
});

const HistoryEntrySchema = OccupantSchema.extend({
  leftDate: z.string(),
  reason: z.string().nullable(),
  notes: z.string().nullable(),
});

const AssignmentSummarySchema = z.object({
  positionId: UuidSchema,
  jobTitleId: UuidSchema.nullable(),
  occupant: OccupantSchema.nullable(),
  history: z.array(HistoryEntrySchema),
});

export type AssignmentCandidate = z.infer<typeof CandidateSchema>;
export type AssignmentSummary = z.infer<typeof AssignmentSummarySchema>;

export interface ChartPositionNode {
  id: string;
  data?: {
    position?: unknown;
    badgeText?: unknown;
    department?: unknown;
    office?: unknown;
  };
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function ensurePositionForNode(
  chartId: string,
  node: ChartPositionNode,
): Promise<string> {
  const { data, error } = await supabase.rpc("ensure_chart_position", {
    target_chart_id: chartId,
    target_node_id: node.id,
    position_title: stringValue(node.data?.position || node.data?.badgeText),
    department_name: stringValue(node.data?.department),
    office_name: stringValue(node.data?.office),
  });
  if (error) throw error;
  return UuidSchema.parse(data);
}

export async function loadAssignmentCandidates(
  positionId: string,
): Promise<AssignmentCandidate[]> {
  const { data, error } = await supabase.rpc("get_assignment_candidates", {
    target_position_id: positionId,
  });
  if (error) throw error;
  return z.array(CandidateSchema).parse(data ?? []);
}

export async function loadAssignmentSummary(
  positionId: string,
): Promise<AssignmentSummary> {
  const { data, error } = await supabase.rpc(
    "get_position_assignment_summary",
    { target_position_id: positionId },
  );
  if (error) throw error;
  return AssignmentSummarySchema.parse(data);
}

export async function assignCandidate(
  candidate: AssignmentCandidate,
  targetPositionId: string,
  effectiveDate: string,
  notes: string | null,
): Promise<void> {
  if (candidate.currentPosition?.positionId === targetPositionId) return;

  if (candidate.currentPosition) {
    const { error } = await supabase.rpc("transfer_staff_position", {
      target_staff_id: candidate.id,
      target_position_id: targetPositionId,
      effective_on: effectiveDate,
      transfer_reason: "transferred",
      transfer_notes: notes,
    });
    if (error) throw error;
    return;
  }

  const { error } = await supabase.rpc("assign_staff_to_position", {
    target_staff_id: candidate.id,
    target_position_id: targetPositionId,
    joined_on: effectiveDate,
    assignment_reason: "assigned",
    assignment_notes: notes,
  });
  if (error) throw error;
}

export async function vacatePosition(
  positionId: string,
  leftDate: string,
  reason: "resigned" | "retired" | "suspended" | "vacated" | "corrected",
  notes: string | null,
): Promise<void> {
  const { error } = await supabase.rpc("vacate_staff_position", {
    target_position_id: positionId,
    left_on: leftDate,
    departure_reason: reason,
    departure_notes: notes,
  });
  if (error) throw error;
}
