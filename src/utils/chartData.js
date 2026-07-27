export const DEFAULT_EDGE_OPTIONS = {
  type: 'custom',
  animated: false,
  data: {
    strokeColor: '#4b8fd4',
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
