/**
 * @file MixedParagraphPropertiesEditor - Editor for paragraph properties with Mixed support
 *
 * Wraps the shared ParagraphFormattingEditor with PPTX-specific adapters and slots.
 * PPTX-specific controls (level, RTL, alignment extras like justifyLow/distributed)
 * go in renderExtras.
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { PixelsEditor } from "../primitives";
import { LineSpacingEditor } from "./LineSpacingEditor";
import { ParagraphFormattingEditor } from "@aurochs-ui/editor-controls/text";
import type { ParagraphFormatting } from "@aurochs-ui/editor-controls/text";
import type { ParagraphProperties, LineSpacing } from "@aurochs-office/pptx/domain/text";
import type { TextAlign } from "@aurochs-office/pptx/domain/types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import { px, type Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { MixedParagraphProperties, PropertyExtraction } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";
import { pptxMixedParagraphToContext, pptxMixedParagraphToGeneric } from "../../adapters/editor-controls";

// =============================================================================
// Types
// =============================================================================

export type MixedParagraphPropertiesEditorProps = {
  /** Mixed paragraph properties from selection */
  readonly value: MixedParagraphProperties;
  /** Called when user changes a property (applies to all selected paragraphs) */
  readonly onChange: (update: Partial<ParagraphProperties>) => void;
  /** Whether the editor is disabled */
  readonly disabled?: boolean;
  /** Additional class name */
  readonly className?: string;
  /** Additional styles */
  readonly style?: CSSProperties;
  /** Show spacing section (line spacing, before/after) */
  readonly showSpacing?: boolean;
  /** Show indentation section */
  readonly showIndentation?: boolean;
  /** Show direction controls (RTL) */
  readonly showDirection?: boolean;
};

// =============================================================================
// Options (PPTX-specific extras: extended alignment)
// =============================================================================

const alignmentOptions: readonly SelectOption<TextAlign>[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
  { value: "justifyLow", label: "Justify Low" },
  { value: "distributed", label: "Distributed" },
];

// =============================================================================
// Styles
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

function getInputValue<T>(extraction: PropertyExtraction<T>, defaultValue: T): T | string {
  if (isMixed(extraction)) {
    return "";
  }
  const value = getExtractionValue(extraction);
  return value !== undefined ? value : defaultValue;
}

function getPlaceholder<T>(extraction: PropertyExtraction<T>, defaultPlaceholder: string): string {
  if (isMixed(extraction)) {
    return MIXED_PLACEHOLDER;
  }
  return defaultPlaceholder;
}

/** Map generic HorizontalAlignment → PPTX TextAlign. */
function genericAlignToPptx(align: string | undefined): TextAlign | undefined {
  switch (align) {
    case "left":
      return "left";
    case "center":
      return "center";
    case "right":
      return "right";
    case "justify":
      return "justify";
    default:
      return undefined;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for paragraph properties with Mixed value support.
 * Uses shared ParagraphFormattingEditor for alignment.
 * PPTX-specific controls (level, extended alignments, spacing, indentation, RTL) in extras.
 */
export function MixedParagraphPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showSpacing = true,
  showIndentation = true,
  showDirection = true,
}: MixedParagraphPropertiesEditorProps) {
  // Convert mixed properties to generic format
  const generic = pptxMixedParagraphToGeneric(value);
  const mixedCtx = pptxMixedParagraphToContext(value);

  // Handle shared editor onChange (convert generic → PPTX ParagraphProperties)
  const handleSharedChange = useCallback(
    (update: Partial<ParagraphFormatting>) => {
      const parts: Partial<ParagraphProperties>[] = [];

      if ("alignment" in update) {
        parts.push({ alignment: genericAlignToPptx(update.alignment) });
      }
      if ("indentLeft" in update) {
        parts.push({ marginLeft: update.indentLeft !== undefined ? (px(update.indentLeft) as Pixels) : undefined });
      }
      if ("indentRight" in update) {
        parts.push({ marginRight: update.indentRight !== undefined ? (px(update.indentRight) as Pixels) : undefined });
      }
      if ("firstLineIndent" in update) {
        parts.push({
          indent: update.firstLineIndent !== undefined ? (px(update.firstLineIndent) as Pixels) : undefined,
        });
      }
      if ("lineSpacing" in update && update.lineSpacing !== undefined) {
        parts.push({ lineSpacing: { type: "percent", value: update.lineSpacing * 100 } as LineSpacing });
      }

      onChange(Object.assign({}, ...parts) as Partial<ParagraphProperties>);
    },
    [onChange],
  );

  // PPTX-specific: extended alignment select (justifyLow, distributed)
  const handleAlignmentChange = useCallback(
    (newValue: TextAlign) => {
      onChange({ alignment: newValue });
    },
    [onChange],
  );

  // PPTX-specific: Level
  const handleLevelChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseInt(String(newValue), 10);
      if (isNaN(num)) {
        onChange({ level: 0 });
      } else {
        onChange({ level: Math.max(0, Math.min(8, num)) });
      }
    },
    [onChange],
  );

  // PPTX-specific: Indentation (uses Pixels, not points)
  const handleMarginLeftChange = useCallback(
    (newValue: Pixels) => {
      onChange({ marginLeft: newValue === px(0) ? undefined : newValue });
    },
    [onChange],
  );

  const handleMarginRightChange = useCallback(
    (newValue: Pixels) => {
      onChange({ marginRight: newValue === px(0) ? undefined : newValue });
    },
    [onChange],
  );

  const handleIndentChange = useCallback(
    (newValue: Pixels) => {
      onChange({ indent: newValue === px(0) ? undefined : newValue });
    },
    [onChange],
  );

  // PPTX-specific: Spacing (uses LineSpacing type, not simple multiplier)
  const handleLineSpacingChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ lineSpacing: newValue });
    },
    [onChange],
  );

  const handleSpaceBeforeChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ spaceBefore: newValue });
    },
    [onChange],
  );

  const handleSpaceAfterChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ spaceAfter: newValue });
    },
    [onChange],
  );

  // PPTX-specific: RTL
  const handleRtlChange = useCallback(
    (checked: boolean) => {
      onChange({ rtl: checked || undefined });
    },
    [onChange],
  );

  // Display values for PPTX-specific extras
  const alignmentValue = getExtractionValue(value.alignment) ?? "left";
  const levelValue = getInputValue(value.level, 0);
  const marginLeftValue = getExtractionValue(value.marginLeft) ?? px(0);
  const marginRightValue = getExtractionValue(value.marginRight) ?? px(0);
  const indentValue = getExtractionValue(value.indent) ?? px(0);
  const lineSpacingValue = getExtractionValue(value.lineSpacing);
  const spaceBeforeValue = getExtractionValue(value.spaceBefore);
  const spaceAfterValue = getExtractionValue(value.spaceAfter);
  const rtlValue = getExtractionValue(value.rtl) ?? false;

  return (
    <ParagraphFormattingEditor
      value={generic}
      onChange={handleSharedChange}
      disabled={disabled}
      className={className}
      style={style}
      features={{ showAlignment: true }}
      mixed={mixedCtx}
      renderExtras={() => (
        <>
          {/* PPTX-specific: Extended alignment (includes justifyLow, distributed) + Level */}
          <FieldRow>
            <FieldGroup label={getLabel(value.alignment, "Align")} inline labelWidth={40} style={{ flex: 1 }}>
              <Select
                value={isMixed(value.alignment) ? "left" : alignmentValue}
                onChange={handleAlignmentChange}
                options={alignmentOptions}
                disabled={disabled}
                placeholder={isMixed(value.alignment) ? MIXED_PLACEHOLDER : undefined}
              />
            </FieldGroup>
            <FieldGroup label={getLabel(value.level, "Level")} inline labelWidth={40} style={{ width: "80px" }}>
              <Input
                type="number"
                value={levelValue}
                onChange={handleLevelChange}
                min={0}
                max={8}
                disabled={disabled}
                placeholder={getPlaceholder(value.level, "0")}
              />
            </FieldGroup>
          </FieldRow>

          {/* PPTX-specific: Indentation (Pixels, not points) */}
          {showIndentation && (
            <>
              <div style={separatorStyle} />
              <FieldRow>
                <FieldGroup label={getLabel(value.marginLeft, "L Margin")} inline labelWidth={56} style={{ flex: 1 }}>
                  <PixelsEditor
                    value={isMixed(value.marginLeft) ? px(0) : marginLeftValue}
                    onChange={handleMarginLeftChange}
                    disabled={disabled}
                  />
                </FieldGroup>
                <FieldGroup label={getLabel(value.marginRight, "R Margin")} inline labelWidth={56} style={{ flex: 1 }}>
                  <PixelsEditor
                    value={isMixed(value.marginRight) ? px(0) : marginRightValue}
                    onChange={handleMarginRightChange}
                    disabled={disabled}
                  />
                </FieldGroup>
              </FieldRow>
              <FieldGroup label={getLabel(value.indent, "Indent")} inline labelWidth={48}>
                <PixelsEditor
                  value={isMixed(value.indent) ? px(0) : indentValue}
                  onChange={handleIndentChange}
                  disabled={disabled}
                />
              </FieldGroup>
            </>
          )}

          {/* PPTX-specific: Spacing (LineSpacing type) */}
          {showSpacing && (
            <>
              <div style={separatorStyle} />
              <FieldGroup label={getLabel(value.lineSpacing, "Line")}>
                <LineSpacingEditor
                  value={isMixed(value.lineSpacing) ? undefined : lineSpacingValue}
                  onChange={handleLineSpacingChange}
                  disabled={disabled}
                />
              </FieldGroup>
              <FieldRow>
                <FieldGroup label={getLabel(value.spaceBefore, "Before")} style={{ flex: 1 }}>
                  <LineSpacingEditor
                    value={isMixed(value.spaceBefore) ? undefined : spaceBeforeValue}
                    onChange={handleSpaceBeforeChange}
                    disabled={disabled}
                  />
                </FieldGroup>
                <FieldGroup label={getLabel(value.spaceAfter, "After")} style={{ flex: 1 }}>
                  <LineSpacingEditor
                    value={isMixed(value.spaceAfter) ? undefined : spaceAfterValue}
                    onChange={handleSpaceAfterChange}
                    disabled={disabled}
                  />
                </FieldGroup>
              </FieldRow>
            </>
          )}

          {/* PPTX-specific: Direction */}
          {showDirection && (
            <>
              <div style={separatorStyle} />
              <Toggle
                checked={isMixed(value.rtl) ? false : rtlValue}
                onChange={handleRtlChange}
                label={getLabel(value.rtl, "Right-to-Left")}
                disabled={disabled}
              />
            </>
          )}
        </>
      )}
    />
  );
}
