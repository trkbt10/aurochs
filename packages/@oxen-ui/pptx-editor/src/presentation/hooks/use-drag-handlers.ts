/**
 * @file Drag handlers hook
 *
 * Handles move, resize, and rotate operations with snapping support.
 */

import { useCallback, useEffect, type RefObject } from "react";
import type { Slide } from "@oxen/pptx/domain";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px, deg } from "@oxen/ooxml/domain/units";
import type { DragState, SelectionState } from "../../context/slide/state";
import type { PresentationEditorAction } from "../../context/presentation/editor/types";
import type { ViewportTransform } from "@oxen/pptx-render/svg-viewport";
import { screenToSlideCoords } from "@oxen/pptx-render/svg-viewport";
import { snapValue } from "../../slide-canvas/canvas-controls";

export type UseDragHandlersParams = {
  readonly drag: DragState;
  readonly selection: SelectionState;
  readonly slide: Slide | undefined;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly canvasRef: RefObject<HTMLDivElement | null>;
  readonly snapEnabled: boolean;
  readonly snapStep: number;
  readonly dispatch: (action: PresentationEditorAction) => void;
  /** Viewport transform for coordinate conversion */
  readonly viewport?: ViewportTransform;
  /** Ruler thickness for coordinate offset */
  readonly rulerThickness?: number;
};

type Delta = { readonly dx: number; readonly dy: number };

function calculateMoveDelta(
  dx: number,
  dy: number,
  drag: DragState,
  selection: SelectionState,
  snapEnabled: boolean,
  snapStep: number,
): Delta {
  if (!snapEnabled || snapStep <= 0 || drag.type !== "move") {
    return { dx, dy };
  }

  const primaryId = selection.primaryId ?? drag.shapeIds[0];
  const initial = drag.initialBounds.get(primaryId);
  if (!initial) {
    return { dx, dy };
  }

  const targetX = (initial.x as number) + dx;
  const targetY = (initial.y as number) + dy;
  const snappedX = snapValue(targetX, snapStep);
  const snappedY = snapValue(targetY, snapStep);

  return { dx: snappedX - (initial.x as number), dy: snappedY - (initial.y as number) };
}

function calculateResizeDelta(dx: number, dy: number, drag: DragState, snapEnabled: boolean, snapStep: number): Delta {
  if (!snapEnabled || snapStep <= 0 || drag.type !== "resize") {
    return { dx, dy };
  }

  const bounds = drag.combinedBounds;
  if (!bounds) {
    return { dx, dy };
  }

  const baseX = bounds.x as number;
  const baseY = bounds.y as number;
  const baseWidth = bounds.width as number;
  const baseHeight = bounds.height as number;
  const handle = drag.handle;

  const eastEdge = handle.includes("e") ? snapValue(baseX + baseWidth + dx, snapStep) : baseX + baseWidth + dx;
  const westEdge = handle.includes("w") ? snapValue(baseX + dx, snapStep) : baseX + dx;
  const southEdge = handle.includes("s") ? snapValue(baseY + baseHeight + dy, snapStep) : baseY + baseHeight + dy;
  const northEdge = handle.includes("n") ? snapValue(baseY + dy, snapStep) : baseY + dy;

  const snappedDx = calculateSnappedDx(handle, westEdge, eastEdge, baseX, baseWidth, dx);
  const snappedDy = calculateSnappedDy(handle, northEdge, southEdge, baseY, baseHeight, dy);

  return { dx: snappedDx, dy: snappedDy };
}

function calculateSnappedDx(
  handle: string,
  westEdge: number,
  eastEdge: number,
  baseX: number,
  baseWidth: number,
  dx: number,
): number {
  if (handle.includes("w")) {
    return westEdge - baseX;
  }
  if (handle.includes("e")) {
    return eastEdge - (baseX + baseWidth);
  }
  return dx;
}

function calculateSnappedDy(
  handle: string,
  northEdge: number,
  southEdge: number,
  baseY: number,
  baseHeight: number,
  dy: number,
): number {
  if (handle.includes("n")) {
    return northEdge - baseY;
  }
  if (handle.includes("s")) {
    return southEdge - (baseY + baseHeight);
  }
  return dy;
}

/**
 * Hook for handling drag operations (move, resize, rotate) with snapping.
 */
export function useDragHandlers({
  drag,
  selection,
  slide,
  width,
  height,
  canvasRef,
  snapEnabled,
  snapStep,
  dispatch,
  viewport,
  rulerThickness = 0,
}: UseDragHandlersParams): void {
  const getMoveDelta = useCallback(
    (dx: number, dy: number): Delta => calculateMoveDelta(dx, dy, drag, selection, snapEnabled, snapStep),
    [drag, selection, snapEnabled, snapStep],
  );

  const getResizeDelta = useCallback(
    (dx: number, dy: number): Delta => calculateResizeDelta(dx, dy, drag, snapEnabled, snapStep),
    [drag, snapEnabled, snapStep],
  );

  useEffect(() => {
    if (drag.type === "idle" || !slide) {
      return;
    }

    const handlePointerMove = (e: PointerEvent): void => {
      const container = canvasRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const vp = viewport ?? { translateX: 0, translateY: 0, scale: 1 };
      const coords = screenToSlideCoords(e.clientX, e.clientY, rect, vp, rulerThickness);

      if (drag.type === "move") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        const snapped = getMoveDelta(deltaX, deltaY);
        dispatch({ type: "PREVIEW_MOVE", dx: px(snapped.dx), dy: px(snapped.dy) });
      } else if (drag.type === "resize") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        const snapped = getResizeDelta(deltaX, deltaY);
        dispatch({ type: "PREVIEW_RESIZE", dx: px(snapped.dx), dy: px(snapped.dy) });
      } else if (drag.type === "rotate") {
        const centerX = drag.centerX as number;
        const centerY = drag.centerY as number;
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI);
        dispatch({ type: "PREVIEW_ROTATE", currentAngle: deg(currentAngle) });
      }
    };

    const handlePointerUp = (): void => {
      dispatch({ type: "COMMIT_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, slide, width, height, dispatch, getMoveDelta, getResizeDelta, canvasRef, viewport, rulerThickness]);
}
