interface ColorPreset {
  label: string;
  value: string;
}

interface ColorPresetPickerProps {
  presets: ColorPreset[];
  value: string;
  onChange: (value: string) => void;
  customLabel?: string;
}

export default function ColorPresetPicker({
  presets,
  value,
  onChange,
  customLabel = "Custom color",
}: ColorPresetPickerProps) {
  const customValue = /^#[0-9a-f]{6}$/i.test(value) ? value : "#334155";

  return (
    <div className="pp-colors">
      {presets.map((preset) => (
        <button
          key={preset.value}
          type="button"
          className={`pp-swatch ${value === preset.value ? "active" : ""}`}
          style={{ background: preset.value }}
          onClick={() => onChange(preset.value)}
          title={preset.label}
          aria-label={preset.label}
        />
      ))}
      <label
        className="pp-swatch pp-swatch--custom"
        title={customLabel}
        aria-label={customLabel}
      >
        <input
          type="color"
          value={customValue}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
        />
        <span aria-hidden="true" style={{ fontSize: 14 }}>🎨</span>
      </label>
    </div>
  );
}
