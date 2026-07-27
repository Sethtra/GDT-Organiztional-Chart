import { z } from 'zod';
import { PublicChartOccupantSchema } from './hr';

export const ChartPositionSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
});

export const ChartNodeSchema = z
  .object({
    id: z.string().min(1).max(200),
    type: z.string().min(1).max(100).optional(),
    position: ChartPositionSchema,
    data: z.record(z.string(), z.unknown()),
  })
  .passthrough();

export const ChartEdgeSchema = z
  .object({
    id: z.string().min(1).max(200),
    source: z.string().min(1).max(200),
    target: z.string().min(1).max(200),
    type: z.string().min(1).max(100).optional(),
    data: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

export const ChartSnapshotSchema = z.object({
  version: z.literal(1),
  chartId: z.string().uuid(),
  chartName: z.string().trim().min(1).max(300),
  capturedAt: z.string().datetime({ offset: true }),
  nodes: z.array(ChartNodeSchema),
  edges: z.array(ChartEdgeSchema),
});

export const ChartViewerAccessSchema = z.enum([
  'owner',
  'edit',
  'view',
  'public',
]);

export const ChartShareSchema = z.object({
  access_level: z.enum(['view', 'edit']),
  shared_email: z.string().email(),
  status: z.enum(['pending', 'accepted']),
});

export const ChartViewerRecordSchema = z
  .object({
    id: z.string().uuid(),
    owner_id: z.string().uuid().nullable().optional(),
    name: z.string().min(1).max(300).optional().default('Untitled Chart'),
    nodes: z.array(ChartNodeSchema).optional().default([]),
    edges: z.array(ChartEdgeSchema).optional().default([]),
    thumbnail_url: z.string().nullable().optional(),
    is_public: z.boolean().optional().default(false),
    public_access_level: z.enum(['view', 'edit']).optional().default('view'),
    created_at: z.string().datetime({ offset: true }).optional(),
    updated_at: z.string().datetime({ offset: true }).optional(),
    viewer_access: ChartViewerAccessSchema.optional(),
    chart_shares: z.array(ChartShareSchema).optional(),
  })
  .passthrough();

export const PublicChartNodeDataSchema = z.object({
  orgType: z.string().max(100).nullable(),
  badgeText: z.string().max(300).nullable(),
  position: z.string().max(300).nullable(),
  department: z.string().max(300).nullable(),
  office: z.string().max(300).nullable(),
  occupant: PublicChartOccupantSchema.nullable(),
  backgroundColor: z.string().max(100).nullable(),
  borderColor: z.string().max(100).nullable(),
  textColor: z.string().max(100).nullable(),
  linkedChartId: z.string().uuid().nullable(),
});

export type ChartPosition = z.infer<typeof ChartPositionSchema>;
export type ChartNode = z.infer<typeof ChartNodeSchema>;
export type ChartEdge = z.infer<typeof ChartEdgeSchema>;
export type ChartSnapshot = z.infer<typeof ChartSnapshotSchema>;
export type ChartViewerAccess = z.infer<typeof ChartViewerAccessSchema>;
export type ChartViewerRecord = z.infer<typeof ChartViewerRecordSchema>;
export type PublicChartNodeData = z.infer<typeof PublicChartNodeDataSchema>;
