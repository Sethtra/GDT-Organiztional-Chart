import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../src/supabaseClient", () => ({
  supabase: { rpc },
}));

import {
  evaluateStaffJobFit,
  setJobTitleRequirement,
} from "../src/services/jobArchitectureService";

const staffId = "00000000-0000-4000-8000-000000000001";
const jobTitleId = "00000000-0000-4000-8000-000000000002";
const skillId = "00000000-0000-4000-8000-000000000003";

describe("jobArchitectureService scoped RPC contract", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("sends the explicit global scope when saving a requirement", async () => {
    await setJobTitleRequirement({
      jobTitleId,
      skillId,
      minimumProficiency: 3,
    });

    expect(rpc).toHaveBeenCalledWith("set_job_title_skill_requirement", {
      target_job_title_id: jobTitleId,
      target_skill_id: skillId,
      minimum_proficiency_value: 3,
      is_required_value: true,
      target_org_unit_id: null,
    });
  });

  it("sends the explicit global scope when evaluating fit", async () => {
    rpc.mockResolvedValue({
      data: {
        staffId,
        jobTitleId,
        orgUnitId: null,
        isFit: true,
        requirements: [],
      },
      error: null,
    });

    await expect(evaluateStaffJobFit(staffId, jobTitleId)).resolves.toMatchObject({
      staffId,
      jobTitleId,
      isFit: true,
    });
    expect(rpc).toHaveBeenCalledWith("evaluate_staff_job_fit", {
      target_staff_id: staffId,
      target_job_title_id: jobTitleId,
      target_org_unit_id: null,
    });
  });
});
