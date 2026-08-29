-- Live HR activity log: 15-day rolling history of HR actions.
-- Isolated table -- triggers only INSERT here, never touch real data.
-- Requires 2026072701_add_hr_admin_rbac.sql (is_hr_admin function).

BEGIN;

-- 1. Activity log table
CREATE TABLE IF NOT EXISTS public.hr_activity_log (
  id              UUID        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id        UUID        REFERENCES public.staff(id) ON DELETE CASCADE,
  staff_name      TEXT        NOT NULL,
  staff_name_en   TEXT,
  photo_url       TEXT,
  event_type      TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  department_name TEXT,
  office_name     TEXT,
  metadata        JSONB       NOT NULL DEFAULT '{}'::"jsonb",
  occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.hr_activity_log ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS hr_activity_log_occurred_at_idx
  ON public.hr_activity_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS hr_activity_log_staff_id_idx
  ON public.hr_activity_log (staff_id);
CREATE INDEX IF NOT EXISTS hr_activity_log_event_type_idx
  ON public.hr_activity_log (event_type);

REVOKE ALL ON TABLE public.hr_activity_log FROM anon, authenticated;
GRANT SELECT ON TABLE public.hr_activity_log TO service_role;

CREATE POLICY "HR administrators read activity log"
  ON public.hr_activity_log
  FOR SELECT
  TO authenticated
  USING (public.is_hr_admin());

-- 2. Helper: resolve department/office for a staff member
CREATE OR REPLACE FUNCTION public._activity_placement(p_staff_id UUID)
RETURNS TABLE(department_name TEXT, office_name TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT
    coalesce(dept_from_assignment.name, dept_from_placement.name),
    coalesce(office_from_assignment.name, office_from_placement.name)
  FROM public.staff AS s
  LEFT JOIN LATERAL (
    SELECT pos.org_unit_id, pos.office_id
    FROM public.position_assignments AS pa
    JOIN public.positions AS pos ON pos.id = pa.position_id
    WHERE pa.staff_id = s.id AND pa.end_date IS NULL
    ORDER BY pa.created_at DESC LIMIT 1
  ) AS active_assign ON true
  LEFT JOIN public.org_units AS dept_from_assignment
    ON dept_from_assignment.id = active_assign.org_unit_id
  LEFT JOIN public.org_offices AS office_from_assignment
    ON office_from_assignment.id = active_assign.office_id
  LEFT JOIN public.staff_placements AS placement ON placement.staff_id = s.id
  LEFT JOIN public.org_units AS dept_from_placement
    ON dept_from_placement.id = placement.org_unit_id
  LEFT JOIN public.org_offices AS office_from_placement
    ON office_from_placement.id = placement.office_id
  WHERE s.id = p_staff_id;
$$;
REVOKE ALL ON FUNCTION public._activity_placement(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._activity_placement(UUID) TO service_role;

-- 3. Trigger: new officer created
CREATE OR REPLACE FUNCTION public._log_staff_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_dept TEXT; v_office TEXT;
BEGIN
  SELECT department_name, office_name INTO v_dept, v_office
  FROM public._activity_placement(NEW.id);
  INSERT INTO public.hr_activity_log
    (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
     department_name, office_name, metadata, occurred_at)
  VALUES (NEW.id, NEW.name, NEW.name_en, NEW.photo_url,
    'officer_created', 'New officer record created',
    v_dept, v_office,
    jsonb_build_object('employeeId', coalesce(NEW.employee_id, NEW.staff_id), 'status', NEW.status),
    now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._log_staff_created() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_staff_created ON public.staff;
CREATE TRIGGER trg_log_staff_created
  AFTER INSERT ON public.staff FOR EACH ROW
  EXECUTE FUNCTION public._log_staff_created();

-- 4. Trigger: officer profile updated
CREATE OR REPLACE FUNCTION public._log_staff_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_dept TEXT; v_office TEXT; v_desc TEXT;
BEGIN
  IF OLD.status = 'active' AND NEW.status = 'archived' THEN
    v_desc := 'Officer record archived';
  ELSIF OLD.job_title_id IS DISTINCT FROM NEW.job_title_id THEN
    v_desc := 'Job title updated';
  ELSE
    v_desc := 'Profile updated';
  END IF;
  SELECT department_name, office_name INTO v_dept, v_office
  FROM public._activity_placement(NEW.id);
  INSERT INTO public.hr_activity_log
    (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
     department_name, office_name, metadata, occurred_at)
  VALUES (NEW.id, NEW.name, NEW.name_en, NEW.photo_url,
    'profile_updated', v_desc, v_dept, v_office,
    jsonb_build_object('employeeId', coalesce(NEW.employee_id, NEW.staff_id), 'status', NEW.status),
    now());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._log_staff_updated() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_staff_updated ON public.staff;
CREATE TRIGGER trg_log_staff_updated
  AFTER UPDATE ON public.staff FOR EACH ROW
  WHEN (OLD.name IS DISTINCT FROM NEW.name
    OR OLD.name_en IS DISTINCT FROM NEW.name_en
    OR OLD.job_title_id IS DISTINCT FROM NEW.job_title_id
    OR OLD.status IS DISTINCT FROM NEW.status
    OR OLD.photo_url IS DISTINCT FROM NEW.photo_url
    OR OLD.education IS DISTINCT FROM NEW.education
    OR OLD.phone IS DISTINCT FROM NEW.phone
    OR OLD.email IS DISTINCT FROM NEW.email
    OR OLD.address IS DISTINCT FROM NEW.address)
  EXECUTE FUNCTION public._log_staff_updated();

-- 5. Trigger: position assignment changes
CREATE OR REPLACE FUNCTION public._log_position_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_staff       RECORD;
  v_position    RECORD;
  v_event_type  TEXT;
  v_desc        TEXT;
BEGIN
  SELECT name, name_en, photo_url INTO v_staff
  FROM public.staff WHERE id = COALESCE(NEW.staff_id, OLD.staff_id);
  SELECT u.name AS dept_name, o.name AS office_name INTO v_position
  FROM public.positions AS p
  LEFT JOIN public.org_units AS u ON u.id = p.org_unit_id
  LEFT JOIN public.org_offices AS o ON o.id = p.office_id
  WHERE p.id = COALESCE(NEW.position_id, OLD.position_id);

  IF TG_OP = 'INSERT' THEN
    v_event_type := CASE NEW.change_reason
      WHEN 'promoted'    THEN 'promoted'
      WHEN 'transferred' THEN 'transferred'
      ELSE 'assigned'
    END;
    v_desc := CASE NEW.change_reason
      WHEN 'promoted'    THEN 'Promoted to new position'
      WHEN 'transferred' THEN 'Transferred to new position'
      WHEN 'vacated'     THEN 'Position vacated'
      WHEN 'resigned'    THEN 'Resigned from position'
      WHEN 'retired'     THEN 'Retired from position'
      ELSE 'Position assigned'
    END;
  ELSE
    IF NEW.end_date IS NOT NULL AND OLD.end_date IS NULL THEN
      v_event_type := 'position_vacated';
      v_desc := CASE NEW.change_reason
        WHEN 'promoted'    THEN 'Promoted - previous position vacated'
        WHEN 'transferred' THEN 'Transferred - previous position vacated'
        WHEN 'resigned'    THEN 'Resigned from position'
        WHEN 'retired'     THEN 'Retired from position'
        ELSE 'Position vacated'
      END;
    ELSE
      RETURN NEW;
    END IF;
  END IF;

  INSERT INTO public.hr_activity_log
    (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
     department_name, office_name, metadata, occurred_at)
  VALUES (COALESCE(NEW.staff_id, OLD.staff_id),
    COALESCE(v_staff.name, 'Unknown'), v_staff.name_en, v_staff.photo_url,
    v_event_type, v_desc, v_position.dept_name, v_position.office_name,
    jsonb_build_object(
      'positionId',   COALESCE(NEW.position_id,   OLD.position_id),
      'changeReason', COALESCE(NEW.change_reason, OLD.change_reason)
    ),
    now());
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public._log_position_assignment() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_position_assignment_insert ON public.position_assignments;
CREATE TRIGGER trg_log_position_assignment_insert
  AFTER INSERT ON public.position_assignments FOR EACH ROW
  EXECUTE FUNCTION public._log_position_assignment();
DROP TRIGGER IF EXISTS trg_log_position_assignment_update ON public.position_assignments;
CREATE TRIGGER trg_log_position_assignment_update
  AFTER UPDATE ON public.position_assignments FOR EACH ROW
  EXECUTE FUNCTION public._log_position_assignment();

-- 6. Trigger: skills updated
CREATE OR REPLACE FUNCTION public._log_skill_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff RECORD; v_dept TEXT; v_office TEXT; v_skill TEXT;
BEGIN
  SELECT name, name_en, photo_url INTO v_staff
  FROM public.staff WHERE id = COALESCE(NEW.staff_id, OLD.staff_id);
  SELECT department_name, office_name INTO v_dept, v_office
  FROM public._activity_placement(COALESCE(NEW.staff_id, OLD.staff_id));
  SELECT name INTO v_skill FROM public.skills
  WHERE id = COALESCE(NEW.skill_id, OLD.skill_id);
  INSERT INTO public.hr_activity_log
    (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
     department_name, office_name, metadata, occurred_at)
  VALUES (COALESCE(NEW.staff_id, OLD.staff_id),
    COALESCE(v_staff.name, 'Unknown'), v_staff.name_en, v_staff.photo_url,
    'skills_updated', 'Skills profile updated', v_dept, v_office,
    jsonb_build_object('skill', v_skill), now());
  RETURN COALESCE(NEW, OLD);
END;
$$;
REVOKE ALL ON FUNCTION public._log_skill_updated() FROM PUBLIC;
DROP TRIGGER IF EXISTS trg_log_skill_updated ON public.staff_skill_history;
CREATE TRIGGER trg_log_skill_updated
  AFTER INSERT OR UPDATE ON public.staff_skill_history FOR EACH ROW
  EXECUTE FUNCTION public._log_skill_updated();

-- 7. Cleanup function
CREATE OR REPLACE FUNCTION public._cleanup_hr_activity_log()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $$
  DELETE FROM public.hr_activity_log WHERE occurred_at < now() - INTERVAL '15 days';
$$;
REVOKE ALL ON FUNCTION public._cleanup_hr_activity_log() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public._cleanup_hr_activity_log() TO service_role;

-- 8. RPC: get_hr_activity_log
CREATE OR REPLACE FUNCTION public.get_hr_activity_log(days_back INTEGER DEFAULT 15)
RETURNS JSONB LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE result JSONB;
BEGIN
  IF NOT public.is_hr_admin() THEN
    RAISE EXCEPTION 'HR administrator access required' USING ERRCODE = '42501';
  END IF;
  PERFORM public._cleanup_hr_activity_log();
  SELECT coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',             log.id,
        'staffId',        log.staff_id,
        'staffName',      log.staff_name,
        'staffNameEn',    log.staff_name_en,
        'photoUrl',       log.photo_url,
        'eventType',      log.event_type,
        'description',    log.description,
        'departmentName', log.department_name,
        'officeName',     log.office_name,
        'metadata',       log.metadata,
        'occurredAt',     log.occurred_at
      ) ORDER BY log.occurred_at DESC
    ),
    '[]'::jsonb
  )
  INTO result
  FROM public.hr_activity_log AS log
  WHERE log.occurred_at >= now() - (days_back || ' days')::INTERVAL;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_hr_activity_log(INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_hr_activity_log(INTEGER) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
