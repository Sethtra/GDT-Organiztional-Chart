import {
  ChartSnapshotSchema,
  type ChartEdge,
  type ChartNode,
  type ChartSnapshot,
} from '../contracts/chart';

export interface CreateChartBackupInput {
  chartId: string;
  chartName: string;
  nodes: ChartNode[];
  edges: ChartEdge[];
  capturedAt?: string;
}

export function createChartBackup({
  chartId,
  chartName,
  nodes,
  edges,
  capturedAt = new Date().toISOString(),
}: CreateChartBackupInput): ChartSnapshot {
  return ChartSnapshotSchema.parse({
    version: 1,
    chartId,
    chartName,
    capturedAt,
    nodes,
    edges,
  });
}

export function serializeChartBackup(snapshot: ChartSnapshot): string {
  return `${JSON.stringify(ChartSnapshotSchema.parse(snapshot), null, 2)}\n`;
}

export function parseChartBackup(contents: string): ChartSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error('The selected file is not valid JSON.');
  }

  const result = ChartSnapshotSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error('The selected file is not a valid GDT chart backup.');
  }
  return result.data;
}

export function chartBackupFilename(
  chartName: string,
  capturedAt = new Date(),
): string {
  const safeName =
    chartName
      .trim()
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\p{Cc}/gu, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'gdt-chart';
  const timestamp = capturedAt
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .replace('Z', '');
  return `${safeName}_${timestamp}.gdt-chart.json`;
}
