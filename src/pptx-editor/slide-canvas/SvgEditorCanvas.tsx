/**
 * @file SVG Editor Canvas
 *
 * Unified SVG-based canvas component for slide editing.
 * Combines viewport management, rulers, slide rendering, and interaction handling.
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
  type CSSProperties,
  type MouseEvent,
} from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ColorContext } from "../../pptx/domain/color/context";
import type { FontScheme } from "../../pptx/domain/resolution";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import { px } from "../../pptx/domain/types";
import type { SlideId } from "../../pptx/app";
import type { DragState, SelectionState, ResizeHandlePosition, PathEditState } from "../context/slide/state";
import { isPathEditEditing } from "../context/slide/state";
import type { CreationMode } from "../context/presentation/editor/types";
import { isPenMode, isPathMode } from "../context/presentation/editor/types";
import type { ResourceResolver } from "../../pptx/domain/resource-resolver";
import type { ResolvedBackgroundFill } from "../../pptx/render/background-fill";
import type { RenderOptions } from "../../pptx/render/render-options";
import type { DrawingPath } from "../path-tools/types";
import { PenToolOverlay } from "../path-tools/components/PenToolOverlay";
import { PathEditOverlay } from "../path-tools/components/PathEditOverlay";
import { customGeometryToDrawingPath, isCustomGeometry } from "../path-tools/utils/path-commands";
import { collectShapeRenderData } from "../shape/traverse";
import { findShapeByIdWithParents } from "../shape/query";
import { getAbsoluteBounds } from "../shape/transform";
import { getCombinedBoundsWithRotation } from "../shape/bounds";
import { getSvgRotationTransformForBounds, normalizeAngle } from "../shape/rotate";
import { createBoundsFromDrag } from "../shape/factory";
import type { ShapeBounds as CreationBounds } from "../shape/creation-bounds";
import { SlideContextMenu, type ContextMenuActions } from "../slide/context-menu/SlideContextMenu";
import { SelectionBox } from "../selection/SelectionBox";
import { SlideRenderer } from "../../pptx/render/react";
import {
  TextEditController,
  isTextEditActive,
  type TextEditState,
  type SelectionChangeEvent,
} from "../slide/text-edit";
import { colorTokens } from "../ui/design-tokens";
import { SvgRulers } from "./SvgRulers";
import { ViewportOverlay } from "./ViewportOverlay";
import { useSvgViewport } from "./use-svg-viewport";
import { getTransformString, screenToSlideCoords, type ViewportTransform } from "../../pptx/render/svg-viewport";

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
  readonly fontScheme?: FontScheme;
  readonly resolvedBackground?: ResolvedBackgroundFill;
  readonly renderOptions?: Partial<RenderOptions>;
  readonly editingShapeId?: ShapeId;
  readonly layoutShapes?: readonly Shape[];
  readonly creationMode: CreationMode;
  readonly textEdit: TextEditState;
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[]) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
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
  readonly zoom: number;
  readonly onZoomChange: (value: number) => void;
  readonly showRulers: boolean;
  readonly rulerThickness: number;
  /** Callback when viewport transform changes (for drag coordinate conversion) */
  readonly onViewportChange?: (viewport: ViewportTransform) => void;
};

type ShapeBounds = {
  readonly id: ShapeId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

type BaseBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
};

type MarqueeSelection = {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly additive: boolean;
};

type CreationDrag = {
  readonly startX: number;
  readonly startY: number;
  readonly currentX: number;
  readonly currentY: number;
};

// =============================================================================
// Drag Preview Helpers
// =============================================================================

function isPointInBounds(
  x: number,
  y: number,
  bounds: { x: number; y: number; width: number; height: number; rotation: number },
): boolean {
  const centerX = bounds.x + bounds.width / 2;
  const centerY = bounds.y + bounds.height / 2;
  const dx = x - centerX;
  const dy = y - centerY;
  const angle = (-bounds.rotation * Math.PI) / 180;
  const rotatedX = dx * Math.cos(angle) - dy * Math.sin(angle);
  const rotatedY = dx * Math.sin(angle) + dy * Math.cos(angle);
  const halfWidth = bounds.width / 2;
  const halfHeight = bounds.height / 2;
  return Math.abs(rotatedX) <= halfWidth && Math.abs(rotatedY) <= halfHeight;
}

function applyMovePreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: Extract<DragState, { type: "move" }>
): BaseBounds {
  if (!drag.shapeIds.includes(id)) return baseBounds;
  const dx = drag.previewDelta.dx as number;
  const dy = drag.previewDelta.dy as number;
  const initial = drag.initialBounds.get(id);
  if (!initial) return baseBounds;
  return {
    ...baseBounds,
    x: (initial.x as number) + dx,
    y: (initial.y as number) + dy,
  };
}

function calculateResizedDimensions(
  handle: ResizeHandlePosition,
  baseW: number,
  baseH: number,
  baseX: number,
  baseY: number,
  dx: number,
  dy: number,
  aspectLocked: boolean
): { newWidth: number; newHeight: number; newX: number; newY: number } {
  const widthDelta = handle.includes("e") ? dx : handle.includes("w") ? -dx : 0;
  const heightDelta = handle.includes("s") ? dy : handle.includes("n") ? -dy : 0;
  const xDelta = handle.includes("w") ? dx : 0;
  const yDelta = handle.includes("n") ? dy : 0;

  const rawWidth = Math.max(10, baseW + widthDelta);
  const rawHeight = Math.max(10, baseH + heightDelta);

  if (!aspectLocked || baseW <= 0 || baseH <= 0) {
    return { newWidth: rawWidth, newHeight: rawHeight, newX: baseX + xDelta, newY: baseY + yDelta };
  }

  const aspect = baseW / baseH;
  const isVerticalOnly = handle === "n" || handle === "s";
  const isHorizontalOnly = handle === "e" || handle === "w";

  const finalWidth = isVerticalOnly ? rawHeight * aspect : rawWidth;
  const finalHeight = isHorizontalOnly ? rawWidth / aspect : rawWidth / aspect;

  return { newWidth: finalWidth, newHeight: finalHeight, newX: baseX + xDelta, newY: baseY + yDelta };
}

function applyResizePreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: Extract<DragState, { type: "resize" }>
): BaseBounds {
  if (!drag.shapeIds.includes(id)) return baseBounds;

  const dx = drag.previewDelta.dx as number;
  const dy = drag.previewDelta.dy as number;
  const { handle, combinedBounds: cb, initialBoundsMap, aspectLocked } = drag;
  const initial = initialBoundsMap.get(id);

  if (!initial || !cb) return baseBounds;

  const baseX = cb.x as number;
  const baseY = cb.y as number;
  const baseW = cb.width as number;
  const baseH = cb.height as number;

  const { newWidth, newHeight, newX, newY } = calculateResizedDimensions(
    handle, baseW, baseH, baseX, baseY, dx, dy, aspectLocked
  );

  const scaleX = baseW > 0 ? newWidth / baseW : 1;
  const scaleY = baseH > 0 ? newHeight / baseH : 1;

  const relX = (initial.x as number) - baseX;
  const relY = (initial.y as number) - baseY;

  return {
    x: newX + relX * scaleX,
    y: newY + relY * scaleY,
    width: (initial.width as number) * scaleX,
    height: (initial.height as number) * scaleY,
    rotation: baseBounds.rotation,
  };
}

function applyRotatePreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: Extract<DragState, { type: "rotate" }>
): BaseBounds {
  if (!drag.shapeIds.includes(id)) return baseBounds;

  const angleDelta = drag.previewAngleDelta as number;
  const initialRotation = drag.initialRotationsMap.get(id);

  if (initialRotation === undefined) return baseBounds;

  return {
    ...baseBounds,
    rotation: normalizeAngle((initialRotation as number) + angleDelta),
  };
}

function applyDragPreview(id: ShapeId, baseBounds: BaseBounds, drag: DragState): BaseBounds {
  switch (drag.type) {
    case "move":
      return applyMovePreview(id, baseBounds, drag);
    case "resize":
      return applyResizePreview(id, baseBounds, drag);
    case "rotate":
      return applyRotatePreview(id, baseBounds, drag);
    default:
      return baseBounds;
  }
}

// =============================================================================
// Component
// =============================================================================

const containerStyle: CSSProperties = {
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
};

/**
 * Unified SVG-based editor canvas.
 */
export const SvgEditorCanvas = forwardRef<HTMLDivElement, SvgEditorCanvasProps>(function SvgEditorCanvas(
  {
    slide,
    slideId,
    selection,
    drag,
    width,
    height,
    primaryShape,
    selectedShapes,
    contextMenuActions,
    colorContext,
    resources,
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
    onStartResize,
    onStartRotate,
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
    zoom,
    onZoomChange,
    showRulers,
    rulerThickness: rulerThicknessProp,
    onViewportChange,
  },
  containerRef
) {
  const widthNum = width as number;
  const heightNum = height as number;
  const rulerThickness = showRulers ? rulerThicknessProp : 0;

  // slideSize for SlideRenderer (uses Pixels branded type)
  const slideSizeForRenderer = useMemo(() => ({ width, height }), [width, height]);

  // slideSize for viewport calculations (uses plain numbers)
  const slideSize = useMemo(() => ({ width: widthNum, height: heightNum }), [widthNum, heightNum]);

  // Viewport management
  const {
    svgRef,
    viewport,
    viewportSize,
    handleWheel,
    handlePanStart,
    handlePanMove,
    handlePanEnd,
    isPanning,
  } = useSvgViewport({
    slideSize,
    rulerThickness,
    zoom,
    onZoomChange,
    autoCenter: true,
  });

  // Notify parent of viewport changes
  useEffect(() => {
    onViewportChange?.(viewport);
  }, [viewport, onViewportChange]);

  // State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeSelection | null>(null);
  const [creationDrag, setCreationDrag] = useState<CreationDrag | null>(null);
  const marqueeRef = useRef<MarqueeSelection | null>(null);
  const creationDragRef = useRef<CreationDrag | null>(null);
  const ignoreNextClickRef = useRef(false);
  const lastSlideIdRef = useRef<SlideId | null>(null);

  // Reset on slide change
  useEffect(() => {
    if (lastSlideIdRef.current !== slideId) {
      lastSlideIdRef.current = slideId;
    }
  }, [slideId]);

  // Register wheel handler
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    svg.addEventListener("wheel", handleWheel, { passive: false });
    return () => svg.removeEventListener("wheel", handleWheel);
  }, [svgRef, handleWheel]);

  // Collect shape render data
  const shapeRenderData = useMemo(() => collectShapeRenderData(slide.shapes), [slide.shapes]);

  // Get selected shape bounds with drag preview
  const selectedBounds = useMemo(() => {
    return selection.selectedIds
      .map((id) => {
        const result = findShapeByIdWithParents(slide.shapes, id);
        if (!result) return undefined;

        const absoluteBounds = getAbsoluteBounds(result.shape, result.parentGroups);
        if (!absoluteBounds) return undefined;

        const baseBounds = {
          x: absoluteBounds.x,
          y: absoluteBounds.y,
          width: absoluteBounds.width,
          height: absoluteBounds.height,
          rotation: absoluteBounds.rotation,
        };

        const previewBounds = applyDragPreview(id, baseBounds, drag);
        return { id, ...previewBounds };
      })
      .filter((b): b is ShapeBounds => b !== undefined);
  }, [slide.shapes, selection.selectedIds, drag]);

  const combinedBounds = useMemo(() => {
    if (selectedBounds.length <= 1) return undefined;
    return getCombinedBoundsWithRotation(selectedBounds);
  }, [selectedBounds]);

  const isMultiSelection = selectedBounds.length > 1;

  const isSelected = useCallback(
    (shapeId: ShapeId) => selection.selectedIds.includes(shapeId),
    [selection.selectedIds]
  );

  // Convert client coords to slide coords
  const clientToSlide = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return screenToSlideCoords(clientX, clientY, rect, viewport, rulerThickness);
    },
    [svgRef, viewport, rulerThickness]
  );

  // Handlers
  const handleShapeClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
      const isToggle = e.metaKey || e.ctrlKey;
      onSelect(shapeId, isModifierKey, isToggle);
    },
    [onSelect]
  );

  const handleShapeDoubleClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onDoubleClick(shapeId);
    },
    [onDoubleClick]
  );

  const handleSvgClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) return;

      if (isTextEditActive(textEdit)) {
        onTextEditCancel();
        return;
      }

      if (creationMode && creationMode.type !== "select" && onCreate) {
        const coords = clientToSlide(e.clientX, e.clientY);
        onCreate(coords.x, coords.y);
        return;
      }
      onClearSelection();
    },
    [onClearSelection, creationMode, onCreate, clientToSlide, textEdit, onTextEditCancel]
  );

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      // Check for pan gesture first
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        handlePanStart(e);
        return;
      }

      if (e.button !== 0) return;

      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) return;

      if (isTextEditActive(textEdit)) {
        onTextEditCancel();
        e.preventDefault();
        return;
      }

      // Creation drag
      if (creationMode && creationMode.type !== "select") {
        if (isPathMode(creationMode)) return;
        const coords = clientToSlide(e.clientX, e.clientY);
        const nextDrag: CreationDrag = {
          startX: coords.x,
          startY: coords.y,
          currentX: coords.x,
          currentY: coords.y,
        };
        creationDragRef.current = nextDrag;
        setCreationDrag(nextDrag);
        ignoreNextClickRef.current = false;
        e.preventDefault();
        return;
      }

      // Marquee selection
      const coords = clientToSlide(e.clientX, e.clientY);
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      const nextMarquee: MarqueeSelection = {
        startX: coords.x,
        startY: coords.y,
        currentX: coords.x,
        currentY: coords.y,
        additive,
      };
      marqueeRef.current = nextMarquee;
      setMarquee(nextMarquee);
      ignoreNextClickRef.current = false;
      e.preventDefault();
    },
    [creationMode, clientToSlide, handlePanStart, textEdit, onTextEditCancel]
  );

  const handleTextEditOverlayPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isTextEditActive(textEdit)) {
        return;
      }
      const coords = clientToSlide(e.clientX, e.clientY);
      const bounds = textEdit.bounds;
      const isInside = isPointInBounds(coords.x, coords.y, {
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
    [clientToSlide, onTextEditCancel, textEdit],
  );

  // Marquee finalization
  const finalizeMarqueeSelection = useCallback(
    (current: MarqueeSelection) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      const dragged = dx > 2 || dy > 2;

      if (!dragged) return;

      ignoreNextClickRef.current = true;

      const rectX = Math.min(current.startX, current.currentX);
      const rectY = Math.min(current.startY, current.currentY);
      const rectW = Math.abs(current.currentX - current.startX);
      const rectH = Math.abs(current.currentY - current.startY);

      const idsInRect = shapeRenderData
        .filter((shape) => {
          const shapeRight = shape.x + shape.width;
          const shapeBottom = shape.y + shape.height;
          const rectRight = rectX + rectW;
          const rectBottom = rectY + rectH;
          return shapeRight >= rectX && shape.x <= rectRight && shapeBottom >= rectY && shape.y <= rectBottom;
        })
        .map((shape) => shape.id);

      if (idsInRect.length === 0) {
        if (!current.additive) onClearSelection();
        return;
      }

      if (current.additive) {
        const combinedIds = [...selection.selectedIds];
        for (const id of idsInRect) {
          if (!combinedIds.includes(id)) combinedIds.push(id);
        }
        onSelectMultiple(combinedIds);
        return;
      }

      onSelectMultiple(idsInRect);
    },
    [onClearSelection, onSelectMultiple, selection.selectedIds, shapeRenderData]
  );

  // Creation drag finalization
  const finalizeCreationDrag = useCallback(
    (current: CreationDrag) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      const dragged = dx > 2 || dy > 2;

      if (!dragged) return;

      ignoreNextClickRef.current = true;

      if (onCreateFromDrag) {
        const bounds = createBoundsFromDrag(
          px(current.startX),
          px(current.startY),
          px(current.currentX),
          px(current.currentY)
        );
        onCreateFromDrag(bounds);
      }
    },
    [onCreateFromDrag]
  );

  // Window pointer handlers for marquee/creation
  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      // Handle pan
      if (isPanning) {
        handlePanMove(e);
        return;
      }

      const current = marqueeRef.current;
      if (current) {
        const coords = clientToSlide(e.clientX, e.clientY);
        const nextMarquee: MarqueeSelection = { ...current, currentX: coords.x, currentY: coords.y };
        marqueeRef.current = nextMarquee;
        setMarquee(nextMarquee);
        return;
      }

      const creationCurrent = creationDragRef.current;
      if (creationCurrent) {
        const coords = clientToSlide(e.clientX, e.clientY);
        const nextDrag: CreationDrag = { ...creationCurrent, currentX: coords.x, currentY: coords.y };
        creationDragRef.current = nextDrag;
        setCreationDrag(nextDrag);
      }
    },
    [isPanning, handlePanMove, clientToSlide]
  );

  const handleWindowPointerUp = useCallback(() => {
    if (isPanning) {
      handlePanEnd();
      return;
    }

    const current = marqueeRef.current;
    if (current) {
      marqueeRef.current = null;
      setMarquee(null);
      finalizeMarqueeSelection(current);
      return;
    }

    const creationCurrent = creationDragRef.current;
    if (creationCurrent) {
      creationDragRef.current = null;
      setCreationDrag(null);
      finalizeCreationDrag(creationCurrent);
    }
  }, [isPanning, handlePanEnd, finalizeMarqueeSelection, finalizeCreationDrag]);

  // Register window listeners
  useEffect(() => {
    if (!marquee && !creationDrag && !isPanning) return;

    const handleCancel = () => {
      marqueeRef.current = null;
      creationDragRef.current = null;
      setMarquee(null);
      setCreationDrag(null);
      handlePanEnd();
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp, { once: true });
    window.addEventListener("pointercancel", handleCancel, { once: true });

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleCancel);
    };
  }, [marquee, creationDrag, isPanning, handleWindowPointerMove, handleWindowPointerUp, handlePanEnd]);

  // Shape interaction handlers
  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      if (!isSelected(shapeId)) {
        const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
        const isToggle = e.metaKey || e.ctrlKey;
        onSelect(shapeId, isModifierKey, isToggle);
      }

      const coords = clientToSlide(e.clientX, e.clientY);
      onStartMove(coords.x, coords.y);
    },
    [isSelected, onSelect, onStartMove, clientToSlide]
  );

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      const coords = clientToSlide(e.clientX, e.clientY);
      onStartResize(handle, coords.x, coords.y, e.shiftKey);
    },
    [onStartResize, clientToSlide]
  );

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      const coords = clientToSlide(e.clientX, e.clientY);
      onStartRotate(coords.x, coords.y);
    },
    [onStartRotate, clientToSlide]
  );

  const handleContextMenu = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!isSelected(shapeId)) onSelect(shapeId, false);
      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [isSelected, onSelect]
  );

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), []);

  // Selection/creation rect calculation
  const selectionRect = useMemo(() => {
    if (marquee === null) return null;
    return {
      x: Math.min(marquee.startX, marquee.currentX),
      y: Math.min(marquee.startY, marquee.currentY),
      width: Math.abs(marquee.currentX - marquee.startX),
      height: Math.abs(marquee.currentY - marquee.startY),
    };
  }, [marquee]);

  const creationRect = useMemo(() => {
    if (creationDrag === null) return null;
    return {
      x: Math.min(creationDrag.startX, creationDrag.currentX),
      y: Math.min(creationDrag.startY, creationDrag.currentY),
      width: Math.abs(creationDrag.currentX - creationDrag.startX),
      height: Math.abs(creationDrag.currentY - creationDrag.startY),
    };
  }, [creationDrag]);

  // SVG styles
  const svgStyle: CSSProperties = {
    display: "block",
    width: "100%",
    height: "100%",
    cursor: isPanning ? "grabbing" : drag.type !== "idle" ? "grabbing" : "default",
    backgroundColor: colorTokens.background.tertiary,
  };

  // Canvas background style
  const canvasBgStyle: CSSProperties = {
    filter: "drop-shadow(0 4px 24px rgba(0, 0, 0, 0.4))",
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <svg
        ref={svgRef}
        style={svgStyle}
        onClick={handleSvgClick}
        onPointerDown={handleSvgPointerDown}
      >
        {/* Canvas viewport group with pan/zoom transform */}
        <g transform={`translate(${rulerThickness}, ${rulerThickness})`}>
          <g transform={getTransformString(viewport)}>
            {/* Slide background */}
            <rect
              x={0}
              y={0}
              width={widthNum}
              height={heightNum}
              fill="white"
              style={canvasBgStyle}
            />

            {/* Slide content */}
            <SlideRenderer
              slide={slide}
              slideSize={slideSizeForRenderer}
              colorContext={colorContext}
              resources={resources}
              fontScheme={fontScheme}
              options={renderOptions}
              resolvedBackground={resolvedBackground}
              editingShapeId={editingShapeId}
              layoutShapes={layoutShapes}
            />

            {/* Hit areas for shapes */}
            {shapeRenderData.map((shape) => (
              <g
                key={`hit-${shape.id}`}
                transform={getSvgRotationTransformForBounds(shape.rotation, shape.x, shape.y, shape.width, shape.height)}
              >
                <rect
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill="transparent"
                  style={{ cursor: "pointer" }}
                  onClick={(e) => handleShapeClick(shape.id, e)}
                  onDoubleClick={(e) => handleShapeDoubleClick(shape.id, e)}
                  onPointerDown={(e) => handlePointerDown(shape.id, e)}
                  onContextMenu={(e) => handleContextMenu(shape.id, e)}
                  data-shape-id={shape.id}
                />
              </g>
            ))}

            {/* Selection boxes */}
            <g style={{ pointerEvents: "auto" }}>
              {selectedBounds.map((bounds) => (
                <SelectionBox
                  key={bounds.id}
                  x={bounds.x}
                  y={bounds.y}
                  width={bounds.width}
                  height={bounds.height}
                  rotation={bounds.rotation}
                  variant="primary"
                  showResizeHandles={!isTextEditActive(textEdit) && !isMultiSelection}
                  showRotateHandle={!isTextEditActive(textEdit) && !isMultiSelection}
                  onResizeStart={handleResizeStart}
                  onRotateStart={handleRotateStart}
                />
              ))}

              {!isTextEditActive(textEdit) && isMultiSelection && combinedBounds && (
                <SelectionBox
                  x={combinedBounds.x}
                  y={combinedBounds.y}
                  width={combinedBounds.width}
                  height={combinedBounds.height}
                  variant="multi"
                  onResizeStart={handleResizeStart}
                  onRotateStart={handleRotateStart}
                />
              )}
            </g>

            {/* Marquee selection rect */}
            {selectionRect && (
              <rect
                x={selectionRect.x}
                y={selectionRect.y}
                width={selectionRect.width}
                height={selectionRect.height}
                fill={colorTokens.selection.primary}
                fillOpacity={0.12}
                stroke={colorTokens.selection.primary}
                strokeWidth={1 / viewport.scale}
                pointerEvents="none"
              />
            )}

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
          </g>
        </g>

        {/* Rulers (viewport-fixed) */}
        <SvgRulers
          viewport={viewport}
          viewportSize={viewportSize}
          slideSize={slideSize}
          rulerThickness={rulerThicknessProp}
          visible={showRulers}
        />
      </svg>

      {/* Pen tool overlay */}
      {creationMode && isPenMode(creationMode) && onPathCommit && onPathCancel && (
        <ViewportOverlay
          viewport={viewport}
          viewportSize={viewportSize}
          slideWidth={widthNum}
          slideHeight={heightNum}
          rulerThickness={rulerThickness}
        >
          <PenToolOverlay
            slideWidth={widthNum}
            slideHeight={heightNum}
            onCommit={onPathCommit}
            onCancel={onPathCancel}
            isActive={true}
          />
        </ViewportOverlay>
      )}

      {/* Path edit overlay */}
      {pathEdit && isPathEditEditing(pathEdit) && onPathEditCommit && onPathEditCancel && (() => {
        const editingShape = slide.shapes.find((s) => {
          if (s.type === "contentPart") return false;
          return s.nonVisual.id === pathEdit.shapeId;
        });

        if (editingShape?.type !== "sp" || !isCustomGeometry(editingShape.properties.geometry)) {
          return null;
        }

        const shapeTransform = editingShape.properties.transform;
        if (!shapeTransform) return null;

        const shapeWidth = shapeTransform.width as number;
        const shapeHeight = shapeTransform.height as number;

        const drawingPath = customGeometryToDrawingPath(
          editingShape.properties.geometry,
          shapeWidth,
          shapeHeight
        );

        if (!drawingPath) return null;

        return (
          <ViewportOverlay
            viewport={viewport}
            viewportSize={viewportSize}
            slideWidth={widthNum}
            slideHeight={heightNum}
            rulerThickness={rulerThickness}
          >
            <PathEditOverlay
              initialPath={drawingPath}
              offsetX={shapeTransform.x as number}
              offsetY={shapeTransform.y as number}
              slideWidth={widthNum}
              slideHeight={heightNum}
              onCommit={(editedPath) => onPathEditCommit(editedPath, pathEdit.shapeId)}
              onCancel={onPathEditCancel}
              isActive={true}
            />
          </ViewportOverlay>
        );
      })()}

      {/* Text edit controller */}
      {isTextEditActive(textEdit) && (
        <ViewportOverlay
          viewport={viewport}
          viewportSize={viewportSize}
          slideWidth={widthNum}
          slideHeight={heightNum}
          rulerThickness={rulerThickness}
        >
          <div
            style={{ position: "absolute", inset: 0 }}
            onPointerDown={handleTextEditOverlayPointerDown}
          >
            <TextEditController
              bounds={textEdit.bounds}
              textBody={textEdit.initialTextBody}
              colorContext={colorContext}
              fontScheme={fontScheme}
              slideWidth={widthNum}
              slideHeight={heightNum}
              onComplete={onTextEditComplete}
              onCancel={onTextEditCancel}
              onSelectionChange={onTextEditSelectionChange}
              showSelectionOverlay={true}
              showFrameOutline={false}
            />
          </div>
        </ViewportOverlay>
      )}

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
