import { useEffect, useState } from "react";

import type { ActivityEvent } from "../contracts/activityLog";
import { listRecentActivity } from "../services/activityLogService";

export function useRecentActivity(daysBack = 15) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void listRecentActivity(daysBack)
      .then((data) => {
        if (cancelled) return;
        setEvents(data);
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
  }, [daysBack]);

  return { events, loading, hasError };
}
