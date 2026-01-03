/**
 * @file Presentation editor main component
 *
 * Complete presentation editor with:
 * - Slide thumbnails (left)
 * - Slide canvas (center)
 * - Inspector panel (right) - switches based on selection
 * - Layer panel
 * - Toolbar
 *
 * This is the top-level component that manages all editing state.
 */

import { useRef, useEffect, useMemo, useCallback, type CSSProperties } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import type { ResizeHandlePosition } from "../state";
import type { PresentationDocument, SlideWithId, PresentationEditorAction } from "./types";
import type { ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { PresentationEditorProvider, usePresentationEditor } from "./context";
import { SlideThumbnailPanel } from "./SlideThumbnailPanel";
import { SlideCanvas } from "../slide/SlideCanvas";
import { PropertyPanel } from "../slide/PropertyPanel";
import { ShapeToolbar } from "../slide/ShapeToolbar";
import { LayerPanel } from "../slide/LayerPanel";
import { Panel } from "../ui/layout";
import { findShapeById, isTopLevelShape } from "../shape/query";
import { clientToSlideCoords } from "../shape/coords";
import { withUpdatedTransform } from "../shape/transform";
import { calculateAlignedBounds } from "../shape/alignment";
import { renderSlideSvg } from "../../pptx/render/svg/renderer";
import { createRenderContext } from "../../pptx/render/context";

// =============================================================================
// Types
// =============================================================================

export type PresentationEditorProps = {
  /** Initial presentation document */
  readonly initialDocument: PresentationDocument;
  /** Show property panel */
  readonly showPropertyPanel?: boolean;
  /** Show layer panel */
  readonly showLayerPanel?: boolean;
  /** Show toolbar */
  readonly showToolbar?: boolean;
  /** CSS class for the container */
  readonly className?: string;
  /** CSS style for the container */
  readonly style?: CSSProperties;
};

// =============================================================================
// Styles
// =============================================================================

const containerStyle: CSSProperties = {
  display: "flex",
  width: "100%",
  height: "100%",
  backgroundColor: "var(--bg-primary, #0a0a0a)",
  color: "var(--text-primary, #fff)",
  overflow: "hidden",
};

const thumbnailPanelStyle: CSSProperties = {
  width: "200px",
  flexShrink: 0,
  borderRight: "1px solid var(--border-subtle, #333)",
};

const mainAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  minWidth: 0,
  overflow: "hidden",
};

const toolbarStyle: CSSProperties = {
  padding: "8px 16px",
  backgroundColor: "var(--bg-secondary, #1a1a1a)",
  borderBottom: "1px solid var(--border-subtle, #333)",
};

const contentAreaStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  overflow: "hidden",
};

const canvasContainerStyle: CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  backgroundColor: "var(--bg-tertiary, #111)",
  overflow: "hidden",
};

const sidePanelStyle: CSSProperties = {
  width: "280px",
  flexShrink: 0,
  borderLeft: "1px solid var(--border-subtle, #333)",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
};

const panelSectionStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

// =============================================================================
// Drag Helpers
// =============================================================================

function applyMoveDelta(
  drag: { type: "move"; shapeIds: readonly ShapeId[]; initialBounds: Map<ShapeId, { x: number; y: number }> },
  deltaX: number,
  deltaY: number,
  dispatch: (action: PresentationEditorAction) => void
): void {
  for (const shapeId of drag.shapeIds) {
    const initialBounds = drag.initialBounds.get(shapeId);
    if (!initialBounds) continue;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          x: px(initialBounds.x + deltaX),
          y: px(initialBounds.y + deltaY),
        }),
    });
  }
}

function applyResizeDelta(
  drag: {
    type: "resize";
    handle: ResizeHandlePosition;
    shapeIds: readonly ShapeId[];
    combinedBounds?: { x: number; y: number; width: number; height: number };
    initialBoundsMap?: Map<ShapeId, { x: number; y: number; width: number; height: number }>;
    aspectLocked: boolean;
  },
  deltaX: number,
  deltaY: number,
  dispatch: (action: PresentationEditorAction) => void
): void {
  const { handle, combinedBounds, initialBoundsMap, aspectLocked, shapeIds } = drag;
  if (!combinedBounds || !initialBoundsMap) return;

  let newBounds = {
    x: combinedBounds.x as number,
    y: combinedBounds.y as number,
    width: combinedBounds.width as number,
    height: combinedBounds.height as number,
  };
  const baseX = combinedBounds.x as number;
  const baseY = combinedBounds.y as number;
  const baseW = combinedBounds.width as number;
  const baseH = combinedBounds.height as number;
  const aspect = baseW / baseH;

  switch (handle) {
    case "nw":
      newBounds = { x: baseX + deltaX, y: baseY + deltaY, width: baseW - deltaX, height: baseH - deltaY };
      break;
    case "n":
      newBounds = { ...newBounds, y: baseY + deltaY, height: baseH - deltaY };
      break;
    case "ne":
      newBounds = { ...newBounds, y: baseY + deltaY, width: baseW + deltaX, height: baseH - deltaY };
      break;
    case "e":
      newBounds = { ...newBounds, width: baseW + deltaX };
      break;
    case "se":
      newBounds = { ...newBounds, width: baseW + deltaX, height: baseH + deltaY };
      break;
    case "s":
      newBounds = { ...newBounds, height: baseH + deltaY };
      break;
    case "sw":
      newBounds = { ...newBounds, x: baseX + deltaX, width: baseW - deltaX, height: baseH + deltaY };
      break;
    case "w":
      newBounds = { ...newBounds, x: baseX + deltaX, width: baseW - deltaX };
      break;
  }

  newBounds.width = Math.max(10, newBounds.width);
  newBounds.height = Math.max(10, newBounds.height);

  if (aspectLocked) {
    if (handle === "n" || handle === "s") {
      newBounds.width = newBounds.height * aspect;
    } else if (handle === "e" || handle === "w") {
      newBounds.height = newBounds.width / aspect;
    } else {
      newBounds.height = newBounds.width / aspect;
    }
  }

  const scaleX = newBounds.width / baseW;
  const scaleY = newBounds.height / baseH;

  for (const shapeId of shapeIds) {
    const initialBounds = initialBoundsMap.get(shapeId);
    if (!initialBounds) continue;

    const relX = (initialBounds.x as number) - baseX;
    const relY = (initialBounds.y as number) - baseY;
    const newX = newBounds.x + relX * scaleX;
    const newY = newBounds.y + relY * scaleY;
    const newWidth = (initialBounds.width as number) * scaleX;
    const newHeight = (initialBounds.height as number) * scaleY;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          x: px(newX),
          y: px(newY),
          width: px(newWidth),
          height: px(newHeight),
        }),
    });
  }
}

function applyRotateDelta(
  drag: {
    type: "rotate";
    shapeIds: readonly ShapeId[];
    startAngle: number;
    initialRotationsMap?: Map<ShapeId, number>;
  },
  currentAngle: number,
  dispatch: (action: PresentationEditorAction) => void
): void {
  const { startAngle, initialRotationsMap, shapeIds } = drag;
  const angleDelta = currentAngle - startAngle;

  for (const shapeId of shapeIds) {
    const initialRotation = initialRotationsMap?.get(shapeId);
    if (initialRotation === undefined) continue;

    let newRotation = (initialRotation + angleDelta) % 360;
    if (newRotation < 0) newRotation += 360;

    dispatch({
      type: "UPDATE_SHAPE",
      shapeId,
      updater: (shape) =>
        withUpdatedTransform(shape, {
          rotation: deg(newRotation),
        }),
    });
  }
}

// =============================================================================
// Inner Editor Component
// =============================================================================

function EditorContent({
  showPropertyPanel,
  showLayerPanel,
  showToolbar,
}: {
  showPropertyPanel: boolean;
  showLayerPanel: boolean;
  showToolbar: boolean;
}) {
  const { state, dispatch, document, activeSlide, selectedShapes, primaryShape, canUndo, canRedo } =
    usePresentationEditor();
  const containerRef = useRef<HTMLDivElement>(null);
  const { shapeSelection: selection, drag } = state;

  const slide = activeSlide?.slide;
  const width = document.slideWidth;
  const height = document.slideHeight;

  // Render context for SVG
  const renderContext = useMemo(
    () => createRenderContext({ slideSize: { width, height } }),
    [width, height]
  );

  // Rendered SVG content
  const svgContent = useMemo(() => {
    if (!slide) return undefined;
    const result = renderSlideSvg(slide, renderContext);
    return result.svg;
  }, [slide, renderContext]);

  // ==========================================================================
  // Drag handlers
  // ==========================================================================

  useEffect(() => {
    if (drag.type === "idle" || !slide) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      if (drag.type === "move") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        applyMoveDelta(drag as any, deltaX, deltaY, dispatch);
      } else if (drag.type === "resize") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        applyResizeDelta(drag as any, deltaX, deltaY, dispatch);
      } else if (drag.type === "rotate") {
        const centerX = drag.centerX as number;
        const centerY = drag.centerY as number;
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI);
        applyRotateDelta(drag as any, currentAngle, dispatch);
      }
    };

    const handlePointerUp = () => {
      dispatch({ type: "END_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, slide, width, height, dispatch]);

  // ==========================================================================
  // Keyboard shortcuts
  // ==========================================================================

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        dispatch({ type: "UNDO" });
        return;
      }
      if (modKey && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        dispatch({ type: "REDO" });
        return;
      }
      if (modKey && e.key === "c") {
        e.preventDefault();
        dispatch({ type: "COPY" });
        return;
      }
      if (modKey && e.key === "v") {
        e.preventDefault();
        dispatch({ type: "PASTE" });
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds });
        return;
      }
      if (modKey && e.key === "d") {
        e.preventDefault();
        dispatch({ type: "COPY" });
        dispatch({ type: "PASTE" });
        return;
      }
      if (modKey && e.key === "a" && slide) {
        e.preventDefault();
        const allIds = slide.shapes
          .filter((s): s is Shape & { nonVisual: { id: ShapeId } } => "nonVisual" in s)
          .map((s) => s.nonVisual.id);
        dispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: allIds });
        return;
      }
      if (modKey && e.key === "g" && !e.shiftKey && slide) {
        e.preventDefault();
        if (selection.selectedIds.length >= 2) {
          dispatch({ type: "GROUP_SHAPES", shapeIds: selection.selectedIds });
        }
        return;
      }
      if (modKey && e.shiftKey && e.key === "g") {
        e.preventDefault();
        if (selection.primaryId && primaryShape?.type === "grpSp") {
          dispatch({ type: "UNGROUP_SHAPE", shapeId: selection.primaryId });
        }
        return;
      }
      if (e.key === "Escape") {
        dispatch({ type: "CLEAR_SHAPE_SELECTION" });
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [dispatch, selection, slide, primaryShape]);

  // ==========================================================================
  // Context menu actions
  // ==========================================================================

  const canGroup = useMemo(() => {
    if (!slide || selection.selectedIds.length < 2) return false;
    return selection.selectedIds.every((id) => isTopLevelShape(slide.shapes, id));
  }, [selection.selectedIds, slide]);

  const canUngroup = selection.selectedIds.length === 1 && primaryShape?.type === "grpSp";
  const hasSelection = selection.selectedIds.length > 0;
  const isMultiSelect = selection.selectedIds.length > 1;
  const canAlign = selection.selectedIds.length >= 2;
  const canDistribute = selection.selectedIds.length >= 3;
  const hasClipboard = state.clipboard !== undefined && state.clipboard.shapes.length > 0;

  const applyAlignment = useCallback(
    (alignment: "left" | "center" | "right" | "top" | "middle" | "bottom" | "distributeH" | "distributeV") => {
      if (!slide || selection.selectedIds.length < 2) return;

      const alignedBounds = calculateAlignedBounds(slide.shapes, selection.selectedIds, alignment);

      for (const [shapeId, bounds] of alignedBounds) {
        dispatch({
          type: "UPDATE_SHAPE",
          shapeId,
          updater: (shape) =>
            withUpdatedTransform(shape, {
              x: px(bounds.x),
              y: px(bounds.y),
            }),
        });
      }
    },
    [dispatch, selection.selectedIds, slide]
  );

  const contextMenuActions: ContextMenuActions = useMemo(
    () => ({
      hasSelection,
      hasClipboard,
      isMultiSelect,
      canGroup,
      canUngroup,
      canAlign,
      canDistribute,
      copy: () => dispatch({ type: "COPY" }),
      cut: () => {
        dispatch({ type: "COPY" });
        dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds });
      },
      paste: () => dispatch({ type: "PASTE" }),
      duplicateSelected: () => {
        dispatch({ type: "COPY" });
        dispatch({ type: "PASTE" });
      },
      deleteSelected: () => dispatch({ type: "DELETE_SHAPES", shapeIds: selection.selectedIds }),
      bringToFront: () => selection.primaryId && dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "front" }),
      bringForward: () => selection.primaryId && dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "forward" }),
      sendBackward: () => selection.primaryId && dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "backward" }),
      sendToBack: () => selection.primaryId && dispatch({ type: "REORDER_SHAPE", shapeId: selection.primaryId, direction: "back" }),
      group: () => canGroup && dispatch({ type: "GROUP_SHAPES", shapeIds: selection.selectedIds }),
      ungroup: () => canUngroup && selection.primaryId && dispatch({ type: "UNGROUP_SHAPE", shapeId: selection.primaryId }),
      alignLeft: () => applyAlignment("left"),
      alignCenter: () => applyAlignment("center"),
      alignRight: () => applyAlignment("right"),
      alignTop: () => applyAlignment("top"),
      alignMiddle: () => applyAlignment("middle"),
      alignBottom: () => applyAlignment("bottom"),
      distributeHorizontally: () => applyAlignment("distributeH"),
      distributeVertically: () => applyAlignment("distributeV"),
    }),
    [dispatch, selection, canGroup, canUngroup, hasSelection, hasClipboard, isMultiSelect, canAlign, canDistribute, applyAlignment]
  );

  // ==========================================================================
  // Callbacks for SlideCanvas
  // ==========================================================================

  const handleSelect = useCallback(
    (shapeId: ShapeId, addToSelection: boolean) => {
      dispatch({ type: "SELECT_SHAPE", shapeId, addToSelection });
    },
    [dispatch]
  );

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_SHAPE_SELECTION" });
  }, [dispatch]);

  const handleStartMove = useCallback(
    (startX: number, startY: number) => {
      dispatch({ type: "START_MOVE", startX: px(startX), startY: px(startY) });
    },
    [dispatch]
  );

  const handleStartResize = useCallback(
    (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => {
      dispatch({ type: "START_RESIZE", handle, startX: px(startX), startY: px(startY), aspectLocked });
    },
    [dispatch]
  );

  const handleStartRotate = useCallback(
    (startX: number, startY: number) => {
      dispatch({ type: "START_ROTATE", startX: px(startX), startY: px(startY) });
    },
    [dispatch]
  );

  // ==========================================================================
  // Callbacks for panels
  // ==========================================================================

  const handleShapeChange = useCallback(
    (shapeId: ShapeId, updater: (shape: Shape) => Shape) => {
      dispatch({ type: "UPDATE_SHAPE", shapeId, updater });
    },
    [dispatch]
  );

  const handleSlideChange = useCallback(
    (updater: (slide: Slide) => Slide) => {
      dispatch({ type: "UPDATE_ACTIVE_SLIDE", updater });
    },
    [dispatch]
  );

  const handleGroup = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "GROUP_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const handleUngroup = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "UNGROUP_SHAPE", shapeId });
    },
    [dispatch]
  );

  const handleDelete = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({ type: "DELETE_SHAPES", shapeIds });
    },
    [dispatch]
  );

  const handleDuplicate = useCallback(() => {
    dispatch({ type: "COPY" });
    dispatch({ type: "PASTE" });
  }, [dispatch]);

  const handleReorder = useCallback(
    (shapeId: ShapeId, direction: "front" | "back" | "forward" | "backward") => {
      dispatch({ type: "REORDER_SHAPE", shapeId, direction });
    },
    [dispatch]
  );

  // ==========================================================================
  // Canvas wrapper style
  // ==========================================================================

  const aspectRatio = (width as number) / (height as number);
  const canvasWrapperStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    maxWidth: `calc((100vh - 200px) * ${aspectRatio})`,
    aspectRatio: `${width} / ${height}`,
    boxShadow: "0 4px 24px rgba(0, 0, 0, 0.4)",
    backgroundColor: "white",
  };

  if (!activeSlide || !slide) {
    return (
      <div style={{ ...containerStyle, alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#666" }}>No slide selected</span>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      {/* Left: Slide Thumbnails */}
      <div style={thumbnailPanelStyle}>
        <SlideThumbnailPanel />
      </div>

      {/* Center: Main editing area */}
      <div style={mainAreaStyle}>
        {/* Toolbar */}
        {showToolbar && (
          <div style={toolbarStyle}>
            <ShapeToolbar
              canUndo={canUndo}
              canRedo={canRedo}
              selectedIds={selection.selectedIds}
              primaryShape={primaryShape}
              onUndo={() => dispatch({ type: "UNDO" })}
              onRedo={() => dispatch({ type: "REDO" })}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onReorder={handleReorder}
              onShapeChange={handleShapeChange}
              direction="horizontal"
            />
          </div>
        )}

        {/* Content area */}
        <div style={contentAreaStyle}>
          {/* Canvas */}
          <div style={canvasContainerStyle}>
            <div ref={containerRef} style={canvasWrapperStyle}>
              <SlideCanvas
                slide={slide}
                selection={selection}
                drag={drag}
                svgContent={svgContent}
                width={width}
                height={height}
                primaryShape={primaryShape}
                selectedShapes={selectedShapes}
                contextMenuActions={contextMenuActions}
                onSelect={handleSelect}
                onClearSelection={handleClearSelection}
                onStartMove={handleStartMove}
                onStartResize={handleStartResize}
                onStartRotate={handleStartRotate}
              />
            </div>
          </div>

          {/* Right: Panels */}
          {(showPropertyPanel || showLayerPanel) && (
            <div style={sidePanelStyle}>
              {showLayerPanel && (
                <Panel title="Layers" badge={slide.shapes.length}>
                  <LayerPanel
                    slide={slide}
                    selection={selection}
                    primaryShape={primaryShape}
                    onSelect={(id) => handleSelect(id, false)}
                    onGroup={handleGroup}
                    onUngroup={handleUngroup}
                    onClearSelection={handleClearSelection}
                  />
                </Panel>
              )}
              {showPropertyPanel && (
                <div style={panelSectionStyle}>
                  <Panel title="Properties">
                    <PropertyPanel
                      slide={slide}
                      selectedShapes={selectedShapes}
                      primaryShape={primaryShape}
                      onShapeChange={handleShapeChange}
                      onSlideChange={handleSlideChange}
                      onUngroup={handleUngroup}
                      onSelect={(id) => handleSelect(id, false)}
                    />
                  </Panel>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * Complete presentation editor
 */
export function PresentationEditor({
  initialDocument,
  showPropertyPanel = true,
  showLayerPanel = true,
  showToolbar = true,
  className,
  style,
}: PresentationEditorProps) {
  const containerStyles = useMemo<CSSProperties>(
    () => ({
      width: "100%",
      height: "100%",
      ...style,
    }),
    [style]
  );

  return (
    <PresentationEditorProvider initialDocument={initialDocument}>
      <div className={className} style={containerStyles}>
        <EditorContent
          showPropertyPanel={showPropertyPanel}
          showLayerPanel={showLayerPanel}
          showToolbar={showToolbar}
        />
      </div>
    </PresentationEditorProvider>
  );
}
