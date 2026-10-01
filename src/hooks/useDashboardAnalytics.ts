import { useMemo } from "react";

import type { HrStaffDirectoryRecord } from "../contracts/hr";
import { toIsoDate } from "../utils/workforceTrend";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JobTitleRow {
  id: string;
  name: string;
  nameEn: string | null;
  rankOrder: number;
  count: number;
}

export interface GenderByDepartmentRow {
  departmentId: string;
  departmentName: string;
  male: number;
  female: number;
  other: number;
  total: number;
}

export interface EducationRow {
  label: string;
  count: number;
}

export interface AgeBandRow {
  band: string;
  count: number;
}

export interface RecentMovement {
  id: string;
  name: string;
  nameEn: string | null;
  department: string | null;
  date: string;
  type: "joined" | "departed";
}

export interface DashboardAnalytics {
  jobTitleDistribution: JobTitleRow[];
  genderByDepartment: GenderByDepartmentRow[];
  educationDistribution: EducationRow[];
  ageBands: AgeBandRow[];
  retirementSoonCount: number;
  recentJoiners: RecentMovement[];
  recentDepartures: RecentMovement[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ageFromDateOfBirth(dob: string, today: string): number {
  const birthYear = Number.parseInt(dob.slice(0, 4), 10);
  const birthMonth = Number.parseInt(dob.slice(5, 7), 10);
  const birthDay = Number.parseInt(dob.slice(8, 10), 10);
  const todayYear = Number.parseInt(today.slice(0, 4), 10);
  const todayMonth = Number.parseInt(today.slice(5, 7), 10);
  const todayDay = Number.parseInt(today.slice(8, 10), 10);

  let age = todayYear - birthYear;
  if (
    todayMonth < birthMonth ||
    (todayMonth === birthMonth && todayDay < birthDay)
  ) {
    age -= 1;
  }
  return age;
}

function ageBandLabel(age: number): string {
  if (age < 20) return "< 20";
  if (age < 30) return "20–29";
  if (age < 40) return "30–39";
  if (age < 50) return "40–49";
  if (age < 60) return "50–59";
  return "60+";
}

const AGE_BAND_ORDER = ["< 20", "20–29", "30–39", "40–49", "50–59", "60+"];

/**
 * Normalizes freeform education strings into broad categories.
 * Education field is freeform text — common patterns include "Bachelor",
 * "Master", "PhD", "High School", Khmer equivalents, etc.
 */
function normalizeEducation(raw: string | null): string {
  if (!raw || !raw.trim()) return "Not specified";
  const lower = raw.trim().toLowerCase();

  if (lower.includes("phd") || lower.includes("doctor") || lower.includes("បណ្ឌិត")) {
    return "Doctorate / PhD";
  }
  if (lower.includes("master") || lower.includes("mba") || lower.includes("អនុបណ្ឌិត")) {
    return "Master's";
  }
  if (
    lower.includes("bachelor") ||
    lower.includes("licence") ||
    lower.includes("បរិញ្ញាបត្រ") ||
    lower.includes("b.a") ||
    lower.includes("b.s")
  ) {
    return "Bachelor's";
  }
  if (lower.includes("associate") || lower.includes("diploma") || lower.includes("វិញ្ញាបនបត្រ")) {
    return "Associate / Diploma";
  }
  if (lower.includes("high school") || lower.includes("secondary") || lower.includes("មធ្យម")) {
    return "High School";
  }
  return "Other";
}

// ─── Core computation ─────────────────────────────────────────────────────────

function computeAnalytics(
  staffList: HrStaffDirectoryRecord[],
  today: Date = new Date(),
): DashboardAnalytics {
  const todayIso = toIsoDate(today);
  const active = staffList.filter((s) => s.status === "active");

  // ── 1. Job title distribution ───────────────────────────────────────────
  const titleMap = new Map<
    string,
    { name: string; nameEn: string | null; rankOrder: number; count: number }
  >();
  for (const person of active) {
    if (!person.jobTitle) continue;
    const existing = titleMap.get(person.jobTitle.id);
    if (existing) {
      existing.count += 1;
    } else {
      titleMap.set(person.jobTitle.id, {
        name: person.jobTitle.name,
        nameEn: person.jobTitle.nameEn,
        rankOrder: person.jobTitle.rankOrder,
        count: 1,
      });
    }
  }
  const jobTitleDistribution: JobTitleRow[] = [...titleMap.entries()]
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);

  // ── 2. Gender by department ─────────────────────────────────────────────
  const deptGender = new Map<
    string,
    { name: string; male: number; female: number; other: number }
  >();
  for (const person of active) {
    const deptId = person.organizationalPlacement?.departmentId;
    const deptName = person.organizationalPlacement?.departmentName;
    if (!deptId || !deptName) continue;

    if (!deptGender.has(deptId)) {
      deptGender.set(deptId, { name: deptName, male: 0, female: 0, other: 0 });
    }
    const row = deptGender.get(deptId)!;
    if (person.gender === "male") row.male += 1;
    else if (person.gender === "female") row.female += 1;
    else row.other += 1;
  }
  const genderByDepartment: GenderByDepartmentRow[] = [...deptGender.entries()]
    .map(([departmentId, data]) => ({
      departmentId,
      departmentName: data.name,
      male: data.male,
      female: data.female,
      other: data.other,
      total: data.male + data.female + data.other,
    }))
    .sort((a, b) => b.total - a.total);

  // ── 3. Education distribution ───────────────────────────────────────────
  const eduMap = new Map<string, number>();
  for (const person of active) {
    const label = normalizeEducation(person.education);
    eduMap.set(label, (eduMap.get(label) ?? 0) + 1);
  }
  const educationDistribution: EducationRow[] = [...eduMap.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count);

  // ── 4. Age distribution & retirement forecast ───────────────────────────
  const ageCounts = new Map<string, number>();
  for (const band of AGE_BAND_ORDER) ageCounts.set(band, 0);

  let retirementSoonCount = 0;
  const RETIREMENT_AGE = 60;
  const WARNING_YEARS = 2;

  for (const person of active) {
    if (!person.dateOfBirth) continue;
    const age = ageFromDateOfBirth(person.dateOfBirth, todayIso);
    if (age < 0) continue;

    const band = ageBandLabel(age);
    ageCounts.set(band, (ageCounts.get(band) ?? 0) + 1);

    if (age >= RETIREMENT_AGE - WARNING_YEARS) {
      retirementSoonCount += 1;
    }
  }
  const ageBands: AgeBandRow[] = AGE_BAND_ORDER.map((band) => ({
    band,
    count: ageCounts.get(band) ?? 0,
  }));

  // ── 7. Recent joiners & departures (last 90 days) ──────────────────────
  const ninetyDaysAgo = new Date(today);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const ninetyDaysAgoIso = toIsoDate(ninetyDaysAgo);

  const recentJoiners: RecentMovement[] = [];
  const recentDepartures: RecentMovement[] = [];

  for (const person of staffList) {
    const dept =
      person.organizationalPlacement?.departmentName ?? null;

    if (
      person.joinedDate &&
      person.joinedDate >= ninetyDaysAgoIso &&
      person.joinedDate <= todayIso &&
      person.status === "active"
    ) {
      recentJoiners.push({
        id: person.id,
        name: person.name,
        nameEn: person.nameEn,
        department: dept,
        date: person.joinedDate,
        type: "joined",
      });
    }
    if (
      person.retiredDate &&
      person.retiredDate >= ninetyDaysAgoIso &&
      person.retiredDate <= todayIso &&
      person.status === "archived"
    ) {
      recentDepartures.push({
        id: person.id,
        name: person.name,
        nameEn: person.nameEn,
        department: dept,
        date: person.retiredDate,
        type: "departed",
      });
    }
  }

  recentJoiners.sort((a, b) => b.date.localeCompare(a.date));
  recentDepartures.sort((a, b) => b.date.localeCompare(a.date));

  return {
    jobTitleDistribution,
    genderByDepartment,
    educationDistribution,
    ageBands,
    retirementSoonCount,
    recentJoiners,
    recentDepartures,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDashboardAnalytics(
  staffList: HrStaffDirectoryRecord[],
  loading: boolean,
): DashboardAnalytics {
  return useMemo(
    () =>
      loading || staffList.length === 0
        ? {
            jobTitleDistribution: [],
            genderByDepartment: [],
            educationDistribution: [],
            ageBands: [],
            retirementSoonCount: 0,
            recentJoiners: [],
            recentDepartures: [],
          }
        : computeAnalytics(staffList),
    [staffList, loading],
  );
}
