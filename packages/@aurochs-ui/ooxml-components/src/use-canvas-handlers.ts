/**
 * @file OOXML canvas handler hook
 *
 * Wires EditorCanvas events to selection/drag/resize/rotate callbacks.
 * This is the shared interaction layer for OOXML editors (pptx, potx, etc.)
 * that sits between the generic EditorCanvas and format-specific logic.
 */

import { useCallback, useState } from "react";
import type { CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";

// =============================================================================
// Types
// =============================================================================

export type CanvasSelectionCallbacks = {
  readonly selectedIds: readonly string[];
  readonly onSelect: (id: string, addToSelection: boolean, toggle?: boolean) => void;
  readonly onSelectMultiple: (ids: readonly string[]) => void;
  readonly onClearSelection: () => void;
};

export type CanvasDragCallbacks = {
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartPendingMove?: (args: {
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
  }) => void;
  readonly onStartResize: (args: {
    readonly handle: ResizeHandlePosition;
    readonly startX: number;
    readonly startY: number;
    readonly aspectLocked: boolean;
  }) => void;
  readonly onStartPendingResize?: (args: {
    readonly handle: ResizeHandlePosition;
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
    readonly aspectLocked: boolean;
  }) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onStartPendingRotate?: (args: {
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
  }) => void;
  readonly onDoubleClick: (id: string) => void;
};

export type UseCanvasHandlersOptions = CanvasSelectionCallbacks & CanvasDragCallbacks & {
  /** Called when background is clicked and no other handler consumed the event */
  readonly onBackgroundClick?: () => void;
  /** Called when background pointer down occurs; return true to suppress marquee */
  readonly onBackgroundPointerDown?: (coords: CanvasPageCoords, e: React.PointerEvent) => boolean;
};

export type CanvasHandlers = {
  readonly handleItemPointerDown: (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly handleItemClick: (id: string, coords: CanvasPageCoords) => void;
  readonly handleItemDoubleClick: (id: string) => void;
  readonly handleItemContextMenu: (id: string, coords: CanvasPageCoords) => void;
  readonly handleCanvasPointerDown: (coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly handleCanvasClick: (coords: CanvasPageCoords) => void;
  readonly handleResizeStart: (handle: ResizeHandlePosition, coords: CanvasPageCoords, e: React.PointerEvent) => void;
  readonly handleRotateStart: (coords: CanvasPageCoords) => void;
  readonly handleMarqueeSelect: (
    result: { readonly itemIds: readonly string[]; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } },
    additive: boolean,
  ) => void;
  readonly contextMenu: { x: number; y: number } | null;
  readonly closeContextMenu: () => void;
};

// =============================================================================
// Hook
// =============================================================================

/**
 * Wires EditorCanvas events to OOXML editor selection/drag/resize/rotate callbacks.
 *
 * Extracts the common interaction patterns shared by pptx-editor and potx-editor:
 * - Item pointer down → select + start pending/direct move
 * - Item click → select
 * - Item double click → forward
 * - Item context menu → select + show context menu
 * - Canvas background click → clear selection (with override hook)
 * - Canvas background pointer down → override hook (for creation drag etc.)
 * - Resize/rotate handle start → pending vs direct dispatch
 * - Marquee → combine with existing selection
 * - Context menu state management
 */
export function useCanvasHandlers(options: UseCanvasHandlersOptions): CanvasHandlers {
  const {
    selectedIds,
    onSelect,
    onSelectMultiple,
    onClearSelection,
    onStartMove,
    onStartPendingMove,
    onStartResize,
    onStartPendingResize,
    onStartRotate,
    onStartPendingRotate,
    onDoubleClick,
    onBackgroundClick,
    onBackgroundPointerDown,
  } = options;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      if (!selectedIds.includes(id)) {
        onSelect(id, coords.addToSelection, coords.toggle);
      }

      if (onStartPendingMove) {
        onStartPendingMove({
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
        });
      } else {
        onStartMove(coords.pageX, coords.pageY);
      }
    },
    [selectedIds, onSelect, onStartMove, onStartPendingMove],
  );

  const handleItemClick = useCallback(
    (id: string, coords: CanvasPageCoords) => {
      onSelect(id, coords.addToSelection, coords.toggle);
    },
    [onSelect],
  );

  const handleItemDoubleClick = useCallback(
    (id: string) => {
      onDoubleClick(id);
    },
    [onDoubleClick],
  );

  const handleItemContextMenu = useCallback(
    (id: string, coords: CanvasPageCoords) => {
      if (!selectedIds.includes(id)) {
        onSelect(id, false);
      }
      setContextMenu({ x: coords.clientX, y: coords.clientY });
    },
    [selectedIds, onSelect],
  );

  const handleCanvasPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (onBackgroundPointerDown) {
        const consumed = onBackgroundPointerDown(coords, e);
        if (consumed) return;
      }
    },
    [onBackgroundPointerDown],
  );

  const handleCanvasClick = useCallback(
    (coords: CanvasPageCoords) => {
      if (onBackgroundClick) {
        onBackgroundClick();
        return;
      }
      onClearSelection();
    },
    [onBackgroundClick, onClearSelection],
  );

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (onStartPendingResize) {
        onStartPendingResize({
          handle,
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
          aspectLocked: e.shiftKey,
        });
      } else {
        onStartResize({ handle, startX: coords.pageX, startY: coords.pageY, aspectLocked: e.shiftKey });
      }
    },
    [onStartResize, onStartPendingResize],
  );

  const handleRotateStart = useCallback(
    (coords: CanvasPageCoords) => {
      if (onStartPendingRotate) {
        onStartPendingRotate({
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
        });
      } else {
        onStartRotate(coords.pageX, coords.pageY);
      }
    },
    [onStartRotate, onStartPendingRotate],
  );

  const handleMarqueeSelect = useCallback(
    (
      result: { readonly itemIds: readonly string[]; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } },
      additive: boolean,
    ) => {
      const { itemIds } = result;

      if (itemIds.length === 0) {
        if (!additive) onClearSelection();
        return;
      }

      if (additive) {
        const combinedIds = [...selectedIds];
        for (const id of itemIds) {
          if (!combinedIds.includes(id)) combinedIds.push(id);
        }
        onSelectMultiple(combinedIds);
      } else {
        onSelectMultiple(itemIds);
      }
    },
    [selectedIds, onSelectMultiple, onClearSelection],
  );

  const closeContextMenu = useCallback(() => setContextMenu(null), []);

  return {
    handleItemPointerDown,
    handleItemClick,
    handleItemDoubleClick,
    handleItemContextMenu,
    handleCanvasPointerDown,
    handleCanvasClick,
    handleResizeStart,
    handleRotateStart,
    handleMarqueeSelect,
    contextMenu,
    closeContextMenu,
  };
}
