import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useChartNodeFocus } from "../src/hooks/useChartNodeFocus";

describe("useChartNodeFocus", () => {
  it("focuses a requested node once after the chart finishes loading", () => {
    const onFocus = vi.fn();
    const nodes = [{ id: "node-1" }, { id: "node-2" }];
    const { rerender } = renderHook(
      (props) => useChartNodeFocus({ ...props, nodes, onFocus }),
      {
        initialProps: {
          active: true,
          loading: true,
          focusNodeId: "node-2",
        },
      },
    );

    expect(onFocus).not.toHaveBeenCalled();

    rerender({
      active: true,
      loading: false,
      focusNodeId: "node-2",
    });
    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledWith(nodes[1]);

    rerender({
      active: true,
      loading: false,
      focusNodeId: "node-2",
    });
    expect(onFocus).toHaveBeenCalledTimes(1);
  });

  it("waits until the requested node exists", () => {
    const onFocus = vi.fn();
    const { rerender } = renderHook(
      (props) => useChartNodeFocus({ ...props, onFocus }),
      {
        initialProps: {
          active: true,
          loading: false,
          focusNodeId: "node-2",
          nodes: [{ id: "node-1" }],
        },
      },
    );

    expect(onFocus).not.toHaveBeenCalled();

    rerender({
      active: true,
      loading: false,
      focusNodeId: "node-2",
      nodes: [{ id: "node-1" }, { id: "node-2" }],
    });
    expect(onFocus).toHaveBeenCalledWith({ id: "node-2" });
  });
});
