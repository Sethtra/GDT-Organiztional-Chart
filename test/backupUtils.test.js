import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldOfferLocalRecovery } from '../src/utils/backupUtils.js';

const server = {
  updated_at: '2026-07-23T10:00:00.000Z',
  nodes: [{ id: 'a' }],
  edges: [],
};

test('does not recover when the server is newer', () => {
  assert.equal(shouldOfferLocalRecovery(server, {
    timestamp: new Date('2026-07-23T09:59:00.000Z').getTime(),
    nodes: [{ id: 'a' }, { id: 'b' }],
    edges: [],
  }), false);
});

test('recovers newer local edits even when item counts are unchanged', () => {
  assert.equal(shouldOfferLocalRecovery(server, {
    timestamp: new Date('2026-07-23T10:01:00.000Z').getTime(),
    nodes: [{ id: 'a', data: { name: 'Changed' } }],
    edges: [],
  }), true);
});

test('does not prompt when newer local content equals the server', () => {
  assert.equal(shouldOfferLocalRecovery(server, {
    timestamp: new Date('2026-07-23T10:01:00.000Z').getTime(),
    nodes: [{ id: 'a' }],
    edges: [],
  }), false);
});
