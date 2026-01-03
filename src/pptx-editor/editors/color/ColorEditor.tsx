/**
 * @file ColorEditor - Editor for Color type
 *
 * Compact color editor without redundant labels.
 * Uses ColorPickerPopover for sRGB colors.
 * Parent provides semantic labels (e.g., "Fill Color", "Text Color").
 */

import { useCallback, useState, type CSSProperties } from "react";
import { Button, Select } from "../../ui/primitives";
import { ColorPickerPopover } from "../../ui/color";
import { ColorTransformEditor } from "./ColorTransformEditor";
import { createDefaultSrgbColor } from "./ColorSpecEditor";
import type { Color, ColorSpec, ColorTransform, SrgbColor, SchemeColor } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";

export type ColorEditorProps = EditorProps<Color> & {
  readonly style?: CSSProperties;
  /** Show transform editor (default: false for compact mode) */
  readonly showTransform?: boolean;
  /** Allow switching between color modes (sRGB, theme, etc.) */
  readonly showModeSwitch?: boolean;
};

type ColorSpecType = ColorSpec["type"];

const colorModeOptions: SelectOption<ColorSpecType>[] = [
  { value: "srgb", label: "Hex" },
  { value: "scheme", label: "Theme" },
];

const schemeColorOptions: SelectOption[] = [
  { value: "dk1", label: "Dark 1" },
  { value: "lt1", label: "Light 1" },
  { value: "dk2", label: "Dark 2" },
  { value: "lt2", label: "Light 2" },
  { value: "accent1", label: "Accent 1" },
  { value: "accent2", label: "Accent 2" },
  { value: "accent3", label: "Accent 3" },
  { value: "accent4", label: "Accent 4" },
  { value: "accent5", label: "Accent 5" },
  { value: "accent6", label: "Accent 6" },
  { value: "hlink", label: "Hyperlink" },
  { value: "folHlink", label: "Followed Link" },
];

const containerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
};

const transformToggleStyle: CSSProperties = {
  fontSize: "10px",
  padding: "2px 6px",
};

function createDefaultColorSpec(type: ColorSpecType): ColorSpec {
  switch (type) {
    case "srgb":
      return { type: "srgb", value: "000000" };
    case "scheme":
      return { type: "scheme", value: "accent1" };
    default:
      return { type: "srgb", value: "000000" };
  }
}

function getHexPreview(spec: ColorSpec): string {
  if (spec.type === "srgb") {
    return spec.value;
  }
  // Placeholder for non-sRGB colors
  return "888888";
}

/**
 * Compact color editor.
 * No redundant "Color" label - parent provides semantic context.
 */
export function ColorEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showTransform = false,
  showModeSwitch = false,
}: ColorEditorProps) {
  const [transformExpanded, setTransformExpanded] = useState(!!value.transform);

  const handleSpecChange = useCallback(
    (spec: ColorSpec) => {
      onChange({ ...value, spec });
    },
    [value, onChange]
  );

  const handleHexChange = useCallback(
    (hex: string) => {
      onChange({ ...value, spec: { type: "srgb", value: hex } });
    },
    [value, onChange]
  );

  const handleTypeChange = useCallback(
    (newType: string) => {
      onChange({ ...value, spec: createDefaultColorSpec(newType as ColorSpecType) });
    },
    [value, onChange]
  );

  const handleTransformChange = useCallback(
    (transform: ColorTransform | undefined) => {
      onChange({ ...value, transform });
    },
    [value, onChange]
  );

  const toggleTransform = useCallback(() => {
    if (transformExpanded) {
      onChange({ ...value, transform: undefined });
      setTransformExpanded(false);
    } else {
      setTransformExpanded(true);
    }
  }, [transformExpanded, value, onChange]);

  // sRGB: Use ColorPickerPopover
  if (value.spec.type === "srgb") {
    const srgbSpec = value.spec as SrgbColor;
    return (
      <div className={className} style={style}>
        <div style={containerStyle}>
          <ColorPickerPopover
            value={srgbSpec.value}
            onChange={handleHexChange}
            size="md"
            disabled={disabled}
          />
          {showModeSwitch && (
            <Select
              value={value.spec.type}
              onChange={handleTypeChange}
              options={colorModeOptions}
              disabled={disabled}
              style={{ width: "70px" }}
            />
          )}
          {showTransform && (
            <Button
              variant="ghost"
              onClick={toggleTransform}
              style={transformToggleStyle}
              disabled={disabled}
            >
              {transformExpanded ? "−" : "+"}
            </Button>
          )}
        </div>
        {showTransform && transformExpanded && (
          <div style={{ marginTop: "8px" }}>
            <ColorTransformEditor
              value={value.transform}
              onChange={handleTransformChange}
              disabled={disabled}
              compact
            />
          </div>
        )}
      </div>
    );
  }

  // Scheme: Select from theme colors
  if (value.spec.type === "scheme") {
    const schemeSpec = value.spec as SchemeColor;
    return (
      <div className={className} style={style}>
        <div style={containerStyle}>
          <ColorPickerPopover
            value={getHexPreview(value.spec)}
            onChange={handleHexChange}
            size="md"
            disabled={disabled}
          />
          <Select
            value={schemeSpec.value}
            onChange={(v) => handleSpecChange({ ...schemeSpec, value: v as SchemeColor["value"] })}
            options={schemeColorOptions}
            disabled={disabled}
            style={{ flex: 1 }}
          />
          {showModeSwitch && (
            <Select
              value={value.spec.type}
              onChange={handleTypeChange}
              options={colorModeOptions}
              disabled={disabled}
              style={{ width: "70px" }}
            />
          )}
        </div>
      </div>
    );
  }

  // Fallback for other types: show hex preview with mode switch
  return (
    <div className={className} style={style}>
      <div style={containerStyle}>
        <ColorPickerPopover
          value={getHexPreview(value.spec)}
          onChange={handleHexChange}
          size="md"
          disabled={disabled}
        />
        <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
          {value.spec.type}
        </span>
        {showModeSwitch && (
          <Select
            value={value.spec.type}
            onChange={handleTypeChange}
            options={colorModeOptions}
            disabled={disabled}
            style={{ width: "70px" }}
          />
        )}
      </div>
    </div>
  );
}

/**
 * Create a default Color value.
 */
export function createDefaultColor(hex: string = "000000"): Color {
  return {
    spec: createDefaultSrgbColor(hex),
  };
}
