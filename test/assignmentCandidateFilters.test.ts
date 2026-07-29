import { describe, expect, it } from "vitest";

import type { HrStaffDirectoryRecord } from "../src/contracts/hr";
import type { AssignmentCandidate } from "../src/services/positionAssignmentService";
import {
  candidatePayloadHasStaffFilters,
  filterAssignmentCandidates,
  projectHrStaffCandidates,
} from "../src/services/positionAssignmentService";

const departmentId = "00000000-0000-4000-8000-000000000001";
const anotherDepartmentId = "00000000-0000-4000-8000-000000000002";
const officeId = "00000000-0000-4000-8000-000000000003";
const anotherOfficeId = "00000000-0000-4000-8000-000000000004";
const jobTitleId = "00000000-0000-4000-8000-000000000005";

function candidate(
  id: string,
  positionName: string,
  candidateDepartmentId: string,
  candidateOfficeId: string | null,
): AssignmentCandidate {
  return {
    id,
    employeeId: `GDT-${id.slice(-1)}`,
    name: `Officer ${id.slice(-1)}`,
    nameEn: null,
    jobTitle: {
      id: jobTitleId,
      name: positionName,
      nameEn: null,
      rankOrder: 50,
      positionScope: "individual",
    },
    organizationalPlacement: {
      departmentId: candidateDepartmentId,
      departmentName: `Department ${candidateDepartmentId.slice(-1)}`,
      officeId: candidateOfficeId,
      officeName: candidateOfficeId
        ? `Office ${candidateOfficeId.slice(-1)}`
        : null,
    },
    currentPosition: null,
  };
}

const candidates = [
  candidate(
    "00000000-0000-4000-8000-000000000011",
    "មន្ត្រី",
    departmentId,
    officeId,
  ),
  candidate(
    "00000000-0000-4000-8000-000000000012",
    "មន្ត្រី",
    departmentId,
    null,
  ),
  candidate(
    "00000000-0000-4000-8000-000000000013",
    "ប្រធានការិយាល័យ",
    departmentId,
    anotherOfficeId,
  ),
  candidate(
    "00000000-0000-4000-8000-000000000014",
    "មន្ត្រី",
    anotherDepartmentId,
    null,
  ),
];
const firstCandidate = candidates[0]!;

describe("assignment candidate filters", () => {
  it("detects the legacy API shape that omitted staff-table filters", () => {
    expect(
      candidatePayloadHasStaffFilters([
        {
          id: firstCandidate.id,
          employeeId: firstCandidate.employeeId,
          name: firstCandidate.name,
          nameEn: null,
          currentPosition: null,
        },
      ]),
    ).toBe(false);
    expect(candidatePayloadHasStaffFilters(candidates)).toBe(true);
  });

  it("projects the HR fallback to assignment-safe fields", () => {
    const hrRecord: HrStaffDirectoryRecord = {
      ...firstCandidate,
      dateOfBirth: "1990-01-01",
      joinedDate: "2020-01-01",
      retiredDate: null,
      gender: "unspecified",
      status: "active",
      education: "Private education",
      phone: "Private phone",
      address: "Private address",
      otherInformation: "Private notes",
      createdAt: "2026-07-29T00:00:00+00:00",
      updatedAt: "2026-07-29T00:00:00+00:00",
    };

    const projected = projectHrStaffCandidates([hrRecord])[0]!;

    expect(projected).toMatchObject(firstCandidate);
    expect(projected).not.toHaveProperty("phone");
    expect(projected).not.toHaveProperty("address");
    expect(projected).not.toHaveProperty("education");
    expect(projected).not.toHaveProperty("otherInformation");
  });

  it("requires the fixed node position and matches staff-table position", () => {
    expect(
      filterAssignmentCandidates(candidates, {
        positionName: "",
        departmentId: "",
        officeId: "",
        query: "",
      }),
    ).toEqual([]);

    expect(
      filterAssignmentCandidates(candidates, {
        positionName: "មន្ត្រី",
        departmentId: "",
        officeId: "",
        query: "",
      }),
    ).toHaveLength(3);
  });

  it("uses department and optional office only as staff-table filters", () => {
    const departmentMatches = filterAssignmentCandidates(candidates, {
      positionName: "មន្ត្រី",
      departmentId,
      officeId: "",
      query: "",
    });
    expect(departmentMatches.map((entry) => entry.id)).toEqual([
      "00000000-0000-4000-8000-000000000011",
      "00000000-0000-4000-8000-000000000012",
    ]);

    const officeMatches = filterAssignmentCandidates(candidates, {
      positionName: "មន្ត្រី",
      departmentId,
      officeId,
      query: "",
    });
    expect(officeMatches.map((entry) => entry.id)).toEqual([
      "00000000-0000-4000-8000-000000000011",
    ]);
  });
});
