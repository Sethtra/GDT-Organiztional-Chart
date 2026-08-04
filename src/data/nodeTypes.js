// Shared node-type metadata — used by OrgNode (the badge rendered on the
// chart) and PropertiesPanel (the type picker + live preview), so both
// always agree on labels/colors instead of keeping two copies in sync by hand.
export const TYPE_META = {
  orgNode: { label: "ORG NODE", accent: "#136232" },
  individualNode: { label: "INDIVIDUAL", accent: "#136232", isPerson: true },
};

export const TYPE_OPTIONS = Object.keys(TYPE_META);

export const POSITION_OPTIONS = [
  "ប្រធាននាយកដ្ឋាន",
  "អនុប្រធាននាយកដ្ឋាន",
  "ប្រធានការិយាល័យ",
  "អនុប្រធានការិយាល័យ",
  "មន្ត្រី",
];

// Deliberately NO automatic rank/tier system here.
//
// An earlier version derived a "tier" from the unit's name and its depth in the
// chart, then drew each tier at a different fixed width. That was wrong twice
// over: it guessed at a hierarchy the author never declared, and the per-tier
// width made nodes un-resizable. Every node is now the same card, and how it
// looks is entirely the author's call — `badgeText` for the label, `color` for
// the band. Size belongs to whoever is dragging the resize handle.
