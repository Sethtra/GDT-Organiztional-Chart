import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  single: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    rpc: mocks.rpc,
    from: mocks.from,
  },
}));

// This suite is about the behaviour BEFORE the HR migrations land, so the flag
// has to be pinned. It used to read whatever VITE_HR_FEATURES_ENABLED the
// ambient .env happened to set — which Vite loads into the test run — so the
// moment that file flipped to true locally, every assertion here inverted and
// the suite failed against correct code. A rollout-gate test that depends on
// the developer's own .env is not testing the gate.
vi.mock("../src/config/hrFeatures", () => ({
  HR_FEATURES_ENABLED: false,
  parseHrFeaturesEnabled: (value?: string) =>
    value?.trim().toLowerCase() === "true",
}));

import { loadChartForViewer } from "../src/services/chartService";

describe("chart service migration rollout", () => {
  beforeEach(() => {
    mocks.rpc.mockReset();
    mocks.from.mockReset();
    mocks.single.mockReset();
    mocks.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: mocks.single,
        }),
      }),
    });
  });

  it("does not call a missing viewer RPC or expose raw charts anonymously", async () => {
    const result = await loadChartForViewer(
      "00000000-0000-4000-8000-000000000001",
    );

    expect(result).toEqual({
      chart: null,
      usedLegacyFallback: true,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("uses the legacy chart query for authenticated users", async () => {
    mocks.single.mockResolvedValue({
      data: {
        id: "00000000-0000-4000-8000-000000000001",
        owner_id: "00000000-0000-4000-8000-000000000002",
        name: "Existing chart",
        nodes: [],
        edges: [],
        is_public: false,
        public_access_level: "view",
        chart_shares: [],
      },
      error: null,
    });

    const result = await loadChartForViewer(
      "00000000-0000-4000-8000-000000000001",
      { allowLegacyAuthenticatedFallback: true },
    );

    expect(result.chart?.name).toBe("Existing chart");
    expect(result.usedLegacyFallback).toBe(true);
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.from).toHaveBeenCalledWith("charts");
  });
});
