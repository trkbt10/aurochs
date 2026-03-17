/**
 * @file TableDimensionEditor - Shared column width and row height editor
 *
 * Format-agnostic editor for table column widths and row heights.
 * Unit label is configurable (e.g., "px", "pt", "twips").
 */

import { type CSSProperties } from "react";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { Input } from "@aurochs-ui/ui-components/primitives";
import { getColumnLetter } from "@aurochs-ui/editor-core/table-selection";

// =============================================================================
// Types
// =============================================================================

export type TableDimensionEditorProps = {
  readonly columns: readonly { readonly width: number }[];
  readonly rows: readonly { readonly height: number }[];
  readonly onColumnWidthChange?: (colIndex: number, width: number) => void;
  readonly onRowHeightChange?: (rowIndex: number, height: number) => void;
  readonly unitLabel?: string;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const itemsContainerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const itemStyle: CSSProperties = {
  minWidth: "80px",
};

// =============================================================================
// Component
// =============================================================================

/** Shared column width and row height editor. */
export function TableDimensionEditor({
  columns,
  rows,
  onColumnWidthChange,
  onRowHeightChange,
  unitLabel = "px",
  disabled,
}: TableDimensionEditorProps) {
  return (
    <div style={containerStyle}>
      {/* Column Widths */}
      <FieldGroup label="Column Widths">
        <div style={itemsContainerStyle}>
          {columns.map((col, index) => (
            <div key={index} style={itemStyle}>
              <FieldGroup label={`Col ${getColumnLetter(index)}`}>
                <Input
                  type="number"
                  value={col.width}
                  onChange={(v) => onColumnWidthChange?.(index, typeof v === "number" ? v : parseFloat(String(v)))}
                  disabled={disabled}
                  min={10}
                  suffix={unitLabel}
                />
              </FieldGroup>
            </div>
          ))}
        </div>
      </FieldGroup>

      {/* Row Heights */}
      <FieldGroup label="Row Heights">
        <div style={itemsContainerStyle}>
          {rows.map((row, index) => (
            <div key={index} style={itemStyle}>
              <FieldGroup label={`Row ${index + 1}`}>
                <Input
                  type="number"
                  value={row.height}
                  onChange={(v) => onRowHeightChange?.(index, typeof v === "number" ? v : parseFloat(String(v)))}
                  disabled={disabled}
                  min={10}
                  suffix={unitLabel}
                />
              </FieldGroup>
            </div>
          ))}
        </div>
      </FieldGroup>
    </div>
  );
}
