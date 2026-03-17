/**
 * @file PageSizeEditor - Format-agnostic page size editor
 *
 * Extracted from pptx-editor's SlideSizeEditor. Provides preset selection,
 * width/height inputs, and aspect ratio display. Each format (PPTX, PDF, DOCX)
 * supplies its own presets and adapter logic.
 */

import { useCallback, type CSSProperties } from "react";
import type { PageSizeData, PageSizePreset } from "@aurochs-ui/editor-core/adapter-types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { Input, Select } from "@aurochs-ui/ui-components/primitives";

// =============================================================================
// Types
// =============================================================================

export type PageSizeEditorProps = {
  readonly data: PageSizeData;
  readonly onChange: (data: PageSizeData) => void;
  readonly presets: readonly PageSizePreset[];
  readonly unitLabel?: string;
  readonly disabled?: boolean;
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const infoStyle: CSSProperties = {
  fontSize: "11px",
  color: "var(--text-tertiary, #737373)",
  marginTop: "4px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Format-agnostic page size editor.
 *
 * Features:
 * - Preset selector dropdown
 * - Width and height input fields
 * - Aspect ratio display
 * - Automatically resets preset to "Custom" on manual dimension edit
 */
export function PageSizeEditor({
  data,
  onChange,
  presets,
  unitLabel = "px",
  disabled,
  min = 1,
  max = 100000,
  step = 1,
}: PageSizeEditorProps) {
  const selectOptions: readonly SelectOption[] = [
    { value: "", label: "Custom" },
    ...presets.map((p) => ({ value: p.value, label: p.label })),
  ];

  const handlePresetChange = useCallback(
    (newPreset: string) => {
      if (newPreset === "") {
        // Keep current dimensions, just mark as custom
        onChange({ ...data, preset: "" });
      } else {
        const preset = presets.find((p) => p.value === newPreset);
        if (preset) {
          onChange({
            width: String(preset.width),
            height: String(preset.height),
            preset: newPreset,
          });
        }
      }
    },
    [data, onChange, presets],
  );

  const handleWidthChange = useCallback(
    (newWidth: string | number) => {
      const w = typeof newWidth === "number" ? newWidth : parseFloat(newWidth);
      if (!isNaN(w) && w > 0) {
        onChange({ ...data, width: String(w), preset: "" });
      }
    },
    [data, onChange],
  );

  const handleHeightChange = useCallback(
    (newHeight: string | number) => {
      const h = typeof newHeight === "number" ? newHeight : parseFloat(newHeight);
      if (!isNaN(h) && h > 0) {
        onChange({ ...data, height: String(h), preset: "" });
      }
    },
    [data, onChange],
  );

  const width = parseFloat(data.width);
  const height = parseFloat(data.height);
  const aspectRatioText = !isNaN(width) && !isNaN(height) && height > 0
    ? getAspectRatioText(width / height)
    : "—";

  return (
    <div style={containerStyle}>
      <FieldGroup label="Preset">
        <Select
          value={data.preset}
          onChange={handlePresetChange}
          options={selectOptions}
          disabled={disabled}
        />
      </FieldGroup>

      <FieldRow>
        <FieldGroup label="W" inline labelWidth={20} style={{ flex: 1 }}>
          <Input
            type="number"
            value={width}
            onChange={handleWidthChange}
            suffix={unitLabel}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
          />
        </FieldGroup>
        <FieldGroup label="H" inline labelWidth={20} style={{ flex: 1 }}>
          <Input
            type="number"
            value={height}
            onChange={handleHeightChange}
            suffix={unitLabel}
            disabled={disabled}
            min={min}
            max={max}
            step={step}
          />
        </FieldGroup>
      </FieldRow>

      <div style={infoStyle}>Aspect ratio: {aspectRatioText}</div>
    </div>
  );
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get human-readable aspect ratio text.
 */
function getAspectRatioText(ratio: number): string {
  const tolerance = 0.01;

  if (Math.abs(ratio - 16 / 9) < tolerance) return "16:9";
  if (Math.abs(ratio - 16 / 10) < tolerance) return "16:10";
  if (Math.abs(ratio - 4 / 3) < tolerance) return "4:3";
  if (Math.abs(ratio - 3 / 2) < tolerance) return "3:2";
  if (Math.abs(ratio - 1) < tolerance) return "1:1";
  if (Math.abs(ratio - 21 / 9) < tolerance) return "21:9";

  return ratio.toFixed(2) + ":1";
}
