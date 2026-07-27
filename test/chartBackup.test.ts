import { describe, expect, it } from 'vitest';
import {
  chartBackupFilename,
  createChartBackup,
  parseChartBackup,
  serializeChartBackup,
} from '../src/utils/chartBackup';

const input = {
  chartId: '00000000-0000-4000-8000-000000000001',
  chartName: 'GDT Main Chart',
  capturedAt: '2026-07-27T05:00:00.000Z',
  nodes: [
    {
      id: 'node-1',
      type: 'orgNode',
      position: { x: 100, y: 200 },
      data: { badgeText: 'Officer', futureField: { preserved: true } },
      style: { width: 240 },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      source: 'node-1',
      target: 'node-2',
      type: 'custom',
      data: { strokeWidth: 3 },
    },
  ],
};

describe('chart backup', () => {
  it('round-trips node IDs, positions, unknown data, and edges', () => {
    const created = createChartBackup(input);
    const restored = parseChartBackup(serializeChartBackup(created));

    expect(restored).toEqual(created);
    expect(restored.nodes[0]?.id).toBe('node-1');
    expect(restored.nodes[0]?.position).toEqual({ x: 100, y: 200 });
    expect(restored.nodes[0]?.data.futureField).toEqual({ preserved: true });
    expect(restored.edges[0]?.source).toBe('node-1');
    expect(restored.edges[0]?.target).toBe('node-2');
  });

  it('rejects malformed backups without returning partial data', () => {
    expect(() =>
      parseChartBackup(
        JSON.stringify({
          version: 1,
          chartId: input.chartId,
          chartName: input.chartName,
          capturedAt: input.capturedAt,
          nodes: [{ id: 'node-without-position', data: {} }],
          edges: [],
        }),
      ),
    ).toThrow('not a valid GDT chart backup');
  });

  it('creates a filesystem-safe timestamped filename', () => {
    expect(
      chartBackupFilename('GDT: Main / Chart', new Date(input.capturedAt)),
    ).toBe('GDT-Main-Chart_2026-07-27_05-00-00-000.gdt-chart.json');
  });
});
