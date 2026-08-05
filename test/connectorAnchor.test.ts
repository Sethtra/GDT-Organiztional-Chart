import { Position } from "@xyflow/react";
import { describe, expect, it } from "vitest";
import {
  getNodeRect as getNodeRectUntyped,
  getStaticAnchor as getStaticAnchorUntyped,
} from "../src/utils/floatingEdge";

interface Rect { x: number; y: number; width: number; height: number }
interface FakeNode {
  internals: { positionAbsolute: { x: number; y: number } };
  measured?: { width: number; height: number };
  data: { orgType: string };
}

// floatingEdge.js is plain JS — cast the boundary rather than add a .d.ts.
const getNodeRect = getNodeRectUntyped as (node: FakeNode) => Rect;
const getStaticAnchor = getStaticAnchorUntyped as (
  node: FakeNode,
  position: unknown,
) => { x: number; y: number } | null;

const node = (
  x: number,
  y: number,
  width: number,
  height: number,
  orgType = "orgNode",
): FakeNode => ({
  internals: { positionAbsolute: { x, y } },
  measured: { width, height },
  data: { orgType },
});

// Regression guard for off-centre connectors.
//
// getNodeRect used to clamp a node's width up to an assumed CSS minimum
// (160 for units, 220 for person cards). Whenever a node was actually narrower
// than that, the computed side-centre sat half the difference away from the
// handle the user can see, so the connector visibly missed the dot — and the
// error silently changed size every time the CSS min-width was edited.
describe("getNodeRect", () => {
  it("uses the measured width verbatim, even when it is small", () => {
    const rect = getNodeRect(node(0, 0, 140, 64));
    expect(rect.width).toBe(140);
    expect(rect.height).toBe(64);
  });

  it("does not widen a narrow person card either", () => {
    const rect = getNodeRect(node(0, 0, 180, 170, "individualNode"));
    expect(rect.width).toBe(180);
  });

  it("keeps a wide node at its real width", () => {
    expect(getNodeRect(node(0, 0, 420, 90)).width).toBe(420);
  });
});

describe("getStaticAnchor", () => {
  it("lands the top and bottom ports on the node's true horizontal centre", () => {
    // A 140-wide node at x=100 has its centre at 170. The old clamp to 160
    // reported 180 — ten pixels off the visible handle.
    const n = node(100, 200, 140, 64);

    expect(getStaticAnchor(n, Position.Top)).toEqual({ x: 170, y: 200 });
    expect(getStaticAnchor(n, Position.Bottom)).toEqual({ x: 170, y: 264 });
  });

  it("lands the side ports on the node's true vertical centre", () => {
    const n = node(100, 200, 140, 64);

    expect(getStaticAnchor(n, Position.Left)).toEqual({ x: 100, y: 232 });
    expect(getStaticAnchor(n, Position.Right)).toEqual({ x: 240, y: 232 });
  });

  it("starts a person card's bottom connector on the card edge, not below it", () => {
    // The bottom port used to sit 13px lower, to reach a headcount pill that
    // hung off the bottom of the card. The pill is gone; an offset with nothing
    // out there to meet is just a gap between the node and its own connector.
    const p = node(100, 200, 220, 170, "individualNode");

    expect(getStaticAnchor(p, Position.Bottom)).toEqual({ x: 210, y: 370 });
  });

  it("keeps the person top port on the avatar apex above the card", () => {
    // This offset is still earned: the avatar really does render 42px above the
    // card top, so an arrow stopping at the card edge would pierce the face.
    const p = node(100, 200, 220, 170, "individualNode");

    expect(getStaticAnchor(p, Position.Top)).toEqual({ x: 210, y: 158 });
  });

  it("puts a parent and a centred child on the same vertical line", () => {
    // Different widths, same centre — the trunk between them must be straight.
    const parent = node(100, 0, 240, 80);   // centre 220
    const child = node(160, 200, 120, 64);  // centre 220

    const from = getStaticAnchor(parent, Position.Bottom);
    const to = getStaticAnchor(child, Position.Top);

    expect(from?.x).toBe(to?.x);
  });
});
