import { describe, expect, it } from 'vitest';
import {
  ChartSnapshotSchema,
  PublicChartNodeDataSchema,
} from '../src/contracts/chart';

describe('chart contracts', () => {
  it('preserves unknown node and edge fields in recovery snapshots', () => {
    const snapshot = ChartSnapshotSchema.parse({
      version: 1,
      chartId: '00000000-0000-4000-8000-000000000001',
      chartName: 'GDT Main Chart',
      capturedAt: '2026-07-27T05:00:00.000Z',
      nodes: [
        {
          id: 'node-1',
          type: 'orgNode',
          position: { x: 20, y: 30 },
          data: { badgeText: 'Officer', customFutureField: 'keep me' },
          measured: { width: 240, height: 120 },
        },
      ],
      edges: [
        {
          id: 'edge-1',
          source: 'node-1',
          target: 'node-2',
          data: { dynamic: true },
          reconnectable: true,
        },
      ],
    });

    expect(snapshot.nodes[0]?.measured).toEqual({ width: 240, height: 120 });
    expect(snapshot.nodes[0]?.data.customFutureField).toBe('keep me');
    expect(snapshot.edges[0]?.reconnectable).toBe(true);
  });

  it('strips private legacy fields from public node data', () => {
    const publicData = PublicChartNodeDataSchema.parse({
      orgType: 'individualNode',
      badgeText: 'Officer',
      position: 'Officer',
      department: 'Department',
      office: 'Office',
      occupant: null,
      backgroundColor: '#ffffff',
      borderColor: '#000000',
      textColor: '#000000',
      linkedChartId: null,
      nationalId: '123456789012',
      phone: '012345678',
      email: 'private@example.com',
      address: 'Private',
      maritalStatus: 'single',
      education: 'Private',
      history: [{ phone: 'private' }],
    });

    expect('nationalId' in publicData).toBe(false);
    expect('phone' in publicData).toBe(false);
    expect('history' in publicData).toBe(false);
  });
});
