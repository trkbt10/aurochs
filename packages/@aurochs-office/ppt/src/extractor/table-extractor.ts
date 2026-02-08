/**
 * @file Table extraction from PPT OfficeArt group shapes
 *
 * PPT stores tables as OfficeArtSpgrContainer groups where:
 * - The patriarch shape's TertiaryFOPT has property 0x039F=1 (isTable)
 * - Property 0x03A0 contains complex data: u16 nRows, u16 nCols, u16 flags, i32[nRows] rowHeights
 * - Cell shapes are rectangles (msospt=1) with ChildAnchor and ClientTextbox
 * - Merged cells span multiple grid positions via their anchor bounds
 * - Border lines are line shapes (msospt=20)
 */

import type { PptRecord } from "../records/types";
import { RT } from "../records/record-types";
import { findChildByType, findChildrenByType } from "../records/record-iterator";
import {
  parseOfficeArtFOPT, parseOfficeArtFSP, parseChildAnchor,
  type ShapeProperty,
} from "../records/atoms/shape";
import { extractTextBodies } from "./text-extractor";
import type { ColorScheme } from "../records/atoms/color";
import type { PptTable, PptTableRow, PptTableCell, PptTextBody } from "../domain/types";

/** PPT master unit to EMU conversion factor */
const MASTER_UNIT_TO_EMU = 914400 / 576;

/** Table metadata property IDs in TertiaryFOPT */
const TABLE_FLAG = 0x039F;
const TABLE_LAYOUT = 0x03A0;

type CellInfo = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  textBody?: PptTextBody;
};

/**
 * Check if a group container is a table.
 * Returns the TertiaryFOPT if it is, undefined otherwise.
 */
export function isTableGroup(groupContainer: PptRecord): Map<number, ShapeProperty> | undefined {
  const children = groupContainer.children ?? [];

  // First child is the patriarch shape
  const spContainers = findChildrenByType(children, RT.OfficeArtSpContainer);
  if (spContainers.length === 0) return undefined;

  const patriarch = spContainers[0];
  const tertiaryFOPT = findChildByType(patriarch.children ?? [], RT.OfficeArtTertiaryFOPT);
  if (!tertiaryFOPT) return undefined;

  const props = parseOfficeArtFOPT(tertiaryFOPT);
  const tableFlag = props.get(TABLE_FLAG);
  if (!tableFlag || tableFlag.value !== 1) return undefined;

  return props;
}

/**
 * Extract table structure from a group that has been identified as a table.
 */
export function extractTable(
  groupContainer: PptRecord,
  tertiaryProps: Map<number, ShapeProperty>,
  fonts: readonly string[],
  colorScheme: ColorScheme,
): PptTable | undefined {
  // Parse table layout metadata
  const layoutProp = tertiaryProps.get(TABLE_LAYOUT);
  if (!layoutProp?.complexData || layoutProp.complexData.byteLength < 6) return undefined;

  const layoutView = new DataView(
    layoutProp.complexData.buffer,
    layoutProp.complexData.byteOffset,
    layoutProp.complexData.byteLength,
  );
  const nRows = layoutView.getUint16(0, true);
  const nCols = layoutView.getUint16(2, true);
  // Skip flags at offset 4

  // Parse row heights (i32 values starting at offset 6)
  const rowHeightsMaster: number[] = [];
  for (let i = 0; i < nRows && 6 + (i + 1) * 4 <= layoutProp.complexData.byteLength; i++) {
    rowHeightsMaster.push(layoutView.getInt32(6 + i * 4, true));
  }

  // Collect cell shapes from the group
  const children = groupContainer.children ?? [];
  const cells: CellInfo[] = [];

  for (const child of children) {
    if (child.recType !== RT.OfficeArtSpContainer) continue;
    const childChildren = child.children ?? [];

    const fsp = findChildByType(childChildren, RT.OfficeArtFSP);
    if (!fsp) continue;
    const flags = parseOfficeArtFSP(fsp);
    if (flags.isPatriarch) continue;

    // Only rectangle shapes are cells (msospt=1), skip lines (msospt=20)
    if (fsp.recInstance === 20) continue;

    const anchor = findChildByType(childChildren, RT.OfficeArtChildAnchor);
    if (!anchor) continue;

    const a = parseChildAnchor(anchor);

    // Extract text
    let textBody: PptTextBody | undefined;
    const clientTextbox = findChildByType(childChildren, RT.OfficeArtClientTextbox);
    if (clientTextbox?.children) {
      const bodies = extractTextBodies(clientTextbox.children, fonts, colorScheme);
      if (bodies.length > 0) textBody = bodies[0];
    }

    cells.push({ left: a.left, top: a.top, right: a.right, bottom: a.bottom, textBody });
  }

  if (cells.length === 0) return undefined;

  // Derive grid lines from cell anchors
  const colBounds = deriveGridLines(cells.map(c => c.left), cells.map(c => c.right));
  const rowBounds = deriveGridLines(cells.map(c => c.top), cells.map(c => c.bottom));

  if (colBounds.length < 2 || rowBounds.length < 2) return undefined;

  const actualNCols = colBounds.length - 1;
  const actualNRows = rowBounds.length - 1;

  // Column widths in EMU
  const columnWidthsEmu = [];
  for (let c = 0; c < actualNCols; c++) {
    columnWidthsEmu.push(Math.round((colBounds[c + 1] - colBounds[c]) * MASTER_UNIT_TO_EMU));
  }

  // Build grid: assign cells to grid positions
  const grid: (PptTableCell | undefined)[][] = Array.from({ length: actualNRows }, () =>
    Array.from({ length: actualNCols }, () => undefined),
  );

  for (const cell of cells) {
    const col = findGridIndex(colBounds, cell.left);
    const row = findGridIndex(rowBounds, cell.top);
    const colEnd = findGridIndex(colBounds, cell.right);
    const rowEnd = findGridIndex(rowBounds, cell.bottom);

    if (col < 0 || row < 0 || colEnd < 0 || rowEnd < 0) continue;

    const colSpan = colEnd - col;
    const rowSpan = rowEnd - row;

    grid[row][col] = {
      text: cell.textBody,
      ...(colSpan > 1 ? { colSpan } : {}),
      ...(rowSpan > 1 ? { rowSpan } : {}),
    };
  }

  // Build rows
  const rows: PptTableRow[] = [];
  for (let r = 0; r < actualNRows; r++) {
    const heightEmu = Math.round((rowBounds[r + 1] - rowBounds[r]) * MASTER_UNIT_TO_EMU);
    const rowCells: PptTableCell[] = [];

    for (let c = 0; c < actualNCols; c++) {
      rowCells.push(grid[r][c] ?? { text: undefined });
    }

    rows.push({ heightEmu, cells: rowCells });
  }

  return { columnWidthsEmu, rows };
}

/**
 * Derive sorted unique grid line positions from cell start/end positions.
 */
function deriveGridLines(starts: number[], ends: number[]): number[] {
  const positions = new Set<number>();
  for (const s of starts) positions.add(s);
  for (const e of ends) positions.add(e);
  return Array.from(positions).sort((a, b) => a - b);
}

/**
 * Find which grid interval a position falls at (snapping to nearest grid line).
 */
function findGridIndex(gridLines: number[], position: number): number {
  // Find the nearest grid line
  let minDist = Infinity;
  let bestIdx = -1;
  for (let i = 0; i < gridLines.length; i++) {
    const dist = Math.abs(gridLines[i] - position);
    if (dist < minDist) {
      minDist = dist;
      bestIdx = i;
    }
  }
  return bestIdx;
}
