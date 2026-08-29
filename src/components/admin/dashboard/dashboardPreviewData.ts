import type { LucideIcon } from "lucide-react";
import { Clock3 } from "lucide-react";

export type BadgeTone = "success" | "warning" | "info" | "neutral" | "danger";

export interface DashboardKpi {
  label: string;
  value: string;
  detail: string;
  badge: string;
  tone: BadgeTone;
  icon: LucideIcon;
  highlighted?: boolean;
}

export interface DepartmentCoverage {
  name: string;
  current: number;
  plan: number;
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
