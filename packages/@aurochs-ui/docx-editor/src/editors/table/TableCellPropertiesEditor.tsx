/**
 * @file TableCellPropertiesEditor - Editor for DOCX table cell properties
 *
 * Provides UI controls for editing cell-level properties like
 * width, vertical alignment, borders, and shading.
 */

import { useCallback, type CSSProperties, type ReactNode } from "react";
import type { DocxTableCellProperties } from "@aurochs-office/docx/domain/table";
import type { TableCellVerticalAlignment } from "@aurochs-office/ooxml/domain/table";
import { ToggleButton, Input, Select, Toggle, Button } from "@aurochs-ui/ui-components/primitives";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import type { EditorProps, SelectOption } from "@aurochs-ui/ui-components/types";
import { AlignTopIcon, AlignMiddleIcon, AlignBottomIcon } from "@aurochs-ui/ui-components/icons";
import { iconTokens } from "@aurochs-ui/ui-components/design-tokens";
import styles from "./TableCellPropertiesEditor.module.css";

// =============================================================================
// Types
// =============================================================================

export type TableCellPropertiesEditorProps = EditorProps<DocxTableCellProperties> & {
  readonly style?: CSSProperties;
  /** Show border controls */
  readonly showBorders?: boolean;
  /** Show shading controls */
  readonly showShading?: boolean;
};

// =============================================================================
// Constants
// =============================================================================

const VERTICAL_ALIGNMENT_OPTIONS: { value: TableCellVerticalAlignment; label: string; icon: ReactNode }[] = [
  { value: "top", label: "Top", icon: <AlignTopIcon size={iconTokens.size.sm} /> },
  { value: "center", label: "Middle", icon: <AlignMiddleIcon size={iconTokens.size.sm} /> },
  { value: "bottom", label: "Bottom", icon: <AlignBottomIcon size={iconTokens.size.sm} /> },
];

const TEXT_DIRECTION_OPTIONS: SelectOption<NonNullable<DocxTableCellProperties["textDirection"]>>[] = [
  { value: "lrTb", label: "Horizontal" },
  { value: "tbRl", label: "Vertical (Top to Bottom)" },
  { value: "btLr", label: "Vertical (Bottom to Top)" },
];

const WIDTH_TYPE_OPTIONS: SelectOption<"auto" | "dxa" | "nil" | "pct">[] = [
  { value: "auto", label: "Auto" },
  { value: "dxa", label: "Twips" },
  { value: "pct", label: "Percent" },
  { value: "nil", label: "None" },
];

// =============================================================================
// Component
// =============================================================================

/**
 * Editor component for DOCX table cell properties.
 */
export function TableCellPropertiesEditor({
  value,
  onChange,
  disabled,
  className,
  style,
  showBorders: _showBorders = true,
  showShading = true,
}: TableCellPropertiesEditorProps) {
  void _showBorders; // Reserved for future border controls
  const handleVerticalAlignmentChange = useCallback(
    (vAlign: TableCellVerticalAlignment) => {
      onChange({ ...value, vAlign });
    },
    [value, onChange],
  );

  const handleTextDirectionChange = useCallback(
    (textDirection: DocxTableCellProperties["textDirection"]) => {
      onChange({ ...value, textDirection });
    },
    [value, onChange],
  );

  const handleNoWrapChange = useCallback(
    (noWrap: boolean) => {
      onChange({ ...value, noWrap });
    },
    [value, onChange],
  );

  const handleWidthChange = useCallback(
    (widthValue: number, widthType: "auto" | "dxa" | "nil" | "pct") => {
      onChange({
        ...value,
        tcW: { value: widthValue, type: widthType },
      });
    },
    [value, onChange],
  );

  const handleShadingColorChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const color = e.target.value.slice(1); // Remove # prefix
      onChange({
        ...value,
        shd: {
          ...value.shd,
          fill: color || undefined,
        },
      });
    },
    [value, onChange],
  );

  const handleClearShading = useCallback(() => {
    onChange({
      ...value,
      shd: {
        ...value.shd,
        fill: undefined,
      },
    });
  }, [value, onChange]);

  const widthValue = value.tcW?.value ?? 0;
  const widthType = value.tcW?.type ?? "auto";

  const containerClassName = className ? `${styles.container} ${className}` : styles.container;

  return (
    <div className={containerClassName} style={style}>
      {/* Cell Width */}
      <FieldGroup label="Cell Width">
        <div className={styles.widthInputs}>
          <Input
            type="number"
            value={widthValue}
            onChange={(v) => handleWidthChange(Number(v), widthType)}
            disabled={disabled}
            min={0}
            width={80}
          />
          <Select
            value={widthType}
            onChange={(type) => handleWidthChange(widthValue, type)}
            options={WIDTH_TYPE_OPTIONS}
            disabled={disabled}
          />
        </div>
      </FieldGroup>

      {/* Vertical Alignment */}
      <FieldGroup label="Vertical Alignment">
        <div className={styles.alignmentButtons}>
          {VERTICAL_ALIGNMENT_OPTIONS.map((option) => (
            <ToggleButton
              key={option.value}
              pressed={value.vAlign === option.value}
              onChange={() => handleVerticalAlignmentChange(option.value)}
              label={option.label}
              disabled={disabled}
            >
              {option.icon}
            </ToggleButton>
          ))}
        </div>
      </FieldGroup>

      {/* Text Direction */}
      <FieldGroup label="Text Direction">
        <Select
          value={value.textDirection ?? "lrTb"}
          onChange={handleTextDirectionChange}
          options={TEXT_DIRECTION_OPTIONS}
          disabled={disabled}
        />
      </FieldGroup>

      {/* No Wrap */}
      <FieldGroup label="Text Wrapping">
        <Toggle
          checked={value.noWrap ?? false}
          onChange={handleNoWrapChange}
          label="No text wrapping"
          disabled={disabled}
        />
      </FieldGroup>

      {/* Shading */}
      {showShading && (
        <FieldGroup label="Background Color">
          <div className={styles.shadingSection}>
            <input
              type="color"
              value={value.shd?.fill ? `#${value.shd.fill}` : "#ffffff"}
              onChange={handleShadingColorChange}
              disabled={disabled}
            />
            <Button onClick={handleClearShading} disabled={disabled} variant="ghost" size="sm">
              Clear
            </Button>
          </div>
        </FieldGroup>
      )}

      {/* Grid Span */}
      <FieldGroup label="Column Span">
        <Input
          type="number"
          value={value.gridSpan ?? 1}
          onChange={(v) => {
            const span = Number(v);
            if (span <= 1) {
              const { gridSpan: _removed, ...rest } = value;
              void _removed;
              onChange(rest);
            } else {
              onChange({ ...value, gridSpan: span as typeof value.gridSpan });
            }
          }}
          disabled={disabled}
          min={1}
          width={60}
        />
      </FieldGroup>
    </div>
  );
}

/**
 * Create default TableCellProperties value.
 */
export function createDefaultTableCellProperties(): DocxTableCellProperties {
  return {};
}
