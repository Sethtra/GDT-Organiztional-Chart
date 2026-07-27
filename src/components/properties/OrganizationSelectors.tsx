import { useEffect, useMemo, useRef } from "react";

import { useOrgStructure } from "../../hooks/useOrgStructure";

interface SelectorProps {
  value: string;
  onChange: (value: string) => void;
}

export function DepartmentSelect({ value, onChange }: SelectorProps) {
  const { units, loading } = useOrgStructure();

  return (
    <select
      className="pp-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <option value="">Select department…</option>
      {loading && <option disabled>Loading…</option>}
      {units.map((unit) => (
        <option key={unit.id} value={unit.name}>
          {unit.name}
        </option>
      ))}
      {value && !units.find((unit) => unit.name === value) && (
        <option value={value}>{value} (legacy/custom)</option>
      )}
    </select>
  );
}

interface OfficeSelectorProps extends SelectorProps {
  department: string;
}

export function OfficeSelect({
  department,
  value,
  onChange,
}: OfficeSelectorProps) {
  const { getOfficesForUnit } = useOrgStructure();
  const offices = useMemo(
    () => getOfficesForUnit(department),
    [department, getOfficesForUnit],
  );
  const previousDepartment = useRef(department);

  useEffect(() => {
    if (previousDepartment.current === department) return;
    previousDepartment.current = department;
    if (
      value &&
      offices.length > 0 &&
      !offices.find((office) => office.name === value)
    ) {
      onChange("");
    }
  }, [department, offices, onChange, value]);

  const disabled = !department;
  return (
    <select
      className="pp-input"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <option value="">
        {disabled
          ? "Select department first…"
          : offices.length === 0
            ? "No offices available"
            : "Select office…"}
      </option>
      {offices.map((office) => (
        <option key={office.id} value={office.name}>
          {office.name}
        </option>
      ))}
      {value &&
        offices.length > 0 &&
        !offices.find((office) => office.name === value) && (
          <option value={value}>{value} (legacy/custom)</option>
        )}
    </select>
  );
}
