import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../src/supabaseClient", () => ({
  supabase: { rpc },
}));

import {
  listPromotionReadiness,
  loadPromotionReadiness,
} from "../src/services/promotionReadinessService";

const readyOfficer = {
  staffId: "00000000-0000-4000-8000-000000000001",
  employeeId: "GDT-001",
  name: "Sok Dara",
  nameEn: null,
  photoUrl: null,
  departmentName: "Finance and Personnel",
  officeName: null,
  currentJobTitle: {
    id: "00000000-0000-4000-8000-000000000014",
    name: "មន្ត្រី",
    nameEn: "Officer",
    rankOrder: 50,
    positionScope: "individual",
  },
  targetJobTitle: {
    id: "00000000-0000-4000-8000-000000000013",
    name: "អនុប្រធានការិយាល័យ",
    nameEn: "Deputy Office Chief",
    rankOrder: 40,
    positionScope: "office",
  },
  requiredSkillCount: 2,
  metSkillCount: 2,
  status: "ready",
};

describe("promotionReadinessService", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: [readyOfficer], error: null });
  });

  it("lists readiness through the admin RPC", async () => {
    await expect(listPromotionReadiness()).resolves.toEqual([readyOfficer]);
    expect(rpc).toHaveBeenCalledWith("get_promotion_readiness", {
      target_staff_id: null,
    });
  });

  it("loads one officer with a validated staff identifier", async () => {
    await expect(
      loadPromotionReadiness(readyOfficer.staffId),
    ).resolves.toEqual(readyOfficer);
    expect(rpc).toHaveBeenCalledWith("get_promotion_readiness", {
      target_staff_id: readyOfficer.staffId,
    });
  });

  it("rejects malformed readiness data", async () => {
    rpc.mockResolvedValue({
      data: [{ ...readyOfficer, status: "skipped_two_levels" }],
      error: null,
    });

    await expect(listPromotionReadiness()).rejects.toThrow(
      "The promotion readiness response was malformed.",
    );
  });
});
