import { useCallback, useEffect, useState } from "react";

import type { AccessRequest, AccessRequestStatus } from "../contracts/accessRequest";
import { listAccessRequests } from "../services/accessRequestService";

export interface AccessRequestsState {
  requests: AccessRequest[];
  loading: boolean;
  hasError: boolean;
  reload: () => void;
  /** Drop a request locally after it moves to another status. */
  removeRequest: (requestId: string) => void;
}

export function useAccessRequests(status: AccessRequestStatus): AccessRequestsState {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setHasError(false);

    listAccessRequests(status)
      .then((result) => {
        if (!cancelled) setRequests(result);
      })
      .catch(() => {
        if (!cancelled) {
          setRequests([]);
          setHasError(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [status, reloadKey]);

  const reload = useCallback(() => setReloadKey((key) => key + 1), []);
  const removeRequest = useCallback((requestId: string) => {
    setRequests((current) => current.filter((request) => request.id !== requestId));
  }, []);

  return { requests, loading, hasError, reload, removeRequest };
}
