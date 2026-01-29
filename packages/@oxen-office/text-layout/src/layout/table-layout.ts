/**
 * @file Table Layout Engine
 *
 * Computes table layout from input, calculating cell positions and sizes.
 *
 * @see ECMA-376 Part 1, Section 17.4 (Tables)
 */

import type {
  LayoutTableInput,
  LayoutTableResult,
  LayoutTableRowResult,
  LayoutTableCellResult,
  LayoutParagraphInput,
  LayoutParagraphResult,
} from "../types";
import type { Pixels } from "@oxen-office/ooxml/domain/units";
import { px } from "@oxen-office/ooxml/domain/units";
import { layoutDocument } from "./engine";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for table layout.
 */
export type TableLayoutConfig = {
  /** Available width for the table */
  readonly availableWidth: Pixels;
  /** Starting Y position */
  readonly startY: Pixels;
};

/**
 * Grid cell info for tracking merged cells.
 */
type GridCell = {
  /** Row index of the cell that owns this grid position */
  readonly ownerRow: number;
  /** Column index of the cell that owns this grid position */
  readonly ownerCol: number;
  /** Whether this is the top-left of the merged area */
  readonly isOrigin: boolean;
};

// =============================================================================
// Grid Column Width Calculation
// =============================================================================

/**
 * Calculate final column widths.
 * Uses grid column widths if available, otherwise distributes evenly.
 */
function calculateColumnWidths(
  table: LayoutTableInput,
  availableWidth: Pixels,
): readonly Pixels[] {
  const { gridColumnWidths, width, indent } = table;

  // Determine table width
  const tableWidth = width ?? px((availableWidth as number) - (indent as number));

  // If we have grid column widths, use them
  if (gridColumnWidths.length > 0) {
    return gridColumnWidths;
  }

  // Otherwise, calculate from first row
  if (table.rows.length === 0) {
    return [];
  }

  const firstRow = table.rows[0];
  const totalGridSpan = firstRow.cells.reduce((sum, cell) => sum + cell.gridSpan, 0);

  if (totalGridSpan === 0) {
    return [];
  }

  // Distribute width evenly across grid columns
  const colWidth = px((tableWidth as number) / totalGridSpan);
  const result: Pixels[] = [];
  for (let i = 0; i < totalGridSpan; i++) {
    result.push(colWidth);
  }
  return result;
}

/**
 * Get the width of a cell spanning multiple grid columns.
 */
function getCellWidth(
  ...args: readonly [
    gridColIndex: number,
    gridSpan: number,
    columnWidths: readonly Pixels[],
    cellSpacing: Pixels,
  ]
): Pixels {
  const [gridColIndex, gridSpan, columnWidths, cellSpacing] = args;
  const cellSpacingValue = cellSpacing as number;
  const totalWidth = columnWidths
    .slice(gridColIndex, gridColIndex + gridSpan)
    .reduce((sum, w) => sum + (w as number), 0);

  // Add cell spacing between spanned columns (gridSpan - 1 gaps)
  const spacingGaps = Math.max(0, gridSpan - 1) * cellSpacingValue;

  return px(totalWidth + spacingGaps);
}

/**
 * Get the X position of a cell.
 */
function getCellX(
  ...args: readonly [
    gridColIndex: number,
    columnWidths: readonly Pixels[],
    cellSpacing: Pixels,
    tableX: number,
  ]
): number {
  const [gridColIndex, columnWidths, cellSpacing, tableX] = args;
  const cellSpacingValue = cellSpacing as number;
  const widthBefore = columnWidths
    .slice(0, gridColIndex)
    .reduce((sum, w) => sum + (w as number), 0);

  // Add cell spacing for each column before this one
  const spacingBefore = gridColIndex * cellSpacingValue;

  return tableX + widthBefore + spacingBefore;
}

// =============================================================================
// Vertical Merge Handling
// =============================================================================

/**
 * Build a grid map to track merged cells.
 * Returns a 2D array where each position points to the owning cell.
 */
function buildMergeGrid(
  table: LayoutTableInput,
  columnWidths: readonly Pixels[],
): GridCell[][] {
  const numCols = columnWidths.length;
  const numRows = table.rows.length;

  // Initialize grid
  const grid: (GridCell | null)[][] = [];
  for (let r = 0; r < numRows; r++) {
    grid[r] = new Array(numCols).fill(null);
  }

  // Process each row
  for (let rowIndex = 0; rowIndex < numRows; rowIndex++) {
    const row = table.rows[rowIndex];
    const gridColIndexRef = { value: 0 };

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      // Skip columns that are already claimed by vertical merges
      while (gridColIndexRef.value < numCols && grid[rowIndex][gridColIndexRef.value] !== null) {
        gridColIndexRef.value++;
      }

      if (gridColIndexRef.value >= numCols) {
        break;
      }

      const cell = row.cells[cellIndex];
      const gridSpan = cell.gridSpan;
      const vMerge = cell.vMerge;

      if (vMerge === "continue") {
        // This cell continues a vertical merge from above
        // Find the owning cell and extend it
        const owningCell = grid[rowIndex - 1]?.[gridColIndexRef.value];
        if (owningCell !== null) {
          // Mark this cell as owned by the same owner
          for (let c = gridColIndexRef.value; c < gridColIndexRef.value + gridSpan && c < numCols; c++) {
            grid[rowIndex][c] = {
              ownerRow: owningCell.ownerRow,
              ownerCol: owningCell.ownerCol,
              isOrigin: false,
            };
          }
        }
      } else {
        // This is an origin cell (restart or normal)
        for (let c = gridColIndexRef.value; c < gridColIndexRef.value + gridSpan && c < numCols; c++) {
          grid[rowIndex][c] = {
            ownerRow: rowIndex,
            ownerCol: cellIndex,
            isOrigin: c === gridColIndexRef.value,
          };
        }
      }

      gridColIndexRef.value += gridSpan;
    }
  }

  // Fill any remaining null cells with default
  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      if (grid[r][c] === null) {
        grid[r][c] = { ownerRow: r, ownerCol: c, isOrigin: true };
      }
    }
  }

  return grid as GridCell[][];
}

/**
 * Calculate row spans for cells based on merge grid.
 */
function calculateRowSpans(
  mergeGrid: GridCell[][],
  numRows: number,
  numCols: number,
): Map<string, number> {
  const rowSpans = new Map<string, number>();

  for (let r = 0; r < numRows; r++) {
    for (let c = 0; c < numCols; c++) {
      const cell = mergeGrid[r][c];
      if (cell.isOrigin) {
        // Count how many rows this cell spans
        const key = `${cell.ownerRow},${cell.ownerCol}`;
        const spanRef = { value: 1 };
        for (let nextRow = r + 1; nextRow < numRows; nextRow++) {
          const nextCell = mergeGrid[nextRow][c];
          if (
            nextCell.ownerRow === cell.ownerRow &&
            nextCell.ownerCol === cell.ownerCol
          ) {
            spanRef.value++;
          } else {
            break;
          }
        }
        rowSpans.set(key, spanRef.value);
      }
    }
  }

  return rowSpans;
}

// =============================================================================
// Cell Content Layout
// =============================================================================

/**
 * Layout paragraphs within a cell.
 */
function layoutCellContent(
  paragraphs: readonly LayoutParagraphInput[],
  contentWidth: Pixels,
): { paragraphs: readonly LayoutParagraphResult[]; height: Pixels } {
  if (paragraphs.length === 0) {
    // Empty cell has minimum height
    return { paragraphs: [], height: px(20) };
  }

  const result = layoutDocument(paragraphs, contentWidth);
  return {
    paragraphs: result.paragraphs,
    height: result.totalHeight,
  };
}

// =============================================================================
// Table Layout
// =============================================================================

/**
 * Layout a table, computing cell positions and sizes.
 */
export function layoutTable(
  table: LayoutTableInput,
  config: TableLayoutConfig,
): LayoutTableResult {
  const { availableWidth, startY } = config;
  const { alignment, indent, cellSpacing } = table;

  // Calculate column widths
  const columnWidths = calculateColumnWidths(table, availableWidth);

  // Calculate table width
  const cellSpacingValue = cellSpacing as number;
  const totalColumnWidth = columnWidths.reduce(
    (sum, w) => sum + (w as number),
    0,
  );
  const totalSpacing = Math.max(0, columnWidths.length - 1) * cellSpacingValue;
  const tableWidth = px(totalColumnWidth + totalSpacing);

  // Calculate table X position based on alignment
  const indentValue = indent as number;
  const availableWidthValue = availableWidth as number;
  const tableWidthValue = tableWidth as number;

  const tableX = calculateTableX(
    alignment,
    indentValue,
    availableWidthValue,
    tableWidthValue,
  );

  // Build merge grid
  const mergeGrid = buildMergeGrid(table, columnWidths);
  const rowSpans = calculateRowSpans(
    mergeGrid,
    table.rows.length,
    columnWidths.length,
  );

  // First pass: layout cell content and calculate minimum heights
  const cellHeights: number[][] = [];
  const cellResults: LayoutTableCellResult[][] = [];

  for (let rowIndex = 0; rowIndex < table.rows.length; rowIndex++) {
    const row = table.rows[rowIndex];
    cellHeights[rowIndex] = [];
    cellResults[rowIndex] = [];
    const gridColIndexRef = { value: 0 };

    for (let cellIndex = 0; cellIndex < row.cells.length; cellIndex++) {
      // Skip columns claimed by vertical merges from above
      while (
        gridColIndexRef.value < columnWidths.length &&
        mergeGrid[rowIndex][gridColIndexRef.value].ownerRow !== rowIndex
      ) {
        gridColIndexRef.value++;
      }

      if (gridColIndexRef.value >= columnWidths.length) {
        break;
      }

      const cell = row.cells[cellIndex];
      const { padding, paragraphs, borders, backgroundColor, verticalAlign, gridSpan, vMerge } =
        cell;

      // Skip continued merge cells - they don't contribute to height
      if (vMerge === "continue") {
        gridColIndexRef.value += gridSpan;
        continue;
      }

      // Calculate cell width
      const cellWidth = getCellWidth(gridColIndexRef.value, gridSpan, columnWidths, cellSpacing);
      const contentWidth = px(
        (cellWidth as number) - (padding.left as number) - (padding.right as number),
      );

      // Layout cell content
      const content = layoutCellContent(paragraphs, contentWidth);

      // Calculate minimum cell height
      const minHeight =
        (content.height as number) +
        (padding.top as number) +
        (padding.bottom as number);

      // Store for row height calculation
      const rowSpan = rowSpans.get(`${rowIndex},${cellIndex}`) ?? 1;
      cellHeights[rowIndex].push(minHeight / rowSpan); // Distribute height across spanned rows

      // Calculate X position
      const cellX = getCellX(gridColIndexRef.value, columnWidths, cellSpacing, tableX);

      // Create partial result (Y and final height will be set later)
      cellResults[rowIndex].push({
        x: px(cellX),
        y: px(0), // Will be updated
        width: cellWidth,
        height: px(minHeight), // Will be updated for row height
        paragraphs: content.paragraphs,
        padding,
        borders,
        backgroundColor,
        verticalAlign,
        colSpan: gridSpan,
        rowSpan,
      });

      gridColIndexRef.value += gridSpan;
    }
  }

  // Calculate row heights
  const rowHeights: number[] = table.rows.map((row, rowIndex) => {
    const specifiedHeight = row.height as number | undefined;
    const maxCellHeight = Math.max(...cellHeights[rowIndex], 0);

    if (specifiedHeight === undefined) {
      return maxCellHeight;
    }

    switch (row.heightRule) {
      case "exact":
        return specifiedHeight;
      case "atLeast":
        return Math.max(specifiedHeight, maxCellHeight);
      case "auto":
      default:
        return maxCellHeight;
    }
  });

function getCellTotalRowHeight(
  ...args: readonly [
    cell: LayoutTableCellResult,
    rowIndex: number,
    rowHeights: readonly number[],
    rowHeight: number,
    cellSpacingValue: number,
  ]
): number {
  const [cell, rowIndex, rowHeights, rowHeight, cellSpacingValue] = args;
  if (cell.rowSpan <= 1) {
    return rowHeight;
  }

  const spannedHeights = rowHeights
    .slice(rowIndex, rowIndex + cell.rowSpan)
    .reduce((sum, h) => sum + h, 0);
  return spannedHeights + (cell.rowSpan - 1) * cellSpacingValue;
}

  // Build final row results with correct Y positions
  const rowLayout = table.rows.reduce(
    (acc, row, rowIndex) => {
      const rowHeight = rowHeights[rowIndex];
      const currentY = acc.currentY;

      // Update cell Y positions and heights
      const finalCells: LayoutTableCellResult[] = cellResults[rowIndex].map((cell) => {
        const totalRowHeight = getCellTotalRowHeight(cell, rowIndex, rowHeights, rowHeight, cellSpacingValue);
        return {
          ...cell,
          y: px(currentY),
          height: px(totalRowHeight),
        };
      });

      acc.rows.push({
        y: px(currentY),
        height: px(rowHeight),
        cells: finalCells,
        isHeader: row.isHeader,
      });

      acc.currentY = currentY + rowHeight + cellSpacingValue;
      return acc;
    },
    { rows: [] as LayoutTableRowResult[], currentY: startY as number },
  );

  const rowResults = rowLayout.rows;

  // Calculate total table height
  const tableHeight = px(rowLayout.currentY - (startY as number) - cellSpacingValue);

  return {
    x: px(tableX),
    y: startY,
    width: tableWidth,
    height: tableHeight,
    rows: rowResults,
    alignment,
  };
}

/**
 * Calculate table X position based on alignment.
 */
function calculateTableX(
  ...args: readonly [
    alignment: "left" | "center" | "right",
    indent: number,
    availableWidth: number,
    tableWidth: number,
  ]
): number {
  const [alignment, indent, availableWidth, tableWidth] = args;
  switch (alignment) {
    case "center":
      return indent + (availableWidth - tableWidth) / 2;
    case "right":
      return indent + availableWidth - tableWidth;
    case "left":
    default:
      return indent;
  }
}
