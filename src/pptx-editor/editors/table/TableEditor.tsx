/**
 * @file TableEditor - Editor for Table type
 *
 * Edits full table: properties, grid (column widths), rows and cells.
 */

import { useCallback, useState, type CSSProperties, type KeyboardEvent } from "react";
import { Accordion, FieldGroup } from "../../ui/layout";
import { PixelsEditor } from "../primitives/PixelsEditor";
import { TablePropertiesEditor, createDefaultTableProperties } from "./TablePropertiesEditor";
import { TableCellEditor, createDefaultTableCell } from "./TableCellEditor";
import { px } from "../../../pptx/domain/types";
import type {
  Table,
  TableProperties,
  TableGrid,
  TableRow,
  TableCell,
  TableColumn,
} from "../../../pptx/domain/table";
import type { EditorProps } from "../../types";

export type TableEditorProps = EditorProps<Table> & {
  readonly style?: CSSProperties;
};

// =============================================================================
// Types
// =============================================================================

type CellPosition = {
  readonly row: number;
  readonly col: number;
};

type CellGridProps = {
  readonly rows: readonly TableRow[];
  readonly grid: TableGrid;
  readonly selectedCell: CellPosition | null;
  readonly disabled?: boolean;
  readonly onSelectCell: (pos: CellPosition) => void;
};

type ColumnWidthsEditorProps = {
  readonly grid: TableGrid;
  readonly disabled?: boolean;
  readonly onChange: (grid: TableGrid) => void;
};

type RowHeightsEditorProps = {
  readonly rows: readonly TableRow[];
  readonly disabled?: boolean;
  readonly onChange: (rows: readonly TableRow[]) => void;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
};

const cellGridContainerStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
  overflowX: "auto",
};

const cellGridStyle: CSSProperties = {
  display: "inline-grid",
  gap: "2px",
  minWidth: "100%",
};

const cellStyle: CSSProperties = {
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
  ...cellStyle,
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  color: "var(--text-secondary, #a1a1a1)",
};

const cellSelectedStyle: CSSProperties = {
  ...cellStyle,
  backgroundColor: "var(--accent-blue, #0070f3)",
  color: "var(--text-primary, #fafafa)",
};

const headerCellStyle: CSSProperties = {
  ...cellStyle,
  backgroundColor: "var(--bg-tertiary, #111111)",
  color: "var(--text-tertiary, #737373)",
  fontWeight: 600,
  fontSize: "11px",
  cursor: "default",
};

const sectionStyle: CSSProperties = {
  padding: "12px",
  backgroundColor: "var(--bg-tertiary, #111111)",
  borderRadius: "var(--radius-md, 8px)",
  border: "1px solid var(--border-subtle, rgba(255, 255, 255, 0.08))",
};

const noSelectionStyle: CSSProperties = {
  padding: "20px",
  textAlign: "center",
  color: "var(--text-tertiary, #737373)",
  fontSize: "13px",
};

const widthsContainerStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
};

const widthItemStyle: CSSProperties = {
  minWidth: "80px",
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get preview text from cell
 */
function getCellPreview(cell: TableCell, maxLength: number = 10): string {
  if (!cell.textBody) {
    return "";
  }

  const texts: string[] = [];
  for (const para of cell.textBody.paragraphs) {
    for (const run of para.runs) {
      if (run.type === "text") {
        texts.push(run.text);
      }
    }
  }

  const text = texts.join(" ").trim();
  if (text.length > maxLength) {
    return text.substring(0, maxLength) + "…";
  }
  return text;
}

/**
 * Generate column letter (A, B, C, ... Z, AA, AB, ...)
 * Uses recursive approach to avoid let
 */
function getColumnLetter(index: number): string {
  const buildLetter = (n: number, acc: string): string => {
    if (n < 0) {
      return acc;
    }
    const char = String.fromCharCode((n % 26) + 65);
    return buildLetter(Math.floor(n / 26) - 1, char + acc);
  };
  return buildLetter(index, "");
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Cell grid display with selection
 */
function CellGrid({ rows, grid, selectedCell, disabled, onSelectCell }: CellGridProps) {
  const colCount = grid.columns.length;

  if (rows.length === 0 || colCount === 0) {
    return <div style={noSelectionStyle}>No cells in table</div>;
  }

  const gridTemplateColumns = `auto ${grid.columns.map(() => "1fr").join(" ")}`;

  const handleCellClick = (row: number, col: number) => {
    if (!disabled) {
      onSelectCell({ row, col });
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>, row: number, col: number) => {
    if (!disabled && (e.key === "Enter" || e.key === " ")) {
      onSelectCell({ row, col });
    }
  };

  return (
    <div style={{ ...cellGridStyle, gridTemplateColumns }}>
      {/* Header row with column letters */}
      <div style={headerCellStyle}></div>
      {grid.columns.map((_, colIndex) => (
        <div key={`header-${colIndex}`} style={headerCellStyle}>
          {getColumnLetter(colIndex)}
        </div>
      ))}

      {/* Data rows */}
      {rows.map((row, rowIndex) => (
        <>
          {/* Row number */}
          <div key={`row-${rowIndex}-header`} style={headerCellStyle}>
            {rowIndex + 1}
          </div>

          {/* Cells */}
          {row.cells.map((cell, colIndex) => {
            const isSelected =
              selectedCell?.row === rowIndex && selectedCell?.col === colIndex;
            const cellStyleFinal = isSelected ? cellSelectedStyle : cellUnselectedStyle;
            const preview = getCellPreview(cell);
            const tabIndexValue = disabled ? -1 : 0;

            return (
              <div
                key={`cell-${rowIndex}-${colIndex}`}
                style={cellStyleFinal}
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
  );
}

/**
 * Column widths editor
 */
function ColumnWidthsEditor({ grid, disabled, onChange }: ColumnWidthsEditorProps) {
  const handleWidthChange = (index: number, width: number) => {
    const newColumns = grid.columns.map((col, i) =>
      i === index ? { ...col, width: px(width) } : col
    );
    onChange({ ...grid, columns: newColumns });
  };

  return (
    <div style={widthsContainerStyle}>
      {grid.columns.map((col, index) => (
        <div key={index} style={widthItemStyle}>
          <FieldGroup label={`Col ${getColumnLetter(index)}`}>
            <PixelsEditor
              value={col.width}
              onChange={(w) => handleWidthChange(index, w)}
              disabled={disabled}
              min={10}
            />
          </FieldGroup>
        </div>
      ))}
    </div>
  );
}

/**
 * Row heights editor
 */
function RowHeightsEditor({ rows, disabled, onChange }: RowHeightsEditorProps) {
  const handleHeightChange = (index: number, height: number) => {
    const newRows = rows.map((row, i) => (i === index ? { ...row, height: px(height) } : row));
    onChange(newRows);
  };

  return (
    <div style={widthsContainerStyle}>
      {rows.map((row, index) => (
        <div key={index} style={widthItemStyle}>
          <FieldGroup label={`Row ${index + 1}`}>
            <PixelsEditor
              value={row.height}
              onChange={(h) => handleHeightChange(index, h)}
              disabled={disabled}
              min={10}
            />
          </FieldGroup>
        </div>
      ))}
    </div>
  );
}

/**
 * Selected cell panel component
 */
function SelectedCellPanel({
  selectedCell,
  selectedCellData,
  disabled,
  sectionStyle,
  noSelectionStyle,
  onCellChange,
}: {
  selectedCell: CellPosition | null;
  selectedCellData: TableCell | null;
  disabled?: boolean;
  sectionStyle: CSSProperties;
  noSelectionStyle: CSSProperties;
  onCellChange: (cell: TableCell) => void;
}) {
  if (!selectedCellData || !selectedCell) {
    return (
      <div style={sectionStyle}>
        <div style={noSelectionStyle}>Select a cell to edit its properties</div>
      </div>
    );
  }

  const label = `Cell ${getColumnLetter(selectedCell.col)}${selectedCell.row + 1}`;

  return (
    <div style={sectionStyle}>
      <FieldGroup label={label}>
        <TableCellEditor
          value={selectedCellData}
          onChange={onCellChange}
          disabled={disabled}
        />
      </FieldGroup>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Editor for Table type.
 */
export function TableEditor({ value, onChange, disabled, className, style }: TableEditorProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | null>(
    value.rows.length > 0 && value.rows[0].cells.length > 0 ? { row: 0, col: 0 } : null
  );

  const handlePropertiesChange = useCallback(
    (properties: TableProperties) => {
      onChange({ ...value, properties });
    },
    [value, onChange]
  );

  const handleGridChange = useCallback(
    (grid: TableGrid) => {
      onChange({ ...value, grid });
    },
    [value, onChange]
  );

  const handleRowsChange = useCallback(
    (rows: readonly TableRow[]) => {
      onChange({ ...value, rows });
    },
    [value, onChange]
  );

  const handleCellChange = useCallback(
    (cell: TableCell) => {
      if (!selectedCell) {
        return;
      }

      const newRows = value.rows.map((row, rowIndex) => {
        if (rowIndex !== selectedCell.row) {
          return row;
        }
        return {
          ...row,
          cells: row.cells.map((c, colIndex) => (colIndex === selectedCell.col ? cell : c)),
        };
      });

      onChange({ ...value, rows: newRows });
    },
    [value, onChange, selectedCell]
  );

  const getSelectedCellData = (): TableCell | null => {
    if (!selectedCell) {
      return null;
    }
    const row = value.rows[selectedCell.row];
    if (!row) {
      return null;
    }
    return row.cells[selectedCell.col] ?? null;
  };

  const selectedCellData = getSelectedCellData();

  return (
    <div style={{ ...containerStyle, ...style }} className={className}>
      {/* Table Properties */}
      <Accordion title="Table Properties" defaultExpanded={false}>
        <TablePropertiesEditor
          value={value.properties}
          onChange={handlePropertiesChange}
          disabled={disabled}
        />
      </Accordion>

      {/* Grid Structure */}
      <Accordion title="Grid Structure" defaultExpanded={false}>
        <FieldGroup label="Column Widths">
          <ColumnWidthsEditor
            grid={value.grid}
            onChange={handleGridChange}
            disabled={disabled}
          />
        </FieldGroup>
        <div style={{ marginTop: "12px" }}>
          <FieldGroup label="Row Heights">
            <RowHeightsEditor
              rows={value.rows}
              onChange={handleRowsChange}
              disabled={disabled}
            />
          </FieldGroup>
        </div>
      </Accordion>

      {/* Cell Grid */}
      <FieldGroup label="Cells">
        <div style={cellGridContainerStyle}>
          <CellGrid
            rows={value.rows}
            grid={value.grid}
            selectedCell={selectedCell}
            disabled={disabled}
            onSelectCell={setSelectedCell}
          />
        </div>
      </FieldGroup>

      {/* Selected Cell Editor */}
      <SelectedCellPanel
        selectedCell={selectedCell}
        selectedCellData={selectedCellData}
        disabled={disabled}
        sectionStyle={sectionStyle}
        noSelectionStyle={noSelectionStyle}
        onCellChange={handleCellChange}
      />
    </div>
  );
}

/**
 * Create default table (2x2)
 */
export function createDefaultTable(): Table {
  const defaultWidth = px(100);
  const defaultHeight = px(30);

  return {
    properties: createDefaultTableProperties(),
    grid: {
      columns: [{ width: defaultWidth }, { width: defaultWidth }],
    },
    rows: [
      {
        height: defaultHeight,
        cells: [createDefaultTableCell(), createDefaultTableCell()],
      },
      {
        height: defaultHeight,
        cells: [createDefaultTableCell(), createDefaultTableCell()],
      },
    ],
  };
}

/**
 * Create table with specified dimensions
 */
export function createTable(rowCount: number, colCount: number): Table {
  const defaultWidth = px(100);
  const defaultHeight = px(30);

  const columns: TableColumn[] = Array.from({ length: colCount }, () => ({
    width: defaultWidth,
  }));

  const rows: TableRow[] = Array.from({ length: rowCount }, () => ({
    height: defaultHeight,
    cells: Array.from({ length: colCount }, () => createDefaultTableCell()),
  }));

  return {
    properties: createDefaultTableProperties(),
    grid: { columns },
    rows,
  };
}
