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

import { useRef, useEffect, useMemo, useCallback, useState, type CSSProperties } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ShapeId } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import type { ResizeHandlePosition } from "../state";
import type { PresentationDocument, SlideWithId } from "./types";
import type { ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { PresentationEditorProvider, usePresentationEditor } from "./context";
import { SlideThumbnailPanel } from "../panels";
import { useSlideThumbnails } from "../thumbnail/use-slide-thumbnails";
import { SlideThumbnailPreview } from "../thumbnail/SlideThumbnailPreview";
import { CreationToolbar } from "../panels/CreationToolbar";
import type { CreationMode } from "./types";
import { createShapeFromMode, getDefaultBoundsForMode } from "../shape/factory";
import { isTextEditActive, mergeTextIntoBody, extractDefaultRunProperties } from "../slide/text-edit";
import { PropertyPanel } from "../panels/PropertyPanel";
import { ShapeToolbar } from "../panels/ShapeToolbar";
import { LayerPanel } from "../panels/LayerPanel";
import { Panel } from "../ui/layout";
import { isTopLevelShape } from "../shape/query";
import { clientToSlideCoords } from "../shape/coords";
import { withUpdatedTransform } from "../shape/transform";
import { calculateAlignedBounds } from "../shape/alignment";
import { createRenderContextFromApiSlide, getLayoutNonPlaceholderShapes } from "./slide-render-context-builder";
import { CanvasControls } from "./CanvasControls";
import { CanvasStage } from "./CanvasStage";
import { snapValue } from "./canvas-controls";

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
  height: "100%",
  flexShrink: 0,
  borderRight: "1px solid var(--border-subtle, #333)",
  overflow: "hidden",
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
  position: "relative",
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

const RULER_THICKNESS = 24;

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
  const { state, dispatch, document, activeSlide, selectedShapes, primaryShape, canUndo, canRedo, creationMode, textEdit } =
    usePresentationEditor();
  const canvasRef = useRef<HTMLDivElement>(null);
  const { shapeSelection: selection, drag } = state;
  const [zoom, setZoom] = useState(1);
  const [showRulers, setShowRulers] = useState(true);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapStep, setSnapStep] = useState(10);

  // Creation mode handlers
  const handleCreationModeChange = useCallback(
    (mode: CreationMode) => {
      dispatch({ type: "SET_CREATION_MODE", mode });
    },
    [dispatch]
  );

  const handleCanvasCreate = useCallback(
    (x: number, y: number) => {
      if (creationMode.type === "select") return;

      const bounds = getDefaultBoundsForMode(creationMode, px(x), px(y));
      const shape = createShapeFromMode(creationMode, bounds);
      if (shape) {
        dispatch({ type: "CREATE_SHAPE", shape });
      }
    },
    [creationMode, dispatch]
  );

  // Text editing handlers
  const handleDoubleClick = useCallback(
    (shapeId: ShapeId) => {
      dispatch({ type: "ENTER_TEXT_EDIT", shapeId });
    },
    [dispatch]
  );

  const handleTextEditComplete = useCallback(
    (newText: string) => {
      if (isTextEditActive(textEdit)) {
        const defaultRunProperties = extractDefaultRunProperties(textEdit.initialTextBody);
        const newTextBody = mergeTextIntoBody(textEdit.initialTextBody, newText, defaultRunProperties);
        dispatch({ type: "UPDATE_TEXT_BODY", shapeId: textEdit.shapeId, textBody: newTextBody });
      }
      dispatch({ type: "EXIT_TEXT_EDIT" });
    },
    [dispatch, textEdit]
  );

  const handleTextEditCancel = useCallback(() => {
    dispatch({ type: "EXIT_TEXT_EDIT" });
  }, [dispatch]);

  const slide = activeSlide?.slide;
  const width = document.slideWidth;
  const height = document.slideHeight;

  // Thumbnail rendering hook (with theme context for proper rendering)
  const { getThumbnailSvg } = useSlideThumbnails({
    slideWidth: width,
    slideHeight: height,
    slides: document.slides,
    colorContext: document.colorContext,
    resources: document.resources,
    fontScheme: document.fontScheme,
    fileCache: document.fileCache,
  });

  const renderThumbnail = useCallback(
    (slideWithId: SlideWithId) => {
      const svg = getThumbnailSvg(slideWithId);
      return (
        <SlideThumbnailPreview
          svg={svg}
          slideWidth={width as number}
          slideHeight={height as number}
        />
      );
    },
    [getThumbnailSvg, width, height]
  );

  // Render context from API slide for proper theme/master/layout inheritance
  const renderContext = useMemo(() => {
    const apiSlide = activeSlide?.apiSlide;
    const fileCache = document.fileCache;

    // Use full context from API slide if available
    if (apiSlide && fileCache) {
      return createRenderContextFromApiSlide(apiSlide, fileCache, { width, height });
    }

    return undefined;
  }, [width, height, activeSlide?.apiSlide, document.fileCache]);

  // Get non-placeholder shapes from layout for rendering behind slide content
  const layoutShapes = useMemo(() => {
    const apiSlide = activeSlide?.apiSlide;
    if (apiSlide === undefined) {
      return undefined;
    }
    return getLayoutNonPlaceholderShapes(apiSlide);
  }, [activeSlide?.apiSlide]);

  // Get the editing shape ID when in text edit mode
  const editingShapeId = isTextEditActive(textEdit) ? textEdit.shapeId : undefined;

  // ==========================================================================
  // Drag handlers
  // ==========================================================================

  const getMoveDelta = useCallback(
    (dx: number, dy: number) => {
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
    },
    [drag, selection.primaryId, snapEnabled, snapStep]
  );

  const getResizeDelta = useCallback(
    (dx: number, dy: number) => {
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

      const snappedDx = handle.includes("w") ? westEdge - baseX : handle.includes("e") ? eastEdge - (baseX + baseWidth) : dx;
      const snappedDy = handle.includes("n") ? northEdge - baseY : handle.includes("s") ? southEdge - (baseY + baseHeight) : dy;

      return { dx: snappedDx, dy: snappedDy };
    },
    [drag, snapEnabled, snapStep]
  );

  useEffect(() => {
    if (drag.type === "idle" || !slide) return;

    const handlePointerMove = (e: PointerEvent) => {
      const container = canvasRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

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

    const handlePointerUp = () => {
      dispatch({ type: "COMMIT_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [drag, slide, width, height, dispatch, getMoveDelta, getResizeDelta]);

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

  const rulerThickness = showRulers ? RULER_THICKNESS : 0;

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
        <SlideThumbnailPanel
          slideWidth={width as number}
          slideHeight={height as number}
          renderThumbnail={renderThumbnail}
        />
      </div>

      {/* Center: Main editing area */}
      <div style={mainAreaStyle}>
        {/* Toolbar */}
        {showToolbar && (
          <div style={toolbarStyle}>
            <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
              <CreationToolbar mode={creationMode} onModeChange={handleCreationModeChange} />
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
              <CanvasControls
                zoom={zoom}
                onZoomChange={setZoom}
                showRulers={showRulers}
                onShowRulersChange={setShowRulers}
                snapEnabled={snapEnabled}
                onSnapEnabledChange={setSnapEnabled}
                snapStep={snapStep}
                onSnapStepChange={setSnapStep}
              />
            </div>
          </div>
        )}

        {/* Content area */}
        <div style={contentAreaStyle}>
          {/* Canvas */}
          <div style={canvasContainerStyle}>
            <CanvasStage
              ref={canvasRef}
              slide={slide}
              selection={selection}
              drag={drag}
              width={width as number}
              height={height as number}
              primaryShape={primaryShape}
              selectedShapes={selectedShapes}
              contextMenuActions={contextMenuActions}
              colorContext={renderContext?.colorContext ?? document.colorContext}
              resources={renderContext?.resources ?? document.resources}
              fontScheme={renderContext?.fontScheme ?? document.fontScheme}
              resolvedBackground={renderContext?.resolvedBackground ?? activeSlide?.resolvedBackground}
              editingShapeId={editingShapeId}
              layoutShapes={layoutShapes}
              creationMode={creationMode}
              textEdit={textEdit}
              onSelect={handleSelect}
              onClearSelection={handleClearSelection}
              onStartMove={handleStartMove}
              onStartResize={handleStartResize}
              onStartRotate={handleStartRotate}
              onDoubleClick={handleDoubleClick}
              onCreate={handleCanvasCreate}
              onTextEditComplete={handleTextEditComplete}
              onTextEditCancel={handleTextEditCancel}
              zoom={zoom}
              onZoomChange={setZoom}
              showRulers={showRulers}
              rulerThickness={rulerThickness}
            />
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
