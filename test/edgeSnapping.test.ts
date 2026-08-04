import { describe, expect, it } from "vitest";
import { collectCrossEdgeSnapCandidates } from "../src/utils/edgeSnapping";

function makeNode(x: number, y: number) {
  return {
    internals: { positionAbsolute: { x, y } },
    measured: { width: 200, height: 80 },
    data: { orgType: "orgNode" },
  };
}

describe("collectCrossEdgeSnapCandidates", () => {
  const nodes: Record<string, ReturnType<typeof makeNode>> = {
    parent: makeNode(400, 0),
    childA: makeNode(100, 300),
    childB: makeNode(700, 300),
  };
  const getInternalNode = (id: string) => nodes[id];

  const edges = [
    {
      id: "edge-A",
      source: "parent",
      target: "childA",
      sourceHandle: "bottom",
      targetHandle: "top",
      data: { points: [{ x: 999, y: 999 }] },
    },
    {
      id: "edge-B",
      source: "parent",
      target: "childB",
      sourceHandle: "bottom",
      targetHandle: "top",
      data: { points: [{ x: 500, y: 150 }] },
    },
    {
      id: "edge-C",
      source: "parent",
      target: "childA",
      data: {},
    },
  ];
  const getEdges = () => edges;

  it("excludes the edge currently being dragged", () => {
    const { xs, ys } = collectCrossEdgeSnapCandidates(
      "edge-A",
      getEdges,
      getInternalNode,
    );
    expect(xs).not.toContain(999);
    expect(ys).not.toContain(999);
  });

  it("includes another static edge's resolved anchor coordinates", () => {
    const { xs, ys } = collectCrossEdgeSnapCandidates(
      "edge-A",
      getEdges,
      getInternalNode,
    );
    // edge-B: parent bottom handle -> {x: 500, y: 80}; childB top handle -> {x: 800, y: 300}
    expect(xs).toContain(500);
    expect(xs).toContain(800);
    expect(ys).toContain(80);
    expect(ys).toContain(300);
  });

  it("includes another edge's manually-placed waypoints", () => {
    const { xs, ys } = collectCrossEdgeSnapCandidates(
      "edge-A",
      getEdges,
      getInternalNode,
    );
    expect(xs).toContain(500);
    expect(ys).toContain(150);
  });

  it("includes a dynamic (floating) edge's live-computed anchors", () => {
    const { xs, ys } = collectCrossEdgeSnapCandidates(
      "edge-B",
      getEdges,
      getInternalNode,
    );
    // edge-C is dynamic (no sourceHandle/targetHandle): parent faces down
    // toward childA (bottom {500,80}), childA faces up toward parent (top {200,300}).
    expect(xs).toContain(500);
    expect(xs).toContain(200);
    expect(ys).toContain(80);
    expect(ys).toContain(300);
  });

  it("skips edges whose nodes can't be resolved instead of throwing", () => {
    const brokenEdges = [
      { id: "edge-A", source: "parent", target: "childA" },
      { id: "edge-ghost", source: "parent", target: "missing" },
    ];
    expect(() =>
      collectCrossEdgeSnapCandidates(
        "edge-A",
        () => brokenEdges,
        getInternalNode,
      ),
    ).not.toThrow();
  });
});
