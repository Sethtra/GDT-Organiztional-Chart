// Shared node-type metadata — used by OrgNode (the badge rendered on the
// chart) and PropertiesPanel (the type picker + live preview), so both
// always agree on labels/colors instead of keeping two copies in sync by hand.
export const TYPE_META = {
  orgNode: { label: "ORG NODE", accent: "#38bdf8" },
  individualNode: { label: "INDIVIDUAL", accent: "#f59e0b", isPerson: true },
};

export const TYPE_OPTIONS = Object.keys(TYPE_META);
