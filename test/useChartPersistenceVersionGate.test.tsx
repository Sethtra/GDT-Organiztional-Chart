import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  maybeSingle: vi.fn(),
  versionInsert: vi.fn(),
}));

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: mocks.from,
    storage: { from: vi.fn() },
  },
}));

import { useChartPersistence } from "../src/hooks/useChartPersistence";

describe("useChartPersistence cloud-version rollout gate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    mocks.from.mockReset();
    mocks.maybeSingle.mockReset();
    mocks.versionInsert.mockReset();
    mocks.maybeSingle.mockResolvedValue({
      data: { id: "00000000-0000-4000-8000-000000000001" },
      error: null,
    });
    mocks.from.mockImplementation((table: string) => {
      if (table === "chart_versions") {
        return { insert: mocks.versionInsert };
      }
      return {
        update: () => ({
          eq: () => ({
            select: () => ({
              maybeSingle: mocks.maybeSingle,
            }),
          }),
        }),
      };
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("saves chart data without attempting a disabled version insert", async () => {
    const nodes = [{ id: "node-1" }];
    const edges: { id: string }[] = [];
    const nodesRef = { current: nodes };
    const edgesRef = { current: edges };

    renderHook(() =>
      useChartPersistence({
        chartId: "00000000-0000-4000-8000-000000000001",
        nodes,
        edges,
        nodesRef,
        edgesRef,
        lastSyncData: { current: { nodes: "[]", edges: "[]" } },
        setNodes: vi.fn(),
        setEdges: vi.fn(),
        setSaveStatus: vi.fn(),
        loading: false,
        canEdit: true,
      }),
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });

    expect(mocks.maybeSingle).toHaveBeenCalledOnce();
    expect(mocks.versionInsert).not.toHaveBeenCalled();
    expect(mocks.from).not.toHaveBeenCalledWith("chart_versions");
  });
});
