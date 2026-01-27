/**
 * @file Selection format flags selector
 *
 * Computes "mixed" formatting flags (bold/italic/underline/strike/wrap) for a selected range.
 * This is used to render toolbar/panel states for multi-cell selections.
 */

import type { CellRange } from "@oxen/xlsx/domain/cell/address";
import type { XlsxAlignment, XlsxStyleSheet } from "@oxen/xlsx/domain/style/types";
import type { XlsxWorksheet } from "@oxen/xlsx/domain/workbook";
import { resolveMergedCellXfFromStyleId } from "./cell-xf";

export type MixedBoolean = { readonly mixed: false; readonly value: boolean } | { readonly mixed: true };
export type MixedValue<T> = { readonly mixed: false; readonly value: T } | { readonly mixed: true };

export type SelectionFormatFlags = {
  readonly bold: MixedBoolean;
  readonly italic: MixedBoolean;
  readonly underline: MixedBoolean;
  readonly strikethrough: MixedBoolean;
  readonly wrapText: MixedBoolean;
  readonly horizontal: MixedValue<XlsxAlignment["horizontal"]>;
  readonly tooLarge: boolean;
};

type StyleFlags = {
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly strikethrough: boolean;
  readonly wrapText: boolean;
  readonly horizontal: XlsxAlignment["horizontal"];
};

function toMixedBoolean(value: boolean): MixedBoolean {
  return { mixed: false, value };
}

function toMixedValue<T>(value: T): MixedValue<T> {
  return { mixed: false, value };
}

function mixBoolean(current: MixedBoolean, next: boolean): MixedBoolean {
  if (current.mixed) {
    return current;
  }
  return current.value === next ? current : { mixed: true };
}

function mixValue<T>(current: MixedValue<T>, next: T): MixedValue<T> {
  if (current.mixed) {
    return current;
  }
  return current.value === next ? current : { mixed: true };
}

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

type Interval = { readonly start: number; readonly end: number };

function isFullyCoveredByIntervals(minValue: number, maxValue: number, intervals: readonly Interval[]): boolean {
  if (intervals.length === 0) {
    return false;
  }
  const sorted = [...intervals].sort((a, b) => a.start - b.start);
  const first = sorted[0];
  if (!first) {
    return false;
  }
  if (first.start > minValue) {
    return false;
  }

  const state = sorted.slice(1).reduce(
    (acc, interval) => {
      if (!acc.ok) {
        return acc;
      }
      if (interval.start > acc.end + 1) {
        return { ok: false, end: acc.end };
      }
      const end = Math.max(acc.end, interval.end);
      return { ok: true, end };
    },
    { ok: true, end: first.end },
  );

  return state.ok && state.end >= maxValue;
}

function collectColumnBaselineStyleIds(sheet: XlsxWorksheet, minCol: number, maxCol: number): ReadonlySet<number | undefined> {
  const styleIds = new Set<number>();
  const styledIntervals: Interval[] = [];

  for (const def of sheet.columns ?? []) {
    const defMin = def.min as number;
    const defMax = def.max as number;
    if (defMax < minCol || defMin > maxCol) {
      continue;
    }
    if (def.styleId === undefined) {
      continue;
    }
    styleIds.add(def.styleId as number);
    styledIntervals.push({ start: Math.max(defMin, minCol), end: Math.min(defMax, maxCol) });
  }

  const result = new Set<number | undefined>(styleIds);
  if (!isFullyCoveredByIntervals(minCol, maxCol, styledIntervals)) {
    result.add(undefined);
  }
  return result;
}

/**
 * Resolve selection format flags for a range.
 *
 * This avoids an O(rows×cols) scan by:
 * - Considering row-level styles for rows in the range
 * - Considering column-level styles only when some rows have no row style
 * - Considering explicit cell-level style overrides within the range
 *
 * If the computed cell count exceeds `maxCellsToAnalyze`, returns `tooLarge: true` and treats
 * all flags as mixed.
 */
export function resolveSelectionFormatFlags(params: {
  readonly sheet: XlsxWorksheet;
  readonly styles: XlsxStyleSheet;
  readonly range: CellRange;
  readonly maxCellsToAnalyze?: number;
}): SelectionFormatFlags {
  const maxCells = params.maxCellsToAnalyze ?? 5000;
  const bounds = getRangeBounds(params.range);
  const rowCount = bounds.maxRow - bounds.minRow + 1;
  const colCount = bounds.maxCol - bounds.minCol + 1;
  const cellCount = rowCount * colCount;

  if (cellCount > maxCells) {
    return {
      bold: { mixed: true },
      italic: { mixed: true },
      underline: { mixed: true },
      strikethrough: { mixed: true },
      wrapText: { mixed: true },
      horizontal: { mixed: true },
      tooLarge: true,
    };
  }

  const accumulator = {
    hasAny: false,
    bold: toMixedBoolean(false),
    italic: toMixedBoolean(false),
    underline: toMixedBoolean(false),
    strikethrough: toMixedBoolean(false),
    wrapText: toMixedBoolean(false),
    horizontal: toMixedValue<XlsxAlignment["horizontal"]>("general"),
  };

  const styleFlagsCache = new Map<number, StyleFlags>();
  const undefinedStyleFlags = { value: undefined as StyleFlags | undefined };

  const getStyleFlags = (styleIdValue: number | undefined): StyleFlags => {
    if (styleIdValue === undefined) {
      if (undefinedStyleFlags.value) {
        return undefinedStyleFlags.value;
      }
      const xf = resolveMergedCellXfFromStyleId(params.styles, undefined);
      const font = params.styles.fonts[xf.fontId] ?? params.styles.fonts[0]!;
      undefinedStyleFlags.value = {
        bold: font.bold === true,
        italic: font.italic === true,
        underline: font.underline !== undefined && font.underline !== "none",
        strikethrough: font.strikethrough === true,
        wrapText: xf.alignment?.wrapText === true,
        horizontal: xf.alignment?.horizontal ?? "general",
      };
      return undefinedStyleFlags.value;
    }

    const cached = styleFlagsCache.get(styleIdValue);
    if (cached) {
      return cached;
    }
    const xf = resolveMergedCellXfFromStyleId(params.styles, styleIdValue);
    const font = params.styles.fonts[xf.fontId] ?? params.styles.fonts[0]!;
    const computed: StyleFlags = {
      bold: font.bold === true,
      italic: font.italic === true,
      underline: font.underline !== undefined && font.underline !== "none",
      strikethrough: font.strikethrough === true,
      wrapText: xf.alignment?.wrapText === true,
      horizontal: xf.alignment?.horizontal ?? "general",
    };
    styleFlagsCache.set(styleIdValue, computed);
    return computed;
  };

  const incorporateStyleFlags = (flags: StyleFlags): void => {
    if (!accumulator.hasAny) {
      accumulator.hasAny = true;
      accumulator.bold = toMixedBoolean(flags.bold);
      accumulator.italic = toMixedBoolean(flags.italic);
      accumulator.underline = toMixedBoolean(flags.underline);
      accumulator.strikethrough = toMixedBoolean(flags.strikethrough);
      accumulator.wrapText = toMixedBoolean(flags.wrapText);
      accumulator.horizontal = toMixedValue(flags.horizontal);
      return;
    }

    accumulator.bold = mixBoolean(accumulator.bold, flags.bold);
    accumulator.italic = mixBoolean(accumulator.italic, flags.italic);
    accumulator.underline = mixBoolean(accumulator.underline, flags.underline);
    accumulator.strikethrough = mixBoolean(accumulator.strikethrough, flags.strikethrough);
    accumulator.wrapText = mixBoolean(accumulator.wrapText, flags.wrapText);
    accumulator.horizontal = mixValue(accumulator.horizontal, flags.horizontal);
  };

  const incorporateStyleId = (styleIdValue: number | undefined): void => {
    incorporateStyleFlags(getStyleFlags(styleIdValue));
  };

  const scan = {
    rowStyleIds: new Set<number>(),
    rowsWithRowStyle: new Set<number>(),
    cellOverrideStyleIds: new Set<number>(),
    cellOverrideCount: 0,
  };

  for (const row of params.sheet.rows) {
    const rowNumber = row.rowNumber as number;
    if (rowNumber < bounds.minRow || rowNumber > bounds.maxRow) {
      continue;
    }
    const rowStyleIdValue = row.styleId as number | undefined;
    if (rowStyleIdValue !== undefined) {
      scan.rowStyleIds.add(rowStyleIdValue);
      scan.rowsWithRowStyle.add(rowNumber);
    }
    for (const cell of row.cells) {
      const colNumber = cell.address.col as number;
      if (colNumber < bounds.minCol || colNumber > bounds.maxCol) {
        continue;
      }
      const cellStyleIdValue = cell.styleId as number | undefined;
      if (cellStyleIdValue !== undefined) {
        scan.cellOverrideStyleIds.add(cellStyleIdValue);
        scan.cellOverrideCount += 1;
      }
    }
  }

  const { rowStyleIds, rowsWithRowStyle, cellOverrideStyleIds, cellOverrideCount } = scan;

  // If every cell in the selection has an explicit cell-level styleId, row/column baselines do not affect
  // the effective formatting for this selection.
  const fullyCoveredByCellOverrides = cellOverrideCount === cellCount;

  // If any row within the selection lacks row-level style, the effective style can depend on column styles.
  const includesRowsWithoutRowStyle = !fullyCoveredByCellOverrides && rowsWithRowStyle.size < rowCount;

  if (fullyCoveredByCellOverrides) {
    for (const styleIdValue of cellOverrideStyleIds) {
      incorporateStyleId(styleIdValue);
    }
  } else {
    for (const styleIdValue of rowStyleIds) {
      incorporateStyleId(styleIdValue);
    }
    if (includesRowsWithoutRowStyle) {
      const columnBaselineStyleIds = collectColumnBaselineStyleIds(params.sheet, bounds.minCol, bounds.maxCol);
      for (const styleIdValue of columnBaselineStyleIds) {
        incorporateStyleId(styleIdValue);
      }
    }
    for (const styleIdValue of cellOverrideStyleIds) {
      incorporateStyleId(styleIdValue);
    }
  }

  return {
    bold: accumulator.bold,
    italic: accumulator.italic,
    underline: accumulator.underline,
    strikethrough: accumulator.strikethrough,
    wrapText: accumulator.wrapText,
    horizontal: accumulator.horizontal,
    tooLarge: false,
  };
}
