/**
 * @file Formula-mode range drag controller
 *
 * Pointer-based drag handler for expanding a cell reference into a range reference
 * while editing a formula. The user clicks a cell (inserting a reference) and then
 * drags to expand it to a range like A1:C3.
 */

import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { XlsxEditorAction } from "../../context/workbook/editor/types";
import type { createSheetLayout } from "../../selectors/sheet-layout";
import type { NormalizedMergeRange } from "../../sheet/merge-range";
import { buildReferenceText } from "../../formula-edit/formula-reference-insert";
import { hitTestCellFromPointerEvent } from "./cell-hit-test";
import { safeReleasePointerCapture, safeSetPointerCapture } from "./pointer-capture";
import { startWindowPointerDrag } from "./window-pointer-drag";

type Layout = ReturnType<typeof createSheetLayout>;

type GridMetrics = {
  readonly rowCount: number;
  readonly colCount: number;
};

/**
 * Start a formula-mode range drag that expands the just-inserted cell reference
 * into a range reference as the user drags.
 *
 * On move: rebuilds the reference text for {startAddress:currentCell} and dispatches
 * UPDATE_EDIT_TEXT to replace the reference in the editing text.
 *
 * On up: cleanup only (the final text is already dispatched on the last move).
 */
export function startFormulaRangeDrag(params: {
  readonly pointerId: number;
  readonly captureTarget: HTMLElement;
  readonly container: HTMLElement;
  readonly startAddress: CellAddress;
  readonly editingSheetName: string;
  readonly currentSheetName: string;
  readonly editingText: string;
  readonly refInsertOffset: number;
  readonly refLength: number;
  readonly scrollLeft: number;
  readonly scrollTop: number;
  readonly layout: Layout;
  readonly metrics: GridMetrics;
  readonly zoom: number;
  readonly normalizedMerges: readonly NormalizedMergeRange[];
  readonly dispatch: (action: XlsxEditorAction) => void;
}): () => void {
  const {
    pointerId,
    captureTarget,
    container,
    startAddress,
    editingSheetName,
    currentSheetName,
    scrollLeft,
    scrollTop,
    layout,
    metrics,
    zoom,
    normalizedMerges,
    dispatch,
  } = params;

  let currentText = params.editingText;
  let currentRefOffset = params.refInsertOffset;
  let currentRefLength = params.refLength;

  safeSetPointerCapture(captureTarget, pointerId);

  const onMove = (e: PointerEvent): void => {
    const address = hitTestCellFromPointerEvent({
      e,
      container,
      scrollLeft,
      scrollTop,
      layout,
      metrics,
      normalizedMerges,
      zoom,
    });

    const newRefText = buildReferenceText(
      { start: startAddress, end: address },
      editingSheetName,
      currentSheetName,
    );

    const before = currentText.slice(0, currentRefOffset);
    const after = currentText.slice(currentRefOffset + currentRefLength);
    const newText = before + newRefText + after;
    const newCaretOffset = currentRefOffset + newRefText.length;

    // Update tracking state for subsequent moves
    currentText = newText;
    currentRefLength = newRefText.length;

    dispatch({
      type: "UPDATE_EDIT_TEXT",
      text: newText,
      caretOffset: newCaretOffset,
      selectionEnd: newCaretOffset,
    });
  };

  const onUp = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
  };

  const onCancel = (): void => {
    safeReleasePointerCapture(captureTarget, pointerId);
  };

  const cleanupWindow = startWindowPointerDrag({ pointerId, onMove, onUp, onCancel });
  return () => {
    cleanupWindow();
    safeReleasePointerCapture(captureTarget, pointerId);
  };
}
