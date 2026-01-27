/**
 * @file Table style resolver (SpreadsheetML)
 *
 * Resolves the effective table-style differential format (DXF) for a given cell,
 * based on:
 * - Table definition (`xl/tables/table*.xml`): `tableStyleInfo` and table range
 * - Stylesheet (`xl/styles.xml`): `<tableStyles>` mapping element types → `dxfId`
 *
 * This is intentionally conservative and implements only the element types needed
 * for our POI regression fixtures (e.g., headerRow/totalRow/firstHeaderCell and banded rows/columns).
 *
 * @see ECMA-376 Part 4, Section 18.5.1.10 (tableStyleInfo)
 * @see ECMA-376 Part 4, Section 18.8.57 (tableStyles)
 */

import type { CellAddress, CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxDifferentialFormat } from "@oxen/xlsx/domain/style/dxf";
import type { XlsxStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxTable, XlsxTableStyleInfo } from "@oxen/xlsx/domain/table/types";
import type { XlsxTableStyle, XlsxTableStyleElementType } from "@oxen/xlsx/domain/style/table-style";

function getRangeBounds(range: CellRange): { readonly minRow: number; readonly maxRow: number; readonly minCol: number; readonly maxCol: number } {
  const startRow = range.start.row as number;
  const endRow = range.end.row as number;
  const startCol = range.start.col as number;
  const endCol = range.end.col as number;
  return {
    minRow: Math.min(startRow, endRow),
    maxRow: Math.max(startRow, endRow),
    minCol: Math.min(startCol, endCol),
    maxCol: Math.max(startCol, endCol),
  };
}

function rangeContainsAddress(range: CellRange, address: CellAddress): boolean {
  const bounds = getRangeBounds(range);
  const row = address.row as number;
  const col = address.col as number;
  return bounds.minRow <= row && row <= bounds.maxRow && bounds.minCol <= col && col <= bounds.maxCol;
}

function mergeBorders(
  base: XlsxDifferentialFormat["border"] | undefined,
  overlay: XlsxDifferentialFormat["border"] | undefined,
): XlsxDifferentialFormat["border"] | undefined {
  if (!base) {
    return overlay;
  }
  if (!overlay) {
    return base;
  }
  return {
    left: overlay.left ?? base.left,
    right: overlay.right ?? base.right,
    top: overlay.top ?? base.top,
    bottom: overlay.bottom ?? base.bottom,
    diagonal: overlay.diagonal ?? base.diagonal,
    diagonalUp: overlay.diagonalUp ?? base.diagonalUp,
    diagonalDown: overlay.diagonalDown ?? base.diagonalDown,
    outline: overlay.outline ?? base.outline,
  };
}

function mergeDifferentialFormats(
  base: XlsxDifferentialFormat | undefined,
  overlay: XlsxDifferentialFormat | undefined,
): XlsxDifferentialFormat | undefined {
  if (!base) {
    return overlay;
  }
  if (!overlay) {
    return base;
  }
  return {
    numFmt: overlay.numFmt ?? base.numFmt,
    font: overlay.font ?? base.font,
    fill: overlay.fill ?? base.fill,
    border: mergeBorders(base.border, overlay.border),
  };
}

function buildElementMap(style: XlsxTableStyle): ReadonlyMap<XlsxTableStyleElementType, number> {
  const map = new Map<XlsxTableStyleElementType, number>();
  for (const el of style.elements) {
    map.set(el.type, el.dxfId);
  }
  return map;
}

function findTableStyle(styles: XlsxStyleSheet, styleInfo: XlsxTableStyleInfo | undefined): XlsxTableStyle | undefined {
  const candidates = styles.tableStyles;
  if (!candidates || candidates.length === 0) {
    return undefined;
  }
  const name = styleInfo?.name ?? styles.defaultTableStyle;
  if (!name) {
    return undefined;
  }
  return candidates.find((style) => style.name === name);
}

function getEffectiveHeaderRowBounds(table: XlsxTable): { readonly startRow: number; readonly endRow: number } {
  const refBounds = getRangeBounds(table.ref);
  const startRow = refBounds.minRow;
  const endRow = startRow + table.headerRowCount - 1;
  return { startRow, endRow };
}

function getEffectiveTotalsRowBounds(table: XlsxTable): { readonly startRow: number; readonly endRow: number } | null {
  if (table.totalsRowCount <= 0) {
    return null;
  }
  const refBounds = getRangeBounds(table.ref);
  const endRow = refBounds.maxRow;
  const startRow = endRow - table.totalsRowCount + 1;
  return { startRow, endRow };
}

/**
 * Resolve the table-style DXF for a cell.
 *
 * @param params.sheetIndex - Owning sheet index
 * @param params.tables - Workbook tables
 * @param params.styles - Workbook styles (must include dxfs + tableStyles)
 * @param params.address - Target cell address
 */
export function resolveCellTableStyleDifferentialFormat(params: {
  readonly sheetIndex: number;
  readonly tables: readonly XlsxTable[] | undefined;
  readonly styles: XlsxStyleSheet;
  readonly address: CellAddress;
}): XlsxDifferentialFormat | undefined {
  const { tables, styles, sheetIndex, address } = params;
  const dxfs = styles.dxfs;
  if (!tables || tables.length === 0 || !dxfs || dxfs.length === 0) {
    return undefined;
  }

  const table = tables.find((candidate) => candidate.sheetIndex === sheetIndex && rangeContainsAddress(candidate.ref, address));
  if (!table) {
    return undefined;
  }

  const style = findTableStyle(styles, table.styleInfo);
  if (!style) {
    return undefined;
  }
  const elementToDxfId = buildElementMap(style);

  const bounds = getRangeBounds(table.ref);
  const row = address.row as number;
  const col = address.col as number;
  const isFirstCol = col === bounds.minCol;
  const isLastCol = col === bounds.maxCol;

  const header = getEffectiveHeaderRowBounds(table);
  const totals = getEffectiveTotalsRowBounds(table);
  const isHeaderRow = header.startRow <= row && row <= header.endRow;
  const isTotalsRow = totals ? totals.startRow <= row && row <= totals.endRow : false;
  const isDataRow = !isHeaderRow && !isTotalsRow;

  const resolveDxf = (type: XlsxTableStyleElementType): XlsxDifferentialFormat | undefined => {
    const id = elementToDxfId.get(type);
    if (id === undefined) {
      return undefined;
    }
    return dxfs[id];
  };

  const applyInOrder = (types: readonly XlsxTableStyleElementType[]): XlsxDifferentialFormat | undefined => {
    return types.reduce<XlsxDifferentialFormat | undefined>((acc, type) => {
      return mergeDifferentialFormats(acc, resolveDxf(type));
    }, undefined);
  };

  const baseTypes: XlsxTableStyleElementType[] = ["wholeTable"];

  if (table.styleInfo?.showRowStripes === true && isDataRow) {
    const dataRowIndex = row - (header.endRow + 1);
    baseTypes.push(dataRowIndex % 2 === 0 ? "firstRowStripe" : "secondRowStripe");
  }

  if (table.styleInfo?.showColumnStripes === true && isDataRow) {
    const dataColIndex = col - bounds.minCol;
    baseTypes.push(dataColIndex % 2 === 0 ? "firstColumnStripe" : "secondColumnStripe");
  }

  if (table.styleInfo?.showFirstColumn === true && isFirstCol) {
    baseTypes.push("firstColumn");
  }
  if (table.styleInfo?.showLastColumn === true && isLastCol) {
    baseTypes.push("lastColumn");
  }

  if (isHeaderRow) {
    baseTypes.push("headerRow");
    if (isFirstCol) {
      baseTypes.push("firstHeaderCell");
    } else if (isLastCol) {
      baseTypes.push("lastHeaderCell");
    }
  }

  if (isTotalsRow) {
    baseTypes.push("totalRow");
    if (isFirstCol) {
      baseTypes.push("firstTotalCell");
    } else if (isLastCol) {
      baseTypes.push("lastTotalCell");
    }
  }

  return applyInOrder(baseTypes);
}
