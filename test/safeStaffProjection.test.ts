import { describe, expect, it } from "vitest";

import { mergeSafeStaffProjection } from "../src/utils/safeStaffProjection";

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
                photo_url: null,
              },
            },
          ],
        },
      ],
    );

    expect(node?.data).toMatchObject({
      badgeText: "Officer",
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
    expect(node?.data).not.toHaveProperty("department");
    expect(node?.data).not.toHaveProperty("office");
  });

  it("preserves recovery-only data while clearing a stale node occupant", () => {
    const [node] = mergeSafeStaffProjection(
      [
        {
          id: "node-1",
          data: {
            orgType: "individualNode",
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
      name: "",
      nameEn: "",
      phone: "legacy-backup-value",
      history: [{ name: "Previous occupant" }],
      dbStaffId: null,
      dbAssignmentId: null,
    });
  });

  it("never overwrites an organizational node with a legacy position row", () => {
    const originalNode = {
      id: "org-node-1",
      data: {
        orgType: "orgNode",
        name: "កំ.រដ្ឋបាល",
        badgeText: "Edited label",
      },
    };

    const [node] = mergeSafeStaffProjection(
      [originalNode],
      [
        {
          id: "legacy-position-1",
          node_id: "org-node-1",
          title: "លេខ:",
          department: null,
          office: null,
          position_assignments: [],
        },
      ],
    );

    expect(node).toEqual(originalNode);
  });

  it("automatically updates stale position label with latest job_title name", () => {
    const [node] = mergeSafeStaffProjection(
      [
        {
          id: "node-1",
          data: {
            orgType: "individualNode",
            badgeText: "មន្ត្រី",
            position: "មន្ត្រី",
            name: "Sokha",
          },
        },
      ],
      [
        {
          id: "position-1",
          node_id: "node-1",
          title: "មន្ត្រី",
          department: "Tax",
          office: "Operations",
          job_titles: {
            id: "title-2",
            name: "មន្ត្រីកម្មសិក្សា",
            name_en: "Trainee Officer",
          },
          position_assignments: [
            {
              id: "assignment-1",
              end_date: null,
              staff: {
                id: "staff-1",
                name: "Sokha",
                name_en: "Sokha",
                photo_url: null,
              },
            },
          ],
        },
      ],
    );

    expect(node?.data).toMatchObject({
      badgeText: "មន្ត្រីកម្មសិក្សា",
      position: "មន្ត្រីកម្មសិក្សា",
      name: "Sokha",
    });
  });
});
