/**
 * @file MixedParagraphPropertiesEditor - Editor for paragraph properties with Mixed support
 *
 * Displays "Mixed" indicator when property values differ across selection.
 * Designed for compact display in the PropertyPanel.
 */

import { useCallback, type CSSProperties } from "react";
import { Input, Select, Toggle } from "../../ui/primitives";
import { FieldGroup, FieldRow } from "../../ui/layout";
import { PixelsEditor } from "../primitives";
import { LineSpacingEditor } from "./LineSpacingEditor";
import type { ParagraphProperties, LineSpacing } from "../../../pptx/domain/text";
import type { TextAlign, Pixels } from "../../../pptx/domain/types";
import type { SelectOption } from "../../types";
import { px } from "../../../pptx/domain/types";
import type { MixedParagraphProperties, PropertyExtraction } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";

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
// Options
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

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
};

const separatorStyle: CSSProperties = {
  height: "1px",
  backgroundColor: "var(--border-subtle, rgba(255, 255, 255, 0.06))",
  margin: "4px 0",
};

// =============================================================================
// Helper Functions
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
 * Get label with Mixed indicator if needed.
 */
function getLabel(extraction: PropertyExtraction<unknown>, label: string, mixedSuffix = " (M)"): string {
  if (isMixed(extraction)) {
    return label + mixedSuffix;
  }
  return label;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor for paragraph properties with Mixed value support.
 * Displays "Mixed" indicator when property values differ across selection.
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
  // Alignment handler
  const handleAlignmentChange = useCallback(
    (newValue: TextAlign) => {
      onChange({ alignment: newValue });
    },
    [onChange]
  );

  // Level handler
  const handleLevelChange = useCallback(
    (newValue: string | number) => {
      const num = typeof newValue === "number" ? newValue : parseInt(String(newValue), 10);
      if (isNaN(num)) {
        onChange({ level: 0 });
      } else {
        const clamped = Math.max(0, Math.min(8, num));
        onChange({ level: clamped });
      }
    },
    [onChange]
  );

  // Indentation handlers
  const handleMarginLeftChange = useCallback(
    (newValue: Pixels) => {
      onChange({ marginLeft: newValue === px(0) ? undefined : newValue });
    },
    [onChange]
  );

  const handleMarginRightChange = useCallback(
    (newValue: Pixels) => {
      onChange({ marginRight: newValue === px(0) ? undefined : newValue });
    },
    [onChange]
  );

  const handleIndentChange = useCallback(
    (newValue: Pixels) => {
      onChange({ indent: newValue === px(0) ? undefined : newValue });
    },
    [onChange]
  );

  // Spacing handlers
  const handleLineSpacingChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ lineSpacing: newValue });
    },
    [onChange]
  );

  const handleSpaceBeforeChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ spaceBefore: newValue });
    },
    [onChange]
  );

  const handleSpaceAfterChange = useCallback(
    (newValue: LineSpacing | undefined) => {
      onChange({ spaceAfter: newValue });
    },
    [onChange]
  );

  // RTL handler
  const handleRtlChange = useCallback(
    (checked: boolean) => {
      onChange({ rtl: checked || undefined });
    },
    [onChange]
  );

  // Get display values
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
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Alignment & Level */}
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

      {/* Indentation */}
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

      {/* Spacing */}
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

      {/* Direction */}
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
    </div>
  );
}
