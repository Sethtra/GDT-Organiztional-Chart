import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDummyChartData,
  assertCleanupPreservesChartStructure,
  createCleanChartCopy,
} from '../scripts/lib/dummy-data-cleanup.mjs';

const charts = [
  {
    id: 'chart-1',
    name: 'Chart One',
    nodes: [
      {
        id: 'org-node',
        type: 'orgNode',
        position: { x: 0, y: 0 },
        data: {
          orgType: 'department',
          name: 'Real Department',
          color: '#123456',
        },
      },
      {
        id: 'position-node',
        type: 'orgNode',
        position: { x: 100, y: 200 },
        data: {
          orgType: 'individualNode',
          badgeText: 'Officer',
          department: 'Real Department',
          office: 'Real Office',
          name: 'Dummy Person',
          staffId: 'DUMMY-1',
          phone: '012345678',
          history: [{ name: 'Old Dummy Person' }],
          color: '#abcdef',
        },
      },
    ],
    edges: [
      {
        id: 'edge-1',
        source: 'org-node',
        target: 'position-node',
        data: { strokeWidth: 2 },
      },
    ],
  },
];

test('dummy cleanup targets individual occupant fields only', () => {
  const report = analyzeDummyChartData(charts);

  assert.equal(report.cleanupTargetCount, 1);
  assert.deepEqual(report.targets[0].populatedFields, [
    'name',
    'staffId',
    'phone',
    'history',
  ]);
});

test('clean copy preserves nodes, edges, positions, and organizational data', () => {
  const cleanCopy = createCleanChartCopy(charts);

  assert.doesNotThrow(() =>
    assertCleanupPreservesChartStructure(charts, cleanCopy),
  );
  assert.deepEqual(cleanCopy[0].edges, charts[0].edges);
  assert.deepEqual(cleanCopy[0].nodes[0], charts[0].nodes[0]);
  assert.equal(cleanCopy[0].nodes[1].id, 'position-node');
  assert.deepEqual(cleanCopy[0].nodes[1].position, { x: 100, y: 200 });
  assert.deepEqual(cleanCopy[0].nodes[1].data, {
    orgType: 'individualNode',
    badgeText: 'Officer',
    department: 'Real Department',
    office: 'Real Office',
    color: '#abcdef',
  });
});
