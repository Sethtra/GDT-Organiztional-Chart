-- ============================================================
-- Migration: Add HR Activity Log Triggers for Organizational Units
-- ============================================================

-- 1. Trigger function for new organizational unit creation
CREATE OR REPLACE FUNCTION public._log_org_unit_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.hr_activity_log
      (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
       department_name, office_name, metadata, occurred_at)
    VALUES (
      NULL,
      NEW.name,
      NEW.name_en,
      NULL,
      'unit_created',
      'New ' || COALESCE(NEW.type, 'department') || ' created',
      NEW.name,
      NULL,
      jsonb_build_object(
        'unitId', NEW.id,
        'code', NEW.code,
        'type', NEW.type
      ),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking: never abort the main unit insert
    RAISE WARNING 'hr_activity_log org unit insert trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._log_org_unit_created() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_log_org_unit_created ON public.org_units;
CREATE TRIGGER trg_log_org_unit_created
  AFTER INSERT ON public.org_units FOR EACH ROW
  EXECUTE FUNCTION public._log_org_unit_created();

-- 2. Trigger function for organizational unit updates (name, name_en, code changes)
CREATE OR REPLACE FUNCTION public._log_org_unit_updated()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_desc TEXT;
BEGIN
  BEGIN
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_desc := 'Renamed from ' || OLD.name;
    ELSE
      v_desc := 'Department details updated';
    END IF;

    INSERT INTO public.hr_activity_log
      (staff_id, staff_name, staff_name_en, photo_url, event_type, description,
       department_name, office_name, metadata, occurred_at)
    VALUES (
      NULL,
      NEW.name,
      NEW.name_en,
      NULL,
      'unit_updated',
      v_desc,
      NEW.name,
      NULL,
      jsonb_build_object(
        'unitId', NEW.id,
        'oldName', OLD.name,
        'newName', NEW.name,
        'code', NEW.code,
        'type', NEW.type
      ),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- Non-blocking: never abort the main unit update
    RAISE WARNING 'hr_activity_log org unit update trigger error: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public._log_org_unit_updated() FROM PUBLIC;

DROP TRIGGER IF EXISTS trg_log_org_unit_updated ON public.org_units;
CREATE TRIGGER trg_log_org_unit_updated
  AFTER UPDATE ON public.org_units FOR EACH ROW
  WHEN (
    OLD.name IS DISTINCT FROM NEW.name
    OR OLD.name_en IS DISTINCT FROM NEW.name_en
    OR OLD.code IS DISTINCT FROM NEW.code
  )
  EXECUTE FUNCTION public._log_org_unit_updated();
