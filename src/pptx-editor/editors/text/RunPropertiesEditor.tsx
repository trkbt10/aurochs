/**
 * @file RunPropertiesEditor - Editor for text run properties
 *
 * Design principle: Flat structure, no nested FieldGroups.
 * Each field has its own inline label.
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PointsEditor, PixelsEditor } from "../primitives";
import { ColorEditor, createDefaultColor } from "../color";
import type { RunProperties, UnderlineStyle, StrikeStyle } from "../../../pptx/domain/text";
import type { TextCaps, Points, TextTypeface } from "../../../pptx/domain/types";
import type { Color } from "../../../pptx/domain/color";
import type { EditorProps, SelectOption } from "../../types";
import { pt, px } from "../../../pptx/domain/types";

// =============================================================================
// Types
// =============================================================================

export type RunPropertiesEditorProps = EditorProps<RunProperties> & {
  readonly style?: CSSProperties;
  /** Show spacing section (baseline, spacing, kerning) */
  readonly showSpacing?: boolean;
  /** Compact mode - reduces vertical space */
  readonly compact?: boolean;
};

// =============================================================================
// Options
// =============================================================================

const underlineOptions: readonly SelectOption<UnderlineStyle>[] = [
  { value: "none", label: "None" },
  { value: "sng", label: "Single" },
  { value: "dbl", label: "Double" },
  { value: "heavy", label: "Heavy" },
  { value: "words", label: "Words" },
  { value: "dotted", label: "Dotted" },
  { value: "dash", label: "Dash" },
  { value: "wavy", label: "Wavy" },
];

const strikeOptions: readonly SelectOption<StrikeStyle>[] = [
  { value: "noStrike", label: "None" },
  { value: "sngStrike", label: "Single" },
  { value: "dblStrike", label: "Double" },
];

const capsOptions: readonly SelectOption<TextCaps>[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small" },
  { value: "all", label: "All" },
];

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

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties (character-level formatting).
 * Flat structure with inline labels.
 */
export function RunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
  compact = false,
}: RunPropertiesEditorProps) {
  const updateField = useCallback(
    <K extends keyof RunProperties>(field: K, newValue: RunProperties[K]) => {
      if (newValue === undefined) {
        const updated = { ...value };
        delete updated[field];
        onChange(updated);
      } else {
        onChange({ ...value, [field]: newValue });
      }
    },
    [value, onChange]
  );

  const handleFontFamilyChange = useCallback(
    (newValue: string | number) => {
      const strValue = String(newValue).trim();
      updateField("fontFamily", strValue === "" ? undefined : (strValue as TextTypeface));
    },
    [updateField]
  );

  const handleFontSizeChange = useCallback(
    (newValue: Points) => {
      updateField("fontSize", newValue);
    },
    [updateField]
  );

  const handleBaselineChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      if (isNaN(num) || num === 0) {
        updateField("baseline", undefined);
      } else {
        const clamped = Math.max(-100, Math.min(100, num));
        updateField("baseline", clamped);
      }
    },
    [updateField]
  );

  const handleColorChange = useCallback(
    (newColor: Color) => {
      updateField("color", newColor);
    },
    [updateField]
  );

  const handleHighlightColorChange = useCallback(
    (newColor: Color) => {
      updateField("highlightColor", newColor);
    },
    [updateField]
  );

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Font: Family + Size */}
      <FieldRow>
        <FieldGroup label="Font" inline labelWidth={36} style={{ flex: 1 }}>
          <Input
            type="text"
            value={value.fontFamily ?? ""}
            onChange={handleFontFamilyChange}
            placeholder="Family"
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="Size" inline labelWidth={32} style={{ width: "90px" }}>
          <PointsEditor
            value={value.fontSize ?? pt(12)}
            onChange={handleFontSizeChange}
            disabled={disabled}
            min={1}
            max={999}
          />
        </FieldGroup>
      </FieldRow>

      {/* Style: Bold, Italic, Caps */}
      <div style={rowStyle}>
        <Toggle
          checked={value.bold ?? false}
          onChange={(v) => updateField("bold", v || undefined)}
          label="B"
          disabled={disabled}
        />
        <Toggle
          checked={value.italic ?? false}
          onChange={(v) => updateField("italic", v || undefined)}
          label="I"
          disabled={disabled}
        />
        <FieldGroup label="Caps" inline labelWidth={32} style={{ marginLeft: "auto" }}>
          <Select
            value={value.caps ?? "none"}
            onChange={(v) => updateField("caps", v === "none" ? undefined : v)}
            options={capsOptions}
            disabled={disabled}
            style={{ width: "70px" }}
          />
        </FieldGroup>
      </div>

      <div style={separatorStyle} />

      {/* Decoration: Underline, Strike */}
      <FieldRow>
        <FieldGroup label="U̲" inline labelWidth={20} style={{ flex: 1 }}>
          <Select
            value={value.underline ?? "none"}
            onChange={(v) => updateField("underline", v === "none" ? undefined : v)}
            options={underlineOptions}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label="S̶" inline labelWidth={20} style={{ flex: 1 }}>
          <Select
            value={value.strike ?? "noStrike"}
            onChange={(v) => updateField("strike", v === "noStrike" ? undefined : v)}
            options={strikeOptions}
            disabled={disabled}
          />
        </FieldGroup>
      </FieldRow>

      <div style={separatorStyle} />

      {/* Color: Text + Highlight */}
      <FieldRow>
        <FieldGroup label="Color" inline labelWidth={40}>
          <ColorEditor
            value={value.color ?? createDefaultColor("000000")}
            onChange={handleColorChange}
            disabled={disabled}
            showTransform={false}
          />
        </FieldGroup>
        <FieldGroup label="Highlight" inline labelWidth={56}>
          <ColorEditor
            value={value.highlightColor ?? createDefaultColor("FFFF00")}
            onChange={handleHighlightColorChange}
            disabled={disabled}
            showTransform={false}
          />
        </FieldGroup>
      </FieldRow>

      {/* Spacing */}
      {showSpacing && (
        <>
          <div style={separatorStyle} />
          <FieldRow>
            <FieldGroup label="Spacing" inline labelWidth={52} style={{ flex: 1 }}>
              <PixelsEditor
                value={value.spacing ?? px(0)}
                onChange={(v) => updateField("spacing", v === px(0) ? undefined : v)}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Baseline" inline labelWidth={52} style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.baseline ?? 0}
                onChange={handleBaselineChange}
                suffix="%"
                min={-100}
                max={100}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
          <FieldGroup label="Kerning" inline labelWidth={52}>
            <PointsEditor
              value={value.kerning ?? pt(0)}
              onChange={(v) => updateField("kerning", v === pt(0) ? undefined : v)}
              disabled={disabled}
              min={0}
              max={999}
            />
          </FieldGroup>
        </>
      )}
    </div>
  );
}

/**
 * Create default RunProperties value
 */
export function createDefaultRunProperties(): RunProperties {
  return {};
}
