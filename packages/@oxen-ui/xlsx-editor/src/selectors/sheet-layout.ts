/**
 * @file Sheet layout selector
 *
 * Pure functions for turning SpreadsheetML row/column sizing into pixel layout,
 * without allocating per-row/per-column arrays for the full sheet size.
 */

import type { XlsxColumnDef, XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { colIdx, rowIdx, type ColIndex, type RowIndex } from "@oxen/xlsx/domain/types";

export type SheetLayoutOptions = {
  readonly rowCount: number;
  readonly colCount: number;
  readonly defaultRowHeightPx: number;
  readonly defaultColWidthPx: number;
};

type Segment = {
  readonly start: number;
  readonly endExclusive: number;
  readonly sizePx: number;
  readonly offsetPx: number;
  readonly endOffsetPx: number;
};

export type SheetAxisLayout = {
  readonly count: number;
  readonly totalSizePx: number;

  /** Size (px) of a 0-based item index. */
  readonly getSizePx: (index0: number) => number;
  /** Offset (px) at the start of a 0-based item index. */
  readonly getOffsetPx: (index0: number) => number;
  /** Offset (px) at a boundary index in [0..count]. */
  readonly getBoundaryOffsetPx: (boundaryIndex0: number) => number;
  /** Find a 0-based item index at the given offset (px). */
  readonly findIndexAtOffset: (offsetPx: number) => number;
};

export type SheetLayout = {
  readonly rowCount: number;
  readonly colCount: number;
  readonly rows: SheetAxisLayout;
  readonly cols: SheetAxisLayout;
  readonly totalRowsHeightPx: number;
  readonly totalColsWidthPx: number;
};

const SCREEN_DPI = 96;

/**
 * Convert typographic points (1/72 inch) to pixels using the editor's assumed screen DPI.
 */
export function pointsToPixels(points: number): number {
  if (!Number.isFinite(points)) {
    throw new Error(`points must be finite: ${points}`);
  }
  return (points * SCREEN_DPI) / 72;
}

/**
 * Convert pixels to typographic points (1/72 inch) using the editor's assumed screen DPI.
 */
export function pixelsToPoints(pixels: number): number {
  if (!Number.isFinite(pixels)) {
    throw new Error(`pixels must be finite: ${pixels}`);
  }
  return (pixels * 72) / SCREEN_DPI;
}

export type ColumnWidthConversionOptions = {
  /**
   * Approximate maximum digit width (MDW) in px at 96 DPI.
   * Excel commonly uses Calibri 11 by default (MDW≈7).
   */
  readonly maxDigitWidthPx?: number;
  /** Extra padding in px applied by Excel-like rendering. */
  readonly paddingPx?: number;
};

/**
 * Convert an Excel column width (in "characters") to pixels using an Excel-like approximation.
 */
export function columnWidthCharToPixels(widthChars: number, options?: ColumnWidthConversionOptions): number {
  if (!Number.isFinite(widthChars)) {
    throw new Error(`widthChars must be finite: ${widthChars}`);
  }
  if (widthChars < 0) {
    throw new Error(`widthChars must be >= 0: ${widthChars}`);
  }
  const maxDigitWidthPx = options?.maxDigitWidthPx ?? 7;
  const paddingPx = options?.paddingPx ?? 5;
  if (maxDigitWidthPx <= 0) {
    throw new Error(`maxDigitWidthPx must be > 0: ${maxDigitWidthPx}`);
  }
  return Math.max(0, Math.floor(widthChars * maxDigitWidthPx + paddingPx));
}

/**
 * Convert pixels to an Excel column width (in "characters") using an Excel-like approximation.
 */
export function pixelsToColumnWidthChar(pixels: number, options?: ColumnWidthConversionOptions): number {
  if (!Number.isFinite(pixels)) {
    throw new Error(`pixels must be finite: ${pixels}`);
  }
  if (pixels < 0) {
    throw new Error(`pixels must be >= 0: ${pixels}`);
  }
  const maxDigitWidthPx = options?.maxDigitWidthPx ?? 7;
  const paddingPx = options?.paddingPx ?? 5;
  if (maxDigitWidthPx <= 0) {
    throw new Error(`maxDigitWidthPx must be > 0: ${maxDigitWidthPx}`);
  }
  return Math.max(0, (pixels - paddingPx) / maxDigitWidthPx);
}

function assertValidIndex0(index0: number, count: number, label: string): void {
  if (!Number.isInteger(index0)) {
    throw new Error(`${label} must be an integer: ${index0}`);
  }
  if (index0 < 0 || index0 >= count) {
    throw new Error(`${label} out of range: ${index0}`);
  }
}

function assertValidBoundaryIndex0(boundaryIndex0: number, count: number, label: string): void {
  if (!Number.isInteger(boundaryIndex0)) {
    throw new Error(`${label} must be an integer: ${boundaryIndex0}`);
  }
  if (boundaryIndex0 < 0 || boundaryIndex0 > count) {
    throw new Error(`${label} out of range: ${boundaryIndex0}`);
  }
}

function mergeAdjacentSegments(
  segments: readonly Omit<Segment, "offsetPx" | "endOffsetPx">[],
): readonly Segment[] {
  const merged: Omit<Segment, "offsetPx" | "endOffsetPx">[] = [];
  for (const seg of segments) {
    const last = merged[merged.length - 1];
    if (last && last.endExclusive === seg.start && last.sizePx === seg.sizePx) {
      merged[merged.length - 1] = { ...last, endExclusive: seg.endExclusive };
      continue;
    }
    merged.push(seg);
  }

  const accumulator = merged.reduce(
    (acc, seg) => {
      const length = seg.endExclusive - seg.start;
      const endOffset = acc.offsetPx + length * seg.sizePx;
      acc.segments.push({ ...seg, offsetPx: acc.offsetPx, endOffsetPx: endOffset });
      return { offsetPx: endOffset, segments: acc.segments };
    },
    { offsetPx: 0, segments: [] as Segment[] },
  );

  return accumulator.segments;
}

function buildAxisLayoutFromSegments(segments: readonly Segment[], count: number): SheetAxisLayout {
  if (segments.length === 0) {
    throw new Error("segments must not be empty");
  }
  const first = segments[0]!;
  const last = segments[segments.length - 1]!;
  if (first.start !== 0 || last.endExclusive !== count) {
    throw new Error("segments must cover [0..count)");
  }

  const totalSizePx = last.endOffsetPx;

  const getSegmentForIndex = (index0: number): Segment => {
    const search = (lo: number, hi: number): Segment => {
      if (lo > hi) {
        throw new Error(`No segment found for index0=${index0}`);
      }
      const mid = Math.floor((lo + hi) / 2);
      const seg = segments[mid]!;
      if (index0 < seg.start) {
        return search(lo, mid - 1);
      }
      if (index0 >= seg.endExclusive) {
        return search(mid + 1, hi);
      }
      return seg;
    };
    return search(0, segments.length - 1);
  };

  const getSegmentForOffset = (offsetPx: number): Segment | undefined => {
    if (segments.length === 0) {
      return undefined;
    }

    const clamped = Math.max(0, Math.min(totalSizePx, offsetPx));
    const search = (lo: number, hi: number): Segment | undefined => {
      if (lo > hi) {
        return undefined;
      }
      const mid = Math.floor((lo + hi) / 2);
      const seg = segments[mid]!;
      if (clamped < seg.offsetPx) {
        return search(lo, mid - 1);
      }
      if (clamped >= seg.endOffsetPx) {
        return search(mid + 1, hi);
      }
      return seg;
    };
    return search(0, segments.length - 1);
  };

  const findIndexAtOffset = (offsetPx: number): number => {
    if (count <= 0) {
      return 0;
    }
    if (totalSizePx <= 0) {
      return 0;
    }

    const seg = getSegmentForOffset(offsetPx);
    if (!seg) {
      return count - 1;
    }
    if (seg.sizePx <= 0) {
      return seg.start;
    }
    const clamped = Math.max(0, Math.min(totalSizePx, offsetPx));
    const indexInSeg = Math.floor((clamped - seg.offsetPx) / seg.sizePx);
    return Math.min(seg.endExclusive - 1, seg.start + indexInSeg);
  };

  return {
    count,
    totalSizePx,
    getSizePx: (index0) => {
      assertValidIndex0(index0, count, "index0");
      return getSegmentForIndex(index0).sizePx;
    },
    getOffsetPx: (index0) => {
      assertValidIndex0(index0, count, "index0");
      const seg = getSegmentForIndex(index0);
      return seg.offsetPx + (index0 - seg.start) * seg.sizePx;
    },
    getBoundaryOffsetPx: (boundaryIndex0) => {
      assertValidBoundaryIndex0(boundaryIndex0, count, "boundaryIndex0");
      if (boundaryIndex0 === count) {
        return totalSizePx;
      }
      const seg = getSegmentForIndex(boundaryIndex0);
      return seg.offsetPx + (boundaryIndex0 - seg.start) * seg.sizePx;
    },
    findIndexAtOffset,
  };
}

function buildRowSegments(worksheet: XlsxWorksheet, options: SheetLayoutOptions): readonly Segment[] {
  const overrides = new Map<number, number>();

  for (const row of worksheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < 1 || rowNumber > options.rowCount) {
      continue;
    }
    const row0 = rowNumber - 1;
    if (row.hidden) {
      overrides.set(row0, 0);
      continue;
    }
    if (row.height !== undefined) {
      overrides.set(row0, pointsToPixels(row.height));
    }
  }

  const boundaries = new Set<number>([0, options.rowCount]);
  for (const row0 of overrides.keys()) {
    boundaries.add(row0);
    boundaries.add(row0 + 1);
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const base: Omit<Segment, "offsetPx" | "endOffsetPx">[] = [];

  const pairs = sorted.slice(0, -1).map((start, index) => {
    const endExclusive = sorted[index + 1]!;
    return { start, endExclusive };
  });

  for (const pair of pairs) {
    const sizePx = overrides.get(pair.start) ?? options.defaultRowHeightPx;
    base.push({ start: pair.start, endExclusive: pair.endExclusive, sizePx });
  }

  return mergeAdjacentSegments(base);
}

function buildColumnSegments(worksheet: XlsxWorksheet, options: SheetLayoutOptions): readonly Segment[] {
  const boundaries = new Set<number>([0, options.colCount]);

  for (const def of worksheet.columns ?? []) {
    const start0 = (def.min as number) - 1;
    const endExclusive = def.max as number;
    if (start0 < 0 || endExclusive <= 0) {
      continue;
    }
    boundaries.add(Math.max(0, Math.min(options.colCount, start0)));
    boundaries.add(Math.max(0, Math.min(options.colCount, endExclusive)));
  }

  const sorted = [...boundaries].sort((a, b) => a - b);
  const base: Omit<Segment, "offsetPx" | "endOffsetPx">[] = [];
  const defs = worksheet.columns ?? [];

  const pairs = sorted.slice(0, -1).map((start, index) => {
    const endExclusive = sorted[index + 1]!;
    return { start, endExclusive };
  });

  const findColumnDef = (col1: number): XlsxColumnDef | undefined => {
    return defs.reduce<XlsxColumnDef | undefined>((match, d) => {
      if ((d.min as number) <= col1 && col1 <= (d.max as number)) {
        return d;
      }
      return match;
    }, undefined);
  };

  const resolveColSizePx = (def: XlsxColumnDef | undefined): number => {
    if (!def) {
      return options.defaultColWidthPx;
    }
    if (def.hidden) {
      return 0;
    }
    if (def.width !== undefined) {
      return columnWidthCharToPixels(def.width);
    }
    return options.defaultColWidthPx;
  };

  for (const pair of pairs) {
    const start = pair.start;
    const endExclusive = pair.endExclusive;
    if (start === endExclusive) {
      continue;
    }

    const col1 = start + 1;
    const def = findColumnDef(col1);
    const sizePx = resolveColSizePx(def);

    base.push({ start, endExclusive, sizePx });
  }

  return mergeAdjacentSegments(base);
}

/**
 * Create a layout model for a worksheet that can answer size/offset queries without dense arrays.
 */
export function createSheetLayout(worksheet: XlsxWorksheet, options: SheetLayoutOptions): SheetLayout {
  if (options.rowCount <= 0 || options.colCount <= 0) {
    throw new Error("rowCount/colCount must be > 0");
  }
  if (options.defaultRowHeightPx <= 0 || options.defaultColWidthPx <= 0) {
    throw new Error("defaultRowHeightPx/defaultColWidthPx must be > 0");
  }

  const rows = buildAxisLayoutFromSegments(buildRowSegments(worksheet, options), options.rowCount);
  const cols = buildAxisLayoutFromSegments(buildColumnSegments(worksheet, options), options.colCount);

  return {
    rowCount: options.rowCount,
    colCount: options.colCount,
    rows,
    cols,
    totalRowsHeightPx: rows.totalSizePx,
    totalColsWidthPx: cols.totalSizePx,
  };
}

/**
 * Convert a 1-based `RowIndex` to a 0-based index.
 */
export function toRowIndex0(row: RowIndex): number {
  const n = row as number;
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`RowIndex must be >= 1: ${n}`);
  }
  return n - 1;
}

/**
 * Convert a 1-based `ColIndex` to a 0-based index.
 */
export function toColIndex0(col: ColIndex): number {
  const n = col as number;
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(`ColIndex must be >= 1: ${n}`);
  }
  return n - 1;
}

/**
 * Convert a 0-based row index to a 1-based `RowIndex`.
 */
export function toRowIndex1(row0: number): RowIndex {
  if (!Number.isInteger(row0) || row0 < 0) {
    throw new Error(`row0 must be a 0-based integer: ${row0}`);
  }
  return rowIdx(row0 + 1);
}

/**
 * Convert a 0-based column index to a 1-based `ColIndex`.
 */
export function toColIndex1(col0: number): ColIndex {
  if (!Number.isInteger(col0) || col0 < 0) {
    throw new Error(`col0 must be a 0-based integer: ${col0}`);
  }
  return colIdx(col0 + 1);
}
