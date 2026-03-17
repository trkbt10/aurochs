/**
 * @file MixedRunPropertiesEditor - Editor for text run properties with Mixed support
 *
 * Uses react-editor-ui sections (FontSection, FontMetricsSection, CaseTransformSection)
 * supplemented with PPTX-specific controls (color, underline/strike style, spacing).
 */

import { useCallback, type CSSProperties } from "react";
import { FontSection } from "react-editor-ui/sections/FontSection";
import { useFontOptions } from "@aurochs-ui/editor-controls/font";
import { FontMetricsSection } from "react-editor-ui/sections/FontMetricsSection";
import { CaseTransformSection } from "react-editor-ui/sections/CaseTransformSection";
import { PropertySection } from "react-editor-ui/PropertySection";
import { Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PixelsEditor, PointsEditor } from "../primitives";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { ColorEditor, createDefaultColor } from "../color";
import type { RunProperties, UnderlineStyle, StrikeStyle } from "@aurochs-office/pptx/domain/text";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { pt, px } from "@aurochs-office/drawing-ml/domain/units";
import type { MixedRunProperties } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";
import type { FontData, FontMetricsData, CaseTransformData } from "@aurochs-ui/editor-core/adapter-types";
import {
  mixedRunToFont,
  fontToRunUpdate,
  mixedRunToFontMetrics,
  fontMetricsToRunUpdate,
  mixedRunToCaseTransform,
  caseTransformToRunUpdate,
} from "../../adapters/editor-ui/text-adapters";

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

const MIXED_PLACEHOLDER = "Mixed";

// =============================================================================
// Helpers
// =============================================================================

/** Get label with mixed suffix */
function getLabel(extraction: { readonly type: string }, label: string, mixedSuffix = " (M)"): string {
  if (extraction.type === "mixed") {
    return label + mixedSuffix;
  }
  return label;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for text run properties with Mixed value support.
 * Uses react-editor-ui sections for common controls, supplemented with
 * PPTX-specific controls for color, underline/strike style, and spacing.
 */
export function MixedRunPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
}: MixedRunPropertiesEditorProps) {
  const { fontOptions } = useFontOptions();
  // =========================================================================
  // react-editor-ui section handlers (via adapters)
  // =========================================================================

  const handleFontChange = useCallback(
    (data: FontData) => { onChange(fontToRunUpdate(data)); },
    [onChange],
  );

  const handleFontMetricsChange = useCallback(
    (data: FontMetricsData) => { onChange(fontMetricsToRunUpdate(data)); },
    [onChange],
  );

  const handleCaseTransformChange = useCallback(
    (data: CaseTransformData) => { onChange(caseTransformToRunUpdate(data)); },
    [onChange],
  );

  // =========================================================================
  // PPTX-specific handlers
  // =========================================================================

  const handleUnderlineChange = useCallback(
    (v: UnderlineStyle) => { onChange({ underline: v === "none" ? undefined : v }); },
    [onChange],
  );

  const handleStrikeChange = useCallback(
    (v: StrikeStyle) => { onChange({ strike: v === "noStrike" ? undefined : v }); },
    [onChange],
  );

  const handleSpacingChange = useCallback(
    (v: number) => { onChange({ spacing: v === 0 ? undefined : px(v) }); },
    [onChange],
  );

  const handleBaselineChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (isNaN(num) || num === 0) {
        onChange({ baseline: undefined });
      } else {
        onChange({ baseline: Math.max(-100, Math.min(100, num)) });
      }
    },
    [onChange],
  );

  const handleKerningChange = useCallback(
    (v: number) => { onChange({ kerning: v === 0 ? undefined : pt(v) }); },
    [onChange],
  );

  // =========================================================================
  // Values for PPTX-specific controls
  // =========================================================================

  const underlineValue = getExtractionValue(value.underline) ?? "none";
  const strikeValue = getExtractionValue(value.strike) ?? "noStrike";
  const spacingValue = (getExtractionValue(value.spacing) ?? 0) as number;
  const baselineValue = getExtractionValue(value.baseline) ?? 0;
  const kerningValue = (getExtractionValue(value.kerning) ?? 0) as number;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className={className} style={style}>
      {/* Font family + weight (react-editor-ui) */}
      <FontSection
        data={mixedRunToFont(value)}
        onChange={handleFontChange}
        disabled={disabled}
        fontOptions={fontOptions}
      />

      {/* Font size, leading, tracking, kerning (react-editor-ui) */}
      <FontMetricsSection
        data={mixedRunToFontMetrics(value)}
        onChange={handleFontMetricsChange}
        size="sm"
        disabled={disabled}
      />

      {/* Caps + underline/strike/super/sub toggles (react-editor-ui) */}
      <CaseTransformSection
        data={mixedRunToCaseTransform(value)}
        onChange={handleCaseTransformChange}
        size="sm"
        disabled={disabled}
      />

      {/* PPTX-specific: color + highlight */}
      <PropertySection title="Color" defaultExpanded>
        <FieldRow>
          <FieldGroup label="Text" inline labelWidth={40} style={{ flex: 1 }}>
            <ColorEditor
              value={getExtractionValue(value.color) ?? createDefaultColor("000000")}
              onChange={(c) => onChange({ color: c })}
              disabled={disabled}
              showTransform={false}
            />
          </FieldGroup>
          <FieldGroup label="Highlight" inline labelWidth={60} style={{ flex: 1 }}>
            <ColorEditor
              value={getExtractionValue(value.highlightColor) ?? createDefaultColor("FFFF00")}
              onChange={(c) => onChange({ highlightColor: c })}
              disabled={disabled}
              showTransform={false}
            />
          </FieldGroup>
        </FieldRow>
      </PropertySection>

      {/* PPTX-specific: underline + strike style */}
      <PropertySection title="Decoration" defaultExpanded>
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
      </PropertySection>

      {/* PPTX-specific: spacing/baseline/kerning */}
      {showSpacing && (
        <PropertySection title="Spacing" defaultExpanded>
          <FieldRow>
            <FieldGroup
              label={getLabel(value.spacing, "Spacing")}
              inline
              labelWidth={isMixed(value.spacing) ? 72 : 52}
              style={{ flex: 1 }}
            >
              <PixelsEditor
                value={isMixed(value.spacing) ? px(0) : px(spacingValue)}
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
              value={isMixed(value.kerning) ? pt(0) : pt(kerningValue)}
              onChange={handleKerningChange}
              disabled={disabled}
              min={0}
              max={999}
            />
          </FieldGroup>
        </PropertySection>
      )}
    </div>
  );
}
