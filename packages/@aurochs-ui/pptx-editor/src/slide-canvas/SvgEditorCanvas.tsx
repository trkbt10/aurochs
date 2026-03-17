/**
 * @file SVG Editor Canvas (PPTX)
 *
 * Thin wrapper around the shared EditorCanvas (editor-controls/canvas).
 * Handles PPTX-specific concerns: SlideRenderer, text editing, pen/path tools,
 * context menus, creation drag, and asset drops. All viewport/marquee/coordinate
 * management is delegated to EditorCanvas.
 */

import {
  useCallback,
  useEffect,
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
import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { SlideId } from "@aurochs-office/pptx/app";
import type { DragState, SelectionState, ResizeHandlePosition, PathEditState } from "../context/slide/state";
import { isPathEditEditing } from "../context/slide/state";
import type { CreationMode } from "../context/presentation/editor/types";
import { isPenMode, isPathMode } from "../context/presentation/editor/types";
import type { ResourceResolver } from "@aurochs-office/pptx/domain/resource-resolver";
import type { ResourceStore } from "@aurochs-office/pptx/domain/resource-store";
import type { ResolvedBackgroundFill, RenderOptions } from "@aurochs-renderer/pptx";
import type { DrawingPath } from "@aurochs-ui/path-tools";
import { PenToolOverlay, PathEditOverlay } from "@aurochs-ui/path-tools";
import { customGeometryToDrawingPath, isCustomGeometry } from "../path-tools/adapters";
import { collectShapeRenderData } from "../shape/traverse";
import { isPointInBounds } from "@aurochs-ui/editor-core/geometry";
import { createBoundsFromDrag } from "../shape/factory";
import type { ShapeBounds as CreationBounds } from "../shape/creation-bounds";
import { SlideContextMenu, type ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { SlideRenderer } from "@aurochs-renderer/pptx/react";
import {
  TextEditController,
  isTextEditActive,
  type TextEditState,
  type SelectionChangeEvent,
} from "../slide/text-edit";
import { colorTokens } from "@aurochs-ui/ui-components/design-tokens";
import {
  EditorCanvas,
  type EditorCanvasHandle,
  type EditorCanvasItemBounds,
  type CanvasPageCoords,
} from "@aurochs-ui/editor-controls/canvas";
import type { ViewportTransform } from "@aurochs-ui/editor-core/viewport";
import { INITIAL_VIEWPORT } from "@aurochs-ui/editor-core/viewport";
import type { ZoomMode } from "@aurochs-ui/editor-controls/zoom";
import { ASSET_DRAG_TYPE } from "../panels/inspector/AssetPanel";

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

type CreationDrag = {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
};

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

  // --- Viewport state (tracked for creation drag stroke scaling) ---
  const [viewport, setViewport] = useState<ViewportTransform>(INITIAL_VIEWPORT);
  const handleViewportChange = useCallback(
    (vp: ViewportTransform) => {
      setViewport(vp);
      onViewportChangeProp?.(vp);
    },
    [onViewportChangeProp],
  );

  // --- Context menu ---
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  // --- Creation drag ---
  const [creationDrag, setCreationDrag] = useState<CreationDrag | null>(null);
  const creationDragRef = useRef<CreationDrag | null>(null);
  const ignoreNextClickRef = useRef(false);

  // --- Shape data ---
  const shapeRenderData = useMemo(() => collectShapeRenderData(slide.shapes), [slide.shapes]);
  const primaryId = selection.selectedIds.length === 1 ? selection.selectedIds[0] : undefined;

  // --- Item events ---

  const handleItemPointerDown = useCallback(
    (id: string, coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (e.button !== 0) {return;}
      e.preventDefault();

      const shapeId = id as ShapeId;
      if (!selection.selectedIds.includes(shapeId)) {
        onSelect(shapeId, coords.addToSelection, coords.toggle);
      }

      if (onStartPendingMove) {
        onStartPendingMove({
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
        });
      } else {
        onStartMove(coords.pageX, coords.pageY);
      }
    },
    [selection.selectedIds, onSelect, onStartMove, onStartPendingMove],
  );

  const handleItemClick = useCallback(
    (id: string, coords: CanvasPageCoords) => {
      onSelect(id as ShapeId, coords.addToSelection, coords.toggle);
    },
    [onSelect],
  );

  const handleItemDoubleClick = useCallback(
    (id: string) => {
      onDoubleClick(id as ShapeId);
    },
    [onDoubleClick],
  );

  const handleItemContextMenu = useCallback(
    (id: string, coords: CanvasPageCoords) => {
      const shapeId = id as ShapeId;
      if (!selection.selectedIds.includes(shapeId)) {
        onSelect(shapeId, false);
      }
      setContextMenu({ x: coords.clientX, y: coords.clientY });
    },
    [selection.selectedIds, onSelect],
  );

  // --- Canvas events ---

  const handleCanvasPointerDown = useCallback(
    (coords: CanvasPageCoords, e: React.PointerEvent) => {
      // Cancel text edit on background click
      if (isTextEditActive(textEdit)) {
        onTextEditCancel();
        e.preventDefault(); // suppress marquee
        return;
      }

      // Creation drag (non-path modes)
      if (creationMode && creationMode.type !== "select" && !isPathMode(creationMode)) {
        e.preventDefault(); // suppress marquee
        const next: CreationDrag = {
          startX: coords.pageX,
          startY: coords.pageY,
          currentX: coords.pageX,
          currentY: coords.pageY,
        };
        creationDragRef.current = next;
        setCreationDrag(next);
        ignoreNextClickRef.current = false;
        return;
      }

      // Otherwise let EditorCanvas handle marquee
    },
    [creationMode, textEdit, onTextEditCancel],
  );

  const handleCanvasClick = useCallback(
    (coords: CanvasPageCoords) => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }

      if (isTextEditActive(textEdit)) {
        onTextEditCancel();
        return;
      }

      if (creationMode && creationMode.type !== "select" && onCreate) {
        onCreate(coords.pageX, coords.pageY);
        return;
      }

      onClearSelection();
    },
    [textEdit, onTextEditCancel, creationMode, onCreate, onClearSelection],
  );

  // --- Selection handles ---

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, coords: CanvasPageCoords, e: React.PointerEvent) => {
      if (onStartPendingResize) {
        onStartPendingResize({
          handle,
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
          aspectLocked: e.shiftKey,
        });
      } else {
        onStartResize({ handle, startX: coords.pageX, startY: coords.pageY, aspectLocked: e.shiftKey });
      }
    },
    [onStartResize, onStartPendingResize],
  );

  const handleRotateStart = useCallback(
    (coords: CanvasPageCoords) => {
      if (onStartPendingRotate) {
        onStartPendingRotate({
          startX: coords.pageX,
          startY: coords.pageY,
          startClientX: coords.clientX,
          startClientY: coords.clientY,
        });
      } else {
        onStartRotate(coords.pageX, coords.pageY);
      }
    },
    [onStartRotate, onStartPendingRotate],
  );

  // --- Marquee ---

  const handleMarqueeSelect = useCallback(
    (
      result: { readonly itemIds: readonly string[]; readonly rect: { readonly x: number; readonly y: number; readonly width: number; readonly height: number } },
      additive: boolean,
    ) => {
      const { itemIds } = result;

      if (itemIds.length === 0) {
        if (!additive) {onClearSelection();}
        return;
      }

      if (additive) {
        const combinedIds = [...selection.selectedIds];
        for (const id of itemIds) {
          if (!combinedIds.includes(id as ShapeId)) {combinedIds.push(id as ShapeId);}
        }
        onSelectMultiple(combinedIds);
      } else {
        onSelectMultiple(itemIds as readonly ShapeId[]);
      }
    },
    [selection.selectedIds, onSelectMultiple, onClearSelection],
  );

  // --- Creation drag: global listeners ---

  const finalizeCreationDrag = useCallback(
    (current: CreationDrag) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      if (dx <= 2 && dy <= 2) {return;}
      ignoreNextClickRef.current = true;
      if (onCreateFromDrag) {
        onCreateFromDrag(
          createBoundsFromDrag({
            startX: px(current.startX),
            startY: px(current.startY),
            endX: px(current.currentX),
            endY: px(current.currentY),
          }),
        );
      }
    },
    [onCreateFromDrag],
  );

  useEffect(() => {
    if (!creationDrag) {return;}

    const handleMove = (e: PointerEvent) => {
      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {return;}
      const next: CreationDrag = { ...creationDragRef.current!, currentX: page.pageX, currentY: page.pageY };
      creationDragRef.current = next;
      setCreationDrag(next);
    };

    const handleUp = () => {
      const current = creationDragRef.current;
      creationDragRef.current = null;
      setCreationDrag(null);
      if (current) {finalizeCreationDrag(current);}
    };

    const handleCancel = () => {
      creationDragRef.current = null;
      setCreationDrag(null);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp, { once: true });
    window.addEventListener("pointercancel", handleCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [creationDrag, finalizeCreationDrag]);

  const creationRect = useMemo(() => {
    if (!creationDrag) {return null;}
    return {
      x: Math.min(creationDrag.startX, creationDrag.currentX),
      y: Math.min(creationDrag.startY, creationDrag.currentY),
      width: Math.abs(creationDrag.currentX - creationDrag.startX),
      height: Math.abs(creationDrag.currentY - creationDrag.startY),
    };
  }, [creationDrag]);

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
      if (!assetData || !onAssetDrop) {return;}
      e.preventDefault();

      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {return;}

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
        // Invalid JSON from drag data - non-parseable asset payloads are expected
        // when other drag sources are active, so this is a no-op by design.
        if (error instanceof SyntaxError) { /* expected for malformed JSON */ }
      }
    },
    [onAssetDrop],
  );

  // --- Text edit overlay: click-outside handler ---
  const handleTextEditOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTextEditActive(textEdit)) {return;}
      const page = canvasRef.current?.screenToPage(e.clientX, e.clientY);
      if (!page) {return;}
      const bounds = textEdit.bounds;
      const isInside = isPointInBounds(page.pageX, page.pageY, {
        x: bounds.x as number,
        y: bounds.y as number,
        width: bounds.width as number,
        height: bounds.height as number,
        rotation: bounds.rotation,
      });
      if (!isInside) {onTextEditCancel();}
    },
    [textEdit, onTextEditCancel],
  );

  // --- Viewport overlay content ---
  const viewportOverlay = useMemo(() => {
    const elements: React.ReactNode[] = [];

    // Pen tool overlay
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

    // Path edit overlay
    if (pathEdit && isPathEditEditing(pathEdit) && onPathEditCommit && onPathEditCancel) {
      const editingShape = slide.shapes.find((s) => {
        if (s.type === "contentPart") {return false;}
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

    // Text edit controller
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

  // --- Enable marquee only in select mode ---
  const enableMarquee = !creationMode || creationMode.type === "select";

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

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
        onItemPointerDown={handleItemPointerDown}
        onItemClick={handleItemClick}
        onItemDoubleClick={handleItemDoubleClick}
        onItemContextMenu={handleItemContextMenu}
        onCanvasPointerDown={handleCanvasPointerDown}
        onCanvasClick={handleCanvasClick}
        onResizeStart={handleResizeStart}
        onRotateStart={handleRotateStart}
        enableMarquee={enableMarquee}
        onMarqueeSelect={handleMarqueeSelect}
        viewportOverlay={viewportOverlay}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Slide content */}
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

        {/* Creation drag rect */}
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

      {/* Context menu */}
      {contextMenu && (
        <SlideContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          primaryShape={primaryShape}
          selectedShapes={selectedShapes}
          actions={contextMenuActions}
          onClose={handleCloseContextMenu}
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
