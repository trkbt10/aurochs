/**
 * @file FillFormattingEditor - Shared fill formatting editor
 *
 * Provides basic fill selection (none/solid) with slots for
 * format-specific advanced fills (gradient, pattern, image).
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldRow } from "@aurochs-ui/ui-components/layout";
import type { FillFormatting } from "../types/fill-formatting";
import type { FillFormattingFeatures } from "../types/feature-flags";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

// =============================================================================
// Types
// =============================================================================

export type FillFormattingEditorProps = {
  readonly value: FillFormatting;
  readonly onChange: (update: FillFormatting) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: FillFormattingFeatures;
  /** Slot: format-specific color picker for solid fill. */
  readonly renderColorPicker?: (props: {
    value: string;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific advanced fill editor (gradient, pattern, image). */
  readonly renderAdvancedFill?: () => ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const rowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
};

const typeSelectStyle: CSSProperties = {
  width: "90px",
  flexShrink: 0,
};

// =============================================================================
// Options
// =============================================================================

type FillType = FillFormatting["type"];

const allFillTypeOptions: SelectOption<FillType>[] = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "other", label: "Advanced" },
];

function getFilteredOptions(features?: FillFormattingFeatures): SelectOption<FillType>[] {
  const opts: SelectOption<FillType>[] = [];
  if (features?.showNone !== false) {
    opts.push(allFillTypeOptions[0]);
  }
  if (features?.showSolid !== false) {
    opts.push(allFillTypeOptions[1]);
  }
  if (features?.showAdvancedFill) {
    opts.push(allFillTypeOptions[2]);
  }
  return opts.length > 0 ? opts : allFillTypeOptions;
}

// =============================================================================
// Component
// =============================================================================

export function FillFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  renderColorPicker,
  renderAdvancedFill,
}: FillFormattingEditorProps) {
  const fillTypeOptions = getFilteredOptions(features);

  const handleTypeChange = useCallback(
    (newType: string) => {
      switch (newType) {
        case "none":
          onChange({ type: "none" });
          break;
        case "solid":
          onChange({ type: "solid", color: "#000000" });
          break;
        case "other":
          onChange({ type: "other", label: "Advanced" });
          break;
      }
    },
    [onChange],
  );

  const handleColorChange = useCallback(
    (hex: string) => {
      onChange({ type: "solid", color: hex });
    },
    [onChange],
  );

  // None fill
  if (value.type === "none") {
    return (
      <div className={className} style={style}>
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
          style={typeSelectStyle}
        />
      </div>
    );
  }

  // Solid fill
  if (value.type === "solid") {
    return (
      <div className={className} style={{ ...containerStyle, ...style }}>
        <div style={rowStyle}>
          {renderColorPicker ? (
            renderColorPicker({
              value: value.color,
              onChange: handleColorChange,
              disabled,
            })
          ) : (
            <input
              type="color"
              value={value.color.startsWith("#") ? value.color : `#${value.color}`}
              onChange={(e) => handleColorChange(e.target.value)}
              disabled={disabled}
            />
          )}
          <Select
            value={value.type}
            onChange={handleTypeChange}
            options={fillTypeOptions}
            disabled={disabled}
            style={typeSelectStyle}
          />
        </div>
      </div>
    );
  }

  // Other (advanced) fill
  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <div style={rowStyle}>
        <Select
          value={value.type}
          onChange={handleTypeChange}
          options={fillTypeOptions}
          disabled={disabled}
          style={typeSelectStyle}
        />
        {value.type === "other" && <span style={{ fontSize: "12px", opacity: 0.6 }}>{value.label}</span>}
      </div>
      {renderAdvancedFill?.()}
    </div>
  );
}
