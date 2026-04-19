/**
 * @file TextFormattingEditor - Shared text run formatting editor
 *
 * Uses react-editor-ui sections (FontSection, FontMetricsSection,
 * CaseTransformSection, PropertySection) to provide the same design
 * as the original PPTX MixedRunPropertiesEditor. Feature flags control
 * which sections and controls are visible.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import { FontSection } from "react-editor-ui/sections/FontSection";
import { FontMetricsSection } from "react-editor-ui/sections/FontMetricsSection";
import { CaseTransformSection } from "react-editor-ui/sections/CaseTransformSection";
import { OptionalPropertySection } from "../ui/OptionalPropertySection";
import { Input, Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { ColorPickerPopover } from "@aurochs-ui/color-editor";
import { useFontOptions } from "../font";
import type { FontData, FontMetricsData } from "@aurochs-ui/editor-core/adapter-types";

/** Local TextStyle / CaseTransformData matching react-editor-ui's types exactly. */
type TextStyle = "superscript" | "subscript" | "underline" | "strikethrough";
type CaseTransformData = {
  case: "normal" | "small-caps" | "all-caps";
  styles: TextStyle[];
};
import type { TextFormatting, TextFormattingFeatures, StyleOption } from "./types";
import type { MixedContext } from "../mixed-state";

// =============================================================================
// Types
// =============================================================================

export type TextFormattingEditorProps = {
  readonly value: TextFormatting;
  readonly onChange: (update: Partial<TextFormatting>) => void;
  readonly disabled?: boolean;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly features?: TextFormattingFeatures;
  readonly mixed?: MixedContext;
  /** Slot: format-specific color picker (replaces default ColorPickerPopover). */
  readonly renderColorPicker?: (props: {
    value: string | undefined;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific highlight color picker. */
  readonly renderHighlightPicker?: (props: {
    value: string | undefined;
    onChange: (hex: string) => void;
    disabled?: boolean;
  }) => ReactNode;
  /** Slot: format-specific extra controls. */
  readonly renderExtras?: () => ReactNode;
  /** Options for underline style dropdown. Used when showUnderlineStyle is true. */
  readonly underlineStyleOptions?: readonly StyleOption[];
  /** Options for strike style dropdown. Used when showStrikeStyle is true. */
  readonly strikeStyleOptions?: readonly StyleOption[];
  /** Extra font families to include in FontFamilySelect (e.g. workbook fonts). */
  readonly additionalFontFamilies?: readonly string[];
};

// =============================================================================
// Default options
// =============================================================================

const DEFAULT_UNDERLINE_OPTIONS: readonly StyleOption[] = [
  { value: "none", label: "None" },
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
  { value: "heavy", label: "Heavy" },
  { value: "dotted", label: "Dotted" },
  { value: "dash", label: "Dash" },
  { value: "wavy", label: "Wavy" },
];

const DEFAULT_STRIKE_OPTIONS: readonly StyleOption[] = [
  { value: "none", label: "None" },
  { value: "single", label: "Single" },
  { value: "double", label: "Double" },
];

// =============================================================================
// Helpers — TextFormatting ↔ react-editor-ui adapter-types
// =============================================================================

function toFontData(value: TextFormatting): FontData {
  return {
    family: value.fontFamily ?? "",
    weight: value.bold ? "bold" : "400",
  };
}

function fromFontData(data: FontData): Partial<TextFormatting> {
  return {
    fontFamily: data.family || undefined,
    bold: data.weight === "bold" ? true : undefined,
  };
}

function toFontMetricsData(value: TextFormatting): FontMetricsData {
  return {
    size: value.fontSize !== undefined ? `${value.fontSize} pt` : "",
    leading: "auto",
    kerning: value.kerning !== undefined && value.kerning > 0 ? "auto" : "none",
    tracking: String(value.letterSpacing ?? 0),
  };
}

function fromFontMetricsData(data: FontMetricsData): Partial<TextFormatting> {
  const update: Partial<TextFormatting> = {};
  if (data.size) {
    const parsed = parseFloat(data.size);
    if (!Number.isNaN(parsed) && parsed > 0) {
      (update as Record<string, unknown>).fontSize = parsed;
    }
  }
  if (data.tracking !== "0" && data.tracking !== "") {
    const parsed = parseFloat(data.tracking);
    if (!Number.isNaN(parsed)) {
      (update as Record<string, unknown>).letterSpacing = parsed === 0 ? undefined : parsed;
    }
  }
  return update;
}

function capsToCase(caps: TextFormatting["caps"]): CaseTransformData["case"] {
  if (caps === "small") { return "small-caps"; }
  if (caps === "all") { return "all-caps"; }
  return "normal";
}

function toCaseTransformData(value: TextFormatting): CaseTransformData {
  const styles: TextStyle[] = [];
  if (value.underline) { styles.push("underline"); }
  if (value.strikethrough) { styles.push("strikethrough"); }
  if (value.superscript) { styles.push("superscript"); }
  if (value.subscript) { styles.push("subscript"); }
  return { case: capsToCase(value.caps), styles };
}

function caseDataToCaps(caseValue: CaseTransformData["case"]): "small" | "all" | "none" {
  if (caseValue === "small-caps") { return "small"; }
  if (caseValue === "all-caps") { return "all"; }
  return "none";
}

function fromCaseTransformData(data: CaseTransformData): Partial<TextFormatting> {
  const caps = caseDataToCaps(data.case);
  return {
    caps,
    underline: data.styles.includes("underline") || undefined,
    strikethrough: data.styles.includes("strikethrough") || undefined,
    superscript: data.styles.includes("superscript") || undefined,
    subscript: data.styles.includes("subscript") || undefined,
    italic: undefined, // CaseTransformSection doesn't handle italic
  };
}

function toBareHex(color: string | undefined, fallback: string): string {
  if (!color) { return fallback; }
  return color.startsWith("#") ? color.slice(1) : color;
}

function buildColorPicker(opts: {
  renderSlot: TextFormattingEditorProps["renderColorPicker"] | TextFormattingEditorProps["renderHighlightPicker"];
  color: string | undefined;
  onChange: (hex: string) => void;
  disabled?: boolean;
  fallbackHex: string;
}): ReactNode {
  if (opts.renderSlot) {
    return opts.renderSlot({ value: opts.color, onChange: opts.onChange, disabled: opts.disabled });
  }
  return (
    <ColorPickerPopover
      value={toBareHex(opts.color, opts.fallbackHex)}
      onChange={(hex) => opts.onChange(`#${hex}`)}
      disabled={opts.disabled}
    />
  );
}

function feat(
  features: TextFormattingFeatures | undefined,
  key: keyof TextFormattingFeatures,
  defaultValue = true,
): boolean {
  return features?.[key] ?? defaultValue;
}

const _MIXED_PLACEHOLDER = "Mixed";

// =============================================================================
// Component
// =============================================================================

/** Shared text run formatting editor using react-editor-ui sections. */
export function TextFormattingEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  features,
  mixed: _mixed,
  renderColorPicker,
  renderHighlightPicker,
  renderExtras,
  underlineStyleOptions = DEFAULT_UNDERLINE_OPTIONS,
  strikeStyleOptions = DEFAULT_STRIKE_OPTIONS,
  additionalFontFamilies: _additionalFontFamilies,
}: TextFormattingEditorProps) {
  const { fontOptions } = useFontOptions();

  // =========================================================================
  // react-editor-ui section handlers
  // =========================================================================

  const handleFontChange = useCallback(
    (data: FontData) => { onChange(fromFontData(data)); },
    [onChange],
  );

  const handleFontMetricsChange = useCallback(
    (data: FontMetricsData) => { onChange(fromFontMetricsData(data)); },
    [onChange],
  );

  const handleCaseTransformChange = useCallback(
    (data: CaseTransformData) => { onChange(fromCaseTransformData(data)); },
    [onChange],
  );

  // =========================================================================
  // Color handlers
  // =========================================================================

  const handleTextColorChange = useCallback((hex: string) => onChange({ textColor: hex }), [onChange]);
  const handleHighlightColorChange = useCallback((hex: string) => onChange({ highlightColor: hex }), [onChange]);

  // =========================================================================
  // Style dropdown handlers (underline/strike detail)
  // =========================================================================

  const handleUnderlineStyleChange = useCallback(
    (s: string) => { onChange({ underlineStyle: s, underline: s !== "none" && s !== undefined }); },
    [onChange],
  );

  const handleStrikeStyleChange = useCallback(
    (s: string) => { onChange({ strikethroughStyle: s, strikethrough: s !== "none" && s !== undefined }); },
    [onChange],
  );

  // =========================================================================
  // Spacing handlers
  // =========================================================================

  const handleBaselineChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(String(v));
      if (isNaN(num) || num === 0) { onChange({ baseline: undefined }); }
      else { onChange({ baseline: Math.max(-100, Math.min(100, num)) }); }
    },
    [onChange],
  );

  const handleKerningChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseFloat(v);
      if (!isNaN(num)) { onChange({ kerning: num === 0 ? undefined : num }); }
    },
    [onChange],
  );

  // =========================================================================
  // Feature flags
  // =========================================================================

  const showFontFamily = feat(features, "showFontFamily");
  const showFontSize = feat(features, "showFontSize");
  const showTextColor = feat(features, "showTextColor");
  const showHighlight = feat(features, "showHighlight", false);
  const showSuperSubscript = feat(features, "showSuperSubscript", false);
  const showUnderlineStyle = feat(features, "showUnderlineStyle", false);
  const showStrikeStyle = feat(features, "showStrikeStyle", false);
  const showCaps = feat(features, "showCaps", false);
  const showSpacing = feat(features, "showSpacing", false);

  const hasColorRow = showTextColor || showHighlight;
  const hasStyleDropdowns = showUnderlineStyle || showStrikeStyle;

  // =========================================================================
  // Render
  // =========================================================================

  return (
    <div className={className} style={style}>
      {/* Font family + weight (react-editor-ui FontSection — has its own title) */}
      {showFontFamily && (
        <FontSection
          data={toFontData(value)}
          onChange={handleFontChange}
          disabled={disabled}
          // react-editor-ui's FontSection declares `fontOptions` as
          // mutable `{value;label}[]`, but our hook produces the safer
          // `readonly FontOption[]`. We assign the readonly slice into
          // a fresh mutable array — no cast, just a copy — so the
          // prop contract is honoured without losing our immutability.
          fontOptions={fontOptions.map((o) => ({ value: o.value, label: o.label }))}
        />
      )}

      {/* Font size, leading, tracking, kerning (react-editor-ui FontMetricsSection — has its own title) */}
      {showFontSize && (
        <FontMetricsSection
          data={toFontMetricsData(value)}
          onChange={handleFontMetricsChange}
          size="sm"
          disabled={disabled}
        />
      )}

      {/* Caps + underline/strike/super/sub toggles (react-editor-ui CaseTransformSection — has its own title) */}
      {(showCaps || showSuperSubscript) && (
        <CaseTransformSection
          data={toCaseTransformData(value)}
          onChange={handleCaseTransformChange}
          size="sm"
          disabled={disabled}
        />
      )}

      {/* Color + Highlight */}
      {hasColorRow && (
        <OptionalPropertySection title="Color" defaultExpanded>
          <FieldRow>
            {showTextColor && (
              <FieldGroup label="Text" inline labelWidth={40} style={{ flex: 1 }}>
                {buildColorPicker({ renderSlot: renderColorPicker, color: value.textColor, onChange: handleTextColorChange, disabled, fallbackHex: "000000" })}
              </FieldGroup>
            )}
            {showHighlight && (
              <FieldGroup label="Highlight" inline labelWidth={60} style={{ flex: 1 }}>
                {buildColorPicker({ renderSlot: renderHighlightPicker, color: value.highlightColor, onChange: handleHighlightColorChange, disabled, fallbackHex: "FFFF00" })}
              </FieldGroup>
            )}
          </FieldRow>
        </OptionalPropertySection>
      )}

      {/* Decoration — underline/strike style dropdowns */}
      {hasStyleDropdowns && (
        <OptionalPropertySection title="Decoration" defaultExpanded>
          <FieldRow>
            {showUnderlineStyle && (
              <FieldGroup label="U̲" inline labelWidth={20} style={{ flex: 1 }}>
                <Select
                  value={value.underlineStyle ?? "none"}
                  onChange={handleUnderlineStyleChange}
                  options={underlineStyleOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            )}
            {showStrikeStyle && (
              <FieldGroup label="S̶" inline labelWidth={20} style={{ flex: 1 }}>
                <Select
                  value={value.strikethroughStyle ?? "none"}
                  onChange={handleStrikeStyleChange}
                  options={strikeStyleOptions}
                  disabled={disabled}
                />
              </FieldGroup>
            )}
          </FieldRow>
        </OptionalPropertySection>
      )}

      {/* Spacing — letter spacing + baseline + kerning */}
      {showSpacing && (
        <OptionalPropertySection title="Spacing" defaultExpanded>
          <FieldRow>
            <FieldGroup label="Spacing" inline labelWidth={52} style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.letterSpacing ?? 0}
                onChange={(v) => {
                  const num = typeof v === "number" ? v : parseFloat(v);
                  if (!isNaN(num)) { onChange({ letterSpacing: num === 0 ? undefined : num }); }
                }}
                disabled={disabled}
                suffix="px"
              />
            </FieldGroup>
            <FieldGroup label="Base" inline labelWidth={52} style={{ flex: 1 }}>
              <Input
                type="number"
                value={value.baseline ?? 0}
                onChange={handleBaselineChange}
                disabled={disabled}
                suffix="%"
                min={-100}
                max={100}
              />
            </FieldGroup>
          </FieldRow>
          <FieldGroup label="Kerning" inline labelWidth={52}>
            <Input
              type="number"
              value={value.kerning ?? 0}
              onChange={handleKerningChange}
              disabled={disabled}
              suffix="pt"
              min={0}
              max={999}
            />
          </FieldGroup>
        </OptionalPropertySection>
      )}

      {/* Extras slot */}
      {renderExtras?.()}
    </div>
  );
}
