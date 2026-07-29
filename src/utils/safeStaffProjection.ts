interface ChartNode {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

interface SafeAssignedStaff {
  id: string;
  name: string | null;
  name_en: string | null;
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
  position_assignments: SafeAssignment[] | null;
}

const hasOwn = (object: Record<string, unknown>, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key) &&
  object[key] !== undefined;

function fillMissing(
  target: Record<string, unknown>,
  key: string,
  value: unknown,
) {
  if (!hasOwn(target, key)) target[key] = value ?? "";
}

function singleStaff(
  staff: SafeAssignment["staff"],
): SafeAssignedStaff | null {
  if (Array.isArray(staff)) return staff[0] ?? null;
  return staff;
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
    if (!position) return node;

    const data = { ...(node.data ?? {}) };
    fillMissing(data, "badgeText", position.title);
    delete data.department;
    delete data.office;
    data.positionId = position.id;

    const activeAssignment = (position.position_assignments ?? []).find(
      (assignment) => assignment.end_date === null,
    );
    const staff = singleStaff(activeAssignment?.staff ?? null);

    if (activeAssignment && staff) {
      data.name = staff.name ?? "";
      data.nameEn = staff.name_en ?? "";
      data.dbStaffId = staff.id;
      data.dbAssignmentId = activeAssignment.id;
    } else {
      data.name = "";
      data.nameEn = "";
      data.dbStaffId = null;
      data.dbAssignmentId = null;
    }

    return { ...node, data };
  });
}
