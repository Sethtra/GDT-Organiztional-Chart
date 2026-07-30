import { z } from "zod";

import {
  LegacyEmployeeIdSchema,
  PositionSummarySchema,
  StaffJobTitleSchema,
  StaffOrganizationalPlacementSchema,
  UuidSchema,
} from "../contracts/hr";
import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { supabase } from "../supabaseClient";
import { listHrStaff } from "./staffService";

const CandidateSchema = z.object({
  id: UuidSchema,
  employeeId: LegacyEmployeeIdSchema,
  name: z.string().min(1),
  nameEn: z.string().nullable(),
  jobTitle: StaffJobTitleSchema.nullable().default(null),
  organizationalPlacement:
    StaffOrganizationalPlacementSchema.nullable().default(null),
  currentPosition: PositionSummarySchema.nullable(),
});

const OccupantSchema = z.object({
  assignmentId: UuidSchema,
  staffId: UuidSchema,
  employeeId: LegacyEmployeeIdSchema,
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

export interface AssignmentCandidateFilters {
  jobTitleId: string;
  departmentId: string;
  officeId: string;
  query: string;
}

export interface ChartPositionNode {
  id: string;
  data?: {
    position?: unknown;
    badgeText?: unknown;
    department?: unknown;
    office?: unknown;
    jobTitleId?: unknown;
  };
}

function hasOwn(value: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(value, key);
}

export function candidatePayloadHasStaffFilters(data: unknown): boolean {
  if (!Array.isArray(data) || data.length === 0) return true;
  return data.every(
    (candidate) =>
      typeof candidate === "object" &&
      candidate !== null &&
      hasOwn(candidate, "jobTitle") &&
      hasOwn(candidate, "organizationalPlacement"),
  );
}

export function projectHrStaffCandidates(
  staff: HrStaffDirectoryRecord[],
): AssignmentCandidate[] {
  return z.array(CandidateSchema).parse(
    staff
      .filter((record) => record.status === "active")
      .map((record) => ({
        id: record.id,
        employeeId: record.employeeId,
        name: record.name,
        nameEn: record.nameEn,
        jobTitle: record.jobTitle,
        organizationalPlacement: record.organizationalPlacement,
        currentPosition: record.currentPosition,
      })),
  );
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function filterAssignmentCandidates(
  candidates: AssignmentCandidate[],
  filters: AssignmentCandidateFilters,
): AssignmentCandidate[] {
  const jobTitleId = filters.jobTitleId.trim();
  if (!jobTitleId) return [];

  const query = filters.query.trim().toLocaleLowerCase();
  return candidates.filter((candidate) => {
    if (candidate.jobTitle?.id !== jobTitleId) {
      return false;
    }
    if (
      filters.departmentId &&
      candidate.organizationalPlacement?.departmentId !==
        filters.departmentId
    ) {
      return false;
    }
    if (
      filters.officeId &&
      candidate.organizationalPlacement?.officeId !== filters.officeId
    ) {
      return false;
    }
    if (!query) return true;

    return [candidate.name, candidate.nameEn, candidate.employeeId].some(
      (value) => value?.toLocaleLowerCase().includes(query),
    );
  });
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

  const candidates = z.array(CandidateSchema).parse(data ?? []);
  if (candidatePayloadHasStaffFilters(data)) return candidates;

  // Compatibility for databases still on assignment-candidate API v18.
  // HR administrators can use the existing HR-only directory RPC until the
  // safe chart-editor candidate API migration (v19) is applied. Only the
  // assignment-safe fields above leave this service.
  const hrStaff = await listHrStaff(false);
  return projectHrStaffCandidates(hrStaff);
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
