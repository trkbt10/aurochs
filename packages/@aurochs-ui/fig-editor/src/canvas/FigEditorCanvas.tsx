/**
 * @file Fig editor canvas component
 *
 * The main editing surface. Composes:
 * - EditorCanvas (from editor-controls) for viewport, selection, and interaction
 * - FigPageRenderer for SVG rendering of the current page
 * - Event handlers for select, drag, create interactions
 */

import { useRef, useMemo, useCallback, useState } from "react";
import type { EditorCanvasHandle, CanvasPageCoords } from "@aurochs-ui/editor-controls/canvas";
import { EditorCanvas } from "@aurochs-ui/editor-controls/canvas";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import type { FigNodeId } from "@aurochs-builder/fig/types";
import { useFigEditor } from "../context/FigEditorContext";
import { FigPageRenderer } from "./FigPageRenderer";
import { getPageNodeBounds } from "./interaction/bounds";
import { hitTestNodes } from "./interaction/hit-test";
import { isSelectMode } from "../context/fig-editor/types";

// =============================================================================
// Constants
// =============================================================================

/** Default canvas dimensions (Figma canvas is infinite, but we need a viewport) */
const DEFAULT_CANVAS_WIDTH = 4000;
const DEFAULT_CANVAS_HEIGHT = 3000;

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
 * - Creation drag for new shapes
 * - Zoom and pan
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

  // Event handlers
  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, _e: React.PointerEvent) => {
      if (!isSelectMode(creationMode)) {
        return;
      }

      // Select the node
      dispatch({
        type: "SELECT_NODE",
        nodeId: id as FigNodeId,
        addToSelection: coords.addToSelection,
        toggle: coords.toggle,
      });

      // Start pending move
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
      // Enter text edit if it's a text node
      const node = activePage?.children.find((n) => n.id === id);
      if (node?.type === "TEXT") {
        dispatch({ type: "ENTER_TEXT_EDIT", nodeId: id as FigNodeId });
      }
    },
    [dispatch, activePage],
  );

  return (
    <EditorCanvas
      ref={canvasRef}
      canvasWidth={DEFAULT_CANVAS_WIDTH}
      canvasHeight={DEFAULT_CANVAS_HEIGHT}
      zoomMode={zoomMode}
      onZoomModeChange={setZoomMode}
      itemBounds={itemBounds}
      selectedIds={nodeSelection.selectedIds}
      primaryId={nodeSelection.primaryId}
      drag={drag}
      isTextEditing={textEdit.type === "active"}
      showRotateHandle={true}
      onItemPointerDown={handleItemPointerDown}
      onItemClick={handleItemClick}
      onItemDoubleClick={handleDoubleClick}
    >
      {activePage && (
        <FigPageRenderer
          page={activePage}
          canvasWidth={DEFAULT_CANVAS_WIDTH}
          canvasHeight={DEFAULT_CANVAS_HEIGHT}
          images={document.images}
        />
      )}
    </EditorCanvas>
  );
}
