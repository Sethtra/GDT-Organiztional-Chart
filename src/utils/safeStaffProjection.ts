interface ChartNode {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}
interface SafeJobTitle {
  id: string;
  name: string;
  name_en: string | null;
}

interface SafeAssignedStaff {
  id: string;
  name: string | null;
  name_en: string | null;
  photo_url: string | null;
  job_titles?: SafeJobTitle | SafeJobTitle[] | null;
}

interface SafeAssignment {
  id: string;
  end_date: string | null;
  staff: SafeAssignedStaff | SafeAssignedStaff[] | null;
}

export interface SafePositionProjection {
  id: string;
  node_id: string;
  title: string | null;
  department: string | null;
  office: string | null;
  job_titles?: SafeJobTitle | SafeJobTitle[] | null;
  position_assignments: SafeAssignment[] | null;
}

function singleStaff(
  staff: SafeAssignment["staff"],
): SafeAssignedStaff | null {
  if (Array.isArray(staff)) return staff[0] ?? null;
  return staff;
}

function singleJobTitle(
  title: SafeJobTitle | SafeJobTitle[] | null | undefined,
): SafeJobTitle | null {
  if (Array.isArray(title)) return title[0] ?? null;
  return title ?? null;
}

/**
 * Adds only position identity and safe occupant display values to chart nodes.
 *
 * Personal details and assignment history deliberately remain outside chart
 * JSON. They are loaded on demand through the permission-aware profile RPC.
 */
export function mergeSafeStaffProjection(
  originalNodes: ChartNode[],
  positions: SafePositionProjection[],
): ChartNode[] {
  if (originalNodes.length === 0 || positions.length === 0) {
    return originalNodes;
  }

  const positionByNodeId = new Map(
    positions.map((position) => [position.node_id, position]),
  );

  return originalNodes.map((node) => {
    const position = positionByNodeId.get(node.id);
    // A legacy migration accidentally created position rows for every named
    // organizational unit. Those rows must never replace chart-authored org
    // labels; relational occupant data belongs only to person nodes.
    if (!position || node.data?.orgType !== "individualNode") return node;

    const data = { ...(node.data ?? {}) };
    delete data.department;
    delete data.office;
    data.positionId = position.id;

    const activeAssignment = (position.position_assignments ?? []).find(
      (assignment) => assignment.end_date === null,
    );
    const staff = singleStaff(activeAssignment?.staff ?? null);
    const positionTitle = singleJobTitle(position.job_titles);
    const staffTitle = singleJobTitle(staff?.job_titles);

    const resolvedTitle =
      positionTitle?.name ||
      position.title ||
      staffTitle?.name ||
      (data.position as string | undefined) ||
      (data.badgeText as string | undefined) ||
      "";

    if (resolvedTitle) {
      data.badgeText = resolvedTitle;
      data.position = resolvedTitle;
    }

    if (activeAssignment && staff) {
      data.name = staff.name ?? "";
      data.nameEn = staff.name_en ?? "";
      data.photoUrl = staff.photo_url ?? "";
      data.dbStaffId = staff.id;
      data.dbAssignmentId = activeAssignment.id;
    } else {
      data.name = "";
      data.nameEn = "";
      data.photoUrl = "";
      data.dbStaffId = null;
      data.dbAssignmentId = null;
    }

    return { ...node, data };
  });
}
