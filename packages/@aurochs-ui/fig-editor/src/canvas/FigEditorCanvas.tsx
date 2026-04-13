/**
 * @file Fig editor canvas component
 *
 * The main editing surface for Figma-like .fig files.
 * Unlike PPTX's fixed-size slide canvas, this is an infinite canvas:
 * - No fixed background (no "paper")
 * - No viewport clamping (pan freely in any direction)
 * - Canvas size derived from actual node bounds (with padding)
 *
 * Selection model (matching Figma):
 * - Single click selects the deepest (topmost z-order) node at the cursor.
 *   Clicking inside a frame selects the child element directly, not the
 *   frame. Clicking empty space inside a frame selects the frame itself.
 * - Double-click on TEXT nodes enters text editing mode.
 * - Click canvas background clears selection.
 * - Right-click shows context menu with copy/paste/duplicate/delete/reorder.
 *
 * Implementation: the entire node tree is flattened into absolute-coordinate
 * hit-area bounds (pre-order traversal). Children's hit areas sit above
 * their parents in the SVG z-stack, so the browser's native event dispatch
 * delivers the deepest node's ID on click.
 *
 * Composes:
 * - EditorCanvas (from editor-controls) for viewport, selection, interaction
 * - FigPageRenderer for React-based SVG rendering of the current page
 */

import { useRef, useMemo, useCallback, useState, useEffect } from "react";
import type { EditorCanvasHandle, CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import { EditorCanvas } from "@aurochs-ui/editor-controls/canvas";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/geometry";
import type { FigNodeId, FigDesignNode } from "@aurochs/fig/domain";
import { findNodeById } from "@aurochs-builder/fig/node-ops";
import { useFigEditor } from "../context/FigEditorContext";
import { FigPageRenderer } from "./FigPageRenderer";
import { flattenAllNodeBounds } from "./interaction/bounds";
import { isSelectMode } from "../context/fig-editor/types";
import { FigTextEditOverlay } from "./FigTextEditOverlay";
import { computeAbsoluteNodeBounds } from "./interaction/bounds";
import type { MenuEntry } from "@aurochs-ui/ui-components/context-menu";
import { ContextMenu } from "@aurochs-ui/ui-components/context-menu";

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
// Context menu state
// =============================================================================

type ContextMenuState = {
  readonly x: number;
  readonly y: number;
  readonly targetId: FigNodeId;
} | null;

// =============================================================================
// Component
// =============================================================================

/**
 * Fig editor canvas.
 *
 * Provides the interactive editing surface with:
 * - Rendering of the active page's nodes
 * - Direct selection of any node at any depth (deepest-first hit testing)
 * - Multi-select via Shift/Cmd+click and marquee drag
 * - Drag to move, resize, rotate
 * - Right-click context menu
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
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  // =========================================================================
  // Item bounds — flattened tree with absolute coordinates
  // =========================================================================

  /**
   * Flatten the entire node tree into absolute-coordinate bounds.
   *
   * Every visible node (containers and leaves alike) gets a hit area.
   * The array is in pre-order (parent before children), so children's
   * hit-area rects are rendered AFTER (and thus ON TOP OF) their parents
   * in the SVG z-stack. Clicking at a position covered by a leaf will
   * hit the leaf's rect, not the ancestor frame's rect — matching
   * Figma's "click-through to deepest element" behavior.
   *
   * Clicking empty space inside a frame (not covered by any child) will
   * hit the frame's own rect, selecting the frame itself.
   */
  const itemBounds = useMemo(() => {
    if (!activePage) {
      return [];
    }
    return flattenAllNodeBounds(activePage.children);
  }, [activePage]);

  // Compute canvas size from actual content bounds (always from top-level)
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

  /**
   * Double-click handler: enter text editing for TEXT nodes.
   *
   * Since clicking already selects the deepest node at the cursor,
   * double-click's purpose is limited to entering text edit mode.
   */
  const handleDoubleClick = useCallback(
    (id: string, _coords: CanvasPageCoords, _e: React.MouseEvent) => {
      if (!activePage) {
        return;
      }

      const node = findNodeById(activePage.children, id as FigNodeId);
      if (node?.type === "TEXT") {
        dispatch({ type: "ENTER_TEXT_EDIT", nodeId: id as FigNodeId });
      }
    },
    [dispatch, activePage],
  );

  // =========================================================================
  // Canvas (background) events
  // =========================================================================

  /**
   * Creation drag state — tracked via ref to avoid re-renders during drag.
   * When the user is in a creation mode and drags on the canvas background,
   * we track the start/current page coordinates. On pointer up, we compute
   * the final rectangle and dispatch COMMIT_CREATION.
   */
  const creationDragRef = useRef<{
    startPageX: number;
    startPageY: number;
    currentPageX: number;
    currentPageY: number;
  } | null>(null);
  const [creationPreview, setCreationPreview] = useState<{
    x: number; y: number; width: number; height: number;
  } | null>(null);

  const handleCanvasPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (!isSelectMode(creationMode)) {
        // Start creation drag
        e.preventDefault(); // Suppress marquee in EditorCanvas
        creationDragRef.current = {
          startPageX: coords.pageX,
          startPageY: coords.pageY,
          currentPageX: coords.pageX,
          currentPageY: coords.pageY,
        };
        return;
      }
      dispatch({ type: "CLEAR_NODE_SELECTION" });
    },
    [dispatch, creationMode],
  );

  const handleCanvasClick = useCallback(
    (coords: CanvasPageCoords, _e: React.MouseEvent) => {
      if (!isSelectMode(creationMode)) {
        // Single click in creation mode: create shape at click position with default size
        dispatch({
          type: "COMMIT_CREATION",
          x: coords.pageX,
          y: coords.pageY,
          width: 0,
          height: 0,
        });
        return;
      }
      dispatch({ type: "CLEAR_NODE_SELECTION" });
    },
    [dispatch, creationMode],
  );

  // Global pointer listeners for creation drag
  useEffect(() => {
    if (isSelectMode(creationMode)) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      const drag = creationDragRef.current;
      if (!drag) {
        return;
      }

      const pageCoords = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!pageCoords) {
        return;
      }

      drag.currentPageX = pageCoords.pageX;
      drag.currentPageY = pageCoords.pageY;

      // Update preview rectangle
      const x = Math.min(drag.startPageX, drag.currentPageX);
      const y = Math.min(drag.startPageY, drag.currentPageY);
      const width = Math.abs(drag.currentPageX - drag.startPageX);
      const height = Math.abs(drag.currentPageY - drag.startPageY);
      setCreationPreview({ x, y, width, height });
    };

    const handlePointerUp = () => {
      const drag = creationDragRef.current;
      if (!drag) {
        return;
      }

      const x = Math.min(drag.startPageX, drag.currentPageX);
      const y = Math.min(drag.startPageY, drag.currentPageY);
      const width = Math.abs(drag.currentPageX - drag.startPageX);
      const height = Math.abs(drag.currentPageY - drag.startPageY);

      creationDragRef.current = null;
      setCreationPreview(null);

      dispatch({
        type: "COMMIT_CREATION",
        x,
        y,
        width,
        height,
      });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [creationMode, dispatch]);

  // =========================================================================
  // Context menu
  // =========================================================================

  const handleItemContextMenu = useCallback(
    (id: string, _coords: CanvasPageCoords, e: React.MouseEvent) => {
      // Select the right-clicked item if not already selected
      if (!nodeSelection.selectedIds.includes(id as FigNodeId)) {
        dispatch({
          type: "SELECT_NODE",
          nodeId: id as FigNodeId,
          addToSelection: false,
        });
      }

      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        targetId: id as FigNodeId,
      });
    },
    [dispatch, nodeSelection.selectedIds],
  );

  const handleCanvasContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      // Canvas-level context menu (no item selected) — for now just prevent default
      setContextMenu(null);
    },
    [],
  );

  const contextMenuItems = useMemo((): readonly MenuEntry[] => {
    const hasSelection = nodeSelection.selectedIds.length > 0;
    return [
      { id: "duplicate", label: "Duplicate", shortcut: "Cmd+D", disabled: !hasSelection },
      { id: "copy", label: "Copy", shortcut: "Cmd+C", disabled: !hasSelection },
      { id: "paste", label: "Paste", shortcut: "Cmd+V" },
      { type: "separator" },
      { id: "bring-to-front", label: "Bring to Front", disabled: !hasSelection },
      { id: "bring-forward", label: "Bring Forward", disabled: !hasSelection },
      { id: "send-backward", label: "Send Backward", disabled: !hasSelection },
      { id: "send-to-back", label: "Send to Back", disabled: !hasSelection },
      { type: "separator" },
      { id: "delete", label: "Delete", shortcut: "Del", disabled: !hasSelection, danger: true },
    ];
  }, [nodeSelection.selectedIds.length]);

  const handleContextMenuAction = useCallback(
    (actionId: string) => {
      const selectedIds = nodeSelection.selectedIds;

      switch (actionId) {
        case "duplicate":
          if (selectedIds.length > 0) {
            dispatch({ type: "DUPLICATE_NODES", nodeIds: selectedIds });
          }
          break;
        case "copy":
          dispatch({ type: "COPY" });
          break;
        case "paste":
          dispatch({ type: "PASTE" });
          break;
        case "delete":
          if (selectedIds.length > 0) {
            dispatch({ type: "DELETE_NODES", nodeIds: selectedIds });
          }
          break;
        case "bring-to-front":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "front" });
          }
          break;
        case "bring-forward":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "forward" });
          }
          break;
        case "send-backward":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "backward" });
          }
          break;
        case "send-to-back":
          if (selectedIds.length === 1) {
            dispatch({ type: "REORDER_NODE", nodeId: selectedIds[0], direction: "back" });
          }
          break;
      }
      setContextMenu(null);
    },
    [dispatch, nodeSelection.selectedIds],
  );

  const handleContextMenuClose = useCallback(() => {
    setContextMenu(null);
  }, []);

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

  // =========================================================================
  // Text edit overlay
  // =========================================================================

  const textEditOverlay = useMemo(() => {
    if (textEdit.type !== "active" || !activePage) {
      return undefined;
    }

    const editingNodeId = textEdit.nodeId;
    const editingNode = findNodeById(activePage.children, editingNodeId);
    if (!editingNode || editingNode.type !== "TEXT") {
      return undefined;
    }

    const bounds = computeAbsoluteNodeBounds(activePage.children, editingNodeId);
    if (!bounds) {
      return undefined;
    }

    return (
      <div
        key="text-edit-container"
        style={{ position: "absolute", inset: 0 }}
        onPointerDown={(e) => {
          // Click-outside detection: if click is outside the text bounds, exit editing
          const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
          if (!page) return;
          const b = bounds;
          const inside = page.pageX >= b.x && page.pageX <= b.x + b.width &&
                         page.pageY >= b.y && page.pageY <= b.y + b.height;
          if (!inside) {
            dispatch({ type: "EXIT_TEXT_EDIT" });
          }
        }}
      >
        <FigTextEditOverlay
          node={editingNode}
          bounds={bounds}
          canvasWidth={canvasSize.width}
          canvasHeight={canvasSize.height}
          dispatch={dispatch}
        />
      </div>
    );
  }, [textEdit, activePage, canvasSize, dispatch]);

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
      const node = findNodeById(activePage.children, id);
      return node && frameTypes.has(node.type);
    });
  }, [nodeSelection.selectedIds, activePage]);

  return (
    <>
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
        onItemContextMenu={handleItemContextMenu}
        onContextMenu={handleCanvasContextMenu}
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
        viewportOverlay={textEditOverlay}
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

        {/* Creation drag preview rectangle */}
        {creationPreview && creationPreview.width > 0 && creationPreview.height > 0 && (
          <rect
            x={creationPreview.x}
            y={creationPreview.y}
            width={creationPreview.width}
            height={creationPreview.height}
            fill="rgba(0, 102, 255, 0.08)"
            stroke="#0066ff"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </EditorCanvas>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onAction={handleContextMenuAction}
          onClose={handleContextMenuClose}
        />
      )}
    </>
  );
}
