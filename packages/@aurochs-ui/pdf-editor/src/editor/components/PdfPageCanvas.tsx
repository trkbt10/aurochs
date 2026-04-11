/**
 * @file PdfPageCanvas - PDF editor canvas
 *
 * Thin wrapper around the shared EditorCanvas (editor-controls/canvas).
 * Translates EditorCanvas events to PDF-specific dispatch actions.
 *
 * Consumes the same EditorCanvas API as pptx-editor (symmetric usage):
 * - selectedIds + drag → internal selectedBounds computation
 * - onItemDragMove/End → global drag tracking by EditorCanvas
 * - onMarqueeSelect → multi-select via marquee
 * - showRotateHandle + onRotateStart/DragMove/DragEnd → rotation support
 * - onCanvasPointerDown → end text edit on background click
 */

import { useCallback, useMemo, useRef } from "react";
import type { PdfPage, PdfElementId } from "@aurochs/pdf";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type CanvasPageCoords,
} from "@aurochs-ui/editor-controls/canvas";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import type { SelectionState } from "@aurochs-ui/editor-core/selection";
import { isSelected } from "@aurochs-ui/editor-core/selection";
import type { DragState } from "@aurochs-ui/editor-core/drag-state";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ReactNode } from "react";
import { elementToSvgBounds } from "@aurochs-renderer/pdf/svg";

// =============================================================================
// Types
// =============================================================================

export type PdfPageCanvasProps = {
  readonly page: PdfPage;
  readonly pageIndex: number;
  readonly selection: SelectionState<PdfElementId>;
  readonly drag: DragState<PdfElementId>;
  readonly zoomMode: ZoomMode;
  readonly onZoomModeChange: (mode: ZoomMode) => void;
  readonly onDisplayZoomChange?: (zoom: number) => void;
  readonly showRulers?: boolean;
  readonly contentChildren: ReactNode;
  readonly viewportOverlay?: ReactNode;
  readonly isTextEditing?: boolean;
  // --- Selection ---
  readonly onSelect: (elementId: PdfElementId, addToSelection: boolean) => void;
  readonly onClearSelection: () => void;
  readonly onSelectMultiple: (elementIds: readonly PdfElementId[]) => void;
  // --- Move ---
  readonly onStartMove: (startX: number, startY: number, clientX: number, clientY: number) => void;
  readonly onConfirmMove: (clientX: number, clientY: number) => void;
  readonly onUpdateMove: (currentX: number, currentY: number) => void;
  readonly onEndMove: () => void;
  // --- Resize ---
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number) => void;
  readonly onUpdateResize: (currentX: number, currentY: number) => void;
  readonly onEndResize: () => void;
  // --- Rotate ---
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onUpdateRotate: (currentX: number, currentY: number) => void;
  readonly onEndRotate: () => void;
  // --- Other ---
  readonly onDoubleClick?: (elementId: PdfElementId) => void;
  readonly onEndTextEdit?: () => void;
};

// =============================================================================
// Component
// =============================================================================

/** PdfPageCanvas - PDF editor canvas wrapper around EditorCanvas. */
export function PdfPageCanvas({
  page,
  pageIndex,
  selection,
  drag,
  zoomMode,
  onZoomModeChange,
  onDisplayZoomChange,
  showRulers = true,
  contentChildren,
  viewportOverlay,
  isTextEditing = false,
  onSelect,
  onClearSelection,
  onSelectMultiple,
  onStartMove,
  onConfirmMove,
  onUpdateMove,
  onEndMove,
  onStartResize,
  onUpdateResize,
  onEndResize,
  onStartRotate,
  onUpdateRotate,
  onEndRotate,
  onDoubleClick,
  onEndTextEdit,
}: PdfPageCanvasProps) {
  const canvasRef = useRef<EditorCanvasHandle>(null);

  const elementBounds = useMemo(
    () =>
      page.elements.map((el, i) =>
        elementToSvgBounds({ element: el, elementIndex: i, pageIndex, pageHeight: page.height }),
      ),
    [page, pageIndex],
  );

  // --- Item events (unified with PPTX: select + start move) ---

  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (e.button !== 0) { return; }
      // End text editing when clicking a different element
      if (isTextEditing && onEndTextEdit) {
        onEndTextEdit();
      }
      const elementId = id as PdfElementId;
      if (!isSelected(selection, elementId)) {
        onSelect(elementId, coords.addToSelection);
      }
      onStartMove(coords.pageX, coords.pageY, coords.clientX, coords.clientY);
    },
    [selection, onSelect, onStartMove, isTextEditing, onEndTextEdit],
  );

  const handleItemDoubleClick = useCallback(
    (id: string) => {
      if (onDoubleClick) { onDoubleClick(id as PdfElementId); }
    },
    [onDoubleClick],
  );

  // --- Canvas events ---

  const handleCanvasPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (isTextEditing && onEndTextEdit) {
        onEndTextEdit();
        e.preventDefault(); // suppress marquee
      }
    },
    [isTextEditing, onEndTextEdit],
  );

  const handleCanvasClick = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  // --- Selection handles ---

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, coords: CanvasPageCoords) => {
      onStartResize(handle, coords.pageX, coords.pageY);
    },
    [onStartResize],
  );

  const handleRotateStart = useCallback(
    (coords: CanvasPageCoords) => {
      onStartRotate(coords.pageX, coords.pageY);
    },
    [onStartRotate],
  );

  // --- Global drag tracking (managed by EditorCanvas) ---

  const handleItemDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      switch (drag.type) {
        case "pending-move":
          onConfirmMove(coords.clientX, coords.clientY);
          break;
        case "move":
          onUpdateMove(coords.pageX, coords.pageY);
          break;
      }
    },
    [drag.type, onConfirmMove, onUpdateMove],
  );

  const handleItemDragEnd = useCallback(() => {
    onEndMove();
  }, [onEndMove]);

  const handleResizeDragMove = useCallback(
    (_handle: ResizeHandlePosition, coords: CanvasPageCoords) => {
      onUpdateResize(coords.pageX, coords.pageY);
    },
    [onUpdateResize],
  );

  const handleResizeDragEnd = useCallback(() => {
    onEndResize();
  }, [onEndResize]);

  const handleRotateDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      onUpdateRotate(coords.pageX, coords.pageY);
    },
    [onUpdateRotate],
  );

  const handleRotateDragEnd = useCallback(() => {
    onEndRotate();
  }, [onEndRotate]);

  // --- Marquee ---

  const handleMarqueeSelect = useCallback(
    (result: { readonly itemIds: readonly string[]; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } }, additive: boolean) => {
      const ids = result.itemIds as readonly PdfElementId[];
      if (ids.length === 0) {
        if (!additive) { onClearSelection(); }
        return;
      }
      if (additive) {
        const combined = [...selection.selectedIds];
        for (const id of ids) {
          if (!combined.includes(id)) { combined.push(id); }
        }
        onSelectMultiple(combined);
      } else {
        onSelectMultiple(ids);
      }
    },
    [selection.selectedIds, onSelectMultiple, onClearSelection],
  );

  return (
    <EditorCanvas
      ref={canvasRef}
      canvasWidth={page.width}
      canvasHeight={page.height}
      zoomMode={zoomMode}
      onZoomModeChange={onZoomModeChange}
      onDisplayZoomChange={onDisplayZoomChange}
      showRulers={showRulers}
      itemBounds={elementBounds}
      selectedIds={selection.selectedIds}
      primaryId={selection.primaryId}
      drag={drag}
      isInteracting={drag.type !== "idle"}
      isTextEditing={isTextEditing}
      showRotateHandle={true}
      onItemPointerDown={handleItemPointerDown}
      onItemDoubleClick={handleItemDoubleClick}
      onCanvasPointerDown={handleCanvasPointerDown}
      onCanvasClick={handleCanvasClick}
      onResizeStart={handleResizeStart}
      onRotateStart={handleRotateStart}
      onItemDragMove={handleItemDragMove}
      onItemDragEnd={handleItemDragEnd}
      onResizeDragMove={handleResizeDragMove}
      onResizeDragEnd={handleResizeDragEnd}
      onRotateDragMove={handleRotateDragMove}
      onRotateDragEnd={handleRotateDragEnd}
      onMarqueeSelect={handleMarqueeSelect}
      viewportOverlay={viewportOverlay}
    >
      {contentChildren}
    </EditorCanvas>
  );
}
