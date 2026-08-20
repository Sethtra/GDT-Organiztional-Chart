import { useEffect, useState } from "react";

import type { PromotionReadiness } from "../contracts/hr";
import { listPromotionReadiness } from "../services/promotionReadinessService";

export function usePromotionReadiness() {
  const [candidates, setCandidates] = useState<PromotionReadiness[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void listPromotionReadiness()
      .then((readiness) => {
        if (cancelled) return;
        setCandidates(
          readiness.filter((candidate) => candidate.status === "ready"),
        );
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
  }, []);

  return { candidates, loading, hasError };
}
