import { useEffect, useState } from "react";

import { listHrStaff } from "../services/staffService";

export interface WorkforceMetrics {
  total: number;
  male: number;
  female: number;
}

const EMPTY_WORKFORCE_METRICS: WorkforceMetrics = {
  total: 0,
  male: 0,
  female: 0,
};

export function useWorkforceMetrics() {
  const [metrics, setMetrics] = useState<WorkforceMetrics>(
    EMPTY_WORKFORCE_METRICS,
  );
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void listHrStaff()
      .then((staff) => {
        if (cancelled) return;

        const activeStaff = staff.filter((person) => person.status === "active");
        setMetrics({
          total: activeStaff.length,
          male: activeStaff.filter((person) => person.gender === "male").length,
          female: activeStaff.filter((person) => person.gender === "female")
            .length,
        });
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

  return { metrics, loading, hasError };
}
