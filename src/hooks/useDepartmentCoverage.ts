import { useEffect, useState } from "react";

import { listHrStaff } from "../services/staffService";
import { supabase } from "../supabaseClient";
import type { BadgeTone } from "../components/admin/dashboard/dashboardPreviewData";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DepartmentCoverageRow {
  /** org_unit id */
  id: string;
  /** Khmer name */
  name: string;
  /** English name (may be null) */
  nameEn: string | null;
  /** Shortcut code (may be null) */
  code: string | null;
  /** Live active officer count in this unit */
  current: number;
  /** "Approved plan" = same as current (no separate staffing plan exists yet) */
  plan: number;
  /** 0-100 */
  coverage: number;
  status: string;
  tone: BadgeTone;
}

// ─── Status derivation ────────────────────────────────────────────────────────

function deriveTone(current: number, plan: number): BadgeTone {
  if (plan === 0) return "neutral";
  const pct = (current / plan) * 100;
  if (pct >= 90) return "success";
  if (pct >= 70) return "warning";
  return "danger";
}

function deriveStatus(current: number, plan: number): string {
  if (plan === 0 || current === 0) return "No officers";
  const pct = (current / plan) * 100;
  if (pct >= 90) return "On track";
  if (pct >= 70) return "Needs review";
  return "Under-staffed";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface DepartmentCoverageState {
  rows: DepartmentCoverageRow[];
  loading: boolean;
  hasError: boolean;
}

export function useDepartmentCoverage(): DepartmentCoverageState {
  const [rows, setRows] = useState<DepartmentCoverageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        // Fetch org units and active staff in parallel
        const [staffList, unitsRes] = await Promise.all([
          listHrStaff(false),
          supabase
            .from("org_units")
            .select("id, name, name_en, code, type, sort_order")
            .order("sort_order", { ascending: true }),
        ]);

        if (cancelled) return;

        if (unitsRes.error) throw unitsRes.error;

        const units = (unitsRes.data ?? []) as {
          id: string;
          name: string;
          name_en: string | null;
          code: string | null;
          type: string;
          sort_order: number;
        }[];

        // Count active staff per departmentId from their placement
        const countByUnitId = new Map<string, number>();
        for (const person of staffList) {
          const deptId = person.organizationalPlacement?.departmentId;
          if (deptId) {
            countByUnitId.set(deptId, (countByUnitId.get(deptId) ?? 0) + 1);
          }
        }

        const derived: DepartmentCoverageRow[] = units.map((unit) => {
          const current = countByUnitId.get(unit.id) ?? 0;
          // Use current count as the "approved plan" (no separate plan exists)
          const plan = current;
          const coverage = plan > 0 ? Math.round((current / plan) * 100) : 0;
          return {
            id: unit.id,
            name: unit.name,
            nameEn: unit.name_en ?? null,
            code: unit.code ?? null,
            current,
            plan,
            coverage,
            status: deriveStatus(current, plan),
            tone: deriveTone(current, plan),
          };
        });

        // Sort: departments with most officers first, then alphabetically
        derived.sort((a, b) => {
          if (b.current !== a.current) return b.current - a.current;
          return a.name.localeCompare(b.name);
        });

        if (!cancelled) {
          setRows(derived);
          setHasError(false);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHasError(true);
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  return { rows, loading, hasError };
}
