/**
 * @file TableCellGrid - Shared cell grid display with selection
 *
 * Format-agnostic cell grid component. Displays cells in a grid
 * with column letters (A, B, C...) and row numbers (1, 2, 3...).
 */

import { type CSSProperties, type KeyboardEvent } from "react";
import type { AbstractTable } from "@aurochs-ui/editor-core/table-operations";
import { type CellPosition, getColumnLetter, getCellPreviewText } from "@aurochs-ui/editor-core/table-selection";

// =============================================================================
// Types
// =============================================================================

export type TableCellGridProps = {
  readonly table: AbstractTable;
  readonly selectedCell?: CellPosition;
  readonly onCellSelect?: (pos: CellPosition) => void;
  readonly disabled?: boolean;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflowX: "auto",
};

const gridStyle: CSSProperties = {
  display: "inline-grid",
  gap: "2px",
  minWidth: "100%",
};

const cellBaseStyle: CSSProperties = {
  padding: "8px 12px",
  borderRadius: "4px",
  cursor: "pointer",
  transition: "background-color 150ms ease",
  textAlign: "center",
  fontSize: "12px",
  minWidth: "60px",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const cellUnselectedStyle: CSSProperties = {
  ...cellBaseStyle,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  color: "var(--text-secondary, #a1a1a1)",
};

const cellSelectedStyle: CSSProperties = {
  ...cellBaseStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "var(--text-primary, #fafafa)",
};

const headerCellStyle: CSSProperties = {
  ...cellBaseStyle,
  backgroundColor: "var(--bg-tertiary, #111111)",
  color: "var(--text-tertiary, #737373)",
  fontWeight: 600,
  fontSize: "11px",
  cursor: "default",
};

const noSelectionStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

// =============================================================================
// Component
// =============================================================================

/** Shared cell grid with column letters and row numbers. */
export function TableCellGrid({ table, selectedCell, onCellSelect, disabled }: TableCellGridProps) {
  if (table.rowCount === 0 || table.colCount === 0) {
    return <div style={noSelectionStyle}>No cells in table</div>;
  }

  const gridTemplateColumns = `auto ${table.columns.map(() => "1fr").join(" ")}`;

  const handleCellClick = (row: number, col: number) => {
    if (!disabled && onCellSelect) {
      onCellSelect({ row, col });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, row: number, col: number) => {
    if (!disabled && onCellSelect && (e.key === "Enter" || e.key === " ")) {
      onCellSelect({ row, col });
    }
  };

  return (
    <div style={containerStyle}>
      <div style={{ ...gridStyle, gridTemplateColumns }}>
        {/* Header row with column letters */}
        <div style={headerCellStyle}></div>
        {table.columns.map((_, colIndex) => (
          <div key={`header-${colIndex}`} style={headerCellStyle}>
            {getColumnLetter(colIndex)}
          </div>
        ))}

        {/* Data rows */}
        {table.rows.map((row, rowIndex) => (
          <>
            {/* Row number */}
            <div key={`row-${rowIndex}-header`} style={headerCellStyle}>
              {rowIndex + 1}
            </div>

            {/* Cells */}
            {row.cells.map((cell, colIndex) => {
              const isSelected = selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
              const style = isSelected ? cellSelectedStyle : cellUnselectedStyle;
              const preview = getCellPreviewText(cell.text, 10);
              const tabIndexValue = disabled ? -1 : 0;

              return (
                <div
                  key={`cell-${rowIndex}-${colIndex}`}
                  style={style}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onKeyDown={(e) => handleKeyDown(e, rowIndex, colIndex)}
                  role="button"
                  tabIndex={tabIndexValue}
                  aria-selected={isSelected}
                  title={preview || `Cell ${getColumnLetter(colIndex)}${rowIndex + 1}`}
                >
                  {preview || "—"}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
