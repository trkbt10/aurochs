/**
 * @file Editing E2E harness for potx-editor
 *
 * Minimal page mounting PresentationEditorProvider + EditorCanvas + useDragHandlers
 * with all POTX_VISIBLE_TOOLS shape types pre-created. No demo file dependency.
 *
 * Puppeteer API:
 * - window.getShapeIds() → string[]
 * - window.getShapeBounds(id) → { x, y, width, height, rotation } | null
 * - window.getSelectedIds() → string[]
 * - window.getDragType() → string
 * - window.getShapeCount() → number
 * - window.addShape(type, preset?, x?, y?) → string (created shape id)
 * - window.deleteSelectedShapes() → void
 */

import { StrictMode, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { createRoot } from "react-dom/client";
import type { Shape, Slide, TextBody } from "@aurochs-office/pptx/domain";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { PresentationDocument } from "@aurochs-office/pptx/app";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import { EMPTY_FONT_SCHEME } from "@aurochs-office/ooxml/domain/font-scheme";
import {
  PresentationEditorProvider,
  usePresentationEditor,
  useDragHandlers,
  useKeyboardShortcuts,
} from "@aurochs-ui/pptx-editor";
import type { PresentationEditorAction } from "@aurochs-ui/pptx-editor";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasItemBounds,
} from "@aurochs-ui/editor-controls/canvas";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import {
  useCanvasHandlers,
  createShapeFromMode,
  getDefaultBoundsForMode,
} from "@aurochs-ui/ooxml-components";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import { collectPptxShapeRenderData } from "@aurochs-ui/ooxml-components/pptx-render-resolver";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { getShapeTransform } from "@aurochs-renderer/pptx/svg";
import {
  isTextEditActive,
  useTextEditHandlers,
  TextEditController,
} from "@aurochs-ui/ooxml-components/text-edit";

// =============================================================================
// Harness window API
// =============================================================================

type ShapeBoundsResult = { x: number; y: number; width: number; height: number; rotation: number };

type HarnessWindow = Window & {
  getShapeIds: () => string[];
  getShapeBounds: (id: string) => ShapeBoundsResult | null;
  getSelectedIds: () => string[];
  getDragType: () => string;
  getShapeCount: () => number;
  getTextEditState: () => { active: boolean; shapeId: string | undefined };
  addShape: (type: string, preset?: string, x?: number, y?: number) => string | null;
  deleteSelectedShapes: () => void;
  __ready?: boolean;
};

const harnessWindow = window as HarnessWindow;

// =============================================================================
// All POTX_VISIBLE_TOOLS shape types
// =============================================================================

/**
 * Shapes matching potx-editor's POTX_VISIBLE_TOOLS:
 * select, rect, roundRect, ellipse, triangle, rightArrow, textbox, connector
 * (select is a mode, not a shape — 7 actual shape types)
 */
const SHAPE_CONFIGS: { mode: CreationMode; cx: number; cy: number }[] = [
  { mode: { type: "textbox" }, cx: 120, cy: 100 },
  { mode: { type: "shape", preset: "rect" }, cx: 350, cy: 100 },
  { mode: { type: "shape", preset: "roundRect" }, cx: 580, cy: 100 },
  { mode: { type: "shape", preset: "ellipse" }, cx: 810, cy: 100 },
  { mode: { type: "shape", preset: "triangle" }, cx: 120, cy: 350 },
  { mode: { type: "shape", preset: "rightArrow" }, cx: 350, cy: 350 },
  { mode: { type: "connector" }, cx: 580, cy: 350 },
];

function createTestShapes(): Shape[] {
  const shapes: Shape[] = [];
  for (const cfg of SHAPE_CONFIGS) {
    const bounds = getDefaultBoundsForMode(cfg.mode, px(cfg.cx), px(cfg.cy));
    const shape = createShapeFromMode(cfg.mode, bounds);
    if (shape) shapes.push(shape);
  }
  return shapes;
}

function createTestDocument(): PresentationDocument {
  return {
    presentation: { slideSize: { width: px(960), height: px(540) } },
    slides: [{ id: "slide-1", slide: { shapes: createTestShapes() } }],
    slideWidth: px(960),
    slideHeight: px(540),
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: {
      getTarget: () => undefined, getType: () => undefined,
      resolve: () => undefined, getMimeType: () => undefined,
      getFilePath: () => undefined, readFile: () => null,
      getResourceByType: () => undefined,
    },
    fontScheme: EMPTY_FONT_SCHEME,
  };
}

// =============================================================================
// Editor Harness Component
// =============================================================================

function EditorHarness() {
  const {
    state,
    dispatch,
    activeSlide,
    primaryShape,
    textEdit: textEditState,
  } = usePresentationEditor();

  const canvasRef = useRef<EditorCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const slide = activeSlide?.slide ?? { shapes: [] };
  const width = 960;
  const height = 540;

  const shapeRenderData = useMemo(
    () => collectPptxShapeRenderData(slide.shapes as readonly Shape[]),
    [slide.shapes],
  );

  // Drag handlers — the fix for potx-editor
  useDragHandlers({
    drag: state.drag,
    selection: state.shapeSelection,
    slide: slide,
    width: px(width),
    height: px(height),
    canvasRef: containerRef,
    snapEnabled: false,
    snapStep: 1,
    dispatch,
  });

  // Canvas interaction handlers
  const handlers = useCanvasHandlers({
    selectedIds: state.shapeSelection.selectedIds,
    onSelect: (id, addToSelection, toggle) =>
      dispatch({ type: "SELECT_SHAPE", shapeId: id as ShapeId, addToSelection, toggle }),
    onSelectMultiple: (ids) =>
      dispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: ids as readonly ShapeId[] }),
    onClearSelection: () => dispatch({ type: "CLEAR_SHAPE_SELECTION" }),
    onStartMove: (startX, startY) =>
      dispatch({ type: "START_PENDING_MOVE", startX: px(startX), startY: px(startY), startClientX: 0, startClientY: 0 }),
    onStartResize: ({ handle, startX, startY, aspectLocked }) =>
      dispatch({ type: "START_PENDING_RESIZE", handle, startX: px(startX), startY: px(startY), startClientX: 0, startClientY: 0, aspectLocked }),
    onStartRotate: (startX, startY) =>
      dispatch({ type: "START_PENDING_ROTATE", startX: px(startX), startY: px(startY), startClientX: 0, startClientY: 0 }),
    onDoubleClick: (id) => dispatch({ type: "ENTER_TEXT_EDIT", shapeId: id as ShapeId }),
  });

  // Text edit handlers
  const { handleTextEditComplete, handleTextEditCancel, editingShapeId } = useTextEditHandlers({
    textEditState,
    onCommit: useCallback((shapeId: ShapeId, textBody: TextBody) => {
      dispatch({ type: "UPDATE_TEXT_BODY", shapeId, textBody });
    }, [dispatch]),
    onExit: useCallback(() => {
      dispatch({ type: "EXIT_TEXT_EDIT" } as PresentationEditorAction);
    }, [dispatch]),
  });

  const slideSize = useMemo(() => ({ width: px(width), height: px(height) }), []);

  // Text edit overlay
  const viewportOverlay = useMemo(() => {
    if (!isTextEditActive(textEditState)) return undefined;
    return (
      <TextEditController
        bounds={textEditState.bounds}
        textBody={textEditState.initialTextBody}
        slideWidth={width}
        slideHeight={height}
        onComplete={handleTextEditComplete}
        onCancel={handleTextEditCancel}
        showSelectionOverlay={true}
        showFrameOutline={false}
      />
    );
  }, [textEditState, handleTextEditComplete, handleTextEditCancel]);

  // Keyboard shortcuts (undo/redo, delete, copy/paste, select all, etc.) — SoT from pptx-editor
  useKeyboardShortcuts({
    dispatch,
    selection: state.shapeSelection,
    slide,
    primaryShape,
  });

  // Expose API to Puppeteer
  useEffect(() => {
    harnessWindow.getShapeIds = () =>
      slide.shapes
        .filter((s): s is Shape & { nonVisual: { id: ShapeId } } => "nonVisual" in s)
        .map((s) => s.nonVisual.id);

    harnessWindow.getShapeBounds = (id: string) => {
      const shape = slide.shapes.find((s) => "nonVisual" in s && s.nonVisual.id === id);
      if (!shape) return null;
      const t = getShapeTransform(shape);
      if (!t) return null;
      return {
        x: t.x as number, y: t.y as number,
        width: t.width as number, height: t.height as number,
        rotation: (t.rotation as number) ?? 0,
      };
    };

    harnessWindow.getSelectedIds = () => [...state.shapeSelection.selectedIds];
    harnessWindow.getDragType = () => state.drag.type;
    harnessWindow.getShapeCount = () => slide.shapes.length;

    harnessWindow.getTextEditState = () => ({
      active: textEditState.type === "active",
      shapeId: textEditState.type === "active" ? textEditState.shapeId : undefined,
    });

    harnessWindow.addShape = (type: string, preset?: string, x = 480, y = 270) => {
      const mode: CreationMode = preset
        ? { type: type as "shape", preset: preset as "rect" }
        : { type: type as "textbox" };
      const bounds = getDefaultBoundsForMode(mode, px(x), px(y));
      const shape = createShapeFromMode(mode, bounds);
      if (!shape) return null;
      dispatch({ type: "CREATE_SHAPE", shape });
      return "nonVisual" in shape ? shape.nonVisual.id : null;
    };

    harnessWindow.deleteSelectedShapes = () => {
      dispatch({ type: "DELETE_SHAPES", shapeIds: state.shapeSelection.selectedIds });
    };
  });

  const isInteracting = state.drag.type !== "idle";

  return (
    <div ref={containerRef} style={{ width, height, position: "relative" }}>
      <EditorCanvas
        ref={canvasRef}
        canvasWidth={width}
        canvasHeight={height}
        zoomMode={"fit" as ZoomMode}
        onZoomModeChange={() => {}}
        itemBounds={shapeRenderData as readonly EditorCanvasItemBounds[]}
        selectedIds={state.shapeSelection.selectedIds}
        primaryId={state.shapeSelection.primaryId}
        drag={state.drag}
        isInteracting={isInteracting}
        isTextEditing={isTextEditActive(textEditState)}
        showRotateHandle={!isTextEditActive(textEditState)}
        onItemPointerDown={handlers.handleItemPointerDown}
        onItemClick={handlers.handleItemClick}
        onItemDoubleClick={handlers.handleItemDoubleClick}
        onCanvasPointerDown={handlers.handleCanvasPointerDown}
        onCanvasClick={handlers.handleCanvasClick}
        onResizeStart={handlers.handleResizeStart}
        onRotateStart={handlers.handleRotateStart}
        enableMarquee={true}
        onMarqueeSelect={useCallback(
          (result: { readonly itemIds: readonly string[] }) => {
            dispatch({ type: "SELECT_MULTIPLE_SHAPES", shapeIds: result.itemIds as readonly ShapeId[] });
          },
          [dispatch],
        )}
        viewportOverlay={viewportOverlay}
        editingShapeId={editingShapeId}
      >
        <SlideRenderer
          slide={slide}
          slideSize={slideSize}
          editingShapeId={editingShapeId}
        />
      </EditorCanvas>
    </div>
  );
}

// =============================================================================
// Root
// =============================================================================

function Root() {
  const doc = useMemo(() => createTestDocument(), []);
  return (
    <PresentationEditorProvider initialDocument={doc}>
      <EditorHarness />
    </PresentationEditorProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(
  <StrictMode>
    <Root />
  </StrictMode>,
);

requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    harnessWindow.__ready = true;
    document.title = "ready";
  });
});
