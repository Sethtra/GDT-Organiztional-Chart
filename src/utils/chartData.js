export const DEFAULT_EDGE_OPTIONS = {
  type: 'custom',
  animated: false,
  data: {
    // Neutral ink. Persisted as a hex (not a CSS token) because the properties
    // panel's colour picker round-trips this value, and this mid-grey clears
    // 3:1 against both the light paper ground and the dark one, so a new edge
    // is legible in either theme without the author touching it.
    strokeColor: '#737373',
    strokeWidth: 2,
    arrowType: 'closed',
    arrowStart: 'none',
    label: '',
  },
};

export function normalizeEdges(edges) {
  return (edges || []).map((edge) =>
    edge.type === 'custom'
      ? edge
      : {
          ...edge,
          type: 'custom',
          data: { ...DEFAULT_EDGE_OPTIONS.data, ...edge.data },
        },
  );
}

export function withoutRelationalIds(data = {}) {
  const {
    positionId: _positionId,
    dbStaffId: _dbStaffId,
    dbAssignmentId: _dbAssignmentId,
    ...detached
  } = data;

  if (Array.isArray(detached.history)) {
    detached.history = detached.history.map((record) => {
      const {
        dbStaffId: _historyStaffId,
        dbAssignmentId: _historyAssignmentId,
        ...historyRecord
      } = record || {};
      return historyRecord;
    });
  }

  return detached;
}
