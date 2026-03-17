/**
 * @file Table operation types
 *
 * Format-agnostic types for table structure representation and operations.
 * Used by shared UI components (editor-controls/table) and format-specific adapters.
 */

// =============================================================================
// Abstract Table Types (read-only, for UI rendering)
// =============================================================================

/** Abstract representation of a table for shared UI components. */
export type AbstractTable = {
  readonly rowCount: number;
  readonly colCount: number;
  readonly rows: readonly AbstractRow[];
  readonly columns: readonly AbstractColumn[];
};

/** Abstract row with height and cells. */
export type AbstractRow = {
  readonly height: number;
  readonly cells: readonly AbstractCell[];
};

/** Abstract column with width. */
export type AbstractColumn = {
  readonly width: number;
};

/** Abstract cell with text content and optional span info. */
export type AbstractCell = {
  readonly text: string;
  readonly rowSpan?: number;
  readonly colSpan?: number;
};

// =============================================================================
// Cell Range (for merge operations)
// =============================================================================

/** Cell range for merge/split operations. */
export type CellRange = {
  readonly startRow: number;
  readonly startCol: number;
  readonly endRow: number;
  readonly endCol: number;
};

// =============================================================================
// Table Operation Adapter
// =============================================================================

/**
 * Format-agnostic adapter for table structure operations.
 *
 * Each format (PPTX, DOCX, PDF) implements this interface to connect
 * format-specific table types with shared UI components.
 *
 * All mutation methods return a new table instance (immutable).
 */
export type TableOperationAdapter<TTable> = {
  readonly toAbstract: (table: TTable) => AbstractTable;
  readonly insertRow: (table: TTable, rowIndex: number) => TTable;
  readonly removeRow: (table: TTable, rowIndex: number) => TTable;
  readonly insertColumn: (table: TTable, colIndex: number) => TTable;
  readonly removeColumn: (table: TTable, colIndex: number) => TTable;
  readonly setColumnWidth: (table: TTable, colIndex: number, width: number) => TTable;
  readonly setRowHeight: (table: TTable, rowIndex: number, height: number) => TTable;
  readonly mergeCells: (table: TTable, range: CellRange) => TTable;
  readonly splitCell: (table: TTable, row: number, col: number) => TTable;
};
