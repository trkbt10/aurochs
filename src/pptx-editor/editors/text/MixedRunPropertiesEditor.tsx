/**
 * @file MixedRunPropertiesEditor - Editor for text run properties with Mixed support
 *
 * Displays "Mixed" placeholder when property values differ across selection.
 * Follows the flat structure design of RunPropertiesEditor.
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, ToggleButton } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PointsEditor, PixelsEditor } from "../primitives";
import { ColorEditor, createDefaultColor } from "../color";
import type { RunProperties, UnderlineStyle, StrikeStyle } from "../../../pptx/domain/text";
import type { TextCaps, Points, TextTypeface } from "../../../pptx/domain/types";
import type { Color } from "../../../pptx/domain/color/types";
import type { SelectOption } from "../../types";
import { pt, px } from "../../../pptx/domain/types";
import type { MixedRunProperties, PropertyExtraction } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";

// =============================================================================
// Types
// =============================================================================

export type MixedRunPropertiesEditorProps = {
  /** Mixed run properties from selection */
  readonly value: MixedRunProperties;
  /** Called when user changes a property (applies to all selected runs) */
  readonly onChange: (update: Partial<RunProperties>) => void;
  /** Whether the editor is disabled */
  readonly disabled?: boolean;
  /** Additional class name */
  readonly className?: string;
  /** Additional styles */
  readonly style?: CSSProperties;
  /** Show spacing section (baseline, spacing, kerning) */
  readonly showSpacing?: boolean;
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
// Helper Components
// =============================================================================

/**
 * Placeholder text for mixed values.
 */
const MIXED_PLACEHOLDER = "Mixed";

/**
 * Get display value for input fields.
 */
function getInputValue<T>(extraction: PropertyExtraction<T>, defaultValue: T): T | string {
  if (isMixed(extraction)) {
    return "";
  }
  const value = getExtractionValue(extraction);
  return value !== undefined ? value : defaultValue;
}

/**
 * Get placeholder text based on extraction state.
 */
function getPlaceholder<T>(extraction: PropertyExtraction<T>, defaultPlaceholder: string): string {
  if (isMixed(extraction)) {
    return MIXED_PLACEHOLDER;
  }
  return defaultPlaceholder;
}

/**
 * Get toggle button state for boolean properties.
 */
function getToggleState(extraction: PropertyExtraction<boolean>): boolean | "mixed" {
  if (isMixed(extraction)) {
    return "mixed";
  }
  return getExtractionValue(extraction) ?? false;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties with Mixed value support.
 * Displays "Mixed" placeholder when property values differ across selection.
 */
export function MixedRunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
}: MixedRunPropertiesEditorProps) {
  // Font handlers
  const handleFontFamilyChange = useCallback(
    (newValue: string | number) => {
      const strValue = String(newValue).trim();
      onChange({ fontFamily: strValue === "" ? undefined : (strValue as TextTypeface) });
    },
    [onChange]
  );

  const handleFontSizeChange = useCallback(
    (newValue: Points) => {
      onChange({ fontSize: newValue });
    },
    [onChange]
  );

  // Style handlers
  const handleBoldToggle = useCallback(
    (pressed: boolean) => {
      onChange({ bold: pressed || undefined });
    },
    [onChange]
  );

  const handleItalicToggle = useCallback(
    (pressed: boolean) => {
      onChange({ italic: pressed || undefined });
    },
    [onChange]
  );

  const handleCapsChange = useCallback(
    (newValue: TextCaps) => {
      onChange({ caps: newValue === "none" ? undefined : newValue });
    },
    [onChange]
  );

  // Decoration handlers
  const handleUnderlineChange = useCallback(
    (newValue: UnderlineStyle) => {
      onChange({ underline: newValue === "none" ? undefined : newValue });
    },
    [onChange]
  );

  const handleStrikeChange = useCallback(
    (newValue: StrikeStyle) => {
      onChange({ strike: newValue === "noStrike" ? undefined : newValue });
    },
    [onChange]
  );

  // Color handlers
  const handleColorChange = useCallback(
    (newColor: Color) => {
      onChange({ color: newColor });
    },
    [onChange]
  );

  const handleHighlightColorChange = useCallback(
    (newColor: Color) => {
      onChange({ highlightColor: newColor });
    },
    [onChange]
  );

  // Spacing handlers
  const handleSpacingChange = useCallback(
    (newValue: typeof value.spacing extends PropertyExtraction<infer U> ? U : never) => {
      onChange({ spacing: newValue === px(0) ? undefined : newValue });
    },
    [onChange]
  );

  const handleBaselineChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseFloat(newValue);
      if (isNaN(num) || num === 0) {
        onChange({ baseline: undefined });
      } else {
        const clamped = Math.max(-100, Math.min(100, num));
        onChange({ baseline: clamped });
      }
    },
    [onChange]
  );

  const handleKerningChange = useCallback(
    (newValue: Points) => {
      onChange({ kerning: newValue === pt(0) ? undefined : newValue });
    },
    [onChange]
  );

  // Get display values
  const fontFamilyValue = getInputValue(value.fontFamily, "");
  const fontSizeValue = getExtractionValue(value.fontSize) ?? pt(12);
  const boldState = getToggleState(value.bold);
  const italicState = getToggleState(value.italic);
  const capsValue = getExtractionValue(value.caps) ?? "none";
  const underlineValue = getExtractionValue(value.underline) ?? "none";
  const strikeValue = getExtractionValue(value.strike) ?? "noStrike";
  const colorValue = getExtractionValue(value.color) ?? createDefaultColor("000000");
  const highlightValue = getExtractionValue(value.highlightColor) ?? createDefaultColor("FFFF00");
  const spacingValue = getExtractionValue(value.spacing) ?? px(0);
  const baselineValue = getExtractionValue(value.baseline) ?? 0;
  const kerningValue = getExtractionValue(value.kerning) ?? pt(0);

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Font: Family + Size */}
      <FieldRow>
        <FieldGroup label="Font" inline labelWidth={36} style={{ flex: 1 }}>
          <Input
            type="text"
            value={fontFamilyValue}
            onChange={handleFontFamilyChange}
            placeholder={getPlaceholder(value.fontFamily, "Family")}
            disabled={disabled}
          />
        </FieldGroup>
        <FieldGroup label={isMixed(value.fontSize) ? "Size (Mixed)" : "Size"} inline labelWidth={isMixed(value.fontSize) ? 72 : 32} style={{ width: isMixed(value.fontSize) ? "130px" : "90px" }}>
          <PointsEditor
            value={isMixed(value.fontSize) ? pt(12) : fontSizeValue}
            onChange={handleFontSizeChange}
            disabled={disabled}
            min={1}
            max={999}
          />
        </FieldGroup>
      </FieldRow>

      {/* Style: Bold, Italic, Caps */}
      <div style={rowStyle}>
        <ToggleButton
          pressed={boldState === "mixed" ? false : boldState}
          onChange={handleBoldToggle}
          label="B"
          ariaLabel={isMixed(value.bold) ? "Bold (Mixed)" : "Bold"}
          disabled={disabled}
          mixed={boldState === "mixed"}
        />
        <ToggleButton
          pressed={italicState === "mixed" ? false : italicState}
          onChange={handleItalicToggle}
          label="I"
          ariaLabel={isMixed(value.italic) ? "Italic (Mixed)" : "Italic"}
          disabled={disabled}
          mixed={italicState === "mixed"}
        />
        <FieldGroup label="Caps" inline labelWidth={32} style={{ marginLeft: "auto" }}>
          <Select
            value={isMixed(value.caps) ? "none" : capsValue}
            onChange={handleCapsChange}
            options={capsOptions}
            disabled={disabled}
            style={{ width: "70px" }}
            placeholder={isMixed(value.caps) ? MIXED_PLACEHOLDER : undefined}
          />
        </FieldGroup>
      </div>

      <div style={separatorStyle} />

      {/* Decoration: Underline, Strike */}
      <FieldRow>
        <FieldGroup label="U̲" inline labelWidth={20} style={{ flex: 1 }}>
          <Select
            value={isMixed(value.underline) ? "none" : underlineValue}
            onChange={handleUnderlineChange}
            options={underlineOptions}
            disabled={disabled}
            placeholder={isMixed(value.underline) ? MIXED_PLACEHOLDER : undefined}
          />
        </FieldGroup>
        <FieldGroup label="S̶" inline labelWidth={20} style={{ flex: 1 }}>
          <Select
            value={isMixed(value.strike) ? "noStrike" : strikeValue}
            onChange={handleStrikeChange}
            options={strikeOptions}
            disabled={disabled}
            placeholder={isMixed(value.strike) ? MIXED_PLACEHOLDER : undefined}
          />
        </FieldGroup>
      </FieldRow>

      <div style={separatorStyle} />

      {/* Color: Text + Highlight */}
      <FieldRow>
        <FieldGroup label={isMixed(value.color) ? "Color (Mixed)" : "Color"} inline labelWidth={isMixed(value.color) ? 80 : 40}>
          <ColorEditor
            value={colorValue}
            onChange={handleColorChange}
            disabled={disabled}
            showTransform={false}
          />
        </FieldGroup>
        <FieldGroup label={isMixed(value.highlightColor) ? "Hi (Mixed)" : "Highlight"} inline labelWidth={isMixed(value.highlightColor) ? 64 : 56}>
          <ColorEditor
            value={highlightValue}
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
            <FieldGroup label={isMixed(value.spacing) ? "Spacing (M)" : "Spacing"} inline labelWidth={isMixed(value.spacing) ? 72 : 52} style={{ flex: 1 }}>
              <PixelsEditor
                value={isMixed(value.spacing) ? px(0) : spacingValue}
                onChange={handleSpacingChange}
                disabled={disabled}
              />
            </FieldGroup>
            <FieldGroup label={isMixed(value.baseline) ? "Base (M)" : "Baseline"} inline labelWidth={isMixed(value.baseline) ? 56 : 52} style={{ flex: 1 }}>
              <Input
                type="number"
                value={isMixed(value.baseline) ? "" : baselineValue}
                onChange={handleBaselineChange}
                suffix="%"
                min={-100}
                max={100}
                disabled={disabled}
                placeholder={isMixed(value.baseline) ? MIXED_PLACEHOLDER : undefined}
              />
            </FieldGroup>
          </FieldRow>
          <FieldGroup label={isMixed(value.kerning) ? "Kerning (M)" : "Kerning"} inline labelWidth={isMixed(value.kerning) ? 72 : 52}>
            <PointsEditor
              value={isMixed(value.kerning) ? pt(0) : kerningValue}
              onChange={handleKerningChange}
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
