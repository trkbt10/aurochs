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
import type { Slide, Shape, TextBody } from "../../pptx/domain";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import { px, deg } from "../../pptx/domain/types";
import type { ResizeHandlePosition } from "../state";
import type { PresentationDocument, SlideWithId, PresentationEditorAction } from "./types";
import type { ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { PresentationEditorProvider, usePresentationEditor } from "./context";
import { SlideThumbnailPanel } from "./SlideThumbnailPanel";
import { useSlideThumbnails } from "./use-slide-thumbnails";
import { SlideThumbnailPreview } from "./SlideThumbnailPreview";
import { CreationToolbar } from "../slide/CreationToolbar";
import type { CreationMode } from "./types";
import { createShapeFromMode, createBoundsFromDrag, getDefaultBoundsForMode } from "../shape/factory";
import { SlideCanvas } from "../slide/SlideCanvas";
import { TextEditOverlay } from "../slide/components/TextEditOverlay";
import { isTextEditActive } from "../state";
import { PropertyPanel } from "../slide/PropertyPanel";
import { ShapeToolbar } from "../slide/ShapeToolbar";
import { LayerPanel } from "../slide/LayerPanel";
import { Panel } from "../ui/layout";
import { findShapeById, isTopLevelShape } from "../shape/query";
import { clientToSlideCoords } from "../shape/coords";
import { withUpdatedTransform } from "../shape/transform";
import { calculateAlignedBounds } from "../shape/alignment";
import { renderSlideSvg, renderSlideWithShapeParts } from "../../pptx/render/svg/renderer";
import { createRenderContext } from "../../pptx/render/context";
import { createRenderContextFromApiSlide } from "./slide-render-context-builder";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const { shapeSelection: selection, drag } = state;

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
    (newTextBody: TextBody) => {
      if (isTextEditActive(textEdit)) {
        dispatch({ type: "UPDATE_TEXT_BODY", shapeId: textEdit.shapeId, textBody: newTextBody });
      }
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

  // Render context for SVG rendering
  // When apiSlide and fileCache are available, build full context from API slide
  // This preserves theme/master/layout inheritance for proper rendering after edits
  const renderContext = useMemo(() => {
    const apiSlide = activeSlide?.apiSlide;
    const fileCache = document.fileCache;

    // Use full context from API slide if available
    if (apiSlide && fileCache) {
      return createRenderContextFromApiSlide(apiSlide, fileCache, { width, height });
    }

    // Fall back to basic context for newly created slides
    return createRenderContext({
      slideSize: { width, height },
      colorContext: document.colorContext,
      resources: document.resources,
      fontScheme: document.fontScheme,
      resolvedBackground: activeSlide?.resolvedBackground,
    });
  }, [width, height, activeSlide?.apiSlide, activeSlide?.resolvedBackground, document.fileCache, document.colorContext, document.resources, document.fontScheme]);

  // Rendered SVG content
  // Always render the edited domain slide with proper context
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
        dispatch({ type: "PREVIEW_MOVE", dx: px(deltaX), dy: px(deltaY) });
      } else if (drag.type === "resize") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        dispatch({ type: "PREVIEW_RESIZE", dx: px(deltaX), dy: px(deltaY) });
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
              <CreationToolbar
                mode={creationMode}
                onModeChange={handleCreationModeChange}
              />
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
                onDoubleClick={handleDoubleClick}
                creationMode={creationMode}
                onCreate={handleCanvasCreate}
              />
              {/* Text edit overlay */}
              {isTextEditActive(textEdit) && (
                <TextEditOverlay
                  bounds={textEdit.bounds}
                  textBody={textEdit.initialTextBody}
                  slideWidth={width as number}
                  slideHeight={height as number}
                  onComplete={handleTextEditComplete}
                  onCancel={handleTextEditCancel}
                />
              )}
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
