import test from 'node:test';
import assert from 'node:assert/strict';
import { getFolderAncestors } from '../src/utils/folderUtils.js';

test('returns a root-to-current folder chain', () => {
  const folders = [
    { id: 'root', parent_id: null, name: 'Root' },
    { id: 'child', parent_id: 'root', name: 'Child' },
    { id: 'leaf', parent_id: 'child', name: 'Leaf' },
  ];
  assert.deepEqual(
    getFolderAncestors('leaf', folders).map((folder) => folder.id),
    ['root', 'child', 'leaf'],
  );
});

test('stops safely when corrupt folder data contains a cycle', () => {
  const folders = [
    { id: 'a', parent_id: 'b' },
    { id: 'b', parent_id: 'a' },
  ];
  assert.deepEqual(
    getFolderAncestors('a', folders).map((folder) => folder.id),
    ['b', 'a'],
  );
});

test('returns an empty chain for unknown folders', () => {
  assert.deepEqual(getFolderAncestors('missing', []), []);
});
