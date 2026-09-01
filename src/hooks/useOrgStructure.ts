import { useCallback, useEffect, useSyncExternalStore } from "react";
import { z } from "zod";

import { HR_FEATURES_ENABLED } from "../config/hrFeatures";
import { supabase } from "../supabaseClient";

const DEFAULT_UNIT_DETAILS: Record<string, { nameEn: string; code: string }> = {
  "នាយកដ្ឋានរដ្ឋបាល និងកិច្ចការទូទៅ": {
    nameEn: "Department of Administration and General Affairs",
    code: "DAGA",
  },
  "នាយកដ្ឋានរដ្ឋបាល និងបុគ្គលិក": {
    nameEn: "Administration and Personnel Department",
    code: "APD",
  },
  "នាយកដ្ឋានហិរញ្ញវត្ថុ និងបុគ្គលិក": {
    nameEn: "Department of Finance and Personnel",
    code: "DFP",
  },
  "នាយកដ្ឋានហិរញ្ញវត្ថុ": {
    nameEn: "Department of Finance and Personnel",
    code: "DFP",
  },
  "នាយកដ្ឋានផែនការ និងហិរញ្ញវត្ថុ": {
    nameEn: "Planning and Finance Department",
    code: "PFD",
  },
  "នាយកដ្ឋាននីតិកម្មនយោបាយសារពើពន្ធ និងសហប្រតិបត្តិការពន្ធដារអន្តរជាតិ": {
    nameEn: "Department of Tax Policy, Legislation and International Tax Cooperation",
    code: "DTPLIC",
  },
  "នាយកដ្ឋានពន្ធចលនទ្រព្យ និងអចលនទ្រព្យ": {
    nameEn: "Department of Movable and Immovable Property Tax",
    code: "DMIPT",
  },
  "នាយកដ្ឋានបច្ចេកវិទ្យាព័ត៌មាន": {
    nameEn: "Department of Information Technology",
    code: "DIT",
  },
  "នាយកដ្ឋានស៊ើបអង្កេតបទល្មើសពន្ធដារ": {
    nameEn: "Department of Tax Crime Investigation",
    code: "DTCI",
  },
  "នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធធំ": {
    nameEn: "Department of Large Taxpayers Management",
    code: "DLTM",
  },
  "នាយកដ្ឋានគ្រប់គ្រងអ្នកជាប់ពន្ធតូចនិងមធ្យម": {
    nameEn: "Department of Small and Medium Taxpayers Management",
    code: "DSMTM",
  },
  "នាយកដ្ឋានសវនកម្មសហគ្រាស": {
    nameEn: "Enterprise Audit Department",
    code: "EAD",
  },
  "សាលាជាតិពន្ធដារ": {
    nameEn: "National Tax School",
    code: "NTS",
  },
  "សវនកម្មពន្ធដារពិសេស": {
    nameEn: "Special Tax Audit Department",
    code: "STAD",
  },
  "នាយកដ្ឋានស្រាវជ្រាវ": {
    nameEn: "Research Department",
    code: "RD",
  },
  "នាយកដ្ឋានអនុលោមភាព": {
    nameEn: "Compliance Department",
    code: "CD",
  },
  "សាខាពន្ធដារខណ្ឌដូនពេញ": {
    nameEn: "Daun Penh District Tax Branch",
    code: "DPDTB",
  },
  "សាខាពន្ធដារខណ្ឌចំការមន": {
    nameEn: "Chamkar Mon District Tax Branch",
    code: "CMDTB",
  },
  "សាខាពន្ធដារខេត្តកណ្ដាល": {
    nameEn: "Kandal Provincial Tax Branch",
    code: "KPTB",
  },
  "សាខាពន្ធដារខេត្តសៀមរាប": {
    nameEn: "Siem Reap Provincial Tax Branch",
    code: "SRPTB",
  },
};

const OfficeRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number(),
});

const UnitRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  name_en: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  type: z.string(),
  sort_order: z.number(),
  parent_id: z.string().uuid().nullable().optional(),
  org_offices: z.array(OfficeRowSchema).default([]),
});

export interface OrgOffice {
  id: string;
  name: string;
  sort_order: number;
}

export interface OrgUnit {
  id: string;
  name: string;
  name_en?: string | null;
  nameEn?: string | null;
  code?: string | null;
  type: string;
  sort_order: number;
  parent_id?: string | null;
  offices: OrgOffice[];
}

interface OrgStructureStore {
  units: OrgUnit[];
  loading: boolean;
  error: string | null;
  fetched: boolean;
}

let store: OrgStructureStore = {
  units: [],
  loading: false,
  error: null,
  fetched: false,
};
const listeners = new Set<() => void>();
let fetchPromise: Promise<void> | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return store;
}

async function fetchOrgData(force = false): Promise<void> {
  if (!force && store.fetched && store.units.length > 0) return;
  if (fetchPromise) return fetchPromise;

  if (!store.fetched) {
    store = { ...store, loading: true };
    notify();
  }

  fetchPromise = (async () => {
    try {
      let rawData: unknown = null;
      const res = await supabase
        .from("org_units")
        .select(`
          id, name, name_en, code, type, sort_order, parent_id,
          org_offices ( id, name, sort_order )
        `)
        .order("sort_order", { ascending: true });

      if (res.error) {
        // Graceful fallback if name_en, code, or parent_id columns are not yet present
        const legacyRes = await supabase
          .from("org_units")
          .select(`
            id, name, type, sort_order,
            org_offices ( id, name, sort_order )
          `)
          .order("sort_order", { ascending: true });
        if (legacyRes.error) throw legacyRes.error;
        rawData = legacyRes.data;
      } else {
        rawData = res.data;
      }

      const parsed = z.array(UnitRowSchema).safeParse(rawData ?? []);
      if (!parsed.success) {
        throw new Error("The organization structure response was malformed.");
      }
      const units = parsed.data.map((unit) => {
        const fallback = DEFAULT_UNIT_DETAILS[unit.name];
        const nameEn = unit.name_en || fallback?.nameEn || null;
        const code = unit.code || fallback?.code || null;
        return {
          id: unit.id,
          name: unit.name,
          name_en: nameEn,
          nameEn: nameEn,
          code: code,
          type: unit.type,
          sort_order: unit.sort_order,
          ...(unit.parent_id !== undefined
            ? { parent_id: unit.parent_id }
            : {}),
          offices: [...unit.org_offices].sort(
            (left, right) => left.sort_order - right.sort_order,
          ),
        };
      });
      store = {
        units,
        loading: false,
        error: null,
        fetched: true,
      };
    } catch (error) {
      console.error("useOrgStructure fetch error:", error);
      store = {
        ...store,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load organization structure",
        fetched: true,
      };
    } finally {
      fetchPromise = null;
      notify();
    }
  })();

  return fetchPromise;
}

export function useOrgStructure() {
  const current = useSyncExternalStore(subscribe, getSnapshot);
  useEffect(() => {
    void fetchOrgData();
  }, []);

  const getOfficesForUnit = useCallback(
    (unitName: string): OrgOffice[] => {
      if (!unitName) return [];
      return (
        current.units.find((unit) => unit.name === unitName)?.offices ?? []
      );
    },
    [current.units],
  );

  const refetch = useCallback(async () => {
    store = { ...store, fetched: false };
    await fetchOrgData(true);
  }, []);

  return {
    units: current.units,
    loading: current.loading,
    error: current.error,
    refetch,
    getOfficesForUnit,
  };
}
