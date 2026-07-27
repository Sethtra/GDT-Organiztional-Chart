import { describe, expect, it } from "vitest";

import { mergeSafeStaffProjection } from "./safeStaffProjection";

describe("mergeSafeStaffProjection", () => {
  it("adds safe occupant labels and relational IDs without copying private data", () => {
    const [node] = mergeSafeStaffProjection(
      [{ id: "node-1", data: { orgType: "individualNode" } }],
      [
        {
          id: "position-1",
          node_id: "node-1",
          title: "Officer",
          department: "Tax",
          office: "Operations",
          position_assignments: [
            {
              id: "assignment-1",
              end_date: null,
              staff: {
                id: "staff-1",
                name: "Sokha",
                name_en: "Sokha",
              },
            },
          ],
        },
      ],
    );

    expect(node?.data).toMatchObject({
      badgeText: "Officer",
      department: "Tax",
      office: "Operations",
      name: "Sokha",
      nameEn: "Sokha",
      positionId: "position-1",
      dbStaffId: "staff-1",
      dbAssignmentId: "assignment-1",
    });
    expect(node?.data).not.toHaveProperty("phone");
    expect(node?.data).not.toHaveProperty("address");
    expect(node?.data).not.toHaveProperty("nationalId");
    expect(node?.data).not.toHaveProperty("history");
  });

  it("preserves recovery data while clearing stale relational references", () => {
    const [node] = mergeSafeStaffProjection(
      [
        {
          id: "node-1",
          data: {
            name: "Recovery copy",
            phone: "legacy-backup-value",
            history: [{ name: "Previous occupant" }],
            dbStaffId: "old-staff",
          },
        },
      ],
      [
        {
          id: "position-1",
          node_id: "node-1",
          title: "Officer",
          department: "Tax",
          office: "Operations",
          position_assignments: [],
        },
      ],
    );

    expect(node?.data).toMatchObject({
      name: "Recovery copy",
      phone: "legacy-backup-value",
      history: [{ name: "Previous occupant" }],
      dbStaffId: null,
      dbAssignmentId: null,
    });
  });
});
