/**
 * @file MixedRunPropertiesEditor - Editor for text run properties with Mixed support
 *
 * Wraps the shared TextFormattingEditor with PPTX-specific adapters and slots.
 * PPTX-specific controls (caps, underline/strike styles, spacing) go in renderExtras.
 */

import { useCallback, type CSSProperties } from "react";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PixelsEditor, PointsEditor } from "../primitives";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { ColorEditor, createDefaultColor } from "../color";
import { TextFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { TextFormatting } from "@aurochs-ui/editor-controls/text";
import type { RunProperties, UnderlineStyle, StrikeStyle } from "@aurochs-office/pptx/domain/text";
import type { TextCaps, TextTypeface } from "@aurochs-office/pptx/domain/types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { pt, px, type Points } from "@aurochs-office/drawing-ml/domain/units";
import type { MixedRunProperties, PropertyExtraction } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";
import { pptxMixedRunToContext, pptxMixedRunToGeneric } from "../../adapters/editor-controls";
import { FontFamilySelect } from "@aurochs-ui/editor-controls/font";

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
// Options (PPTX-specific)
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
// Styles (for extras section)
// =============================================================================

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Helpers
// =============================================================================

const MIXED_PLACEHOLDER = "Mixed";

function getLabel(extraction: PropertyExtraction<unknown>, label: string, mixedSuffix = " (M)"): string {
  if (isMixed(extraction)) {
    return label + mixedSuffix;
  }
  return label;
}

/** Resolve strike style from update toggle and current value */
function resolveStrikeFromUpdate(
  enabled: boolean | undefined,
  current: StrikeStyle | undefined,
): StrikeStyle | undefined {
  if (!enabled) {
    return undefined;
  }
  return current && current !== "noStrike" ? current : "sngStrike";
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties with Mixed value support.
 * Uses shared TextFormattingEditor for common controls (B/I/U/S, font, color).
 * PPTX-specific controls (caps, underline/strike styles, spacing) rendered as extras.
 */
export function MixedRunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
}: MixedRunPropertiesEditorProps) {
  // Convert mixed properties to generic format
  const generic = pptxMixedRunToGeneric(value);
  const mixedCtx = pptxMixedRunToContext(value);

  // Handle shared editor onChange (convert generic updates → PPTX RunProperties)
  const handleSharedChange = useCallback(
    (update: Partial<TextFormatting>) => {
      const parts: Partial<RunProperties>[] = [];

      if ("bold" in update) {
        parts.push({ bold: update.bold || undefined });
      }
      if ("italic" in update) {
        parts.push({ italic: update.italic || undefined });
      }
      if ("underline" in update) {
        const currentStyle = getExtractionValue(value.underline);
        parts.push({
          underline: update.underline ? (currentStyle && currentStyle !== "none" ? currentStyle : "sng") : undefined,
        });
      }
      if ("strikethrough" in update) {
        const currentStrike = getExtractionValue(value.strike);
        parts.push({
          strike: resolveStrikeFromUpdate(update.strikethrough, currentStrike),
        });
      }
      if ("fontSize" in update && update.fontSize !== undefined) {
        parts.push({ fontSize: pt(update.fontSize) as Points });
      }
      if ("fontFamily" in update) {
        const str = update.fontFamily?.trim() ?? "";
        parts.push({ fontFamily: str === "" ? undefined : (str as TextTypeface) });
      }
      if ("superscript" in update) {
        parts.push({ baseline: update.superscript ? 30 : undefined });
      }
      if ("subscript" in update) {
        parts.push({ baseline: update.subscript ? -25 : undefined });
      }

      onChange(Object.assign({}, ...parts) as Partial<RunProperties>);
    },
    [onChange, value.underline, value.strike],
  );

  // PPTX-specific handlers for extras section
  const handleCapsChange = useCallback(
    (newValue: TextCaps) => {
      onChange({ caps: newValue === "none" ? undefined : newValue });
    },
    [onChange],
  );

  const handleUnderlineChange = useCallback(
    (newValue: UnderlineStyle) => {
      onChange({ underline: newValue === "none" ? undefined : newValue });
    },
    [onChange],
  );

  const handleStrikeChange = useCallback(
    (newValue: StrikeStyle) => {
      onChange({ strike: newValue === "noStrike" ? undefined : newValue });
    },
    [onChange],
  );

  const handleSpacingChange = useCallback(
    (newValue: typeof value.spacing extends PropertyExtraction<infer U> ? U : never) => {
      onChange({ spacing: newValue === px(0) ? undefined : newValue });
    },
    [onChange],
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
    [onChange],
  );

  const handleKerningChange = useCallback(
    (newValue: Points) => {
      onChange({ kerning: newValue === pt(0) ? undefined : newValue });
    },
    [onChange],
  );

  // PPTX-specific display values for extras
  const capsValue = getExtractionValue(value.caps) ?? "none";
  const underlineValue = getExtractionValue(value.underline) ?? "none";
  const strikeValue = getExtractionValue(value.strike) ?? "noStrike";
  const spacingValue = getExtractionValue(value.spacing) ?? px(0);
  const baselineValue = getExtractionValue(value.baseline) ?? 0;
  const kerningValue = getExtractionValue(value.kerning) ?? pt(0);

  return (
    <TextFormattingEditor
      value={generic}
      onChange={handleSharedChange}
      disabled={disabled}
      className={className}
      style={style}
      features={{ showHighlight: true, showSuperSubscript: true }}
      mixed={mixedCtx}
      renderColorPicker={({ disabled: d }) => (
        <ColorEditor
          value={getExtractionValue(value.color) ?? createDefaultColor("000000")}
          onChange={(newColor) => onChange({ color: newColor })}
          disabled={d}
          showTransform={false}
        />
      )}
      renderHighlightPicker={({ disabled: d }) => (
        <ColorEditor
          value={getExtractionValue(value.highlightColor) ?? createDefaultColor("FFFF00")}
          onChange={(newColor) => onChange({ highlightColor: newColor })}
          disabled={d}
          showTransform={false}
        />
      )}
      renderFontFamilySelect={({ value: fam, disabled: d, placeholder }) => (
        <FontFamilySelect
          value={String(fam ?? "")}
          onChange={(v) => {
            const str = v?.trim() ?? "";
            onChange({ fontFamily: str === "" ? undefined : (str as TextTypeface) });
          }}
          disabled={d}
          placeholder={placeholder}
        />
      )}
      renderExtras={() => (
        <>
          {/* PPTX-specific: Caps */}
          <div style={separatorStyle} />
          <FieldRow>
            <FieldGroup label={getLabel(value.caps, "Caps")} inline labelWidth={32} style={{ flex: 1 }}>
              <Select
                value={isMixed(value.caps) ? "none" : capsValue}
                onChange={handleCapsChange}
                options={capsOptions}
                disabled={disabled}
                style={{ width: "70px" }}
                placeholder={isMixed(value.caps) ? MIXED_PLACEHOLDER : undefined}
              />
            </FieldGroup>
          </FieldRow>

          {/* PPTX-specific: Underline Style + Strike Style */}
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

          {/* PPTX-specific: Spacing */}
          {showSpacing && (
            <>
              <div style={separatorStyle} />
              <FieldRow>
                <FieldGroup
                  label={getLabel(value.spacing, "Spacing")}
                  inline
                  labelWidth={isMixed(value.spacing) ? 72 : 52}
                  style={{ flex: 1 }}
                >
                  <PixelsEditor
                    value={isMixed(value.spacing) ? px(0) : spacingValue}
                    onChange={handleSpacingChange}
                    disabled={disabled}
                  />
                </FieldGroup>
                <FieldGroup
                  label={getLabel(value.baseline, "Base", " (M)")}
                  inline
                  labelWidth={isMixed(value.baseline) ? 56 : 52}
                  style={{ flex: 1 }}
                >
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
              <FieldGroup
                label={getLabel(value.kerning, "Kerning")}
                inline
                labelWidth={isMixed(value.kerning) ? 72 : 52}
              >
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
        </>
      )}
    />
  );
}
