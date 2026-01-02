/**
 * @file RunPropertiesEditor - Editor for text run properties
 *
 * Edits character-level text formatting including font, style, decoration, color, and spacing.
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
  { value: "words", label: "Words Only" },
  { value: "dotted", label: "Dotted" },
  { value: "dottedHeavy", label: "Dotted Heavy" },
  { value: "dash", label: "Dash" },
  { value: "dashHeavy", label: "Dash Heavy" },
  { value: "dashLong", label: "Long Dash" },
  { value: "dashLongHeavy", label: "Long Dash Heavy" },
  { value: "dotDash", label: "Dot-Dash" },
  { value: "dotDashHeavy", label: "Dot-Dash Heavy" },
  { value: "dotDotDash", label: "Dot-Dot-Dash" },
  { value: "dotDotDashHeavy", label: "Dot-Dot-Dash Heavy" },
  { value: "wavy", label: "Wavy" },
  { value: "wavyHeavy", label: "Wavy Heavy" },
  { value: "wavyDbl", label: "Wavy Double" },
];

const strikeOptions: readonly SelectOption<StrikeStyle>[] = [
  { value: "noStrike", label: "None" },
  { value: "sngStrike", label: "Single" },
  { value: "dblStrike", label: "Double" },
];

const capsOptions: readonly SelectOption<TextCaps>[] = [
  { value: "none", label: "None" },
  { value: "small", label: "Small Caps" },
  { value: "all", label: "All Caps" },
];

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const sectionStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const toggleRowStyle: CSSProperties = {
  display: "flex",
  gap: "16px",
  flexWrap: "wrap",
};

const fieldStyle: CSSProperties = {
  flex: 1,
  minWidth: "80px",
};

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties (character-level formatting)
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

  const gap = compact ? "12px" : "16px";

  return (
    <div style={{ ...containerStyle, gap, ...style }} className={className}>
      {/* Font Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Font">
          <FieldRow>
            <FieldGroup label="Family" style={fieldStyle}>
              <Input
                type="text"
                value={value.fontFamily ?? ""}
                onChange={handleFontFamilyChange}
                placeholder="Font name"
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Size" style={{ minWidth: "80px" }}>
              <PointsEditor
                value={value.fontSize ?? pt(12)}
                onChange={handleFontSizeChange}
                disabled={disabled}
                min={1}
                max={999}
              />
            </FieldGroup>
          </FieldRow>
        </FieldGroup>
      </div>

      {/* Style Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Style">
          <div style={toggleRowStyle}>
            <Toggle
              checked={value.bold ?? false}
              onChange={(v) => updateField("bold", v || undefined)}
              label="Bold"
              disabled={disabled}
            />
            <Toggle
              checked={value.italic ?? false}
              onChange={(v) => updateField("italic", v || undefined)}
              label="Italic"
              disabled={disabled}
            />
          </div>
          <div style={{ marginTop: "12px" }}>
            <FieldGroup label="Caps">
              <Select
                value={value.caps ?? "none"}
                onChange={(v) => updateField("caps", v === "none" ? undefined : v)}
                options={capsOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </div>
        </FieldGroup>
      </div>

      {/* Decoration Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Decoration">
          <FieldRow>
            <FieldGroup label="Underline" style={fieldStyle}>
              <Select
                value={value.underline ?? "none"}
                onChange={(v) => updateField("underline", v === "none" ? undefined : v)}
                options={underlineOptions}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label="Strikethrough" style={fieldStyle}>
              <Select
                value={value.strike ?? "noStrike"}
                onChange={(v) => updateField("strike", v === "noStrike" ? undefined : v)}
                options={strikeOptions}
                disabled={disabled}
              />
            </FieldGroup>
          </FieldRow>
        </FieldGroup>
      </div>

      {/* Color Section */}
      <div style={sectionStyle}>
        <FieldGroup label="Text Color">
          <ColorEditor
            value={value.color ?? createDefaultColor("000000")}
            onChange={handleColorChange}
            disabled={disabled}
            showTransform={false}
          />
        </FieldGroup>
        <div style={{ marginTop: "12px" }}>
          <FieldGroup label="Highlight Color">
            <ColorEditor
              value={value.highlightColor ?? createDefaultColor("FFFF00")}
              onChange={handleHighlightColorChange}
              disabled={disabled}
              showTransform={false}
            />
          </FieldGroup>
        </div>
      </div>

      {/* Spacing Section */}
      {showSpacing && (
        <div style={sectionStyle}>
          <FieldGroup label="Spacing">
            <FieldRow>
              <FieldGroup label="Letter Spacing" style={fieldStyle}>
                <PixelsEditor
                  value={value.spacing ?? px(0)}
                  onChange={(v) => updateField("spacing", v === px(0) ? undefined : v)}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldGroup label="Baseline" style={fieldStyle}>
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
            <div style={{ marginTop: "12px" }}>
              <FieldGroup label="Kerning (min size)" hint="pt">
                <PointsEditor
                  value={value.kerning ?? pt(0)}
                  onChange={(v) => updateField("kerning", v === pt(0) ? undefined : v)}
                  disabled={disabled}
                  min={0}
                  max={999}
                />
              </FieldGroup>
            </div>
          </FieldGroup>
        </div>
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
