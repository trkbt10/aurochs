/**
 * @file OutlineFormattingEditor - Shared outline/border formatting editor
 *
 * Provides basic outline controls (width, color, style) with a slot
 * for format-specific advanced editing (PPTX compound lines, DOCX borders).
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { Input, Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import type { OutlineFormatting, OutlineFormattingFeatures } from "./types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";

// =============================================================================
// Types
// =============================================================================

export type OutlineFormattingEditorProps = {
  readonly value: OutlineFormatting;
  readonly onChange: (update: Partial<OutlineFormatting>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: OutlineFormattingFeatures;
  /** Slot: format-specific color picker. */
  readonly renderColorPicker?: (props: {
    value: string | undefined;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific advanced outline editor. */
  readonly renderAdvancedOutline?: () => ReactNode;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

// =============================================================================
// Options
// =============================================================================

function toBareHex(color: string | undefined, fallback: string): string {
  if (!color) {
    return fallback;
  }
  return color.startsWith("#") ? color.slice(1) : color;
}

function buildColorPicker(opts: {
  renderSlot: OutlineFormattingEditorProps["renderColorPicker"];
  color: string | undefined;
  onChange: (hex: string) => void;
  disabled?: boolean;
}): ReactNode {
  if (opts.renderSlot) {
    return opts.renderSlot({ value: opts.color, onChange: opts.onChange, disabled: opts.disabled });
  }
  return (
    <ColorPickerPopover
      value={toBareHex(opts.color, "000000")}
      onChange={(hex) => opts.onChange(`#${hex}`)}
      disabled={opts.disabled}
    />
  );
}

type DashStyle = NonNullable<OutlineFormatting["style"]>;

const dashStyleOptions: SelectOption<DashStyle>[] = [
  { value: "none", label: "None" },
  { value: "solid", label: "Solid" },
  { value: "dashed", label: "Dashed" },
  { value: "dotted", label: "Dotted" },
];

// =============================================================================
// Component
// =============================================================================

/** Shared outline/border editor with width, style, and color controls. */
export function OutlineFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  renderColorPicker,
  renderAdvancedOutline,
}: OutlineFormattingEditorProps) {
  const showWidth = features?.showWidth !== false;
  const showColor = features?.showColor !== false;
  const showStyle = features?.showStyle !== false;

  const handleWidthChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num) && num >= 0) {
        onChange({ width: num });
      }
    },
    [onChange],
  );

  const handleColorChange = useCallback((hex: string) => onChange({ color: hex }), [onChange]);

  const handleStyleChange = useCallback((s: DashStyle) => onChange({ style: s }), [onChange]);

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <FieldRow>
        {showWidth && (
          <FieldGroup label="Width" inline labelWidth={40} style={{ flex: 1 }}>
            <Input
              type="number"
              value={value.width ?? ""}
              onChange={handleWidthChange}
              disabled={disabled}
              placeholder="0"
              min={0}
              max={100}
              step={0.5}
              suffix="pt"
            />
          </FieldGroup>
        )}
        {showStyle && (
          <FieldGroup label="Style" inline labelWidth={36} style={{ flex: 1 }}>
            <Select
              value={value.style ?? "solid"}
              onChange={handleStyleChange}
              options={dashStyleOptions}
              disabled={disabled}
            />
          </FieldGroup>
        )}
      </FieldRow>

      {showColor && (
        <FieldGroup label="Color" inline labelWidth={40}>
          {buildColorPicker({ renderSlot: renderColorPicker, color: value.color, onChange: handleColorChange, disabled })}
        </FieldGroup>
      )}

      {/* Advanced slot */}
      {renderAdvancedOutline?.()}
    </div>
  );
}
