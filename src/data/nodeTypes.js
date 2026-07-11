// Shared node-type metadata — used by OrgNode (the badge rendered on the
// chart) and PropertiesPanel (the type picker + live preview), so both
// always agree on labels/colors instead of keeping two copies in sync by hand.
export const TYPE_META = {
  ministry: { label: "MINISTRY", accent: "#d4af37" },
  department: { label: "DEPARTMENT", accent: "#38bdf8" },
  division: { label: "DIVISION", accent: "#a78bfa" },
  office: { label: "OFFICE", accent: "var(--badge-office)" },
  simple: { label: "", accent: "#94a3b8" },
  // Staff position badges — isPerson switches OrgNode to the compact
  // person-card layout (name + position + team size only).
  head: { label: "ប្រធាននាយកដ្ឋាន", accent: "#f59e0b", isPerson: true },
  deputy: { label: "អនុប្រធាននាយកដ្ឋាន", accent: "#fbbf24", isPerson: true },
  bureau_chief: { label: "ប្រធានការិយាល័យ", accent: "#f43f5e", isPerson: true },
  deputy_bureau_chief: { label: "អនុប្រធានការិយាល័យ", accent: "#fb7185", isPerson: true },
  officer: { label: "មន្ត្រី", accent: "#5eead4", isPerson: true },
};

export const TYPE_OPTIONS = Object.keys(TYPE_META);
