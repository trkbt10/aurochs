/**
 * @file Layout Editor Canvas
 *
 * Wrapper component for SvgEditorCanvas that provides layout-specific context.
 * Enables editing of slide layout shapes using the same canvas infrastructure
 * as the main slide editor.
 */

import { useCallback, useMemo, useState, useRef, useEffect } from "react";
import type { Slide, Shape } from "@oxen/pptx/domain";
import type { ShapeId } from "@oxen/pptx/domain/types";
import type { Pixels } from "@oxen/ooxml/domain/units";
import { px, deg } from "@oxen/ooxml/domain/units";
import type { SlideSize } from "@oxen/pptx/domain";
import type { ColorContext, ColorScheme } from "@oxen/pptx/domain/color/context";
import type { XmlDocument } from "@oxen/xml";
import { parseTheme } from "@oxen/pptx/parser/drawing-ml/index";
import type { ResizeHandlePosition } from "../../context/slide/state";
import { SvgEditorCanvas } from "../../slide-canvas/SvgEditorCanvas";
import type { ContextMenuActions } from "../../slide/context-menu/SlideContextMenu";
import { createInactiveTextEditState } from "../../slide/text-edit";
import type { ZoomMode } from "../../slide-canvas/canvas-controls";
import { usePresentationEditor } from "../../context/presentation/PresentationEditorContext";
import { findShapeById } from "../../shape/query";
import type { ViewportTransform } from "@oxen/pptx-render/svg-viewport";
import { screenToSlideCoords } from "@oxen/pptx-render/svg-viewport";

// =============================================================================
// Types
// =============================================================================

export type LayoutEditorCanvasProps = {
  readonly slideSize: SlideSize;
  /** Color scheme from theme editor - overrides theme bundle colors */
  readonly colorScheme?: ColorScheme;
};

// =============================================================================
// Constants
// =============================================================================

const RULER_THICKNESS = 20;

// =============================================================================
// Helpers
// =============================================================================

/**
 * Default color map (identity mapping)
 * Maps abstract colors to themselves as a fallback
 */
const DEFAULT_COLOR_MAP: Record<string, string> = {
  bg1: "lt1",
  tx1: "dk1",
  bg2: "lt2",
  tx2: "dk2",
  accent1: "accent1",
  accent2: "accent2",
  accent3: "accent3",
  accent4: "accent4",
  accent5: "accent5",
  accent6: "accent6",
  hlink: "hlink",
  folHlink: "folHlink",
};

/**
 * Create ColorContext from theme XML document
 */
function createColorContextFromTheme(
  theme: XmlDocument | null
): ColorContext | undefined {
  if (!theme) {
    return undefined;
  }
  const parsedTheme = parseTheme(theme, undefined);
  if (!parsedTheme.colorScheme) {
    return undefined;
  }
  return {
    colorScheme: parsedTheme.colorScheme,
    colorMap: DEFAULT_COLOR_MAP,
  };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Canvas component for editing layout shapes.
 * Wraps SvgEditorCanvas with layout-specific context and event handlers.
 */
export function LayoutEditorCanvas({ slideSize, colorScheme }: LayoutEditorCanvasProps) {
  const { state, dispatch } = usePresentationEditor();
  const { layoutEdit } = state;

  const [zoomMode, setZoomMode] = useState<ZoomMode>("fit");
  const [viewport, setViewport] = useState<ViewportTransform>({ translateX: 0, translateY: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Create pseudo-slide from layout shapes
  const layoutAsSlide = useMemo<Slide>(
    () => ({
      shapes: layoutEdit.layoutShapes as Shape[],
      background: undefined,
      timing: undefined,
      transition: undefined,
      notesMasterIdPath: undefined,
    }),
    [layoutEdit.layoutShapes]
  );

  // Create color context - prefer passed colorScheme (from theme editor) over bundle theme
  const colorContext = useMemo<ColorContext | undefined>(() => {
    // If colorScheme is provided from theme editor, use it directly
    if (colorScheme) {
      return {
        colorScheme,
        colorMap: DEFAULT_COLOR_MAP,
      };
    }
    // Otherwise fall back to layout bundle theme
    return createColorContextFromTheme(layoutEdit.layoutBundle?.theme ?? null);
  }, [colorScheme, layoutEdit.layoutBundle?.theme]);

  // Get selected and primary shapes
  const selectedShapes = useMemo(() => {
    return layoutEdit.layoutSelection.selectedIds
      .map((id) => findShapeById(layoutEdit.layoutShapes as Shape[], id))
      .filter((s): s is Shape => s !== undefined);
  }, [layoutEdit.layoutShapes, layoutEdit.layoutSelection.selectedIds]);

  const primaryShape = useMemo(() => {
    const primaryId = layoutEdit.layoutSelection.primaryId;
    if (!primaryId) {
      return undefined;
    }
    return findShapeById(layoutEdit.layoutShapes as Shape[], primaryId);
  }, [layoutEdit.layoutShapes, layoutEdit.layoutSelection.primaryId]);

  // Handlers mapped to layout-specific actions
  const handleSelect = useCallback(
    (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => {
      dispatch({
        type: "SELECT_LAYOUT_SHAPE",
        shapeId,
        addToSelection,
        toggle,
      });
    },
    [dispatch]
  );

  const handleSelectMultiple = useCallback(
    (shapeIds: readonly ShapeId[]) => {
      dispatch({
        type: "SELECT_MULTIPLE_LAYOUT_SHAPES",
        shapeIds,
      });
    },
    [dispatch]
  );

  const handleClearSelection = useCallback(() => {
    dispatch({ type: "CLEAR_LAYOUT_SHAPE_SELECTION" });
  }, [dispatch]);

  const handleStartMove = useCallback(
    (startX: number, startY: number) => {
      dispatch({
        type: "START_LAYOUT_MOVE",
        startX: px(startX) as Pixels,
        startY: px(startY) as Pixels,
      });
    },
    [dispatch]
  );

  const handleStartResize = useCallback(
    (
      handle: ResizeHandlePosition,
      startX: number,
      startY: number,
      aspectLocked: boolean
    ) => {
      dispatch({
        type: "START_LAYOUT_RESIZE",
        handle,
        startX: px(startX) as Pixels,
        startY: px(startY) as Pixels,
        aspectLocked,
      });
    },
    [dispatch]
  );

  const handleStartRotate = useCallback(
    (startX: number, startY: number) => {
      dispatch({
        type: "START_LAYOUT_ROTATE",
        startX: px(startX) as Pixels,
        startY: px(startY) as Pixels,
      });
    },
    [dispatch]
  );

  const handleDoubleClick = useCallback(() => {
    // Text editing not supported in layout editor for now
  }, []);

  const handleCreate = useCallback(() => {
    // Shape creation not supported in layout editor for now
  }, []);

  const handleTextEditComplete = useCallback(() => {
    // Text editing not supported in layout editor
  }, []);

  const handleTextEditCancel = useCallback(() => {
    // Text editing not supported in layout editor
  }, []);

  // No-op handlers for unsupported features
  const noop = useCallback(() => {
    // No operation
  }, []);

  // Handler for deleting selected shapes
  const handleDeleteSelected = useCallback(() => {
    dispatch({
      type: "DELETE_LAYOUT_SHAPES",
      shapeIds: layoutEdit.layoutSelection.selectedIds,
    });
  }, [dispatch, layoutEdit.layoutSelection.selectedIds]);

  // Drag handler effect - handles pointer move/up during drag operations
  useEffect(() => {
    const drag = layoutEdit.layoutDrag;
    if (drag.type === "idle" || layoutEdit.layoutShapes.length === 0) {
      return;
    }

    const handlePointerMove = (e: PointerEvent): void => {
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const rect = container.getBoundingClientRect();
      const coords = screenToSlideCoords(e.clientX, e.clientY, rect, viewport, RULER_THICKNESS);

      if (drag.type === "move") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        dispatch({ type: "PREVIEW_LAYOUT_MOVE", dx: px(deltaX), dy: px(deltaY) });
      } else if (drag.type === "resize") {
        const deltaX = coords.x - (drag.startX as number);
        const deltaY = coords.y - (drag.startY as number);
        dispatch({ type: "PREVIEW_LAYOUT_RESIZE", dx: px(deltaX), dy: px(deltaY) });
      } else if (drag.type === "rotate") {
        const centerX = drag.centerX as number;
        const centerY = drag.centerY as number;
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX) * (180 / Math.PI);
        dispatch({ type: "PREVIEW_LAYOUT_ROTATE", currentAngle: deg(currentAngle) });
      }
    };

    const handlePointerUp = (): void => {
      dispatch({ type: "COMMIT_LAYOUT_DRAG" });
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [layoutEdit.layoutDrag, layoutEdit.layoutShapes.length, dispatch, viewport]);

  // Context menu actions for layout shapes
  const hasSelection = layoutEdit.layoutSelection.selectedIds.length > 0;
  const isMultiSelect = layoutEdit.layoutSelection.selectedIds.length > 1;

  const contextMenuActions = useMemo<ContextMenuActions>(
    () => ({
      // State flags
      hasSelection,
      hasClipboard: false,
      isMultiSelect,
      canGroup: isMultiSelect,
      canUngroup: false,
      canAlign: isMultiSelect,
      canDistribute: layoutEdit.layoutSelection.selectedIds.length >= 3,
      // Clipboard - not supported in layout editor
      copy: noop,
      cut: noop,
      paste: noop,
      // Edit
      duplicateSelected: noop,
      deleteSelected: hasSelection ? handleDeleteSelected : noop,
      // Z-order - not supported in layout editor
      bringToFront: noop,
      bringForward: noop,
      sendBackward: noop,
      sendToBack: noop,
      // Group - not supported in layout editor
      group: noop,
      ungroup: noop,
      // Alignment - not supported in layout editor
      alignLeft: noop,
      alignCenter: noop,
      alignRight: noop,
      alignTop: noop,
      alignMiddle: noop,
      alignBottom: noop,
      distributeHorizontally: noop,
      distributeVertically: noop,
    }),
    [handleDeleteSelected, hasSelection, isMultiSelect, noop]
  );

  // If no layout is loaded, show placeholder
  if (!layoutEdit.activeLayoutPath || layoutEdit.layoutShapes.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#888",
          fontSize: "14px",
        }}
      >
        Select a layout to edit
      </div>
    );
  }

  return (
    <SvgEditorCanvas
      ref={containerRef}
      slide={layoutAsSlide}
      slideId="layout-editor"
      selection={layoutEdit.layoutSelection}
      drag={layoutEdit.layoutDrag}
      width={slideSize.width}
      height={slideSize.height}
      primaryShape={primaryShape}
      selectedShapes={selectedShapes}
      contextMenuActions={contextMenuActions}
      colorContext={colorContext}
      creationMode={{ type: "select" }}
      textEdit={createInactiveTextEditState()}
      onSelect={handleSelect}
      onSelectMultiple={handleSelectMultiple}
      onClearSelection={handleClearSelection}
      onStartMove={handleStartMove}
      onStartResize={handleStartResize}
      onStartRotate={handleStartRotate}
      onDoubleClick={handleDoubleClick}
      onCreate={handleCreate}
      onTextEditComplete={handleTextEditComplete}
      onTextEditCancel={handleTextEditCancel}
      zoomMode={zoomMode}
      onZoomModeChange={setZoomMode}
      showRulers={false}
      rulerThickness={RULER_THICKNESS}
      onViewportChange={setViewport}
    />
  );
}
