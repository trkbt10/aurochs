/**
 * @file Creation drag hook
 *
 * Extracts the creation drag logic (pointerdown → pointermove → pointerup)
 * from SvgEditorCanvas into a reusable hook for both pptx-editor and potx-editor.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { EditorCanvasHandle, CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import type { CreationMode } from "./creation-types";
import type { ShapeBounds } from "./shape-factory";
import { createBoundsFromDrag } from "./shape-factory";

// =============================================================================
// Types
// =============================================================================

type CreationDrag = {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
};

export type UseCreationDragOptions = {
  /** Current creation mode */
  readonly creationMode: CreationMode;
  /** Ref to the EditorCanvas for coordinate conversion */
  readonly canvasRef: RefObject<EditorCanvasHandle | null>;
  /** Called when a drag completes with valid bounds */
  readonly onCreateFromDrag?: (bounds: ShapeBounds) => void;
  /** Optional predicate to identify path modes (pptx-editor specific) */
  readonly isPathMode?: (mode: CreationMode) => boolean;
  /** Whether text editing is active (suppresses creation drag) */
  readonly isTextEditing?: boolean;
  /** Called when text edit should be cancelled */
  readonly onTextEditCancel?: () => void;
  /** Called on background click when in creation mode (click-to-create) */
  readonly onClickCreate?: (x: number, y: number) => void;
  /** Called on background click when not in creation mode to clear selection */
  readonly onClearSelection?: () => void;
};

export type UseCreationDragResult = {
  /** Current creation drag state (null if not dragging) */
  readonly creationDrag: CreationDrag | null;
  /** Computed creation rectangle for rendering the drag preview */
  readonly creationRect: { x: number; y: number; width: number; height: number } | null;
  /** Handler for background pointer down — returns true if the event was consumed */
  readonly handleBackgroundPointerDown: (coords: CanvasPageCoords, e: React.PointerEvent) => boolean;
  /** Handler for background click */
  readonly handleBackgroundClick: () => void;
};

// =============================================================================
// Hook
// =============================================================================

/** Hook for handling creation mode drag-to-create interactions. */
export function useCreationDrag({
  creationMode,
  canvasRef,
  onCreateFromDrag,
  isPathMode,
  isTextEditing,
  onTextEditCancel,
  onClickCreate,
  onClearSelection,
}: UseCreationDragOptions): UseCreationDragResult {
  const [creationDrag, setCreationDrag] = useState<CreationDrag | null>(null);
  const creationDragRef = useRef<CreationDrag | null>(null);
  const ignoreNextClickRef = useRef(false);

  const isCreationActive = creationMode.type !== "select" && !(isPathMode?.(creationMode) ?? false);

  const handleBackgroundPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent): boolean => {
      if (isTextEditing) {
        onTextEditCancel?.();
        e.preventDefault();
        return true;
      }

      if (isCreationActive) {
        e.preventDefault();
        const next: CreationDrag = {
          startX: coords.pageX,
          startY: coords.pageY,
          currentX: coords.pageX,
          currentY: coords.pageY,
        };
        creationDragRef.current = next;
        setCreationDrag(next);
        ignoreNextClickRef.current = false;
        return true;
      }

      return false;
    },
    [isCreationActive, isTextEditing, onTextEditCancel],
  );

  const handleBackgroundClick = useCallback(() => {
    if (ignoreNextClickRef.current) {
      ignoreNextClickRef.current = false;
      return;
    }

    if (isTextEditing) {
      onTextEditCancel?.();
      return;
    }

    if (isCreationActive && onClickCreate) {
      onClickCreate(0, 0);
      return;
    }

    onClearSelection?.();
  }, [isTextEditing, onTextEditCancel, isCreationActive, onClickCreate, onClearSelection]);

  // Finalize creation drag — only when drag exceeds 2px threshold
  const finalizeCreationDrag = useCallback(
    (current: CreationDrag) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      if (dx <= 2 && dy <= 2) {
        return;
      }
      ignoreNextClickRef.current = true;
      if (onCreateFromDrag) {
        onCreateFromDrag(
          createBoundsFromDrag({
            startX: px(current.startX),
            startY: px(current.startY),
            endX: px(current.currentX),
            endY: px(current.currentY),
          }),
        );
      }
    },
    [onCreateFromDrag],
  );

  // Global pointermove/pointerup/pointercancel listeners
  useEffect(() => {
    if (!creationDrag) {
      return;
    }

    const handleMove = (e: PointerEvent) => {
      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {
        return;
      }
      const next: CreationDrag = { ...creationDragRef.current!, currentX: page.pageX, currentY: page.pageY };
      creationDragRef.current = next;
      setCreationDrag(next);
    };

    const handleUp = () => {
      const current = creationDragRef.current;
      creationDragRef.current = null;
      setCreationDrag(null);
      if (current) {
        finalizeCreationDrag(current);
      }
    };

    const handleCancel = () => {
      creationDragRef.current = null;
      setCreationDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [creationDrag, finalizeCreationDrag, canvasRef]);

  const creationRect = useMemo(() => {
    if (!creationDrag) {
      return null;
    }
    return {
      x: Math.min(creationDrag.startX, creationDrag.currentX),
      y: Math.min(creationDrag.startY, creationDrag.currentY),
      width: Math.abs(creationDrag.currentX - creationDrag.startX),
      height: Math.abs(creationDrag.currentY - creationDrag.startY),
    };
  }, [creationDrag]);

  return { creationDrag, creationRect, handleBackgroundPointerDown, handleBackgroundClick };
}
