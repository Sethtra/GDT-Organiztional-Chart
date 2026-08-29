-- Patch: make all hr_activity_log triggers non-blocking.
-- If logging fails for any reason, the real HR operation still succeeds.

BEGIN;

-- 3-patch: officer created
CREATE OR REPLACE FUNCTION public._log_staff_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_dept TEXT; v_office TEXT;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- 4-patch: officer profile updated
CREATE OR REPLACE FUNCTION public._log_staff_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_dept TEXT; v_office TEXT; v_desc TEXT;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN NEW;
END;
$$;

-- 5-patch: position assignment changes
CREATE OR REPLACE FUNCTION public._log_position_assignment()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_staff       RECORD;
  v_position    RECORD;
  v_event_type  TEXT;
  v_desc        TEXT;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 6-patch: skills updated
CREATE OR REPLACE FUNCTION public._log_skill_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_staff RECORD; v_dept TEXT; v_office TEXT; v_skill TEXT;
BEGIN
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
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMIT;
