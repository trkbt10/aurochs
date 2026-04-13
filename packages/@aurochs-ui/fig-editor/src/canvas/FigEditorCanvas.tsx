/**
 * @file Fig editor canvas component
 *
 * The main editing surface for Figma-like .fig files.
 * Unlike PPTX's fixed-size slide canvas, this is an infinite canvas:
 * - No fixed background (no "paper")
 * - No viewport clamping (pan freely in any direction)
 * - Canvas size derived from actual node bounds (with padding)
 *
 * Composes:
 * - EditorCanvas (from editor-controls) for viewport, selection, interaction
 * - FigPageRenderer for React-based SVG rendering of the current page
 */

import { useRef, useMemo, useCallback, useState } from "react";
import type { EditorCanvasHandle, CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import { EditorCanvas } from "@aurochs-ui/editor-controls/canvas";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import type { FigNodeId, FigDesignNode } from "@aurochs/fig/domain";
import { useFigEditor } from "../context/FigEditorContext";
import { FigPageRenderer } from "./FigPageRenderer";
import { getPageNodeBounds } from "./interaction/bounds";
import { isSelectMode } from "../context/fig-editor/types";

// =============================================================================
// Canvas bounds computation
// =============================================================================

/** Minimum canvas size to prevent degenerate viewports */
const MIN_CANVAS_SIZE = 800;
/** Padding around content for breathing room */
const CANVAS_PADDING = 200;

/**
 * Compute canvas dimensions that enclose all nodes with padding.
 *
 * Unlike PPTX where canvas = slide size (fixed), the fig canvas
 * size is the bounding box of all content + padding.
 * This ensures fit-to-view works correctly for any page content.
 */
function computeCanvasBoundsFromNodes(nodes: readonly FigDesignNode[]): { width: number; height: number } {
  if (nodes.length === 0) {
    return { width: MIN_CANVAS_SIZE, height: MIN_CANVAS_SIZE };
  }

  const extremes = nodes.reduce(
    (acc, node) => {
      const right = node.transform.m02 + node.size.x;
      const bottom = node.transform.m12 + node.size.y;
      return {
        maxRight: Math.max(acc.maxRight, right),
        maxBottom: Math.max(acc.maxBottom, bottom),
      };
    },
    { maxRight: 0, maxBottom: 0 },
  );

  return {
    width: Math.max(MIN_CANVAS_SIZE, extremes.maxRight + CANVAS_PADDING),
    height: Math.max(MIN_CANVAS_SIZE, extremes.maxBottom + CANVAS_PADDING),
  };
}

/** Identity clamp — infinite canvas has no viewport boundaries */
const NO_CLAMP = (vp: { translateX: number; translateY: number; scale: number }) => vp;

// =============================================================================
// Pending drag threshold
// =============================================================================

/**
 * Minimum pixel distance before a pending move/resize/rotate becomes active.
 * Prevents accidental micro-drags on click.
 */
const DRAG_THRESHOLD = 3;

function exceedsThreshold(
  startClientX: number,
  startClientY: number,
  clientX: number,
  clientY: number,
): boolean {
  const dx = clientX - startClientX;
  const dy = clientY - startClientY;
  return Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Fig editor canvas.
 *
 * Provides the interactive editing surface with:
 * - Rendering of the active page's nodes
 * - Selection via click, multi-select, marquee
 * - Drag to move, resize, rotate
 * - Zoom and pan (unclamped — infinite canvas)
 */
export function FigEditorCanvas() {
  const {
    dispatch,
    document,
    activePage,
    nodeSelection,
    drag,
    creationMode,
    textEdit,
  } = useFigEditor();

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");

  // Compute item bounds for the canvas
  const itemBounds = useMemo(() => {
    if (!activePage) {
      return [];
    }
    return getPageNodeBounds(activePage.children);
  }, [activePage]);

  // Compute canvas size from actual content bounds
  const canvasSize = useMemo(
    () => computeCanvasBoundsFromNodes(activePage?.children ?? []),
    [activePage],
  );

  // =========================================================================
  // Item events
  // =========================================================================

  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, _e: React.PointerEvent) => {
      if (!isSelectMode(creationMode)) {
        return;
      }

      dispatch({
        type: "SELECT_NODE",
        nodeId: id as FigNodeId,
        addToSelection: coords.addToSelection,
        toggle: coords.toggle,
      });

      dispatch({
        type: "START_PENDING_MOVE",
        startX: coords.pageX,
        startY: coords.pageY,
        startClientX: coords.clientX,
        startClientY: coords.clientY,
      });
    },
    [dispatch, creationMode],
  );

  const handleItemClick = useCallback(
    (id: string, coords: CanvasPageCoords, _e: React.MouseEvent) => {
      dispatch({
        type: "SELECT_NODE",
        nodeId: id as FigNodeId,
        addToSelection: coords.addToSelection,
        toggle: coords.toggle,
      });
    },
    [dispatch],
  );

  const handleDoubleClick = useCallback(
    (id: string, _coords: CanvasPageCoords, _e: React.MouseEvent) => {
      const node = activePage?.children.find((n) => n.id === id);
      if (node?.type === "TEXT") {
        dispatch({ type: "ENTER_TEXT_EDIT", nodeId: id as FigNodeId });
      }
    },
    [dispatch, activePage],
  );

  // =========================================================================
  // Canvas (background) events
  // =========================================================================

  const handleCanvasPointerDown = useCallback(
    (_coords: CanvasPageCoords, _e: React.PointerEvent) => {
      dispatch({ type: "CLEAR_NODE_SELECTION" });
    },
    [dispatch],
  );

  const handleCanvasClick = useCallback(
    (_coords: CanvasPageCoords, _e: React.MouseEvent) => {
      dispatch({ type: "CLEAR_NODE_SELECTION" });
    },
    [dispatch],
  );

  // =========================================================================
  // Marquee selection
  // =========================================================================

  const handleMarqueeSelect = useCallback(
    (
      result: {
        readonly itemIds: readonly string[];
        readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
      },
      additive: boolean,
    ) => {
      if (result.itemIds.length > 0) {
        if (additive) {
          // Add to existing selection
          const existingIds = new Set(nodeSelection.selectedIds);
          const newIds = result.itemIds.filter((id) => !existingIds.has(id as FigNodeId));
          if (newIds.length > 0) {
            dispatch({
              type: "SELECT_MULTIPLE_NODES",
              nodeIds: [
                ...nodeSelection.selectedIds,
                ...newIds as FigNodeId[],
              ],
            });
          }
        } else {
          dispatch({
            type: "SELECT_MULTIPLE_NODES",
            nodeIds: result.itemIds as FigNodeId[],
            primaryId: result.itemIds[0] as FigNodeId,
          });
        }
      } else if (!additive) {
        dispatch({ type: "CLEAR_NODE_SELECTION" });
      }
    },
    [dispatch, nodeSelection.selectedIds],
  );

  // =========================================================================
  // Resize & rotate handle start
  // =========================================================================

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, coords: CanvasPageCoords, _e: React.PointerEvent) => {
      dispatch({
        type: "START_PENDING_RESIZE",
        handle,
        startX: coords.pageX,
        startY: coords.pageY,
        startClientX: coords.clientX,
        startClientY: coords.clientY,
        aspectLocked: false,
      });
    },
    [dispatch],
  );

  const handleRotateStart = useCallback(
    (coords: CanvasPageCoords, _e: React.PointerEvent) => {
      dispatch({
        type: "START_PENDING_ROTATE",
        startX: coords.pageX,
        startY: coords.pageY,
        startClientX: coords.clientX,
        startClientY: coords.clientY,
      });
    },
    [dispatch],
  );

  // =========================================================================
  // Global drag tracking (item move)
  // =========================================================================

  const handleItemDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      if (drag.type === "pending-move") {
        if (exceedsThreshold(drag.startClientX, drag.startClientY, coords.clientX, coords.clientY)) {
          dispatch({ type: "CONFIRM_MOVE" });
          dispatch({
            type: "PREVIEW_MOVE",
            dx: coords.pageX - drag.startX,
            dy: coords.pageY - drag.startY,
          });
        }
        return;
      }
      if (drag.type === "move") {
        dispatch({
          type: "PREVIEW_MOVE",
          dx: coords.pageX - drag.startX,
          dy: coords.pageY - drag.startY,
        });
      }
    },
    [dispatch, drag],
  );

  const handleItemDragEnd = useCallback(
    (_coords: CanvasPageCoords) => {
      if (drag.type === "move") {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, drag],
  );

  // =========================================================================
  // Global drag tracking (resize)
  // =========================================================================

  const handleResizeDragMove = useCallback(
    (_handle: ResizeHandlePosition, coords: CanvasPageCoords) => {
      if (drag.type === "pending-resize") {
        if (exceedsThreshold(drag.startClientX, drag.startClientY, coords.clientX, coords.clientY)) {
          dispatch({ type: "CONFIRM_RESIZE" });
          dispatch({
            type: "PREVIEW_RESIZE",
            dx: coords.pageX - drag.startX,
            dy: coords.pageY - drag.startY,
          });
        }
        return;
      }
      if (drag.type === "resize") {
        dispatch({
          type: "PREVIEW_RESIZE",
          dx: coords.pageX - drag.startX,
          dy: coords.pageY - drag.startY,
        });
      }
    },
    [dispatch, drag],
  );

  const handleResizeDragEnd = useCallback(
    (_handle: ResizeHandlePosition, _coords: CanvasPageCoords) => {
      if (drag.type === "resize") {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, drag],
  );

  // =========================================================================
  // Global drag tracking (rotate)
  // =========================================================================

  const handleRotateDragMove = useCallback(
    (coords: CanvasPageCoords) => {
      if (drag.type === "pending-rotate") {
        if (exceedsThreshold(drag.startClientX, drag.startClientY, coords.clientX, coords.clientY)) {
          dispatch({ type: "CONFIRM_ROTATE" });
          // Compute angle from center to pointer
          const centerX = (drag as { centerX?: number }).centerX ?? 0;
          const centerY = (drag as { centerY?: number }).centerY ?? 0;
          const angle = Math.atan2(coords.pageY - centerY, coords.pageX - centerX) * (180 / Math.PI);
          dispatch({ type: "PREVIEW_ROTATE", currentAngle: angle });
        }
        return;
      }
      if (drag.type === "rotate") {
        const centerX = (drag as { centerX?: number }).centerX ?? 0;
        const centerY = (drag as { centerY?: number }).centerY ?? 0;
        const angle = Math.atan2(coords.pageY - centerY, coords.pageX - centerX) * (180 / Math.PI);
        dispatch({ type: "PREVIEW_ROTATE", currentAngle: angle });
      }
    },
    [dispatch, drag],
  );

  const handleRotateDragEnd = useCallback(
    (_coords: CanvasPageCoords) => {
      if (drag.type === "rotate") {
        dispatch({ type: "COMMIT_DRAG" });
      } else {
        dispatch({ type: "END_DRAG" });
      }
    },
    [dispatch, drag],
  );

  // =========================================================================
  // Determine if rotate handle should show
  // =========================================================================

  // In Figma, frames cannot be rotated. Show rotate handle only for non-frame nodes.
  const showRotateHandle = useMemo(() => {
    if (nodeSelection.selectedIds.length === 0) return false;
    if (!activePage) return false;
    // If any selected node is a frame/component/symbol, hide rotate
    const frameTypes = new Set(["FRAME", "COMPONENT", "COMPONENT_SET", "SYMBOL"]);
    return !nodeSelection.selectedIds.some((id) => {
      const node = activePage.children.find((n) => n.id === id);
      return node && frameTypes.has(node.type);
    });
  }, [nodeSelection.selectedIds, activePage]);

  return (
    <EditorCanvas
      ref={canvasRef}
      canvasWidth={canvasSize.width}
      canvasHeight={canvasSize.height}
      clampFn={NO_CLAMP}
      zoomMode={zoomMode}
      onZoomModeChange={setZoomMode}
      itemBounds={itemBounds}
      selectedIds={nodeSelection.selectedIds}
      primaryId={nodeSelection.primaryId}
      drag={drag}
      isInteracting={drag.type !== "idle"}
      isTextEditing={textEdit.type === "active"}
      showRotateHandle={showRotateHandle}
      onItemPointerDown={handleItemPointerDown}
      onItemClick={handleItemClick}
      onItemDoubleClick={handleDoubleClick}
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
      enableMarquee={isSelectMode(creationMode)}
      onMarqueeSelect={handleMarqueeSelect}
    >
      {activePage && (
        <FigPageRenderer
          page={activePage}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          images={document.images}
          blobs={document._loaded?.blobs ?? []}
          symbolMap={document.components}
        />
      )}
    </EditorCanvas>
  );
}
