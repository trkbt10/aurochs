import type { CellAddress } from "../../../xlsx/domain/cell/address";
import { colIdx, rowIdx } from "../../../xlsx/domain/types";
import type { createSheetLayout } from "../../selectors/sheet-layout";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";

type Layout = ReturnType<typeof createSheetLayout>;

type GridMetrics = {
  readonly rowCount: number;
  readonly colCount: number;
};

function clampIndex(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function hitTestCellFromPointerEvent(params: {
  readonly e: PointerEvent;
  readonly container: HTMLElement;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly layout: Layout;
  readonly metrics: GridMetrics;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
}): CellAddress {
  const { e, container, scrollLeft, scrollTop, layout, metrics, normalizedMerges } = params;

  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const sheetX = scrollLeft + x;
  const sheetY = scrollTop + y;

  const col0 = layout.cols.findIndexAtOffset(sheetX);
  const row0 = layout.rows.findIndexAtOffset(sheetY);

  const clampedCol0 = clampIndex(col0, 0, metrics.colCount - 1);
  const clampedRow0 = clampIndex(row0, 0, metrics.rowCount - 1);

  const address: CellAddress = {
    col: colIdx(clampedCol0 + 1),
    row: rowIdx(clampedRow0 + 1),
    colAbsolute: false,
    rowAbsolute: false,
  };

  if (normalizedMerges.length === 0) {
    return address;
  }

  const merge = findMergeForCell(normalizedMerges, address);
  return merge ? merge.range.end : address;
}

