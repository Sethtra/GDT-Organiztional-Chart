// React Flow format — flat nodes + edges, positions assigned by dagre
export const initialNodes = [
  // ── Level 0: Ministry ──────────────────────────────────────────
  {
    id: "ministry",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "ក្រសួងសេដ្ឋកិច្ច និងហិរញ្ញវត្ថុ",
      nameEn: "Ministry of Economy and Finance",
      orgType: "ministry",
      color: "#0f2044",
      description: "",
    },
  },

  // ── Level 1: General Department ────────────────────────────────
  {
    id: "gdt",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានពន្ធដារ",
      nameEn: "General Department of Taxation",
      orgType: "department",
      color: "#0e7d6e",
      description: "Central Department of Taxation",
    },
  },

  // ── Level 2: Deputy Divisions ─────────────────────────────────
  {
    id: "div-admin",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "អគ្គនាយករង ទទួលបន្ទុក ផ្នែករដ្ឋបាល",
      nameEn: "Deputy DG (Administration)",
      orgType: "division",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "div-ops",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "អគ្គនាយករង",
      nameEn: "Deputy Director General",
      orgType: "division",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "div-institute",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "វិទ្យាស្ថានពន្ធដារ",
      nameEn: "Tax Institute",
      orgType: "division",
      color: "#6d28d9",
      description: "",
    },
  },
  {
    id: "div-provincial",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "មន្ទីរពន្ធដារ រាជធានី-ខេត្ត",
      nameEn: "Provincial / Capital Tax Branch",
      orgType: "division",
      color: "#b45309",
      description: "",
    },
  },

  // ── Level 3: Departments under div-admin ──────────────────────
  {
    id: "dept-admin",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក",
      nameEn: "Dept. of Administration & Personnel",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "dept-planning",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានផែនការ និងហិរញ្ញវត្ថុ",
      nameEn: "Dept. of Planning & Finance",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "dept-it",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានព័ត៌មានវិទ្យា",
      nameEn: "Dept. of Information Technology",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },

  // ── Level 3: Departments under div-ops ────────────────────────
  {
    id: "dept-policy",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានគោលនយោបាយពន្ធ",
      nameEn: "Dept. of Tax Policy",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "dept-research",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានស្រាវជ្រាវ",
      nameEn: "Dept. of Research",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },
  {
    id: "dept-compliance",
    type: "orgNode",
    position: { x: 0, y: 0 },
    data: {
      name: "នាយកដ្ឋានអនុលោម",
      nameEn: "Dept. of Compliance",
      orgType: "department",
      color: "#1e5799",
      description: "",
    },
  },

  // ── Level 4: Offices under dept-admin ─────────────────────────
  { id: "off-a1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យរដ្ឋបាល", nameEn: "Administration Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-a2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យបុគ្គលិក", nameEn: "Personnel Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-a3", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យទំនាក់ទំនង", nameEn: "Public Relations Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-a4", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យបណ្ណសារ", nameEn: "Archive Office", orgType: "office", color: "#0369a1", description: "" } },

  // ── Level 4: Offices under dept-planning ──────────────────────
  { id: "off-p1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យផែនការ", nameEn: "Planning Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-p2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យថវិការ", nameEn: "Budget Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-p3", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យគណនេយ្យ", nameEn: "Accounting Office", orgType: "office", color: "#0369a1", description: "" } },

  // ── Level 4: Offices under dept-it ───────────────────────────
  { id: "off-it1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យប្រព័ន្ធ", nameEn: "Systems Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-it2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យទិន្នន័យ", nameEn: "Data Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-it3", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យបណ្ដាញ", nameEn: "Network Office", orgType: "office", color: "#0369a1", description: "" } },

  // ── Level 4: Offices under dept-policy ───────────────────────
  { id: "off-pol1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យគោលនយោបាយ", nameEn: "Policy Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-pol2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យច្បាប់ពន្ធ", nameEn: "Tax Law Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-pol3", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យស្ថិតិ", nameEn: "Statistics Office", orgType: "office", color: "#0369a1", description: "" } },

  // ── Level 4: Offices under dept-research ─────────────────────
  { id: "off-r1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យស្រាវជ្រាវ", nameEn: "Research Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-r2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យវិភាគ", nameEn: "Analysis Office", orgType: "office", color: "#0369a1", description: "" } },

  // ── Level 4: Offices under dept-compliance ────────────────────
  { id: "off-c1", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យប្រតិបត្តិការ", nameEn: "Operations Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-c2", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យត្រួតពិនិត្យ", nameEn: "Inspection Office", orgType: "office", color: "#0369a1", description: "" } },
  { id: "off-c3", type: "orgNode", position: { x: 0, y: 0 }, data: { name: "ការិយាល័យអនុលោម", nameEn: "Compliance Office", orgType: "office", color: "#0369a1", description: "" } },
];

// NOTE: raw edges only carry id/source/target — `type: "custom"` and default
// `data` are applied below. Without an explicit type, React Flow renders
// edges with its own built-in (non-customizable) edge component instead of
// CustomEdge, silently ignoring line-style, color, and dynamic-glue settings.
const rawInitialEdges = [
  // ministry → gdt
  { id: "e-min-gdt", source: "ministry", target: "gdt" },

  // gdt → divisions
  { id: "e-gdt-da", source: "gdt", target: "div-admin" },
  { id: "e-gdt-do", source: "gdt", target: "div-ops" },
  { id: "e-gdt-di", source: "gdt", target: "div-institute" },
  { id: "e-gdt-dp", source: "gdt", target: "div-provincial" },

  // div-admin → departments
  { id: "e-da-da", source: "div-admin", target: "dept-admin" },
  { id: "e-da-dp", source: "div-admin", target: "dept-planning" },
  { id: "e-da-di", source: "div-admin", target: "dept-it" },

  // div-ops → departments
  { id: "e-do-dp", source: "div-ops", target: "dept-policy" },
  { id: "e-do-dr", source: "div-ops", target: "dept-research" },
  { id: "e-do-dc", source: "div-ops", target: "dept-compliance" },

  // dept-admin → offices
  { id: "e-daa-1", source: "dept-admin", target: "off-a1" },
  { id: "e-daa-2", source: "dept-admin", target: "off-a2" },
  { id: "e-daa-3", source: "dept-admin", target: "off-a3" },
  { id: "e-daa-4", source: "dept-admin", target: "off-a4" },

  // dept-planning → offices
  { id: "e-dpl-1", source: "dept-planning", target: "off-p1" },
  { id: "e-dpl-2", source: "dept-planning", target: "off-p2" },
  { id: "e-dpl-3", source: "dept-planning", target: "off-p3" },

  // dept-it → offices
  { id: "e-dit-1", source: "dept-it", target: "off-it1" },
  { id: "e-dit-2", source: "dept-it", target: "off-it2" },
  { id: "e-dit-3", source: "dept-it", target: "off-it3" },

  // dept-policy → offices
  { id: "e-dpol-1", source: "dept-policy", target: "off-pol1" },
  { id: "e-dpol-2", source: "dept-policy", target: "off-pol2" },
  { id: "e-dpol-3", source: "dept-policy", target: "off-pol3" },

  // dept-research → offices
  { id: "e-dr-1", source: "dept-research", target: "off-r1" },
  { id: "e-dr-2", source: "dept-research", target: "off-r2" },

  // dept-compliance → offices
  { id: "e-dc-1", source: "dept-compliance", target: "off-c1" },
  { id: "e-dc-2", source: "dept-compliance", target: "off-c2" },
  { id: "e-dc-3", source: "dept-compliance", target: "off-c3" },
];

export const initialEdges = rawInitialEdges.map((e) => ({
  ...e,
  type: "custom",
  data: { strokeColor: "#4b8fd4", strokeWidth: 2, arrowType: "closed", arrowStart: "none", label: "", dynamic: true },
}));
