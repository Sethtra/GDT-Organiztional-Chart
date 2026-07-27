import { useCallback, useEffect, useSyncExternalStore } from "react";
import { z } from "zod";

import { HR_FEATURES_ENABLED } from "../config/hrFeatures";
import { supabase } from "../supabaseClient";

const OfficeRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  sort_order: z.number(),
});

const UnitRowSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
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
      const res = HR_FEATURES_ENABLED
        ? await supabase
            .from("org_units")
            .select(`
              id, name, type, sort_order, parent_id,
              org_offices ( id, name, sort_order )
            `)
            .order("sort_order", { ascending: true })
        : await supabase
            .from("org_units")
            .select(`
              id, name, type, sort_order,
              org_offices ( id, name, sort_order )
            `)
            .order("sort_order", { ascending: true });

      if (
        HR_FEATURES_ENABLED &&
        res.error &&
        (res.error.code === "42703" || res.error.code === "PGRST204")
      ) {
        // Fallback for legacy DB schema prior to migration_org_structure.sql
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
        if (res.error) throw res.error;
        rawData = res.data;
      }

      const parsed = z.array(UnitRowSchema).safeParse(rawData ?? []);
      if (!parsed.success) {
        throw new Error("The organization structure response was malformed.");
      }
      const units = parsed.data.map((unit) => ({
        id: unit.id,
        name: unit.name,
        type: unit.type,
        sort_order: unit.sort_order,
        ...(unit.parent_id !== undefined
          ? { parent_id: unit.parent_id }
          : {}),
        offices: [...unit.org_offices].sort(
          (left, right) => left.sort_order - right.sort_order,
        ),
      }));
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
