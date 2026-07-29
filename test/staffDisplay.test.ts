import { describe, expect, it } from "vitest";

import type { StaffDirectorySummary } from "../src/contracts/hr";
import {
  getDisplayedStaffPlacement,
  getStaffLocationLabel,
  getStaffPositionTitle,
} from "../src/utils/staffDisplay";

const departmentId = "00000000-0000-4000-8000-000000000001";
const officeId = "00000000-0000-4000-8000-000000000002";
const chartId = "00000000-0000-4000-8000-000000000003";
const positionId = "00000000-0000-4000-8000-000000000004";
const jobTitleId = "00000000-0000-4000-8000-000000000005";

const staff = {
  organizationalPlacement: {
    departmentId,
    departmentName: "Finance and Personnel",
    officeId: null,
    officeName: null,
  },
  currentPosition: {
    positionId,
    chartId,
    nodeId: "office-node",
    title: "Legacy chart title",
    departmentId,
    departmentName: "Finance and Personnel",
    officeId,
    officeName: "Legacy chart office",
  },
  jobTitle: {
    id: jobTitleId,
    name: "Department Director",
    nameEn: null,
    rankOrder: 10,
    positionScope: "department",
  },
} satisfies Pick<
  StaffDirectorySummary,
  "currentPosition" | "jobTitle" | "organizationalPlacement"
>;

describe("staff display placement", () => {
  it("does not show a chart office when HR selected no office", () => {
    expect(getDisplayedStaffPlacement(staff)).toBe(
      staff.organizationalPlacement,
    );
    expect(getStaffLocationLabel(staff)).toBe("Finance and Personnel");
  });

  it("shows the HR-selected position before a legacy chart title", () => {
    expect(getStaffPositionTitle(staff)).toBe("Department Director");
  });

  it("uses chart placement only for a legacy record with no HR placement", () => {
    expect(
      getStaffLocationLabel({
        ...staff,
        organizationalPlacement: null,
      }),
    ).toBe("Finance and Personnel → Legacy chart office");
  });
});
