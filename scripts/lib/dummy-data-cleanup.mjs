export const INDIVIDUAL_DUMMY_FIELDS = Object.freeze([
  'name',
  'nameEn',
  'staffId',
  'age',
  'gender',
  'phone',
  'email',
  'address',
  'maritalStatus',
  'nationalId',
  'siblings',
  'education',
  'skill',
  'skills',
  'joinDate',
  'history',
  'dbStaffId',
  'dbAssignmentId',
]);

function isIndividualNode(node) {
  return node?.data?.orgType === 'individualNode';
}

function hasMeaningfulValue(value) {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function locationFor(chart, node) {
  return {
    chartId: chart.id ?? chart.chartId ?? null,
    chartName: chart.name ?? chart.chartName ?? null,
    nodeId: node.id,
    department: node.data?.department ?? null,
    office: node.data?.office ?? null,
    position: node.data?.position ?? node.data?.badgeText ?? null,
  };
}

function normalizeIdentifier(value) {
  return String(value ?? '').trim().toLowerCase();
}

function addDuplicateCandidate(map, type, value, location) {
  const normalized = normalizeIdentifier(value);
  if (!normalized) return;
  const key = `${type}:${normalized}`;
  const current = map.get(key) ?? {
    type,
    value: String(value).trim(),
    locations: [],
  };
  current.locations.push(location);
  map.set(key, current);
}

export function analyzeDummyChartData(charts) {
  const targets = [];
  const duplicateCandidates = new Map();
  let totalNodes = 0;
  let totalEdges = 0;
  let individualNodes = 0;

  for (const chart of charts) {
    const nodes = Array.isArray(chart.nodes) ? chart.nodes : [];
    const edges = Array.isArray(chart.edges) ? chart.edges : [];
    totalNodes += nodes.length;
    totalEdges += edges.length;

    for (const node of nodes) {
      if (!isIndividualNode(node)) continue;
      individualNodes += 1;
      const populatedFields = INDIVIDUAL_DUMMY_FIELDS.filter((field) =>
        hasMeaningfulValue(node.data?.[field]),
      );
      if (populatedFields.length === 0) continue;

      const location = locationFor(chart, node);
      targets.push({ ...location, populatedFields });
      addDuplicateCandidate(
        duplicateCandidates,
        'employeeId',
        node.data?.staffId,
        location,
      );
      addDuplicateCandidate(
        duplicateCandidates,
        'email',
        node.data?.email,
        location,
      );
      addDuplicateCandidate(
        duplicateCandidates,
        'nationalId',
        node.data?.nationalId,
        location,
      );
    }
  }

  const duplicates = [...duplicateCandidates.values()].filter(
    (candidate) => candidate.locations.length > 1,
  );

  return {
    chartCount: charts.length,
    totalNodes,
    totalEdges,
    individualNodes,
    cleanupTargetCount: targets.length,
    targets,
    duplicates,
  };
}

export function createCleanChartCopy(charts) {
  return charts.map((chart) => ({
    ...chart,
    nodes: (Array.isArray(chart.nodes) ? chart.nodes : []).map((node) => {
      if (!isIndividualNode(node)) return node;
      const cleanedData = { ...node.data };
      for (const field of INDIVIDUAL_DUMMY_FIELDS) {
        delete cleanedData[field];
      }
      return { ...node, data: cleanedData };
    }),
    edges: Array.isArray(chart.edges) ? chart.edges : [],
  }));
}

function stableJson(value) {
  return JSON.stringify(value);
}

export function assertCleanupPreservesChartStructure(before, after) {
  if (before.length !== after.length) {
    throw new Error('Chart count changed during cleanup.');
  }

  for (let chartIndex = 0; chartIndex < before.length; chartIndex += 1) {
    const originalChart = before[chartIndex];
    const cleanedChart = after[chartIndex];
    if (!originalChart || !cleanedChart) {
      throw new Error(`Chart ${chartIndex} is missing after cleanup.`);
    }

    if (!Array.isArray(originalChart.nodes) || !Array.isArray(cleanedChart.nodes)) {
      throw new Error(`Chart ${chartIndex} has invalid nodes.`);
    }
    if (originalChart.nodes.length !== cleanedChart.nodes.length) {
      throw new Error(`Node count changed for chart ${chartIndex}.`);
    }
    if (!Array.isArray(originalChart.edges) || !Array.isArray(cleanedChart.edges)) {
      throw new Error(`Chart ${chartIndex} has invalid edges.`);
    }
    if (stableJson(originalChart.edges) !== stableJson(cleanedChart.edges)) {
      throw new Error(`Edges changed for chart ${chartIndex}.`);
    }

    for (let nodeIndex = 0; nodeIndex < originalChart.nodes.length; nodeIndex += 1) {
      const originalNode = originalChart.nodes[nodeIndex];
      const cleanedNode = cleanedChart.nodes[nodeIndex];
      if (!originalNode || !cleanedNode) {
        throw new Error(`Node ${nodeIndex} is missing after cleanup.`);
      }
      if (originalNode.id !== cleanedNode.id) {
        throw new Error(`Node ID changed at chart ${chartIndex}, node ${nodeIndex}.`);
      }
      if (stableJson(originalNode.position) !== stableJson(cleanedNode.position)) {
        throw new Error(
          `Node position changed for ${originalNode.id ?? nodeIndex}.`,
        );
      }

      if (!isIndividualNode(originalNode)) {
        if (stableJson(originalNode) !== stableJson(cleanedNode)) {
          throw new Error(
            `Non-individual node ${originalNode.id ?? nodeIndex} changed.`,
          );
        }
        continue;
      }

      const expectedData = { ...originalNode.data };
      for (const field of INDIVIDUAL_DUMMY_FIELDS) delete expectedData[field];
      if (stableJson(expectedData) !== stableJson(cleanedNode.data)) {
        throw new Error(
          `Organizational fields changed for individual node ${originalNode.id}.`,
        );
      }
    }
  }
}

export function extractCharts(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.charts)) return payload.charts;
  if (Array.isArray(payload?.nodes) && Array.isArray(payload?.edges)) {
    return [payload];
  }
  throw new Error(
    'Expected a chart backup, an array of charts, or an object with a charts array.',
  );
}
