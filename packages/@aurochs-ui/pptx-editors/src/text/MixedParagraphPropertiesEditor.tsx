/**
 * @file MixedParagraphPropertiesEditor - Editor for paragraph properties with Mixed support
 *
 * Uses react-editor-ui sections (TextJustifySection, ParagraphSpacingSection, IndentSection, ListSection)
 * supplemented with PPTX-specific controls (level, extended alignment, line spacing, RTL).
 */

import { useCallback, type CSSProperties } from "react";
import { TextJustifySection } from "react-editor-ui/sections/TextJustifySection";
import { ParagraphSpacingSection } from "react-editor-ui/sections/ParagraphSpacingSection";
import { IndentSection } from "react-editor-ui/sections/IndentSection";
import { ListSection } from "react-editor-ui/sections/ListSection";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import { LineSpacingEditor } from "./LineSpacingEditor";
import type { ParagraphProperties, LineSpacing } from "@aurochs-office/pptx/domain/text";
import type { TextAlign } from "@aurochs-office/pptx/domain/types";
import type { SelectOption } from "@aurochs-ui/ui-components/types";
import type { MixedParagraphProperties } from "./mixed-properties";
import { getExtractionValue, isMixed } from "./mixed-properties";
import type { TextJustifyData, ParagraphSpacingData, IndentData, ListData } from "@aurochs-ui/editor-core/adapter-types";
import {
  mixedParagraphToTextJustify,
  textJustifyToParagraphUpdate,
  mixedParagraphToSpacing,
  spacingToParagraphUpdate,
  mixedParagraphToIndent,
  indentToParagraphUpdate,
  mixedParagraphToList,
  listToParagraphUpdate,
} from "../adapters/editor-ui/paragraph-adapters";

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
// Options (PPTX-specific)
// =============================================================================

const extendedAlignmentOptions: readonly SelectOption<TextAlign>[] = [
  { value: "left", label: "Left" },
  { value: "center", label: "Center" },
  { value: "right", label: "Right" },
  { value: "justify", label: "Justify" },
  { value: "justifyLow", label: "Justify Low" },
  { value: "distributed", label: "Distributed" },
];

// =============================================================================
// Helpers
// =============================================================================

const MIXED_PLACEHOLDER = "Mixed";

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
 * Editor for paragraph properties with Mixed value support.
 * Uses react-editor-ui sections for common controls, supplemented with
 * PPTX-specific controls for extended alignment, level, line spacing, and RTL.
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
  // =========================================================================
  // react-editor-ui section handlers (via adapters)
  // =========================================================================

  const handleJustifyChange = useCallback(
    (data: TextJustifyData) => { onChange(textJustifyToParagraphUpdate(data)); },
    [onChange],
  );

  const handleSpacingChange = useCallback(
    (data: ParagraphSpacingData) => { onChange(spacingToParagraphUpdate(data)); },
    [onChange],
  );

  const handleIndentChange = useCallback(
    (data: IndentData) => { onChange(indentToParagraphUpdate(data)); },
    [onChange],
  );

  const handleListChange = useCallback(
    (data: ListData) => { onChange(listToParagraphUpdate(data)); },
    [onChange],
  );

  // =========================================================================
  // PPTX-specific handlers
  // =========================================================================

  const handleExtendedAlignmentChange = useCallback(
    (v: TextAlign) => { onChange({ alignment: v }); },
    [onChange],
  );

  const handleLevelChange = useCallback(
    (v: string | number) => {
      const num = typeof v === "number" ? v : parseInt(String(v), 10);
      if (isNaN(num)) {
        onChange({ level: 0 });
      } else {
        onChange({ level: Math.max(0, Math.min(8, num)) });
      }
    },
    [onChange],
  );

  const handleLineSpacingChange = useCallback(
    (v: LineSpacing | undefined) => { onChange({ lineSpacing: v }); },
    [onChange],
  );

  const handleSpaceBeforeChange = useCallback(
    (v: LineSpacing | undefined) => { onChange({ spaceBefore: v }); },
    [onChange],
  );

  const handleSpaceAfterChange = useCallback(
    (v: LineSpacing | undefined) => { onChange({ spaceAfter: v }); },
    [onChange],
  );

  const handleRtlChange = useCallback(
    (checked: boolean) => { onChange({ rtl: checked || undefined }); },
    [onChange],
  );

  // =========================================================================
  // Render
  // =========================================================================

  const alignmentValue = getExtractionValue(value.alignment) ?? "left";
  const levelValue = isMixed(value.level) ? "" : (getExtractionValue(value.level) ?? 0);
  const lineSpacingValue = getExtractionValue(value.lineSpacing);
  const spaceBeforeValue = getExtractionValue(value.spaceBefore);
  const spaceAfterValue = getExtractionValue(value.spaceAfter);
  const rtlValue = getExtractionValue(value.rtl) ?? false;

  return (
    <div className={className} style={style}>
      {/* Text alignment (react-editor-ui) */}
      <OptionalPropertySection title="Text Alignment" defaultExpanded>
        <TextJustifySection
          data={mixedParagraphToTextJustify(value)}
          onChange={handleJustifyChange}
          size="sm"
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* PPTX-specific: Extended alignment (justifyLow, distributed) + Level */}
      <OptionalPropertySection title="Alignment Details" defaultExpanded={false}>
        <FieldRow>
          <FieldGroup label={getLabel(value.alignment, "Align")} inline labelWidth={40} style={{ flex: 1 }}>
            <Select
              value={isMixed(value.alignment) ? "left" : alignmentValue}
              onChange={handleExtendedAlignmentChange}
              options={extendedAlignmentOptions}
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
              placeholder={isMixed(value.level) ? MIXED_PLACEHOLDER : "0"}
            />
          </FieldGroup>
        </FieldRow>
      </OptionalPropertySection>

      {/* Space before/after (react-editor-ui) */}
      <OptionalPropertySection title="Paragraph Spacing" defaultExpanded>
        <ParagraphSpacingSection
          data={mixedParagraphToSpacing(value)}
          onChange={handleSpacingChange}
          size="sm"
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* PPTX-specific: Line spacing with LineSpacing type */}
      {showSpacing && (
        <OptionalPropertySection title="Line Spacing" defaultExpanded>
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
        </OptionalPropertySection>
      )}

      {/* Indent (react-editor-ui) */}
      {showIndentation && (
        <OptionalPropertySection title="Indent" defaultExpanded>
          <IndentSection
            data={mixedParagraphToIndent(value)}
            onChange={handleIndentChange}
            size="sm"
            disabled={disabled}
          />
        </OptionalPropertySection>
      )}

      {/* Bullet/number list (react-editor-ui) */}
      <OptionalPropertySection title="List" defaultExpanded>
        <ListSection
          data={mixedParagraphToList(value)}
          onChange={handleListChange}
          size="sm"
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* PPTX-specific: RTL */}
      {showDirection && (
        <OptionalPropertySection title="Direction" defaultExpanded={false}>
          <Toggle
            checked={isMixed(value.rtl) ? false : rtlValue}
            onChange={handleRtlChange}
            label={getLabel(value.rtl, "Right-to-Left")}
            disabled={disabled}
          />
        </OptionalPropertySection>
      )}
    </div>
  );
}
