export type PreviewUnitType = "department" | "district" | "province";

export interface PreviewOffice {
  id: string;
  name: string;
}

export interface PreviewOrgUnit {
  id: string;
  name: string;
  nameEn: string;
  type: PreviewUnitType;
  offices: PreviewOffice[];
}

const office = (id: string, name: string): PreviewOffice => ({ id, name });

export const ADMIN_ORG_STRUCTURE_PREVIEW_DATA: PreviewOrgUnit[] = [
  {
    id: "dept-admin",
    name: "នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក",
    nameEn: "Administration and Personnel Department",
    type: "department",
    offices: [
      office("off-admin-1", "ការិយាល័យរដ្ឋបាល"),
      office("off-admin-2", "ការិយាល័យបុគ្គលិក"),
      office("off-admin-3", "ការិយាល័យទំនាក់ទំនង"),
      office("off-admin-4", "ការិយាល័យបណ្ណសារ"),
      office("off-admin-5", "ការិយាល័យសន្តិសុខ"),
      office("off-admin-6", "ការិយាល័យសេវាទូទៅ"),
      office("off-admin-7", "ការិយាល័យផ្គត់ផ្គង់"),
    ],
  },
  {
    id: "dept-planning",
    name: "នាយកដ្ឋានផែនការ និងហិរញ្ញវត្ថុ",
    nameEn: "Planning and Finance Department",
    type: "department",
    offices: [
      office("off-planning-1", "ការិយាល័យផែនការ"),
      office("off-planning-2", "ការិយាល័យថវិកា"),
      office("off-planning-3", "ការិយាល័យគណនេយ្យ"),
      office("off-planning-4", "ការិយាល័យលទ្ធកម្ម"),
    ],
  },
  {
    id: "dept-it",
    name: "នាយកដ្ឋានព័ត៌មានវិទ្យា",
    nameEn: "Information Technology Department",
    type: "department",
    offices: [
      office("off-it-1", "ការិយាល័យប្រព័ន្ធ"),
      office("off-it-2", "ការិយាល័យទិន្នន័យ"),
      office("off-it-3", "ការិយាល័យបណ្ដាញ"),
      office("off-it-4", "ការិយាល័យសន្តិសុខឌីជីថល"),
      office("off-it-5", "ការិយាល័យគាំទ្របច្ចេកទេស"),
    ],
  },
  {
    id: "dept-policy",
    name: "នាយកដ្ឋានគោលនយោបាយពន្ធ",
    nameEn: "Tax Policy Department",
    type: "department",
    offices: [
      office("off-policy-1", "ការិយាល័យគោលនយោបាយ"),
      office("off-policy-2", "ការិយាល័យច្បាប់ពន្ធ"),
      office("off-policy-3", "ការិយាល័យស្ថិតិ"),
    ],
  },
  {
    id: "dept-research",
    name: "នាយកដ្ឋានស្រាវជ្រាវ",
    nameEn: "Research Department",
    type: "department",
    offices: [
      office("off-research-1", "ការិយាល័យស្រាវជ្រាវសេដ្ឋកិច្ច"),
      office("off-research-2", "ការិយាល័យវិភាគទិន្នន័យ"),
    ],
  },
  {
    id: "dept-compliance",
    name: "នាយកដ្ឋានអនុលោមភាព",
    nameEn: "Compliance Department",
    type: "department",
    offices: [
      office("off-compliance-1", "ការិយាល័យត្រួតពិនិត្យ"),
      office("off-compliance-2", "ការិយាល័យវាយតម្លៃហានិភ័យ"),
      office("off-compliance-3", "ការិយាល័យអនុលោមភាព"),
      office("off-compliance-4", "ការិយាល័យដោះស្រាយបណ្ដឹង"),
    ],
  },
  {
    id: "dept-audit",
    name: "នាយកដ្ឋានសវនកម្មសហគ្រាស",
    nameEn: "Enterprise Audit Department",
    type: "department",
    offices: [
      office("off-audit-1", "ការិយាល័យសវនកម្មទី១"),
      office("off-audit-2", "ការិយាល័យសវនកម្មទី២"),
      office("off-audit-3", "ការិយាល័យសវនកម្មទី៣"),
    ],
  },
  {
    id: "dept-large-taxpayer",
    name: "នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធធំ",
    nameEn: "Large Taxpayer Department",
    type: "department",
    offices: [
      office("off-large-1", "ការិយាល័យចុះបញ្ជី"),
      office("off-large-2", "ការិយាល័យសេវាអ្នកជាប់ពន្ធ"),
      office("off-large-3", "ការិយាល័យប្រមូលបំណុលពន្ធ"),
      office("off-large-4", "ការិយាល័យតាមដានការប្រកាស"),
      office("off-large-5", "ការិយាល័យវិភាគហានិភ័យ"),
    ],
  },
  {
    id: "district-daun-penh",
    name: "សាខាពន្ធដារខណ្ឌដូនពេញ",
    nameEn: "Daun Penh District Tax Branch",
    type: "district",
    offices: [
      office("off-daun-penh-1", "ការិយាល័យរដ្ឋបាល"),
      office("off-daun-penh-2", "ការិយាល័យសេវាអ្នកជាប់ពន្ធ"),
    ],
  },
  {
    id: "district-chamkar-mon",
    name: "សាខាពន្ធដារខណ្ឌចំការមន",
    nameEn: "Chamkar Mon District Tax Branch",
    type: "district",
    offices: [office("off-chamkar-mon-1", "ការិយាល័យសេវាអ្នកជាប់ពន្ធ")],
  },
  {
    id: "province-kandal",
    name: "សាខាពន្ធដារខេត្តកណ្ដាល",
    nameEn: "Kandal Provincial Tax Branch",
    type: "province",
    offices: [
      office("off-kandal-1", "ការិយាល័យរដ្ឋបាល"),
      office("off-kandal-2", "ការិយាល័យចុះបញ្ជី"),
      office("off-kandal-3", "ការិយាល័យប្រមូលពន្ធ"),
    ],
  },
  {
    id: "province-siem-reap",
    name: "សាខាពន្ធដារខេត្តសៀមរាប",
    nameEn: "Siem Reap Provincial Tax Branch",
    type: "province",
    offices: [],
  },
];
