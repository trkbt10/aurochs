/**
 * @file ParagraphPropertiesEditor - Editor for DOCX paragraph properties
 *
 * Provides UI controls for editing paragraph formatting properties like
 * alignment, indentation, spacing, and list numbering.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import type {
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxOutlineLevel,
} from "@aurochs-office/docx/domain/paragraph";
import type { ParagraphAlignment } from "@aurochs-office/ooxml/domain/text";
import type { Twips } from "@aurochs-office/docx/domain/types";
import { ToggleButton, Input, Select, Toggle } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup, FieldRow } from "@aurochs-ui/ui-components/layout";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon, AlignJustifyIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import styles from "./ParagraphPropertiesEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type ParagraphPropertiesEditorProps = EditorProps<DocxParagraphProperties> & {
  readonly style?: CSSProperties;
  /** Show indentation controls */
  readonly showIndentation?: boolean;
  /** Show spacing controls */
  readonly showSpacing?: boolean;
  /** Show list numbering controls */
  readonly showNumbering?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const JUSTIFICATION_OPTIONS: { value: ParagraphAlignment; label: string; icon: ReactNode }[] = [
  { value: "left", label: "Left", icon: <AlignLeftIcon size={iconTokens.size.sm} /> },
  { value: "center", label: "Center", icon: <AlignCenterIcon size={iconTokens.size.sm} /> },
  { value: "right", label: "Right", icon: <AlignRightIcon size={iconTokens.size.sm} /> },
  { value: "both", label: "Justify", icon: <AlignJustifyIcon size={iconTokens.size.sm} /> },
];

const OUTLINE_LEVEL_OPTIONS: SelectOption<string>[] = [
  { value: "", label: "Body Text" },
  ...Array.from({ length: 9 }, (_, i) => ({
    value: String(i),
    label: `Heading ${i + 1}`,
  })),
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX paragraph properties.
 */
export function ParagraphPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showIndentation = true,
  showSpacing = true,
  showNumbering: _showNumbering = true,
}: ParagraphPropertiesEditorProps) {
  void _showNumbering; // Reserved for future numbering controls
  const handleAlignmentChange = useCallback(
    (jc: ParagraphAlignment) => {
      onChange({ ...value, jc });
    },
    [value, onChange],
  );

  const handleSpacingChange = useCallback(
    (spacing: Partial<DocxParagraphSpacing>) => {
      onChange({
        ...value,
        spacing: { ...value.spacing, ...spacing },
      });
    },
    [value, onChange],
  );

  const handleIndentationChange = useCallback(
    (ind: Partial<DocxParagraphIndent>) => {
      onChange({
        ...value,
        ind: { ...value.ind, ...ind },
      });
    },
    [value, onChange],
  );

  const handleOutlineLevelChange = useCallback(
    (levelStr: string) => {
      if (levelStr === "") {
        const { outlineLvl: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, outlineLvl: Number(levelStr) as DocxOutlineLevel });
      }
    },
    [value, onChange],
  );

  const handleKeepNextChange = useCallback(
    (keepNext: boolean) => {
      onChange({ ...value, keepNext });
    },
    [value, onChange],
  );

  const handleKeepLinesChange = useCallback(
    (keepLines: boolean) => {
      onChange({ ...value, keepLines });
    },
    [value, onChange],
  );

  const handlePageBreakBeforeChange = useCallback(
    (pageBreakBefore: boolean) => {
      onChange({ ...value, pageBreakBefore });
    },
    [value, onChange],
  );

  const spacingBeforeInTwips = value.spacing?.before ?? 0;
  const spacingAfterInTwips = value.spacing?.after ?? 0;
  const lineSpacingValue = value.spacing?.line ?? 240;

  const indentLeftInTwips = value.ind?.left ?? 0;
  const indentRightInTwips = value.ind?.right ?? 0;
  const indentFirstLineInTwips = value.ind?.firstLine ?? value.ind?.hanging ?? 0;
  const isHangingIndent = value.ind?.hanging !== undefined;

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Alignment */}
      <FieldGroup label="Alignment">
        <div className={styles.alignmentButtons}>
          {JUSTIFICATION_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              pressed={value.jc === option.value}
              onChange={() => handleAlignmentChange(option.value)}
              label={option.label}
              disabled={disabled}
            >
              {option.icon}
            </ToggleButton>
          ))}
        </div>
      </FieldGroup>

      {/* Indentation */}
      {showIndentation && (
        <FieldGroup label="Indentation">
          <div className={styles.indentationInputs}>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Left (twips)</span>
              <Input
                type="number"
                value={indentLeftInTwips}
                onChange={(v) => handleIndentationChange({ left: Number(v) as Twips })}
                disabled={disabled}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Right (twips)</span>
              <Input
                type="number"
                value={indentRightInTwips}
                onChange={(v) => handleIndentationChange({ right: Number(v) as Twips })}
                disabled={disabled}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>{isHangingIndent ? "Hanging" : "First Line"} (twips)</span>
              <FieldRow gap={4}>
                <Input
                  type="number"
                  value={indentFirstLineInTwips}
                  onChange={(v) => {
                    const val = Number(v) as Twips;
                    if (isHangingIndent) {
                      handleIndentationChange({ hanging: val, firstLine: undefined });
                    } else {
                      handleIndentationChange({ firstLine: val, hanging: undefined });
                    }
                  }}
                  disabled={disabled}
                />
                <Toggle
                  checked={isHangingIndent}
                  onChange={(checked) => {
                    const val = indentFirstLineInTwips as Twips;
                    if (checked) {
                      handleIndentationChange({ hanging: val, firstLine: undefined });
                    } else {
                      handleIndentationChange({ firstLine: val, hanging: undefined });
                    }
                  }}
                  label="Hang"
                  disabled={disabled}
                />
              </FieldRow>
            </div>
          </div>
        </FieldGroup>
      )}

      {/* Spacing */}
      {showSpacing && (
        <FieldGroup label="Spacing">
          <div className={styles.spacingInputs}>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Before (twips)</span>
              <Input
                type="number"
                value={spacingBeforeInTwips}
                onChange={(v) => handleSpacingChange({ before: Number(v) as Twips })}
                disabled={disabled}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>After (twips)</span>
              <Input
                type="number"
                value={spacingAfterInTwips}
                onChange={(v) => handleSpacingChange({ after: Number(v) as Twips })}
                disabled={disabled}
                min={0}
              />
            </div>
            <div className={styles.inputGroup}>
              <span className={styles.inputLabel}>Line (240=single)</span>
              <Input
                type="number"
                value={lineSpacingValue}
                onChange={(v) => handleSpacingChange({ line: Number(v) as Twips })}
                disabled={disabled}
                min={1}
              />
            </div>
          </div>
        </FieldGroup>
      )}

      {/* Outline Level / Heading */}
      <FieldGroup label="Outline Level">
        <Select
          value={value.outlineLvl !== undefined ? String(value.outlineLvl) : ""}
          onChange={handleOutlineLevelChange}
          options={OUTLINE_LEVEL_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Page break options */}
      <FieldGroup label="Pagination">
        <div className={styles.breaksSection}>
          <Toggle
            checked={value.keepNext ?? false}
            onChange={handleKeepNextChange}
            label="Keep with next"
            disabled={disabled}
          />
          <Toggle
            checked={value.keepLines ?? false}
            onChange={handleKeepLinesChange}
            label="Keep lines together"
            disabled={disabled}
          />
          <Toggle
            checked={value.pageBreakBefore ?? false}
            onChange={handlePageBreakBeforeChange}
            label="Page break before"
            disabled={disabled}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

/**
 * Create default ParagraphProperties value.
 */
export function createDefaultParagraphProperties(): DocxParagraphProperties {
  return {};
}
