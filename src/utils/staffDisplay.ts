import type { StaffDirectorySummary } from "../contracts/hr";

type StaffDisplaySource = Pick<
  StaffDirectorySummary,
  "currentPosition" | "jobTitle" | "organizationalPlacement"
>;

export function getDisplayedStaffPlacement(staff: StaffDisplaySource) {
  return staff.organizationalPlacement ?? staff.currentPosition ?? null;
}

export function getStaffLocationLabel(staff: StaffDisplaySource): string {
  const placement = getDisplayedStaffPlacement(staff);
  if (!placement) return "Unassigned department";

  return (
    [placement.departmentName, placement.officeName]
      .filter(Boolean)
      .join(" → ") || "Unassigned department"
  );
}

export function getStaffPositionTitle(staff: StaffDisplaySource): string {
  return (
    staff.jobTitle?.name ??
    staff.currentPosition?.title ??
    "No position assigned"
  );
}
