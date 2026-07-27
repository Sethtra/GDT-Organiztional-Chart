import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/supabaseClient", () => ({
  supabase: {
    from: vi.fn(),
    storage: { from: vi.fn() },
  },
}));

import { useChartPersistence } from "../src/hooks/useChartPersistence";

describe("useChartPersistence", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes an immediate recovery copy before the debounced remote save", async () => {
    const nodes = [{ id: "node-1" }];
    const edges = [{ id: "edge-1" }];
    const nodesRef = { current: nodes };
    const edgesRef = { current: edges };
    const lastSyncData = { current: { nodes: "[]", edges: "[]" } };

    renderHook(() =>
      useChartPersistence({
        chartId: "00000000-0000-4000-8000-000000000001",
        nodes,
        edges,
        nodesRef,
        edgesRef,
        lastSyncData,
        setNodes: vi.fn(),
        setEdges: vi.fn(),
        setSaveStatus: vi.fn(),
        loading: false,
        canEdit: true,
      }),
    );

    await waitFor(() =>
      expect(
        localStorage.getItem(
          "chart_backup_00000000-0000-4000-8000-000000000001",
        ),
      ).not.toBeNull(),
    );

    const backup = JSON.parse(
      localStorage.getItem(
        "chart_backup_00000000-0000-4000-8000-000000000001",
      ) ?? "{}",
    );
    expect(backup.nodes).toEqual(nodes);
    expect(backup.edges).toEqual(edges);
  });

  it("does not create recovery data for a read-only viewer", () => {
    const nodes: { id: string }[] = [{ id: "node-1" }];
    const edges: { id: string }[] = [];
    const nodesRef = { current: nodes };
    const edgesRef = { current: edges };
    const lastSyncData = { current: { nodes: "[]", edges: "[]" } };

    renderHook(() =>
      useChartPersistence({
        chartId: "00000000-0000-4000-8000-000000000002",
        nodes,
        edges,
        nodesRef,
        edgesRef,
        lastSyncData,
        setNodes: vi.fn(),
        setEdges: vi.fn(),
        setSaveStatus: vi.fn(),
        loading: false,
        canEdit: false,
      }),
    );

    expect(localStorage.length).toBe(0);
  });
});
