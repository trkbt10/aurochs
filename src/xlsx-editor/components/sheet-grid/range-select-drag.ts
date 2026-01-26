/**
 * @file Range selection drag controller
 *
 * Pointer-based drag handler for click-and-drag range selection within the sheet grid.
 * This is UI-only: it emits reducer actions based on pointer movement.
 */

import type { CellAddress } from "../../../xlsx/domain/cell/address";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import type { createSheetLayout } from "../../selectors/sheet-layout";
import { findMergeForCell, type NormalizedMergeRange } from "../../sheet/merge-range";
import { hitTestCellFromPointerEvent } from "./cell-hit-test";
import { safeReleasePointerCapture, safeSetPointerCapture } from "./pointer-capture";
import { startWindowPointerDrag } from "./window-pointer-drag";

type Layout = ReturnType<typeof createSheetLayout>;

type GridMetrics = {
  readonly rowCount: number;
  readonly colCount: number;
};

/**
 * Start a range selection drag sequence from `startAddress`.
 *
 * The initial START/PREVIEW uses merge-aware origin/end:
 * - If the pointer starts inside a merge, selection anchors at the merge origin and covers the merge range.
 * - Subsequent move events are hit-tested (merge-aware) and dispatched as PREVIEW updates.
 */
export function startRangeSelectPointerDrag(params: {
  readonly pointerId: number;
  readonly captureTarget: HTMLElement;
  readonly container: HTMLElement;
  readonly startAddress: CellAddress;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly layout: Layout;
  readonly metrics: GridMetrics;
  /** Display zoom factor (1 = 100%). */
  readonly zoom: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
}): () => void {
  const { pointerId, captureTarget, container, startAddress, scrollLeft, scrollTop, layout, metrics, zoom, normalizedMerges, dispatch } = params;

  if (!Number.isFinite(zoom) || zoom <= 0) {
    throw new Error(`startRangeSelectPointerDrag zoom must be a positive finite number: ${String(zoom)}`);
  }

  safeSetPointerCapture(captureTarget, pointerId);

  const startMerge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, startAddress) : undefined;
  const startCell = startMerge ? startMerge.origin : startAddress;
  const currentCell = startMerge ? startMerge.range.end : startAddress;

  dispatch({ type: "START_RANGE_SELECT", startCell });
  dispatch({ type: "PREVIEW_RANGE_SELECT", currentCell });

  const onMove = (e: PointerEvent): void => {
    const address = hitTestCellFromPointerEvent({ e, container, scrollLeft, scrollTop, layout, metrics, normalizedMerges, zoom });
    dispatch({ type: "PREVIEW_RANGE_SELECT", currentCell: address });
  };

  const onUp = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
    dispatch({ type: "END_RANGE_SELECT" });
  };

  const onCancel = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
    dispatch({ type: "END_RANGE_SELECT" });
  };

  const cleanupWindow = startWindowPointerDrag({ pointerId, onMove, onUp, onCancel });
  return () => {
    cleanupWindow();
    safeReleasePointerCapture(captureTarget, pointerId);
  };
}
