/**
 * @file SVG Editor Canvas (PPTX)
 *
 * PPTX-specific wrapper around EditorCanvas.
 * Uses useCanvasHandlers from ooxml-components for shared interaction patterns.
 * Adds PPTX-specific concerns: SlideRenderer, text editing, pen/path tools,
 * context menus, creation drag, and asset drops.
 */

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import type { Slide, Shape } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";
import type { FontScheme } from "@aurochs-office/ooxml/domain/font-scheme";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import type { SlideId } from "@aurochs-office/pptx/app";
import type { DragState, SelectionState, PathEditState } from "../context/slide/state";
import type { ResizeHandlePosition } from "@aurochs-ui/editor-core/drag-state";
import { isPathEditEditing } from "../context/slide/state";
import type { CreationMode } from "@aurochs-ui/ooxml-components";
import { isPenMode, isPathMode } from "../creation-mode-guards";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { ResolvedBackgroundFill } from "@aurochs-office/drawing-ml/domain/background-fill";
import type { RenderOptions } from "@aurochs-renderer/pptx";
import type { DrawingPath } from "@aurochs-ui/path-tools";
import { PenToolOverlay, PathEditOverlay } from "@aurochs-ui/path-tools";
import { customGeometryToDrawingPath, isCustomGeometry } from "../path-tools/adapters";
import { collectShapeRenderData } from "../shape/traverse";
import { isPointInBounds } from "@aurochs-ui/editor-core/geometry";
import type { ShapeBounds as CreationBounds } from "@aurochs-ui/ooxml-components";
import { SlideContextMenu, type ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import {
  TextEditController,
  isTextEditActive,
  type TextEditState,
  type SelectionChangeEvent,
} from "@aurochs-ui/ooxml-components/text-edit";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasItemBounds,
} from "@aurochs-ui/editor-controls/canvas";
import type { ViewportTransform } from "@aurochs-ui/editor-core/viewport";
import { INITIAL_VIEWPORT } from "@aurochs-ui/editor-core/viewport";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { ASSET_DRAG_TYPE } from "@aurochs-ui/ooxml-components/opc-embedded-assets";
import { useCanvasHandlers, useCreationDrag } from "@aurochs-ui/ooxml-components";

// =============================================================================
// Types
// =============================================================================

export type SvgEditorCanvasProps = {
  readonly slide: Slide;
  readonly slideId: SlideId;
  readonly selection: SelectionState;
  readonly drag: DragState;
  readonly width: Pixels;
  readonly height: Pixels;
  readonly primaryShape: Shape | undefined;
  readonly selectedShapes: readonly Shape[];
  readonly contextMenuActions: ContextMenuActions;
  readonly colorContext?: ColorContext;
  readonly resources?: ResourceResolver;
  readonly resourceStore?: ResourceStore;
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly renderOptions?: Partial<RenderOptions>;
  readonly editingShapeId?: ShapeId;
  readonly layoutShapes?: readonly Shape[];
  readonly embeddedFontCss?: string;
  readonly creationMode: CreationMode;
  readonly textEdit: TextEditState;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[]) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartPendingMove?: (args: {
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
  }) => void;
  readonly onStartResize: (args: {
    readonly handle: ResizeHandlePosition;
    readonly startX: number;
    readonly startY: number;
    readonly aspectLocked: boolean;
  }) => void;
  readonly onStartPendingResize?: (args: {
    readonly handle: ResizeHandlePosition;
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
    readonly aspectLocked: boolean;
  }) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onStartPendingRotate?: (args: {
    readonly startX: number;
    readonly startY: number;
    readonly startClientX: number;
    readonly startClientY: number;
  }) => void;
  readonly onDoubleClick: (shapeId: ShapeId) => void;
  readonly onCreate: (x: number, y: number) => void;
  readonly onCreateFromDrag?: (bounds: CreationBounds) => void;
  readonly onTextEditComplete: (text: string) => void;
  readonly onTextEditCancel: () => void;
  readonly onTextEditSelectionChange?: (event: SelectionChangeEvent) => void;
  readonly onPathCommit?: (path: DrawingPath) => void;
  readonly onPathCancel?: () => void;
  readonly pathEdit?: PathEditState;
  readonly onPathEditCommit?: (path: DrawingPath, shapeId: ShapeId) => void;
  readonly onPathEditCancel?: () => void;
  readonly zoomMode: ZoomMode;
  readonly onZoomModeChange: (mode: ZoomMode) => void;
  readonly onDisplayZoomChange?: (zoom: number) => void;
  readonly showRulers: boolean;
  readonly rulerThickness: number;
  readonly onViewportChange?: (viewport: ViewportTransform) => void;
  readonly onAssetDrop?: (x: number, y: number, assetData: AssetDropData) => void;
};

export type AssetDropData =
  | { readonly type: "image"; readonly dataUrl: string }
  | { readonly type: "ole"; readonly embedDataBase64: string; readonly extension: string; readonly name: string };

// =============================================================================
// Component
// =============================================================================

export const SvgEditorCanvas = forwardRef<HTMLDivElement, SvgEditorCanvasProps>(function SvgEditorCanvas(
  {
    slide,
    slideId: _slideId,
    selection,
    drag,
    width,
    height,
    primaryShape,
    selectedShapes,
    contextMenuActions,
    colorContext,
    resources,
    resourceStore,
    fontScheme,
    resolvedBackground,
    renderOptions,
    editingShapeId,
    layoutShapes,
    creationMode,
    textEdit,
    onSelect,
    onSelectMultiple,
    onClearSelection,
    onStartMove,
    onStartPendingMove,
    onStartResize,
    onStartPendingResize,
    onStartRotate,
    onStartPendingRotate,
    onDoubleClick,
    onCreate,
    onCreateFromDrag,
    onTextEditComplete,
    onTextEditCancel,
    onTextEditSelectionChange,
    onPathCommit,
    onPathCancel,
    pathEdit,
    onPathEditCommit,
    onPathEditCancel,
    zoomMode,
    onZoomModeChange,
    onDisplayZoomChange,
    showRulers,
    rulerThickness: rulerThicknessProp,
    onViewportChange: onViewportChangeProp,
    onAssetDrop,
    embeddedFontCss,
  },
  containerRef,
) {
  const widthNum = width as number;
  const heightNum = height as number;
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const slideSizeForRenderer = useMemo(() => ({ width, height }), [width, height]);

  // --- Viewport state ---
  const [viewport, setViewport] = useState<ViewportTransform>(INITIAL_VIEWPORT);
  const handleViewportChange = useCallback(
    (vp: ViewportTransform) => {
      setViewport(vp);
      onViewportChangeProp?.(vp);
    },
    [onViewportChangeProp],
  );

  // --- Shape data ---
  const shapeRenderData = useMemo(() => collectShapeRenderData(slide.shapes), [slide.shapes]);
  const primaryId = selection.selectedIds.length === 1 ? selection.selectedIds[0] : undefined;

  // --- Creation drag (shared hook) ---
  const { creationRect, handleBackgroundPointerDown, handleBackgroundClick } = useCreationDrag({
    creationMode,
    canvasRef,
    onCreateFromDrag,
    isPathMode,
    isTextEditing: isTextEditActive(textEdit),
    onTextEditCancel,
    onClickCreate: onCreate,
    onClearSelection,
  });

  // --- Shared interaction handlers from ooxml-components ---
  const handlers = useCanvasHandlers({
    selectedIds: selection.selectedIds,
    onSelect: onSelect as (id: string, addToSelection: boolean, toggle?: boolean) => void,
    onSelectMultiple: onSelectMultiple as (ids: readonly string[]) => void,
    onClearSelection,
    onStartMove,
    onStartPendingMove,
    onStartResize,
    onStartPendingResize,
    onStartRotate,
    onStartPendingRotate,
    onDoubleClick: onDoubleClick as (id: string) => void,
    onBackgroundPointerDown: handleBackgroundPointerDown,
    onBackgroundClick: handleBackgroundClick,
  });

  // --- Asset drop ---
  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(ASSET_DRAG_TYPE)) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    },
    [],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      const assetData = e.dataTransfer.getData(ASSET_DRAG_TYPE);
      if (!assetData || !onAssetDrop) {
        return;
      }
      e.preventDefault();

      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {
        return;
      }

      try {
        const parsed = JSON.parse(assetData) as {
          type?: string;
          dataUrl?: string;
          embedDataBase64?: string;
          extension?: string;
          name?: string;
        };
        if (parsed.type === "image" && parsed.dataUrl) {
          onAssetDrop(page.pageX, page.pageY, { type: "image", dataUrl: parsed.dataUrl });
        } else if (parsed.type === "ole" && parsed.embedDataBase64 && parsed.extension && parsed.name) {
          onAssetDrop(page.pageX, page.pageY, {
            type: "ole",
            embedDataBase64: parsed.embedDataBase64,
            extension: parsed.extension,
            name: parsed.name,
          });
        }
      } catch (error: unknown) {
        if (error instanceof SyntaxError) { /* expected for malformed JSON */ }
      }
    },
    [onAssetDrop],
  );

  // --- Text edit overlay: click-outside handler ---
  const handleTextEditOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTextEditActive(textEdit)) {
        return;
      }
      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {
        return;
      }
      const bounds = textEdit.bounds;
      const isInside = isPointInBounds(page.pageX, page.pageY, {
        x: bounds.x as number,
        y: bounds.y as number,
        width: bounds.width as number,
        height: bounds.height as number,
        rotation: bounds.rotation,
      });
      if (!isInside) {
        onTextEditCancel();
      }
    },
    [textEdit, onTextEditCancel],
  );

  // --- Viewport overlay content ---
  const viewportOverlay = useMemo(() => {
    const elements: React.ReactNode[] = [];

    if (creationMode && isPenMode(creationMode) && onPathCommit && onPathCancel) {
      elements.push(
        <PenToolOverlay
          key="pen"
          slideWidth={widthNum}
          slideHeight={heightNum}
          onCommit={onPathCommit}
          onCancel={onPathCancel}
          isActive={true}
        />,
      );
    }

    if (pathEdit && isPathEditEditing(pathEdit) && onPathEditCommit && onPathEditCancel) {
      const editingShape = slide.shapes.find((s) => {
        if (s.type === "contentPart") {
          return false;
        }
        return s.nonVisual.id === pathEdit.shapeId;
      });
      if (editingShape?.type === "sp" && isCustomGeometry(editingShape.properties.geometry)) {
        const shapeTransform = editingShape.properties.transform;
        if (shapeTransform) {
          const shapeWidth = shapeTransform.width as number;
          const shapeHeight = shapeTransform.height as number;
          const drawingPath = customGeometryToDrawingPath(editingShape.properties.geometry, shapeWidth, shapeHeight);
          if (drawingPath) {
            elements.push(
              <PathEditOverlay
                key="path-edit"
                initialPath={drawingPath}
                offsetX={shapeTransform.x as number}
                offsetY={shapeTransform.y as number}
                slideWidth={widthNum}
                slideHeight={heightNum}
                onCommit={(editedPath) => onPathEditCommit(editedPath, pathEdit.shapeId)}
                onCancel={onPathEditCancel}
                isActive={true}
              />,
            );
          }
        }
      }
    }

    if (isTextEditActive(textEdit)) {
      elements.push(
        <div key="text-edit" style={{ position: "absolute", inset: 0 }} onPointerDown={handleTextEditOverlayPointerDown}>
          <TextEditController
            bounds={textEdit.bounds}
            textBody={textEdit.initialTextBody}
            colorContext={colorContext}
            fontScheme={fontScheme}
            slideWidth={widthNum}
            slideHeight={heightNum}
            embeddedFontCss={embeddedFontCss}
            onComplete={onTextEditComplete}
            onCancel={onTextEditCancel}
            onSelectionChange={onTextEditSelectionChange}
            showSelectionOverlay={true}
            showFrameOutline={false}
          />
        </div>,
      );
    }

    return elements.length > 0 ? <>{elements}</> : undefined;
  }, [
    creationMode,
    onPathCommit,
    onPathCancel,
    pathEdit,
    onPathEditCommit,
    onPathEditCancel,
    slide.shapes,
    widthNum,
    heightNum,
    textEdit,
    handleTextEditOverlayPointerDown,
    colorContext,
    fontScheme,
    embeddedFontCss,
    onTextEditComplete,
    onTextEditCancel,
    onTextEditSelectionChange,
  ]);

  const enableMarquee = !creationMode || creationMode.type === "select";

  return (
    <div ref={containerRef} style={containerStyle}>
      <EditorCanvas
        ref={canvasRef}
        canvasWidth={widthNum}
        canvasHeight={heightNum}
        zoomMode={zoomMode}
        onZoomModeChange={onZoomModeChange}
        onDisplayZoomChange={onDisplayZoomChange}
        onViewportChange={handleViewportChange}
        showRulers={showRulers}
        rulerThickness={rulerThicknessProp}
        embeddedFontCss={embeddedFontCss}
        itemBounds={shapeRenderData as readonly EditorCanvasItemBounds[]}
        selectedIds={selection.selectedIds}
        primaryId={primaryId}
        drag={drag}
        isInteracting={drag.type !== "idle"}
        isTextEditing={isTextEditActive(textEdit)}
        showRotateHandle={true}
        onItemPointerDown={handlers.handleItemPointerDown}
        onItemClick={handlers.handleItemClick}
        onItemDoubleClick={handlers.handleItemDoubleClick}
        onItemContextMenu={handlers.handleItemContextMenu}
        onCanvasPointerDown={handlers.handleCanvasPointerDown}
        onCanvasClick={handlers.handleCanvasClick}
        onResizeStart={handlers.handleResizeStart}
        onRotateStart={handlers.handleRotateStart}
        enableMarquee={enableMarquee}
        onMarqueeSelect={handlers.handleMarqueeSelect}
        viewportOverlay={viewportOverlay}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <SlideRenderer
          slide={slide}
          slideSize={slideSizeForRenderer}
          colorContext={colorContext}
          resources={resources}
          resourceStore={resourceStore}
          fontScheme={fontScheme}
          options={renderOptions}
          resolvedBackground={resolvedBackground}
          editingShapeId={editingShapeId}
          layoutShapes={layoutShapes}
        />

        {creationRect && (
          <rect
            x={creationRect.x}
            y={creationRect.y}
            width={creationRect.width}
            height={creationRect.height}
            fill={colorTokens.selection.primary}
            fillOpacity={0.08}
            stroke={colorTokens.selection.primary}
            strokeWidth={1 / viewport.scale}
            strokeDasharray={`${4 / viewport.scale} ${3 / viewport.scale}`}
            pointerEvents="none"
          />
        )}
      </EditorCanvas>

      {handlers.contextMenu && (
        <SlideContextMenu
          x={handlers.contextMenu.x}
          y={handlers.contextMenu.y}
          primaryShape={primaryShape}
          selectedShapes={selectedShapes}
          actions={contextMenuActions}
          onClose={handlers.closeContextMenu}
        />
      )}
    </div>
  );
});

// =============================================================================
// Styles
// =============================================================================

const containerStyle: React.CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};
