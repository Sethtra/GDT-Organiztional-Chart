import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_EDGE_OPTIONS,
  normalizeEdges,
  withoutRelationalIds,
} from '../src/utils/chartData.js';

test('normalizes legacy edges without changing their identity or endpoints', () => {
  const legacyEdge = {
    id: 'edge-1',
    source: 'node-a',
    target: 'node-b',
    data: { strokeWidth: 5, label: 'Reports to' },
  };

  const [normalized] = normalizeEdges([legacyEdge]);

  assert.equal(normalized.id, legacyEdge.id);
  assert.equal(normalized.source, legacyEdge.source);
  assert.equal(normalized.target, legacyEdge.target);
  assert.equal(normalized.type, 'custom');
  assert.deepEqual(normalized.data, {
    ...DEFAULT_EDGE_OPTIONS.data,
    strokeWidth: 5,
    label: 'Reports to',
  });
});

test('keeps already-normalized custom edges unchanged', () => {
  const customEdge = {
    id: 'edge-custom',
    source: 'node-a',
    target: 'node-b',
    type: 'custom',
    data: { strokeColor: '#123456' },
  };

  const [normalized] = normalizeEdges([customEdge]);

  assert.equal(normalized, customEdge);
});

test('detaches database IDs without mutating chart or history data', () => {
  const input = {
    name: 'Current Staff',
    department: 'Tax',
    positionId: 'position-db-id',
    dbStaffId: 'staff-db-id',
    dbAssignmentId: 'assignment-db-id',
    history: [
      {
        name: 'Previous Staff',
        dbStaffId: 'old-staff-db-id',
        dbAssignmentId: 'old-assignment-db-id',
        dateLeft: '2026-01-31',
      },
    ],
  };

  const detached = withoutRelationalIds(input);

  assert.deepEqual(detached, {
    name: 'Current Staff',
    department: 'Tax',
    history: [
      {
        name: 'Previous Staff',
        dateLeft: '2026-01-31',
      },
    ],
  });
  assert.equal(input.positionId, 'position-db-id');
  assert.equal(input.history[0].dbStaffId, 'old-staff-db-id');
});
