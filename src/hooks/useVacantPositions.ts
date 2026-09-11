import { useEffect, useState } from "react";

import type { PromotionReadiness } from "../contracts/hr";
import { supabase } from "../supabaseClient";

export interface VacantPositionsState {
  /** True when at least one vacant position's job_title_id matches
   *  the targetJobTitle of one or more promotion-ready candidates.
   *  Only when this is true should the Qualify Candidate list be shown. */
  hasMatchingVacancy: boolean;
  loading: boolean;
  hasError: boolean;
}

/**
 * Determines whether there is at least one vacant position whose job title
 * matches the TARGET job title of the given promotion-ready candidates.
 *
 * Logic:
 *  1. Collect all unique targetJobTitle IDs from the ready candidates.
 *  2. Query `positions` whose `job_title_id` is in that set AND that have
 *     no active assignment (no position_assignments row with end_date IS NULL).
 *
 * This prevents showing candidates when the only vacant slot is at their
 * CURRENT rank (e.g. a vacant មន្ត្រី position when candidates are being
 * promoted FROM មន្ត្រី, not TO it).
 */
export function useVacantPositions(
  candidates: PromotionReadiness[] = [],
): VacantPositionsState {
  const [hasMatchingVacancy, setHasMatchingVacancy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Derive the set of job title IDs the candidates are being promoted TO.
    const targetTitleIds = [
      ...new Set(
        (candidates ?? [])
          .map((c) => c.targetJobTitle?.id)
          .filter((id): id is string => Boolean(id)),
      ),
    ];

    // If no candidates or none have a target title, no relevant vacancy possible.
    if (targetTitleIds.length === 0) {
      setHasMatchingVacancy(false);
      setLoading(false);
      return;
    }

    async function checkMatchingVacancy(): Promise<boolean> {
      // Step 1: Get all position IDs that currently have an active occupant.
      const { data: occupiedData, error: occupiedError } = await supabase
        .from("position_assignments")
        .select("position_id")
        .is("end_date", null);

      if (occupiedError) throw occupiedError;

      const occupiedIds = (occupiedData ?? []).map(
        (row) => row.position_id as string,
      );

      // Step 2: Check if any position with the target job title is NOT occupied.
      let query = supabase
        .from("positions")
        .select("id", { count: "exact", head: true })
        .in("job_title_id", targetTitleIds);

      if (occupiedIds.length > 0) {
        query = query.not(
          "id",
          "in",
          `(${occupiedIds.join(",")})`,
        ) as typeof query;
      }

      const { count, error: countError } = await query;
      if (countError) throw countError;

      return (count ?? 0) > 0;
    }

    checkMatchingVacancy()
      .then((result) => {
        if (cancelled) return;
        setHasMatchingVacancy(result);
        setHasError(false);
      })
      .catch(() => {
        if (!cancelled) setHasError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [candidates]);

  return { hasMatchingVacancy, loading, hasError };
}
