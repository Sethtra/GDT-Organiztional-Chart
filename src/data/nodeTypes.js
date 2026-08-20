// Shared node-type metadata — used by OrgNode (the badge rendered on the
// chart) and PropertiesPanel (the type picker + live preview), so both
// always agree on labels/colors instead of keeping two copies in sync by hand.
export const TYPE_META = {
  orgNode: { label: "ORG", accent: "#136232", template: "unit", shape: "org" },
  individualNode: {
    label: "INDIVIDUAL",
    accent: "#136232",
    template: "person",
    shape: "person",
    isPerson: true,
  },
  roundNode: { label: "ROUND", accent: "#0d9488", template: "shape", shape: "round" },
  diamondNode: { label: "DIAMOND", accent: "#7c3aed", template: "shape", shape: "diamond" },
  squareNode: { label: "SQUARE", accent: "#334155", template: "shape", shape: "square" },
};

export const TYPE_OPTIONS = Object.keys(TYPE_META);

export const POSITION_OPTIONS = [
  "ប្រធាននាយកដ្ឋាន",
  "អនុប្រធាននាយកដ្ឋាន",
  "ប្រធានការិយាល័យ",
  "អនុប្រធានការិយាល័យ",
  "មន្ត្រី",
  "មន្ត្រីកិច្ចសន្យា",
  "មន្ត្រីកម្មសិក្សា",
];

export const DEFAULT_POSITION_EN_NAMES = {
  "ប្រធាននាយកដ្ឋាន": "Department Director",
  "អនុប្រធាននាយកដ្ឋាន": "Deputy Department Director",
  "ប្រធានការិយាល័យ": "Office Chief",
  "អនុប្រធានការិយាល័យ": "Deputy Office Chief",
  "មន្ត្រី": "Officer",
  "មន្ត្រីកិច្ចសន្យា": "Contract Officer",
  "មន្ត្រីកម្មសិក្សា": "Trainee Officer",
};

export function getPositionNameEn(name, nameEn) {
  return (nameEn && String(nameEn).trim()) || DEFAULT_POSITION_EN_NAMES[name] || "";
}


// Deliberately NO automatic rank/tier system here.
//
// An earlier version derived a "tier" from the unit's name and its depth in the
// chart, then drew each tier at a different fixed width. That was wrong twice
// over: it guessed at a hierarchy the author never declared, and the per-tier
// width made nodes un-resizable. Every node is now the same card, and how it
// looks is entirely the author's call — `badgeText` for the label, `color` for
// the band. Size belongs to whoever is dragging the resize handle.
