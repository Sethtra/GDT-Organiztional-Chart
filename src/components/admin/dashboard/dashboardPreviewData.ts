import type { LucideIcon } from "lucide-react";
import { Clock3 } from "lucide-react";

export type BadgeTone = "success" | "warning" | "info" | "neutral" | "danger";
export type TrendPeriod = "30d" | "90d" | "12m";

export interface DashboardKpi {
  label: string;
  value: string;
  detail: string;
  badge: string;
  tone: BadgeTone;
  icon: LucideIcon;
  highlighted?: boolean;
}

export interface DashboardTrend {
  label: string;
  values: number[];
  axis: string[];
  change: string;
}

export interface DepartmentCoverage {
  name: string;
  current: number;
  plan: number;
  status: string;
  tone: BadgeTone;
}

export interface DashboardActivity {
  initials: string;
  name: string;
  action: string;
  department: string;
  timestamp: string;
  status: string;
  tone: BadgeTone;
}

// Preview fixtures remain isolated from the live workforce totals.
export const DASHBOARD_ACTIONS_KPI: DashboardKpi = {
  label: "Actions due",
  value: "18",
  detail: "5 need attention today",
  badge: "Review",
  tone: "info",
  icon: Clock3,
  highlighted: true,
};

export const DASHBOARD_TRENDS: Record<TrendPeriod, DashboardTrend> = {
  "30d": {
    label: "Last 30 days",
    values: [1168, 1181, 1177, 1204, 1216, 1232, 1248],
    axis: ["01 Jul", "06 Jul", "11 Jul", "16 Jul", "21 Jul", "26 Jul", "31 Jul"],
    change: "+80 officers",
  },
  "90d": {
    label: "Last 90 days",
    values: [1128, 1144, 1160, 1172, 1198, 1215, 1248],
    axis: ["May", "15 May", "Jun", "15 Jun", "Jul", "15 Jul", "31 Jul"],
    change: "+120 officers",
  },
  "12m": {
    label: "Last 12 months",
    values: [1018, 1044, 1086, 1110, 1146, 1188, 1248],
    axis: ["Aug", "Oct", "Dec", "Feb", "Apr", "Jun", "Jul"],
    change: "+230 officers",
  },
};

export const DASHBOARD_DEPARTMENTS: DepartmentCoverage[] = [
  {
    name: "Large Taxpayer Operations",
    current: 236,
    plan: 248,
    status: "On track",
    tone: "success",
  },
  {
    name: "Provincial Tax Operations",
    current: 292,
    plan: 310,
    status: "On track",
    tone: "success",
  },
  {
    name: "Digital Tax Systems",
    current: 184,
    plan: 198,
    status: "On track",
    tone: "info",
  },
  {
    name: "Audit & Enterprise",
    current: 164,
    plan: 190,
    status: "Needs review",
    tone: "warning",
  },
];

export const DASHBOARD_ACTIVITY: DashboardActivity[] = [
  {
    initials: "SR",
    name: "Sreyneang Ros",
    action: "Position assignment approved",
    department: "Finance & Personnel",
    timestamp: "10:42",
    status: "Completed",
    tone: "success",
  },
  {
    initials: "VK",
    name: "Vuthy Kim",
    action: "Transfer request submitted",
    department: "Large Taxpayer Operations",
    timestamp: "09:18",
    status: "In review",
    tone: "warning",
  },
  {
    initials: "CS",
    name: "Chantha Sok",
    action: "Skills profile updated",
    department: "Digital Tax Systems",
    timestamp: "Yesterday",
    status: "Published",
    tone: "info",
  },
  {
    initials: "MP",
    name: "Malis Pech",
    action: "New officer record created",
    department: "Provincial Tax Operations",
    timestamp: "Yesterday",
    status: "Draft",
    tone: "neutral",
  },
];
