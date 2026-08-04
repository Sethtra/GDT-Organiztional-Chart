import { describe, expect, it } from "vitest";
import { computeChartHierarchy as computeChartHierarchyUntyped } from "../src/utils/chartHierarchy";

interface ChartNode {
  id: string;
}
interface ChartEdge {
  id: string;
  source: string;
  target: string;
}
interface ChartHierarchy {
  visibleNodes: ChartNode[];
  visibleEdges: ChartEdge[];
  childCounts: Record<string, number>;
  teamSizes: Record<string, number>;
}

// chartHierarchy.js is plain JS with no type declarations, so TS can only
// infer an empty-object shape for the counts — cast the one boundary here
// instead of adding a parallel .d.ts nobody else needs yet.
const computeChartHierarchy = computeChartHierarchyUntyped as (
  nodes: ChartNode[],
  edges: ChartEdge[],
  collapsedNodes: Set<string>,
) => ChartHierarchy;

function node(id: string): ChartNode {
  return { id };
}
function edge(source: string, target: string): ChartEdge {
  return { id: `${source}->${target}`, source, target };
}

describe("computeChartHierarchy", () => {
  it("counts a plain tree's team size as total descendants", () => {
    // head -> deputyA -> officer1, officer2
    //      -> deputyB -> officer3
    const nodes = [
      node("head"),
      node("deputyA"),
      node("deputyB"),
      node("officer1"),
      node("officer2"),
      node("officer3"),
    ];
    const edges = [
      edge("head", "deputyA"),
      edge("head", "deputyB"),
      edge("deputyA", "officer1"),
      edge("deputyA", "officer2"),
      edge("deputyB", "officer3"),
    ];

    const { childCounts, teamSizes } = computeChartHierarchy(
      nodes,
      edges,
      new Set(),
    );

    expect(childCounts.head).toBe(2);
    expect(teamSizes.deputyA).toBe(2);
    expect(teamSizes.deputyB).toBe(1);
    expect(teamSizes.head).toBe(5); // 2 deputies + 3 officers
  });

  it("does not double-count an officer shared by two supervisors", () => {
    // department -> supervisorA -> officer1..officer10
    //            -> supervisorB -> officer1..officer10 (same 10 people)
    const officers = Array.from({ length: 10 }, (_, i) => `officer${i}`);
    const nodes = [
      node("department"),
      node("supervisorA"),
      node("supervisorB"),
      ...officers.map(node),
    ];
    const edges = [
      edge("department", "supervisorA"),
      edge("department", "supervisorB"),
      ...officers.map((o) => edge("supervisorA", o)),
      ...officers.map((o) => edge("supervisorB", o)),
    ];

    const { teamSizes } = computeChartHierarchy(nodes, edges, new Set());

    expect(teamSizes.supervisorA).toBe(10);
    expect(teamSizes.supervisorB).toBe(10);
    // NOT 22 (2 supervisors + 10 + 10 double-counted) — the 10 officers are
    // the same people, so department's real team is 2 supervisors + 10
    // distinct officers = 12.
    expect(teamSizes.department).toBe(12);
  });

  it("hides every descendant of a collapsed node but keeps the node itself", () => {
    const nodes = [node("head"), node("deputy"), node("officer")];
    const edges = [edge("head", "deputy"), edge("deputy", "officer")];

    const { visibleNodes, visibleEdges } = computeChartHierarchy(
      nodes,
      edges,
      new Set(["deputy"]),
    );

    expect(visibleNodes.map((n) => n.id)).toEqual(["head", "deputy"]);
    expect(visibleEdges).toHaveLength(1); // head->deputy stays; deputy->officer is hidden
  });

  it("does not infinite-loop on a cyclic graph", () => {
    const nodes = [node("a"), node("b")];
    const edges = [edge("a", "b"), edge("b", "a")];

    expect(() =>
      computeChartHierarchy(nodes, edges, new Set()),
    ).not.toThrow();
  });

});
