/**
 * @file NumberingLevelEditor - Editor for DOCX numbering level definitions
 *
 * Provides UI controls for editing numbering level properties like
 * format, start value, text pattern, and justification.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import type { DocxLevel, DocxLevelJustification } from "@oxen-office/docx/domain/numbering";
import type { NumberFormat, LevelSuffix } from "@oxen-office/ooxml";
import type { DocxIlvl } from "@oxen-office/docx/domain/types";
import { ToggleButton, Input, Select, Toggle } from "@oxen-ui/ui-components/primitives";
import { FieldGroup } from "@oxen-ui/ui-components/layout";
import type { EditorProps, SelectOption } from "@oxen-ui/ui-components/types";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from "@oxen-ui/ui-components/icons";
import { iconTokens } from "@oxen-ui/ui-components/design-tokens";
import styles from "./NumberingLevelEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type NumberingLevelEditorProps = EditorProps<DocxLevel> & {
  readonly style?: CSSProperties;
  /** Show paragraph properties */
  readonly showParagraphProps?: boolean;
  /** Show run properties */
  readonly showRunProps?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const NUMBER_FORMAT_OPTIONS: SelectOption<NumberFormat>[] = [
  { value: "decimal", label: "1, 2, 3..." },
  { value: "lowerRoman", label: "i, ii, iii..." },
  { value: "upperRoman", label: "I, II, III..." },
  { value: "lowerLetter", label: "a, b, c..." },
  { value: "upperLetter", label: "A, B, C..." },
  { value: "bullet", label: "Bullet" },
  { value: "none", label: "None" },
  { value: "ordinal", label: "1st, 2nd, 3rd..." },
  { value: "cardinalText", label: "One, Two, Three..." },
  { value: "ordinalText", label: "First, Second, Third..." },
];

const JUSTIFICATION_OPTIONS: { value: DocxLevelJustification; label: string; icon: ReactNode }[] = [
  { value: "left", label: "Left", icon: <AlignLeftIcon size={iconTokens.size.sm} /> },
  { value: "center", label: "Center", icon: <AlignCenterIcon size={iconTokens.size.sm} /> },
  { value: "right", label: "Right", icon: <AlignRightIcon size={iconTokens.size.sm} /> },
];

const SUFFIX_OPTIONS: SelectOption<LevelSuffix>[] = [
  { value: "tab", label: "Tab" },
  { value: "space", label: "Space" },
  { value: "nothing", label: "Nothing" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX numbering level definitions.
 */
export function NumberingLevelEditor({
  value,
  onChange,
  disabled,
  className,
  style,
}: NumberingLevelEditorProps) {
  const handleStartChange = useCallback(
    (start: string | number) => {
      const numStart = typeof start === "string" ? parseInt(start, 10) : start;
      if (isNaN(numStart)) {
        const { start: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, start: numStart });
      }
    },
    [value, onChange],
  );

  const handleFormatChange = useCallback(
    (numFmt: NumberFormat) => {
      onChange({ ...value, numFmt });
    },
    [value, onChange],
  );

  const handleTextChange = useCallback(
    (text: string | number) => {
      onChange({
        ...value,
        lvlText: { val: String(text) },
      });
    },
    [value, onChange],
  );

  const handleJustificationChange = useCallback(
    (lvlJc: DocxLevelJustification) => {
      onChange({ ...value, lvlJc });
    },
    [value, onChange],
  );

  const handleSuffixChange = useCallback(
    (suff: LevelSuffix) => {
      onChange({ ...value, suff });
    },
    [value, onChange],
  );

  const handleRestartChange = useCallback(
    (lvlRestartStr: string) => {
      if (lvlRestartStr === "") {
        const { lvlRestart: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      } else {
        onChange({ ...value, lvlRestart: Number(lvlRestartStr) });
      }
    },
    [value, onChange],
  );

  const handleLegalChange = useCallback(
    (isLgl: boolean) => {
      if (isLgl) {
        onChange({ ...value, isLgl: true });
      } else {
        const { isLgl: _removed, ...rest } = value;
        void _removed;
        onChange(rest);
      }
    },
    [value, onChange],
  );

  const restartOptions: SelectOption<string>[] = [
    { value: "", label: "Auto" },
    ...Array.from({ length: value.ilvl }, (_, i) => ({
      value: String(i),
      label: `Level ${i + 1}`,
    })),
  ];

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Level Index (display only) */}
      <FieldGroup label="Level">
        <div className={styles.levelIndex}>
          <span className={styles.levelValue}>{value.ilvl + 1}</span>
        </div>
      </FieldGroup>

      {/* Number Format */}
      <FieldGroup label="Format">
        <Select
          value={value.numFmt ?? "decimal"}
          onChange={handleFormatChange}
          options={NUMBER_FORMAT_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Start Value */}
      <FieldGroup label="Start At">
        <Input
          type="number"
          value={value.start ?? 1}
          onChange={handleStartChange}
          disabled={disabled}
          min={1}
          width={60}
        />
      </FieldGroup>

      {/* Level Text */}
      <FieldGroup label="Number Text Pattern">
        <Input
          type="text"
          value={value.lvlText?.val ?? ""}
          onChange={handleTextChange}
          disabled={disabled}
          placeholder="%1."
        />
        <span className={styles.textHint}>Use %1, %2, etc. for level numbers</span>
      </FieldGroup>

      {/* Justification */}
      <FieldGroup label="Justification">
        <div className={styles.justificationButtons}>
          {JUSTIFICATION_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              pressed={value.lvlJc === option.value}
              onChange={() => handleJustificationChange(option.value)}
              label={option.label}
              disabled={disabled}
            >
              {option.icon}
            </ToggleButton>
          ))}
        </div>
      </FieldGroup>

      {/* Suffix */}
      <FieldGroup label="Follow Number With">
        <Select
          value={value.suff ?? "tab"}
          onChange={handleSuffixChange}
          options={SUFFIX_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Restart Level */}
      <FieldGroup label="Restart After Level">
        <Select
          value={value.lvlRestart !== undefined ? String(value.lvlRestart) : ""}
          onChange={handleRestartChange}
          options={restartOptions}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Legal Format */}
      <FieldGroup label="Options">
        <Toggle
          checked={value.isLgl ?? false}
          onChange={handleLegalChange}
          label="Legal numbering format"
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}

/**
 * Create default Level value.
 */
export function createDefaultLevel(ilvl: DocxIlvl): DocxLevel {
  return {
    ilvl,
    start: 1,
    numFmt: "decimal",
    lvlText: { val: `%${ilvl + 1}.` },
    lvlJc: "left",
    suff: "tab",
  };
}
