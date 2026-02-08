/**
 * @file TablePropertiesEditor - Editor for DOCX table properties
 *
 * Provides UI controls for editing table-level properties like
 * width, alignment, borders, and cell spacing.
 * Uses shared TableStyleBandsEditor for the style band toggles.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import type { DocxTableProperties } from "@aurochs-office/docx/domain/table";
import type { TableAlignment, TableLayoutType, TableWidth } from "@aurochs-office/ooxml/domain/table";
import { ToggleButton, Input, Select } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { AlignLeftIcon, AlignCenterIcon, AlignRightIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import { TableStyleBandsEditor } from "@aurochs-ui/editor-controls/table";
import type { TableStyleBands } from "@aurochs-ui/editor-controls/types";
import { docxTableAdapter } from "../../adapters/editor-controls";
import styles from "./TablePropertiesEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type TablePropertiesEditorProps = EditorProps<DocxTableProperties> & {
  readonly style?: CSSProperties;
  /** Show border controls */
  readonly showBorders?: boolean;
  /** Show style band options */
  readonly showStyleBands?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const ALIGNMENT_OPTIONS: { value: TableAlignment; label: string; icon: ReactNode }[] = [
  { value: "left", label: "Left", icon: <AlignLeftIcon size={iconTokens.size.sm} /> },
  { value: "center", label: "Center", icon: <AlignCenterIcon size={iconTokens.size.sm} /> },
  { value: "right", label: "Right", icon: <AlignRightIcon size={iconTokens.size.sm} /> },
];

const LAYOUT_OPTIONS: SelectOption<TableLayoutType>[] = [
  { value: "autofit", label: "Auto Fit" },
  { value: "fixed", label: "Fixed" },
];

const WIDTH_TYPE_OPTIONS: SelectOption<TableWidth["type"]>[] = [
  { value: "auto", label: "Auto" },
  { value: "dxa", label: "Twips" },
  { value: "pct", label: "Percent" },
  { value: "nil", label: "None" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX table properties.
 */
export function TablePropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showBorders: _showBorders = true,
  showStyleBands = true,
}: TablePropertiesEditorProps) {
  void _showBorders; // Reserved for future border controls
  const handleWidthChange = useCallback(
    (width: TableWidth | undefined) => {
      onChange({ ...value, tblW: width });
    },
    [value, onChange],
  );

  const handleAlignmentChange = useCallback(
    (jc: TableAlignment) => {
      onChange({ ...value, jc });
    },
    [value, onChange],
  );

  const handleLayoutChange = useCallback(
    (layout: TableLayoutType) => {
      onChange({ ...value, tblLayout: layout });
    },
    [value, onChange],
  );

  // Handle shared TableStyleBandsEditor onChange
  const handleBandsChange = useCallback(
    (update: Partial<TableStyleBands>) => {
      const updated = docxTableAdapter.applyUpdate(value, update);
      onChange(updated);
    },
    [value, onChange],
  );

  const widthValue = value.tblW?.value ?? 0;
  const widthType = value.tblW?.type ?? "auto";

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Table Width */}
      <FieldGroup label="Table Width">
        <div className={styles.widthInputs}>
          <Input
            type="number"
            value={widthValue}
            onChange={(v) =>
              handleWidthChange({
                value: Number(v),
                type: widthType,
              })
            }
            disabled={disabled}
            min={0}
            width={80}
          />
          <Select
            value={widthType}
            onChange={(type) =>
              handleWidthChange({
                value: widthValue,
                type,
              })
            }
            options={WIDTH_TYPE_OPTIONS}
            disabled={disabled}
          />
        </div>
      </FieldGroup>

      {/* Table Alignment */}
      <FieldGroup label="Alignment">
        <div className={styles.alignmentButtons}>
          {ALIGNMENT_OPTIONS.map((option) => (
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

      {/* Table Layout */}
      <FieldGroup label="Layout">
        <Select
          value={value.tblLayout ?? "autofit"}
          onChange={handleLayoutChange}
          options={LAYOUT_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Style Bands - uses shared editor */}
      {showStyleBands && (
        <TableStyleBandsEditor
          value={docxTableAdapter.toGeneric(value)}
          onChange={handleBandsChange}
          disabled={disabled}
        />
      )}

      {/* Caption and Description */}
      <FieldGroup label="Accessibility">
        <div className={styles.accessibilitySection}>
          <Input
            type="text"
            value={value.tblCaption ?? ""}
            onChange={(v) => onChange({ ...value, tblCaption: String(v) || undefined })}
            disabled={disabled}
            placeholder="Table caption"
          />
          <textarea
            className={styles.textarea}
            value={value.tblDescription ?? ""}
            onChange={(e) => onChange({ ...value, tblDescription: e.target.value || undefined })}
            disabled={disabled}
            placeholder="Table description for accessibility"
          />
        </div>
      </FieldGroup>
    </div>
  );
}

/**
 * Create default TableProperties value.
 */
export function createDefaultTableProperties(): DocxTableProperties {
  return {
    tblW: { value: 5000, type: "pct" },
    tblLayout: "autofit",
  };
}
