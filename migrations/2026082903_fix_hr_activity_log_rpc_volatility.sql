-- Fix: the activity-log RPC prunes old rows, so it must run read/write.
-- PostgREST maps writes attempted by STABLE RPCs to HTTP 405 (SQLSTATE 25006).

BEGIN;

ALTER FUNCTION public.get_hr_activity_log(INTEGER) VOLATILE;

NOTIFY pgrst, 'reload schema';
COMMIT;
