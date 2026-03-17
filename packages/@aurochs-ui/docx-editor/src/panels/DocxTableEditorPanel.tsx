/**
 * @file DocxTableEditorPanel - Table editor panel with shared components
 *
 * Combines shared TableCellGrid, TableStructureToolbar, TableDimensionEditor
 * with DOCX-specific TablePropertiesEditor and TableCellPropertiesEditor.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import type { DocxTable, DocxTableProperties, DocxTableCellProperties } from "@aurochs-office/docx/domain/table";
import { OptionalPropertySection } from "@aurochs-ui/editor-controls/ui";
import { TableCellGrid, TableDimensionEditor, TableStructureToolbar } from "@aurochs-ui/editor-controls/table";
import type { CellPosition } from "@aurochs-ui/editor-core/table-selection";
import { docxTableOperationAdapter } from "../adapters/editor-controls/docx-table-operation-adapter";
import { TablePropertiesEditor } from "../editors/table/TablePropertiesEditor";
import { TableCellPropertiesEditor } from "../editors/table/TableCellPropertiesEditor";

// =============================================================================
// Types
// =============================================================================

export type DocxTableEditorPanelProps = {
  readonly table: DocxTable;
  readonly tableIndex: number;
  readonly onTablePropertiesChange: (props: Partial<DocxTableProperties>) => void;
  readonly onTableCellPropertiesChange: (props: Partial<DocxTableCellProperties>) => void;
  readonly onInsertRow: (tableIndex: number, rowIndex: number, above?: boolean) => void;
  readonly onRemoveRow: (tableIndex: number, rowIndex: number) => void;
  readonly onInsertColumn: (tableIndex: number, colIndex: number, before?: boolean) => void;
  readonly onRemoveColumn: (tableIndex: number, colIndex: number) => void;
  readonly onSplitCell: (tableIndex: number, rowIndex: number, colIndex: number) => void;
  readonly disabled?: boolean;
  readonly style?: CSSProperties;
};

// =============================================================================
// Helpers
// =============================================================================

function getSelectedCellProperties(table: DocxTable, selectedCell: CellPosition | undefined) {
  if (!selectedCell) { return undefined; }
  return table.rows[selectedCell.row]?.cells[selectedCell.col]?.properties;
}

// =============================================================================
// Component
// =============================================================================

/** DOCX table editor panel with shared UI components. */
export function DocxTableEditorPanel({
  table,
  tableIndex,
  onTablePropertiesChange,
  onTableCellPropertiesChange,
  onInsertRow,
  onRemoveRow,
  onInsertColumn,
  onRemoveColumn,
  onSplitCell,
  disabled,
  style,
}: DocxTableEditorPanelProps) {
  const [selectedCell, setSelectedCell] = useState<CellPosition | undefined>();

  const abstractTable = useMemo(() => docxTableOperationAdapter.toAbstract(table), [table]);

  const handleInsertRow = useCallback(
    (position: "above" | "below") => {
      if (!selectedCell) { return; }
      onInsertRow(tableIndex, selectedCell.row, position === "above");
    },
    [tableIndex, selectedCell, onInsertRow],
  );

  const handleRemoveRow = useCallback(() => {
    if (!selectedCell) { return; }
    onRemoveRow(tableIndex, selectedCell.row);
    if (selectedCell.row >= table.rows.length - 1 && table.rows.length > 1) {
      setSelectedCell({ row: selectedCell.row - 1, col: selectedCell.col });
    }
  }, [tableIndex, selectedCell, onRemoveRow, table.rows.length]);

  const handleInsertColumn = useCallback(
    (position: "before" | "after") => {
      if (!selectedCell) { return; }
      onInsertColumn(tableIndex, selectedCell.col, position === "before");
    },
    [tableIndex, selectedCell, onInsertColumn],
  );

  const handleRemoveColumn = useCallback(() => {
    if (!selectedCell) { return; }
    const colCount = table.grid?.columns.length ?? table.rows[0]?.cells.length ?? 0;
    onRemoveColumn(tableIndex, selectedCell.col);
    if (selectedCell.col >= colCount - 1 && colCount > 1) {
      setSelectedCell({ row: selectedCell.row, col: selectedCell.col - 1 });
    }
  }, [tableIndex, selectedCell, onRemoveColumn, table]);

  const handleMergeCells = useCallback(() => {
    if (!selectedCell) { return; }
    // Placeholder: merge requires range selection (future work)
  }, [selectedCell]);

  const handleSplitCell = useCallback(() => {
    if (!selectedCell) { return; }
    onSplitCell(tableIndex, selectedCell.row, selectedCell.col);
  }, [tableIndex, selectedCell, onSplitCell]);

  const selectedCellProps = getSelectedCellProperties(table, selectedCell);

  return (
    <div style={style}>
      {/* Table Properties */}
      <OptionalPropertySection title="Table" defaultExpanded>
        <TablePropertiesEditor
          value={table.properties ?? {}}
          onChange={(next) => onTablePropertiesChange(next)}
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Grid Structure (shared) */}
      <OptionalPropertySection title="Dimensions" defaultExpanded={false}>
        <TableDimensionEditor
          columns={abstractTable.columns}
          rows={abstractTable.rows}
          unitLabel="px"
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Structure Operations (shared) */}
      <OptionalPropertySection title="Structure" defaultExpanded={false}>
        <TableStructureToolbar
          onInsertRow={handleInsertRow}
          onRemoveRow={handleRemoveRow}
          onInsertColumn={handleInsertColumn}
          onRemoveColumn={handleRemoveColumn}
          onMergeCells={handleMergeCells}
          onSplitCell={handleSplitCell}
          hasSelection={selectedCell !== undefined}
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Cell Grid (shared) */}
      <OptionalPropertySection title="Cells" defaultExpanded>
        <TableCellGrid
          table={abstractTable}
          selectedCell={selectedCell}
          onCellSelect={setSelectedCell}
          disabled={disabled}
        />
      </OptionalPropertySection>

      {/* Cell Properties (DOCX-specific) */}
      {selectedCellProps && (
        <OptionalPropertySection title="Cell Properties" defaultExpanded>
          <TableCellPropertiesEditor
            value={selectedCellProps}
            onChange={(next) => onTableCellPropertiesChange(next)}
            disabled={disabled}
          />
        </OptionalPropertySection>
      )}
    </div>
  );
}
