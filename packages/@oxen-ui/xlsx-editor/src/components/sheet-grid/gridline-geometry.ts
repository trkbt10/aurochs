/**
 * @file Gridline geometry for the sheet grid
 *
 * Produces SVG line segments for spreadsheet gridlines in the current viewport, and suppresses
 * internal gridlines inside merged ranges to match typical spreadsheet behavior.
 */

import { colIdx, rowIdx } from "@oxen/xlsx/domain/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";

export type GridLineSegment = {
  readonly key: string;
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
};

type SegmentAccumulator = { start: number; end: number } | null;

function mergeIfContiguous(
  active: SegmentAccumulator,
  nextStart: number,
  nextEnd: number,
): SegmentAccumulator {
  if (!active) {
    return { start: nextStart, end: nextEnd };
  }
  if (Math.abs(active.end - nextStart) < 0.001) {
    return { start: active.start, end: nextEnd };
  }
  return null;
}

function getMergeKeyForCell(
  merges: readonly NormalizedMergeRange[],
  cache: Map<string, string | null>,
  col0: number,
  row0: number,
): string | undefined {
  if (merges.length === 0) {
    return undefined;
  }
  const key = `${col0}:${row0}`;
  if (cache.has(key)) {
    return cache.get(key) ?? undefined;
  }
  const addr = { col: colIdx(col0 + 1), row: rowIdx(row0 + 1), colAbsolute: false, rowAbsolute: false };
  const merge = findMergeForCell(merges, addr);
  cache.set(key, merge?.key ?? null);
  return merge?.key;
}

/**
 * Compute the gridline segments visible in the current viewport.
 *
 * The output is split into vertical and horizontal segments, already merged where contiguous.
 */
export function getVisibleGridLineSegments(params: {
  readonly rowRange: { readonly start: number; readonly end: number };
  readonly colRange: { readonly start: number; readonly end: number };
  readonly layout: ReturnType<typeof createSheetLayout>;
  readonly scrollTop: number;
  readonly scrollLeft: number;
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly rowCount: number;
  readonly colCount: number;
}): { readonly vertical: readonly GridLineSegment[]; readonly horizontal: readonly GridLineSegment[] } {
  const { rowRange, colRange, layout, scrollTop, scrollLeft, viewportWidth, viewportHeight, normalizedMerges, rowCount, colCount } = params;

  const mergeKeyCache = new Map<string, string | null>();
  const getMergeKey = (col0: number, row0: number): string | undefined => getMergeKeyForCell(normalizedMerges, mergeKeyCache, col0, row0);

  const vertical: GridLineSegment[] = [];
  const horizontal: GridLineSegment[] = [];

  for (let boundaryCol0 = colRange.start; boundaryCol0 <= colRange.end + 1; boundaryCol0 += 1) {
    const x = layout.cols.getBoundaryOffsetPx(boundaryCol0) - scrollLeft;
    if (x < -1 || x > viewportWidth + 1) {
      continue;
    }

    const state = { active: null as SegmentAccumulator };
    for (let row0 = rowRange.start; row0 <= rowRange.end; row0 += 1) {
      const y1 = layout.rows.getBoundaryOffsetPx(row0) - scrollTop;
      const y2 = layout.rows.getBoundaryOffsetPx(row0 + 1) - scrollTop;
      if (y2 < -1 || y1 > viewportHeight + 1) {
        continue;
      }

      const leftKey = boundaryCol0 > 0 ? getMergeKey(boundaryCol0 - 1, row0) : undefined;
	      const rightKey = boundaryCol0 < colCount ? getMergeKey(boundaryCol0, row0) : undefined;
	      const isInternalMergeBoundary = Boolean(leftKey && leftKey === rightKey);
	      if (isInternalMergeBoundary) {
	        if (state.active) {
	          vertical.push({ key: `v-${boundaryCol0}-${row0}-seg`, x1: x, y1: state.active.start, x2: x, y2: state.active.end });
	          state.active = null;
	        }
	        continue;
	      }

	      const merged = mergeIfContiguous(state.active, y1, y2);
	      if (merged) {
	        state.active = merged;
	        continue;
	      }
	      if (state.active) {
	        vertical.push({ key: `v-${boundaryCol0}-${row0}-seg`, x1: x, y1: state.active.start, x2: x, y2: state.active.end });
	      }
	      state.active = { start: y1, end: y2 };
	    }
	    if (state.active) {
	      vertical.push({ key: `v-${boundaryCol0}-end`, x1: x, y1: state.active.start, x2: x, y2: state.active.end });
	    }
	  }

  for (let boundaryRow0 = rowRange.start; boundaryRow0 <= rowRange.end + 1; boundaryRow0 += 1) {
    const y = layout.rows.getBoundaryOffsetPx(boundaryRow0) - scrollTop;
    if (y < -1 || y > viewportHeight + 1) {
      continue;
    }

    const state = { active: null as SegmentAccumulator };
    for (let col0 = colRange.start; col0 <= colRange.end; col0 += 1) {
      const x1 = layout.cols.getBoundaryOffsetPx(col0) - scrollLeft;
      const x2 = layout.cols.getBoundaryOffsetPx(col0 + 1) - scrollLeft;
      if (x2 < -1 || x1 > viewportWidth + 1) {
        continue;
      }

      const topKey = boundaryRow0 > 0 ? getMergeKey(col0, boundaryRow0 - 1) : undefined;
	      const bottomKey = boundaryRow0 < rowCount ? getMergeKey(col0, boundaryRow0) : undefined;
	      const isInternalMergeBoundary = Boolean(topKey && topKey === bottomKey);
	      if (isInternalMergeBoundary) {
	        if (state.active) {
	          horizontal.push({ key: `h-${boundaryRow0}-${col0}-seg`, x1: state.active.start, y1: y, x2: state.active.end, y2: y });
	          state.active = null;
	        }
	        continue;
	      }

	      const merged = mergeIfContiguous(state.active, x1, x2);
	      if (merged) {
	        state.active = merged;
	        continue;
	      }
	      if (state.active) {
	        horizontal.push({ key: `h-${boundaryRow0}-${col0}-seg`, x1: state.active.start, y1: y, x2: state.active.end, y2: y });
	      }
	      state.active = { start: x1, end: x2 };
	    }
	    if (state.active) {
	      horizontal.push({ key: `h-${boundaryRow0}-end`, x1: state.active.start, y1: y, x2: state.active.end, y2: y });
	    }
	  }

  return { vertical, horizontal };
}
