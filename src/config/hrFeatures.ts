/**
 * HR features are opt-in so the frontend can be deployed safely before the
 * additive HR/RBAC migrations reach a given Supabase environment.
 *
 * This flag controls UI availability only. Database RLS and RPC authorization
 * remain the security boundary after the feature is enabled.
 */
export function parseHrFeaturesEnabled(value: string | undefined): boolean {
  return value?.trim().toLowerCase() === "true";
}

export const HR_FEATURES_ENABLED = parseHrFeaturesEnabled(
  import.meta.env.VITE_HR_FEATURES_ENABLED,
);
