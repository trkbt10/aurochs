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

export function startRangeSelectPointerDrag(params: {
  readonly pointerId: number;
  readonly captureTarget: HTMLElement;
  readonly container: HTMLElement;
  readonly startAddress: CellAddress;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly layout: Layout;
  readonly metrics: GridMetrics;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
}): () => void {
  const { pointerId, captureTarget, container, startAddress, scrollLeft, scrollTop, layout, metrics, normalizedMerges, dispatch } = params;

  safeSetPointerCapture(captureTarget, pointerId);

  const startMerge = normalizedMerges.length > 0 ? findMergeForCell(normalizedMerges, startAddress) : undefined;
  const startCell = startMerge ? startMerge.origin : startAddress;
  const currentCell = startMerge ? startMerge.range.end : startAddress;

  dispatch({ type: "START_RANGE_SELECT", startCell });
  dispatch({ type: "PREVIEW_RANGE_SELECT", currentCell });

  const onMove = (e: PointerEvent): void => {
    const address = hitTestCellFromPointerEvent({ e, container, scrollLeft, scrollTop, layout, metrics, normalizedMerges });
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

