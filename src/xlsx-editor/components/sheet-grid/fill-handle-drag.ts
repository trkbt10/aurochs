import type { CellAddress, CellRange } from "../../../xlsx/domain/cell/address";
import { colIdx as colIdxFn, rowIdx as rowIdxFn } from "../../../xlsx/domain/types";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import type { createSheetLayout } from "../../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../../sheet/merge-range";
import { getRangeBounds } from "./selection-geometry";
import { safeReleasePointerCapture, safeSetPointerCapture } from "./pointer-capture";
import { startWindowPointerDrag } from "./window-pointer-drag";
import { hitTestCellFromPointerEvent } from "./cell-hit-test";

type Layout = ReturnType<typeof createSheetLayout>;

type GridMetrics = {
  readonly rowCount: number;
  readonly colCount: number;
};

function getDistanceOutside(value: number, min: number, max: number): number {
  if (value < min) {
    return min - value;
  }
  if (value > max) {
    return value - max;
  }
  return 0;
}

function computeFillTargetRange(baseRange: CellRange, target: CellAddress): CellRange {
  const sourceBounds = getRangeBounds(baseRange);
  const targetRow = target.row as number;
  const targetCol = target.col as number;

  const rowDist = getDistanceOutside(targetRow, sourceBounds.minRow, sourceBounds.maxRow);
  const colDist = getDistanceOutside(targetCol, sourceBounds.minCol, sourceBounds.maxCol);

  if (rowDist === 0 && colDist === 0) {
    return baseRange;
  }

  if (rowDist >= colDist) {
    const minRow = targetRow < sourceBounds.minRow ? targetRow : sourceBounds.minRow;
    const maxRow = targetRow > sourceBounds.maxRow ? targetRow : sourceBounds.maxRow;
    return {
      start: { col: colIdxFn(sourceBounds.minCol), row: rowIdxFn(minRow), colAbsolute: false, rowAbsolute: false },
      end: { col: colIdxFn(sourceBounds.maxCol), row: rowIdxFn(maxRow), colAbsolute: false, rowAbsolute: false },
    };
  }

  const minCol = targetCol < sourceBounds.minCol ? targetCol : sourceBounds.minCol;
  const maxCol = targetCol > sourceBounds.maxCol ? targetCol : sourceBounds.maxCol;
  return {
    start: { col: colIdxFn(minCol), row: rowIdxFn(sourceBounds.minRow), colAbsolute: false, rowAbsolute: false },
    end: { col: colIdxFn(maxCol), row: rowIdxFn(sourceBounds.maxRow), colAbsolute: false, rowAbsolute: false },
  };
}

export function startFillHandlePointerDrag(params: {
  readonly pointerId: number;
  readonly captureTarget: HTMLElement;
  readonly container: HTMLElement;
  readonly baseRange: CellRange;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly layout: Layout;
  readonly metrics: GridMetrics;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
}): () => void {
  const { pointerId, captureTarget, container, baseRange, scrollLeft, scrollTop, layout, metrics, normalizedMerges, dispatch } = params;

  safeSetPointerCapture(captureTarget, pointerId);
  dispatch({ type: "START_FILL_DRAG", sourceRange: baseRange });

  const onMove = (e: PointerEvent): void => {
    const address = hitTestCellFromPointerEvent({ e, container, scrollLeft, scrollTop, layout, metrics, normalizedMerges });
    dispatch({ type: "PREVIEW_FILL_DRAG", targetRange: computeFillTargetRange(baseRange, address) });
  };

  const onUp = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
    dispatch({ type: "COMMIT_FILL_DRAG" });
  };

  const onCancel = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
    dispatch({ type: "END_DRAG" });
    dispatch({ type: "SELECT_RANGE", range: baseRange });
  };

  const cleanupWindow = startWindowPointerDrag({ pointerId, onMove, onUp, onCancel });
  return () => {
    cleanupWindow();
    safeReleasePointerCapture(captureTarget, pointerId);
  };
}
