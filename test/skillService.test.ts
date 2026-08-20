import { beforeEach, describe, expect, it, vi } from "vitest";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("../src/supabaseClient", () => ({
  supabase: { rpc },
}));

import {
  deleteSkillCatalogItem,
  listSkillCatalog,
  saveSkillCatalogItem,
  setStaffSkill,
} from "../src/services/skillService";

const staffId = "00000000-0000-4000-8000-000000000001";
const skillId = "00000000-0000-4000-8000-000000000002";

describe("skillService RPC contract", () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: null, error: null });
  });

  it("calls get_hr_skill_catalog when listing catalog items", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          id: skillId,
          name: "Auditing",
          description: "Tax audit",
          isActive: true,
        },
      ],
      error: null,
    });

    const items = await listSkillCatalog();
    expect(rpc).toHaveBeenCalledWith("get_hr_skill_catalog");
    expect(items).toHaveLength(1);
    expect(items[0]?.name).toBe("Auditing");
  });

  it("calls save_skill_catalog_item when creating or updating a skill", async () => {
    rpc.mockResolvedValue({ data: skillId, error: null });

    const savedId = await saveSkillCatalogItem({
      name: "Financial Analysis",
      description: "Financial analysis skills",
      isActive: true,
    });

    expect(rpc).toHaveBeenCalledWith("save_skill_catalog_item", {
      target_skill_id: null,
      skill_name: "Financial Analysis",
      skill_description: "Financial analysis skills",
      skill_is_active: true,
    });
    expect(savedId).toBe(skillId);
  });

  it("calls delete_skill_catalog_item with target_skill_id when deleting a skill", async () => {
    await deleteSkillCatalogItem(skillId);

    expect(rpc).toHaveBeenCalledWith("delete_skill_catalog_item", {
      target_skill_id: skillId,
    });
  });

  it("calls set_staff_skill_proficiency when assigning proficiency", async () => {
    await setStaffSkill({
      staffId,
      skillId,
      proficiency: 4,
      effectiveDate: "2026-01-01",
      notes: "Senior auditor",
    });

    expect(rpc).toHaveBeenCalledWith("set_staff_skill_proficiency", {
      target_staff_id: staffId,
      target_skill_id: skillId,
      proficiency_value: 4,
      effective_date: "2026-01-01",
      skill_notes: "Senior auditor",
    });
  });
});
