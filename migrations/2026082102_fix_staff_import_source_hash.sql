-- Repair the deployed Excel import function's source-hash name collision.
BEGIN;

-- Fresh databases receive the corrected function from migration 2026082101.
-- For a database that already stored the earlier function, repair only the
-- four unqualified local-variable references in its existing definition.
DO $$
DECLARE
  current_definition TEXT;
  repaired_definition TEXT;
BEGIN
  SELECT pg_get_functiondef(
    'public.import_staff_workbook(jsonb)'::regprocedure
  )
  INTO current_definition;

  repaired_definition := replace(
    current_definition,
    'source_sha256 TEXT :=',
    'workbook_sha256 TEXT :='
  );
  repaired_definition := replace(
    repaired_definition,
    'OR source_sha256 !~',
    'OR workbook_sha256 !~'
  );
  repaired_definition := replace(
    repaired_definition,
    'lower(source_sha256)',
    'lower(workbook_sha256)'
  );
  repaired_definition := replace(
    repaired_definition,
    'upper(source_sha256)',
    'upper(workbook_sha256)'
  );

  IF repaired_definition <> current_definition THEN
    EXECUTE repaired_definition;
  END IF;

  IF position(
    'workbook_sha256 TEXT :=' IN pg_get_functiondef(
      'public.import_staff_workbook(jsonb)'::regprocedure
    )
  ) = 0 THEN
    RAISE EXCEPTION 'Unable to repair import_staff_workbook source hash variable';
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';

COMMIT;
