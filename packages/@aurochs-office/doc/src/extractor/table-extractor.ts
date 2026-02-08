/**
 * @file Table structure extractor
 *
 * Reconstructs table structures from paragraph flags:
 *   sprmPFInTable → paragraph belongs to a table
 *   sprmPFTtp → row-end marker paragraph
 *   sprmPItap → table nesting depth
 *   \x07 (cell mark) → separates cells within a row
 *
 * Table paragraph sequence:
 *   [cell1 content]\x07  [cell2 content]\x07  [row-end TTP]\x07
 *   [cell3 content]\x07  [cell4 content]\x07  [row-end TTP]\x07
 */

import type { DocParagraph, DocTable, DocTableRow, DocTableCell } from "../domain/types";
import type { TapProps } from "./tap-extractor";

/**
 * Extract tables from a flat paragraph list.
 * Returns the list with table paragraphs replaced by DocTable objects,
 * and the remaining non-table paragraphs.
 *
 * @param tapPropsMap - Optional map of paragraph index → TAP properties for row-end paragraphs
 */
export function extractTables(
  paragraphs: readonly DocParagraph[],
  tapPropsMap?: ReadonlyMap<number, TapProps>,
): readonly (DocParagraph | DocTable)[] {
  const result: (DocParagraph | DocTable)[] = [];
  // eslint-disable-next-line no-restricted-syntax -- index tracked across table scan
  let i = 0;

  while (i < paragraphs.length) {
    const para = paragraphs[i];

    if (para.inTable && (para.tableDepth ?? 1) >= 1) {
      // Start of a table – collect all table paragraphs
      const { table, endIndex } = collectTable(paragraphs, i, tapPropsMap);
      result.push(table);
      i = endIndex;
    } else {
      result.push(para);
      i++;
    }
  }

  return result;
}

function collectTable(
  paragraphs: readonly DocParagraph[],
  startIndex: number,
  tapPropsMap?: ReadonlyMap<number, TapProps>,
): { table: DocTable; endIndex: number } {
  const rows: DocTableRow[] = [];
  let currentCellParagraphs: DocParagraph[] = [];
  let currentRowCells: DocTableCell[] = [];
  // eslint-disable-next-line no-restricted-syntax -- index tracking
  let i = startIndex;

  while (i < paragraphs.length) {
    const para = paragraphs[i];

    // Stop at non-table paragraph
    if (!para.inTable) break;

    // Skip deeper-nested table paragraphs (handled by outer table consumer)
    const depth = para.tableDepth ?? 1;
    if (depth > 1) {
      // Nested table paragraph — include as content of current cell
      currentCellParagraphs.push(stripTableFlags(para));
      i++;
      continue;
    }

    if (para.isRowEnd) {
      // Row-end marker (TTP) — finalize the current cell and row
      if (currentCellParagraphs.length > 0) {
        currentRowCells.push({ paragraphs: currentCellParagraphs });
        currentCellParagraphs = [];
      }

      // Apply TAP properties from row-end paragraph
      const tapProps = tapPropsMap?.get(i);
      const row = buildRow(currentRowCells, tapProps);
      rows.push(row);
      currentRowCells = [];
      i++;
      continue;
    }

    // Check if this paragraph's text ends with cell mark \x07
    const text = getCombinedText(para);
    if (text.includes("\x07")) {
      // Cell boundary — this paragraph ends the cell
      currentCellParagraphs.push(stripTableFlags(para));
      currentRowCells.push({ paragraphs: currentCellParagraphs });
      currentCellParagraphs = [];
    } else {
      // Regular paragraph within a cell
      currentCellParagraphs.push(stripTableFlags(para));
    }

    i++;
  }

  // Handle unclosed cells/rows
  if (currentCellParagraphs.length > 0) {
    currentRowCells.push({ paragraphs: currentCellParagraphs });
  }
  if (currentRowCells.length > 0) {
    rows.push({ cells: currentRowCells });
  }

  return { table: { rows }, endIndex: i };
}

function buildRow(cells: readonly DocTableCell[], tapProps: TapProps | undefined): DocTableRow {
  if (!tapProps) {
    return { cells };
  }

  // Apply per-cell properties from TAP SPRMs
  const enrichedCells = cells.map((cell, idx) => {
    const width = tapProps.cellWidths?.[idx];
    const verticalAlign = tapProps.verticalAlign?.[idx];
    const verticalMerge = tapProps.verticalMerge?.[idx];
    const horizontalMerge = tapProps.horizontalMerge?.[idx];
    const backgroundColor = tapProps.cellShading?.[idx];

    const hasChanges = width !== undefined || verticalAlign !== undefined
      || verticalMerge !== undefined || horizontalMerge !== undefined
      || backgroundColor !== undefined;

    if (!hasChanges) return cell;

    return {
      ...cell,
      ...(width !== undefined ? { width } : {}),
      ...(verticalAlign !== undefined ? { verticalAlign } : {}),
      ...(verticalMerge !== undefined ? { verticalMerge } : {}),
      ...(horizontalMerge !== undefined ? { horizontalMerge } : {}),
      ...(backgroundColor !== undefined ? { backgroundColor } : {}),
    };
  });

  return {
    cells: enrichedCells,
    ...(tapProps.rowHeight !== undefined ? { height: tapProps.rowHeight } : {}),
    ...(tapProps.isHeader ? { header: true } : {}),
    ...(tapProps.borders ? { borders: tapProps.borders } : {}),
  };
}

function getCombinedText(para: DocParagraph): string {
  return para.runs.map((r) => r.text).join("");
}

function stripTableFlags(para: DocParagraph): DocParagraph {
  // Remove table-specific properties from paragraph
  const { inTable: _1, isRowEnd: _2, tableDepth: _3, ...rest } = para;
  // Clean cell marks from run text
  const runs = para.runs.map((run) => {
    const cleaned = run.text.replace(/\x07/g, "");
    return cleaned === run.text ? run : { ...run, text: cleaned };
  });
  return { ...rest, runs };
}
