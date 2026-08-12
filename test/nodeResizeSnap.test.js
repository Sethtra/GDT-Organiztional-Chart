import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getNodeResizeGuides,
  getNodeResizeSnap,
} from '../src/utils/nodeResizeSnap.js';

test('snaps width and height independently to nearby node dimensions', () => {
  assert.deepEqual(
    getNodeResizeSnap(
      { width: 296, height: 183 },
      [{ width: 300, height: 180 }, { width: 220, height: 120 }],
      6,
    ),
    { width: 300, height: 180, widthMatched: true, heightMatched: true },
  );
});

test('keeps free resize values outside the smart-guide threshold', () => {
  assert.deepEqual(
    getNodeResizeSnap(
      { width: 287, height: 167 },
      [{ width: 300, height: 180 }],
      6,
    ),
    { width: 287, height: 167, widthMatched: false, heightMatched: false },
  );
});

test('uses the closest matching dimension when several nodes are nearby', () => {
  const result = getNodeResizeSnap(
    { width: 298, height: 100 },
    [{ width: 294, height: 130 }, { width: 300, height: 140 }],
    6,
  );
  assert.equal(result.width, 300);
  assert.equal(result.widthMatched, true);
});

test('shows a horizontal guide and snaps the bottom edge to a sibling edge', () => {
  const result = getNodeResizeGuides(
    { x: 100, y: 40, width: 174, height: 96 },
    [{ x: 0, y: 0, width: 150, height: 140 }],
    { bottom: true },
    6,
  );

  assert.equal(result.guideY, 140);
  assert.equal(result.y, 40);
  assert.equal(result.height, 100);
  assert.equal(result.heightMatched, true);
});

test('shows a vertical guide and snaps the right edge to a sibling edge', () => {
  const result = getNodeResizeGuides(
    { x: 100, y: 40, width: 96, height: 80 },
    [{ x: 200, y: 0, width: 150, height: 140 }],
    { right: true },
    6,
  );

  assert.equal(result.guideX, 200);
  assert.equal(result.x, 100);
  assert.equal(result.width, 100);
  assert.equal(result.widthMatched, true);
});
