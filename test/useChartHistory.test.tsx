import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useChartHistory } from "../src/hooks/useChartHistory";

describe("useChartHistory", () => {
  it("restores nodes and edges through undo and redo", () => {
    const { result } = renderHook(() => {
      const [nodes, setNodes] = useState([{ id: "node-1" }]);
      const [edges, setEdges] = useState([{ id: "edge-1" }]);
      const history = useChartHistory(nodes, edges, setNodes, setEdges);
      return { nodes, edges, setNodes, setEdges, ...history };
    });

    act(() => {
      result.current.takeSnapshot();
      result.current.setNodes([{ id: "node-2" }]);
      result.current.setEdges([{ id: "edge-2" }]);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => result.current.undo());

    expect(result.current.nodes).toEqual([{ id: "node-1" }]);
    expect(result.current.edges).toEqual([{ id: "edge-1" }]);
    expect(result.current.canRedo).toBe(true);

    act(() => result.current.redo());

    expect(result.current.nodes).toEqual([{ id: "node-2" }]);
    expect(result.current.edges).toEqual([{ id: "edge-2" }]);
  });
});
