import assert from 'node:assert/strict';
import test from 'node:test';

import { moveSelectedNodesToLayer } from '../src/utils/nodeLayering.js';

const nodes = [
  { id: 'back', zIndex: 4, selected: false },
  { id: 'selected', zIndex: 8, selected: true },
  { id: 'front', zIndex: 12, selected: false },
];

test('send to back places selected nodes below every other node', () => {
  const result = moveSelectedNodesToLayer(nodes, 'back');
  const selected = result.find((node) => node.id === 'selected');
  const others = result.filter((node) => node.id !== 'selected');

  assert.ok(others.every((node) => selected.zIndex < node.zIndex));
});

test('bring to front places selected nodes above every other node', () => {
  const result = moveSelectedNodesToLayer(nodes, 'front');
  const selected = result.find((node) => node.id === 'selected');
  const others = result.filter((node) => node.id !== 'selected');

  assert.ok(others.every((node) => selected.zIndex > node.zIndex));
});

test('layering is a no-op when no node is selected', () => {
  const unselected = nodes.map((node) => ({ ...node, selected: false }));
  assert.equal(moveSelectedNodesToLayer(unselected, 'front'), unselected);
});
