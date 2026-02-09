/**
 * @file Drag handlers hook
 *
 * Handles move, resize, and rotate operations with snapping support.
 * Also handles pending drag states with threshold detection.
 */

import { useCallback, useEffect, type RefObject } from "react";
import type { Slide } from "@aurochs-office/pptx/domain";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { DragState, SelectionState } from "../../context/slide/state";
import type { PresentationEditorAction } from "../../context/presentation/editor/types";
import type { ViewportTransform } from "@aurochs-renderer/pptx/svg-viewport";
import { screenToSlideCoords } from "@aurochs-renderer/pptx/svg-viewport";
import { snapValue } from "../../slide-canvas/canvas-controls";
import { isDragThresholdExceeded } from "../../drag";

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

type CalculateMoveDeltaOptions = {
  readonly dx: number;
  readonly dy: number;
  readonly drag: DragState;
  readonly selection: SelectionState;
  readonly snapEnabled: boolean;
  readonly snapStep: number;
};

function calculateMoveDelta({ dx, dy, drag, selection, snapEnabled, snapStep }: CalculateMoveDeltaOptions): Delta {
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

type CalculateResizeDeltaOptions = {
  readonly dx: number;
  readonly dy: number;
  readonly drag: DragState;
  readonly snapEnabled: boolean;
  readonly snapStep: number;
};

function calculateResizeDelta({ dx, dy, drag, snapEnabled, snapStep }: CalculateResizeDeltaOptions): Delta {
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

  const snappedDx = calculateSnappedDx({ handle, westEdge, eastEdge, baseX, baseWidth, dx });
  const snappedDy = calculateSnappedDy({ handle, northEdge, southEdge, baseY, baseHeight, dy });

  return { dx: snappedDx, dy: snappedDy };
}

type CalculateSnappedDxOptions = {
  readonly handle: string;
  readonly westEdge: number;
  readonly eastEdge: number;
  readonly baseX: number;
  readonly baseWidth: number;
  readonly dx: number;
};

function calculateSnappedDx({ handle, westEdge, eastEdge, baseX, baseWidth, dx }: CalculateSnappedDxOptions): number {
  if (handle.includes("w")) {
    return westEdge - baseX;
  }
  if (handle.includes("e")) {
    return eastEdge - (baseX + baseWidth);
  }
  return dx;
}

type CalculateSnappedDyOptions = {
  readonly handle: string;
  readonly northEdge: number;
  readonly southEdge: number;
  readonly baseY: number;
  readonly baseHeight: number;
  readonly dy: number;
};

function calculateSnappedDy({
  handle,
  northEdge,
  southEdge,
  baseY,
  baseHeight,
  dy,
}: CalculateSnappedDyOptions): number {
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
    (dx: number, dy: number): Delta => calculateMoveDelta({ dx, dy, drag, selection, snapEnabled, snapStep }),
    [drag, selection, snapEnabled, snapStep],
  );

  const getResizeDelta = useCallback(
    (dx: number, dy: number): Delta => calculateResizeDelta({ dx, dy, drag, snapEnabled, snapStep }),
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
      const coords = screenToSlideCoords({
        clientX: e.clientX,
        clientY: e.clientY,
        svgRect: rect,
        viewport: vp,
        rulerThickness,
      });

      // Handle pending states - check threshold and transition to active
      if (drag.type === "pending-move") {
        if (isDragThresholdExceeded({ startX: drag.startClientX, startY: drag.startClientY, currentX: e.clientX, currentY: e.clientY })) {
          dispatch({ type: "CONFIRM_MOVE" });
        }
        return;
      }

      if (drag.type === "pending-resize") {
        if (isDragThresholdExceeded({ startX: drag.startClientX, startY: drag.startClientY, currentX: e.clientX, currentY: e.clientY })) {
          dispatch({ type: "CONFIRM_RESIZE" });
        }
        return;
      }

      if (drag.type === "pending-rotate") {
        if (isDragThresholdExceeded({ startX: drag.startClientX, startY: drag.startClientY, currentX: e.clientX, currentY: e.clientY })) {
          dispatch({ type: "CONFIRM_ROTATE" });
        }
        return;
      }

      // Handle marquee selection
      if (drag.type === "marquee") {
        dispatch({ type: "UPDATE_MARQUEE", currentX: px(coords.x), currentY: px(coords.y) });
        return;
      }

      // Handle creation drag
      if (drag.type === "create") {
        dispatch({ type: "UPDATE_CREATE_DRAG", currentX: px(coords.x), currentY: px(coords.y) });
        return;
      }

      // Handle active drag states
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
      // Handle pending states - end without commit (just selection)
      if (drag.type === "pending-move" || drag.type === "pending-resize" || drag.type === "pending-rotate") {
        dispatch({ type: "END_DRAG" });
        return;
      }

      // Handle marquee selection
      if (drag.type === "marquee") {
        dispatch({ type: "END_MARQUEE" });
        return;
      }

      // Handle creation drag
      if (drag.type === "create") {
        dispatch({ type: "END_CREATE_DRAG" });
        return;
      }

      // Handle active drag states
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
