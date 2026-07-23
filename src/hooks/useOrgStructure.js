import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { supabase } from '../supabaseClient';

/**
 * Hook to fetch and cache the organizational structure (units + offices)
 * from the Supabase `org_units` and `org_offices` tables.
 *
 * Uses a module-level store so ALL components share one cache instantly —
 * no loading flash when switching screens or re-mounting components.
 *
 * Returns:
 *   units       – array of { id, name, type, sort_order, offices: [...] }
 *   loading     – true only on the very first fetch (never again after data loads)
 *   error       – error message string (or null)
 *   refetch     – call to force re-fetch from DB
 *   getOfficesForUnit(unitName) – returns offices[] for the given unit name
 */

// ── Module-level store (shared across all hook instances) ──────────
let _store = {
  units: [],
  loading: false,
  error: null,
  fetched: false,   // true once we've fetched at least once
};
let _listeners = new Set();
let _fetchPromise = null;  // dedup concurrent fetches

function _notify() {
  _listeners.forEach(fn => fn());
}

function _subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

function _getSnapshot() {
  return _store;
}

async function _fetchOrgData(force = false) {
  // Already have data and not forcing? Skip entirely.
  if (!force && _store.fetched && _store.units.length > 0) return;

  // Dedup: if a fetch is already in-flight, just wait for it
  if (_fetchPromise) return _fetchPromise;

  // Only show loading if we have NO data at all (first load)
  if (!_store.fetched) {
    _store = { ..._store, loading: true };
    _notify();
  }

  _fetchPromise = (async () => {
    try {
      const { data, error: fetchErr } = await supabase
        .from('org_units')
        .select(`
          id, name, type, sort_order,
          org_offices ( id, name, sort_order )
        `)
        .order('sort_order', { ascending: true });

      if (fetchErr) throw fetchErr;

      const sorted = (data || []).map(unit => ({
        ...unit,
        offices: (unit.org_offices || []).sort((a, b) => a.sort_order - b.sort_order),
      }));

      _store = { units: sorted, loading: false, error: null, fetched: true };
    } catch (e) {
      console.error('useOrgStructure fetch error:', e);
      _store = { ..._store, loading: false, error: e.message || 'Failed to load org structure', fetched: true };
    } finally {
      _fetchPromise = null;
      _notify();
    }
  })();

  return _fetchPromise;
}

// ── Public hook ────────────────────────────────────────────────────
export function useOrgStructure() {
  const store = useSyncExternalStore(_subscribe, _getSnapshot);

  // Trigger initial fetch (only once, deduped)
  useEffect(() => { _fetchOrgData(); }, []);

  /** Returns offices[] for a given unit name. */
  const getOfficesForUnit = useCallback((unitName) => {
    if (!unitName) return [];
    const unit = (store.units || []).find(u => u.name === unitName);
    return unit?.offices || [];
  }, [store.units]);

  /** Force re-fetch from DB (used by admin page after CRUD ops). */
  const refetch = useCallback(() => {
    _store = { ..._store, fetched: false };
    return _fetchOrgData(true);
  }, []);

  return {
    units: store.units,
    loading: store.loading,
    error: store.error,
    refetch,
    getOfficesForUnit,
  };
}
