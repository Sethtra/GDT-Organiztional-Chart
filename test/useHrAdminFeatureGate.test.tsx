import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    rpc: mocks.rpc,
  },
}));

// Pinned, not inherited from the ambient .env — see chartServiceRollout.test.ts.
// The test name says "before HR features are explicitly enabled", so the flag
// is part of the fixture, not part of the environment.
vi.mock("../src/config/hrFeatures", () => ({
  HR_FEATURES_ENABLED: false,
  parseHrFeaturesEnabled: (value?: string) =>
    value?.trim().toLowerCase() === "true",
}));

vi.mock("../src/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    loading: false,
  }),
}));

import { useHrAdmin } from "../src/hooks/useHrAdmin";

describe("useHrAdmin migration rollout gate", () => {
  it("does not call an HR RPC before HR features are explicitly enabled", async () => {
    const { result } = renderHook(() => useHrAdmin());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current).toEqual({
      isHrAdmin: false,
      loading: false,
      error: null,
    });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
