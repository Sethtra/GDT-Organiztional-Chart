-- Canonicalize imported skill spellings and split confirmed compound values.
-- The rollout creates a verified backup before this atomic migration runs.
BEGIN;

SELECT pg_advisory_xact_lock(hashtext('public.skills.canonicalization'));

DO $$
DECLARE
  mapping RECORD;
  source_skill_id UUID;
  target_skill_id UUID;
  target_name TEXT;
BEGIN
  FOR mapping IN
    SELECT *
    FROM (VALUES
      ('ធនាគា', ARRAY['ធនាគារ']::TEXT[]),
      ('និតិសាស្ត្រ', ARRAY['នីតិសាស្ត្រ']::TEXT[]),
      ('និតិសាស្រ្ត', ARRAY['នីតិសាស្ត្រ']::TEXT[]),
      ('និតិសាស្រ្ដ', ARRAY['នីតិសាស្ត្រ']::TEXT[]),
      ('នីតិសាស្រ្ត', ARRAY['នីតិសាស្ត្រ']::TEXT[]),
      ('នីតិសាស្រ្ដ', ARRAY['នីតិសាស្ត្រ']::TEXT[]),
      ('ហរិញ្ញវត្ថុ', ARRAY['ហិរញ្ញវត្ថុ']::TEXT[]),
      ('និតិរដ្ឋបាលសាធារណៈ', ARRAY['នីតិរដ្ឋបាលសាធារណៈ']::TEXT[]),
      ('គ្រង់គ្រងពាណិជ្ជកម្ម', ARRAY['គ្រប់គ្រងពាណិជ្ជកម្ម']::TEXT[]),
      ('ព័ត៍មានវិទ្យា', ARRAY['ព័ត៌មានវិទ្យា']::TEXT[]),
      ('កសិ-ឧស្សាហកម្ម', ARRAY['កសិ.ឧស្សាហកម្ម']::TEXT[]),
      ('គណនេយ្យ ហិរញ្ញវត្ថុ', ARRAY['គណនេយ្យ', 'ហិរញ្ញវត្ថុ']::TEXT[]),
      ('គណនេយ្យហិរញ្ញវត្ថុ', ARRAY['គណនេយ្យ', 'ហិរញ្ញវត្ថុ']::TEXT[]),
      ('ធនាគារ ហិរញ្ញវត្ថុ', ARRAY['ធនាគារ', 'ហិរញ្ញវត្ថុ']::TEXT[]),
      ('នីតិសាស្រ្ត ហិរញ្ញវត្ថុ', ARRAY['នីតិសាស្ត្រ', 'ហិរញ្ញវត្ថុ']::TEXT[]),
      ('ហិរញ្ញវត្ថុ-ធនាគារ', ARRAY['ហិរញ្ញវត្ថុ', 'ធនាគារ']::TEXT[]),
      (
        'គ្រប់គ្រងវិទ្យាសាស្ត្រាកុំព្យូទ័រ/សវនកម្មពន្ធ',
        ARRAY['គ្រប់គ្រងវិទ្យាសាស្ត្រាកុំព្យូទ័រ', 'សវនកម្មពន្ធ']::TEXT[]
      )
    ) AS skill_mapping(source_name, target_names)
  LOOP
    source_skill_id := NULL;
    SELECT skill.id
    INTO source_skill_id
    FROM public.skills AS skill
    WHERE lower(trim(skill.name)) = lower(trim(mapping.source_name))
    ORDER BY skill.created_at, skill.id
    LIMIT 1;

    IF source_skill_id IS NULL THEN
      CONTINUE;
    END IF;

    FOREACH target_name IN ARRAY mapping.target_names
    LOOP
      INSERT INTO public.skills (
        name,
        description,
        is_active,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      SELECT
        target_name,
        source.description,
        source.is_active,
        source.created_at,
        now(),
        source.created_by,
        source.updated_by
      FROM public.skills AS source
      WHERE source.id = source_skill_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.skills AS existing
          WHERE lower(trim(existing.name)) = lower(trim(target_name))
        );

      SELECT skill.id
      INTO target_skill_id
      FROM public.skills AS skill
      WHERE lower(trim(skill.name)) = lower(trim(target_name))
      ORDER BY skill.created_at, skill.id
      LIMIT 1;

      IF target_skill_id IS NULL THEN
        RAISE EXCEPTION 'Unable to create or resolve canonical skill: %', target_name;
      END IF;

      INSERT INTO public.job_title_skill_requirements (
        job_title_id,
        skill_id,
        org_unit_id,
        minimum_proficiency,
        is_required,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      SELECT
        requirement.job_title_id,
        target_skill_id,
        requirement.org_unit_id,
        requirement.minimum_proficiency,
        requirement.is_required,
        requirement.created_at,
        now(),
        requirement.created_by,
        requirement.updated_by
      FROM public.job_title_skill_requirements AS requirement
      WHERE requirement.skill_id = source_skill_id
      ON CONFLICT (
        job_title_id,
        skill_id,
        coalesce(org_unit_id, '00000000-0000-0000-0000-000000000000'::uuid)
      ) DO UPDATE
      SET
        minimum_proficiency = greatest(
          public.job_title_skill_requirements.minimum_proficiency,
          EXCLUDED.minimum_proficiency
        ),
        is_required =
          public.job_title_skill_requirements.is_required OR EXCLUDED.is_required,
        updated_at = now();

      INSERT INTO public.staff_skill_history (
        staff_id,
        skill_id,
        proficiency,
        effective_from,
        effective_to,
        notes,
        created_at,
        updated_at,
        created_by,
        updated_by
      )
      SELECT
        history.staff_id,
        target_skill_id,
        history.proficiency,
        history.effective_from,
        history.effective_to,
        history.notes,
        history.created_at,
        now(),
        history.created_by,
        history.updated_by
      FROM public.staff_skill_history AS history
      WHERE history.skill_id = source_skill_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.staff_skill_history AS existing
          WHERE existing.staff_id = history.staff_id
            AND existing.skill_id = target_skill_id
            AND (
              existing.effective_to IS NULL
              AND history.effective_to IS NULL
              OR (
                existing.effective_from = history.effective_from
                AND existing.effective_to IS NOT DISTINCT FROM history.effective_to
                AND existing.proficiency IS NOT DISTINCT FROM history.proficiency
                AND existing.notes IS NOT DISTINCT FROM history.notes
              )
            )
        );
    END LOOP;

    DELETE FROM public.job_title_skill_requirements
    WHERE skill_id = source_skill_id;

    DELETE FROM public.staff_skill_history
    WHERE skill_id = source_skill_id;

    DELETE FROM public.skills
    WHERE id = source_skill_id;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION private.normalize_import_label(value TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
SET search_path = ''
AS $$
  WITH normalized AS (
    SELECT lower(
      regexp_replace(
        trim(
          replace(
            replace(coalesce(value, ''), chr(8203), ''),
            chr(160),
            ' '
          )
        ),
        '\s+',
        ' ',
        'g'
      )
    ) AS value
  )
  SELECT CASE normalized.value
    WHEN lower('ធនាគា') THEN lower('ធនាគារ')
    WHEN lower('និតិសាស្ត្រ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('និតិសាស្រ្ត') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('និតិសាស្រ្ដ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('នីតិសាស្រ្ត') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('នីតិសាស្រ្ដ') THEN lower('នីតិសាស្ត្រ')
    WHEN lower('ហរិញ្ញវត្ថុ') THEN lower('ហិរញ្ញវត្ថុ')
    WHEN lower('និតិរដ្ឋបាលសាធារណៈ') THEN lower('នីតិរដ្ឋបាលសាធារណៈ')
    WHEN lower('គ្រង់គ្រងពាណិជ្ជកម្ម') THEN lower('គ្រប់គ្រងពាណិជ្ជកម្ម')
    WHEN lower('ព័ត៍មានវិទ្យា') THEN lower('ព័ត៌មានវិទ្យា')
    WHEN lower('កសិ-ឧស្សាហកម្ម') THEN lower('កសិ.ឧស្សាហកម្ម')
    ELSE normalized.value
  END
  FROM normalized;
$$;

REVOKE ALL ON FUNCTION private.normalize_import_label(TEXT) FROM PUBLIC;

NOTIFY pgrst, 'reload schema';

COMMIT;
