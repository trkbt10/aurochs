/**
 * @file TableEditor - Editor for Table type
 *
 * Edits full table: properties, grid (column widths), rows and cells.
 * Uses shared TableCellGrid, TableDimensionEditor, TableStructureToolbar
 * from editor-controls/table for format-agnostic UI.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { FieldGroup } from "@aurochs-ui/ui-components/layout";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { TableCellGrid, TableDimensionEditor, TableStructureToolbar } from "@aurochs-ui/editor-controls/table";
import { TablePropertiesEditor, createDefaultTableProperties } from "./TablePropertiesEditor";
import { TableCellEditor, createDefaultTableCell } from "./TableCellEditor";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type {
  Table,
  TableProperties,
  TableRow,
  TableCell,
  TableColumn,
} from "@aurochs-office/pptx/domain/table/types";
import type { EditorProps } from "@aurochs-ui/ui-components/types";
import { type CellPosition, getColumnLetter } from "@aurochs-ui/editor-core/table-selection";
import { pptxTableOperationAdapter } from "../../adapters/editor-controls/pptx-table-operation-adapter";

export type TableEditorProps = EditorProps<Table> & {
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "16px",
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

// =============================================================================
// Selected Cell Panel (PPTX-specific, retained as-is)
// =============================================================================

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
        <TableCellEditor value={selectedCellData} onChange={onCellChange} disabled={disabled} />
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
    value.rows?.length > 0 && value.rows[0]?.cells?.length > 0 ? { row: 0, col: 0 } : null,
  );

  const abstractTable = useMemo(() => pptxTableOperationAdapter.toAbstract(value), [value]);

  const handlePropertiesChange = useCallback(
    (properties: TableProperties) => {
      onChange({ ...value, properties });
    },
    [value, onChange],
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
    [value, onChange, selectedCell],
  );

  // --- Structure operation handlers ---

  const handleInsertRow = useCallback(
    (position: "above" | "below") => {
      if (!selectedCell) { return; }
      const rowIndex = position === "above" ? selectedCell.row : selectedCell.row + 1;
      onChange(pptxTableOperationAdapter.insertRow(value, rowIndex));
    },
    [value, onChange, selectedCell],
  );

  const handleRemoveRow = useCallback(() => {
    if (!selectedCell) { return; }
    onChange(pptxTableOperationAdapter.removeRow(value, selectedCell.row));
    if (selectedCell.row >= value.rows.length - 1) {
      setSelectedCell(value.rows.length > 1 ? { row: selectedCell.row - 1, col: selectedCell.col } : null);
    }
  }, [value, onChange, selectedCell]);

  const handleInsertColumn = useCallback(
    (position: "before" | "after") => {
      if (!selectedCell) { return; }
      const colIndex = position === "before" ? selectedCell.col : selectedCell.col + 1;
      onChange(pptxTableOperationAdapter.insertColumn(value, colIndex));
    },
    [value, onChange, selectedCell],
  );

  const handleRemoveColumn = useCallback(() => {
    if (!selectedCell) { return; }
    onChange(pptxTableOperationAdapter.removeColumn(value, selectedCell.col));
    if (selectedCell.col >= value.grid.columns.length - 1) {
      setSelectedCell(value.grid.columns.length > 1 ? { row: selectedCell.row, col: selectedCell.col - 1 } : null);
    }
  }, [value, onChange, selectedCell]);

  const handleMergeCells = useCallback(() => {
    if (!selectedCell) { return; }
    // Merge single cell → no-op, would need range selection for real merge
    // For now this is a placeholder for future multi-cell selection
  }, [selectedCell]);

  const handleSplitCell = useCallback(() => {
    if (!selectedCell) { return; }
    onChange(pptxTableOperationAdapter.splitCell(value, selectedCell.row, selectedCell.col));
  }, [value, onChange, selectedCell]);

  const handleColumnWidthChange = useCallback(
    (colIndex: number, width: number) => {
      onChange(pptxTableOperationAdapter.setColumnWidth(value, colIndex, width));
    },
    [value, onChange],
  );

  const handleRowHeightChange = useCallback(
    (rowIndex: number, height: number) => {
      onChange(pptxTableOperationAdapter.setRowHeight(value, rowIndex, height));
    },
    [value, onChange],
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
      <OptionalPropertySection title="Table Properties" defaultExpanded={false}>
        <TablePropertiesEditor value={value.properties} onChange={handlePropertiesChange} disabled={disabled} />
      </OptionalPropertySection>

      {/* Grid Structure (shared component) */}
      <OptionalPropertySection title="Grid Structure" defaultExpanded={false}>
        <TableDimensionEditor
          columns={abstractTable.columns}
          rows={abstractTable.rows}
          onColumnWidthChange={handleColumnWidthChange}
          onRowHeightChange={handleRowHeightChange}
          unitLabel="px"
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Structure Operations (shared component) */}
      <OptionalPropertySection title="Structure" defaultExpanded={false}>
        <TableStructureToolbar
          onInsertRow={handleInsertRow}
          onRemoveRow={handleRemoveRow}
          onInsertColumn={handleInsertColumn}
          onRemoveColumn={handleRemoveColumn}
          onMergeCells={handleMergeCells}
          onSplitCell={handleSplitCell}
          hasSelection={selectedCell !== null}
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Cell Grid (shared component) */}
      <FieldGroup label="Cells">
        <TableCellGrid
          table={abstractTable}
          selectedCell={selectedCell ?? undefined}
          onCellSelect={setSelectedCell}
          disabled={disabled}
        />
      </FieldGroup>

      {/* Selected Cell Editor (PPTX-specific) */}
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
