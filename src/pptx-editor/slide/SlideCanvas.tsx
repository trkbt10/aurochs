/**
 * @file Slide canvas component
 *
 * Self-contained canvas for slide editing with:
 * - SVG rendering via React Renderer
 * - Shape hit areas for selection
 * - Selection boxes with resize/rotate handles
 * - Context menu
 *
 * This is a pure view component - all state is passed in as props.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ColorContext, FontScheme } from "../../pptx/domain/resolution";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import { px } from "../../pptx/domain/types";
import type { DragState, SelectionState, ResizeHandlePosition, PathEditState } from "../context/slide/state";
import { isPathEditEditing } from "../context/slide/state";
import type { CreationMode } from "../context/presentation/editor/types";
import { isPenMode, isPathMode } from "../context/presentation/editor/types";
import type { ResourceResolver, ResolvedBackgroundFill, RenderOptions } from "../../pptx/render/core/types";
import type { DrawingPath } from "../path-tools/types";
import { PenToolOverlay } from "../path-tools/components/PenToolOverlay";
import { PathEditOverlay } from "../path-tools/components/PathEditOverlay";
import { customGeometryToDrawingPath, isCustomGeometry } from "../path-tools/utils/path-commands";
import { clientToSlideCoords } from "../shape/coords";
import { collectShapeRenderData } from "../shape/traverse";
import { findShapeByIdWithParents } from "../shape/query";
import { getAbsoluteBounds } from "../shape/transform";
import { getCombinedBoundsWithRotation } from "../shape/bounds";
import { getSvgRotationTransformForBounds, normalizeAngle } from "../shape/rotate";
import { createBoundsFromDrag } from "../shape/factory";
import type { ShapeBounds as CreationBounds } from "../shape/creation-bounds";
import { SlideContextMenu, type ContextMenuActions } from "./context-menu/SlideContextMenu";
import { SelectionBox } from "../selection/SelectionBox";
import { SlideRenderer } from "../../pptx/render/react";
import { colorTokens } from "../ui/design-tokens";

// =============================================================================
// Types
// =============================================================================

export type SlideCanvasProps = {
  /** Current slide */
  readonly slide: Slide;
  /** Selection state */
  readonly selection: SelectionState;
  /** Drag state */
  readonly drag: DragState;
  /** Slide dimensions */
  readonly width: Pixels;
  readonly height: Pixels;
  /** Primary shape */
  readonly primaryShape: Shape | undefined;
  /** Selected shapes */
  readonly selectedShapes: readonly Shape[];
  /** Context menu actions */
  readonly contextMenuActions: ContextMenuActions;
  /** Whether to show shape hit areas (for debugging) */
  readonly debugHitAreas?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;

  // React Renderer props
  /** Color context for theme color resolution */
  readonly colorContext?: ColorContext;
  /** Resource resolver for images */
  readonly resources?: ResourceResolver;
  /** Font scheme for theme fonts */
  readonly fontScheme?: FontScheme;
  /** Pre-resolved background from inheritance chain */
  readonly resolvedBackground?: ResolvedBackgroundFill;
  /** Render options */
  readonly renderOptions?: Partial<RenderOptions>;
  /** ID of shape currently being edited (its text will be hidden) */
  readonly editingShapeId?: ShapeId;
  /**
   * Non-placeholder shapes from slide layout.
   * These are rendered before slide shapes (behind slide content).
   */
  readonly layoutShapes?: readonly Shape[];

  // Callbacks
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean, toggle?: boolean) => void;
  readonly onSelectMultiple: (shapeIds: readonly ShapeId[]) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onDoubleClick?: (shapeId: ShapeId) => void;

  // Creation mode
  readonly creationMode?: CreationMode;
  readonly onCreate?: (x: number, y: number) => void;
  readonly onCreateFromDrag?: (bounds: CreationBounds) => void;

  // Path tool callbacks
  readonly onPathCommit?: (path: DrawingPath) => void;
  readonly onPathCancel?: () => void;

  // Path edit state and callbacks
  readonly pathEdit?: PathEditState;
  readonly onPathEditCommit?: (path: DrawingPath, shapeId: ShapeId) => void;
  readonly onPathEditCancel?: () => void;
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

function applyMovePreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: Extract<DragState, { type: "move" }>
): BaseBounds {
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }
  const dx = drag.previewDelta.dx as number;
  const dy = drag.previewDelta.dy as number;
  const initial = drag.initialBounds.get(id);
  if (!initial) {
    return baseBounds;
  }
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
    return {
      newWidth: rawWidth,
      newHeight: rawHeight,
      newX: baseX + xDelta,
      newY: baseY + yDelta,
    };
  }

  const aspect = baseW / baseH;
  const isVerticalOnly = handle === "n" || handle === "s";
  const isHorizontalOnly = handle === "e" || handle === "w";

  const finalWidth = isVerticalOnly ? rawHeight * aspect : rawWidth;
  const finalHeight = isHorizontalOnly ? rawWidth / aspect : rawWidth / aspect;

  return {
    newWidth: finalWidth,
    newHeight: finalHeight,
    newX: baseX + xDelta,
    newY: baseY + yDelta,
  };
}

function applyResizePreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: Extract<DragState, { type: "resize" }>
): BaseBounds {
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }

  const dx = drag.previewDelta.dx as number;
  const dy = drag.previewDelta.dy as number;
  const { handle, combinedBounds: cb, initialBoundsMap, aspectLocked } = drag;
  const initial = initialBoundsMap.get(id);

  if (!initial || !cb) {
    return baseBounds;
  }

  const baseX = cb.x as number;
  const baseY = cb.y as number;
  const baseW = cb.width as number;
  const baseH = cb.height as number;

  const { newWidth, newHeight, newX, newY } = calculateResizedDimensions(
    handle,
    baseW,
    baseH,
    baseX,
    baseY,
    dx,
    dy,
    aspectLocked
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
  if (!drag.shapeIds.includes(id)) {
    return baseBounds;
  }

  const angleDelta = drag.previewAngleDelta as number;
  const initialRotation = drag.initialRotationsMap.get(id);

  if (initialRotation === undefined) {
    return baseBounds;
  }

  return {
    ...baseBounds,
    rotation: normalizeAngle((initialRotation as number) + angleDelta),
  };
}

function applyDragPreview(
  id: ShapeId,
  baseBounds: BaseBounds,
  drag: DragState
): BaseBounds {
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

/**
 * Self-contained slide canvas with rendering, selection, and interaction.
 */
export function SlideCanvas({
  slide,
  selection,
  drag,
  width,
  height,
  primaryShape,
  selectedShapes,
  contextMenuActions,
  debugHitAreas = false,
  className,
  style,
  colorContext,
  resources,
  fontScheme,
  resolvedBackground,
  renderOptions,
  editingShapeId,
  layoutShapes,
  onSelect,
  onSelectMultiple,
  onClearSelection,
  onStartMove,
  onStartResize,
  onStartRotate,
  onDoubleClick,
  creationMode,
  onCreate,
  onCreateFromDrag,
  onPathCommit,
  onPathCancel,
  pathEdit,
  onPathEditCommit,
  onPathEditCancel,
}: SlideCanvasProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<MarqueeSelection | null>(null);
  const [creationDrag, setCreationDrag] = useState<CreationDrag | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const marqueeRef = useRef<MarqueeSelection | null>(null);
  const creationDragRef = useRef<CreationDrag | null>(null);
  const ignoreNextClickRef = useRef(false);

  const widthNum = width as number;
  const heightNum = height as number;

  // Slide size for renderer
  const slideSize = useMemo(() => ({ width, height }), [width, height]);

  // Collect shape render data for hit areas
  const shapeRenderData = useMemo(() => collectShapeRenderData(slide.shapes), [slide.shapes]);

  // Get bounds for selected shapes (with preview delta applied during drag)
  const selectedBounds = useMemo(() => {
    return selection.selectedIds
      .map((id) => {
        const result = findShapeByIdWithParents(slide.shapes, id);
        if (!result) {
          return undefined;
        }

        const absoluteBounds = getAbsoluteBounds(result.shape, result.parentGroups);
        if (!absoluteBounds) {
          return undefined;
        }

        const baseBounds = {
          x: absoluteBounds.x,
          y: absoluteBounds.y,
          width: absoluteBounds.width,
          height: absoluteBounds.height,
          rotation: absoluteBounds.rotation,
        };

        const previewBounds = applyDragPreview(id, baseBounds, drag);

        return {
          id,
          ...previewBounds,
        };
      })
      .filter((b): b is ShapeBounds => b !== undefined);
  }, [slide.shapes, selection.selectedIds, drag]);

  const combinedBounds = useMemo(() => {
    if (selectedBounds.length <= 1) {
      return undefined;
    }
    return getCombinedBoundsWithRotation(selectedBounds);
  }, [selectedBounds]);

  const isMultiSelection = selectedBounds.length > 1;

  const isSelected = useCallback(
    (shapeId: ShapeId) => selection.selectedIds.includes(shapeId),
    [selection.selectedIds],
  );

  // Handlers
  const handleShapeClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
      const isToggle = e.metaKey || e.ctrlKey; // Cmd/Ctrl = toggle
      onSelect(shapeId, isModifierKey, isToggle);
    },
    [onSelect],
  );

  const handleShapeDoubleClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onDoubleClick) {
        onDoubleClick(shapeId);
      }
    },
    [onDoubleClick],
  );

  const handleContainerClick = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      // Only clear selection if clicking directly on the container (not bubbled from SVG)
      if (e.target === e.currentTarget) {
        onClearSelection();
      }
    },
    [onClearSelection],
  );

  const handleSvgBackgroundClick = useCallback(
    (e: MouseEvent<SVGRectElement>) => {
      e.stopPropagation();
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }
      // If in creation mode and onCreate is provided, create shape at click position
      if (creationMode && creationMode.type !== "select" && onCreate) {
        const svg = e.currentTarget.ownerSVGElement;
        if (svg) {
          const rect = svg.getBoundingClientRect();
          const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
          onCreate(coords.x, coords.y);
          return;
        }
      }
      onClearSelection();
    },
    [onClearSelection, creationMode, onCreate, widthNum, heightNum],
  );

  const handleSvgClick = useCallback(
    (e: MouseEvent<SVGSVGElement>) => {
      if (ignoreNextClickRef.current) {
        ignoreNextClickRef.current = false;
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) {
        return;
      }
      // If in creation mode and onCreate is provided, create shape at click position
      if (creationMode && creationMode.type !== "select" && onCreate) {
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
        onCreate(coords.x, coords.y);
        return;
      }
      onClearSelection();
    },
    [onClearSelection, creationMode, onCreate, widthNum, heightNum],
  );

  const handleSvgPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (e.button !== 0) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (target?.closest("[data-shape-id]")) {
        return;
      }
      if (creationMode && creationMode.type !== "select") {
        if (isPathMode(creationMode)) {
          return;
        }
        const rect = e.currentTarget.getBoundingClientRect();
        const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
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
      const rect = e.currentTarget.getBoundingClientRect();
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
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
    [creationMode, widthNum, heightNum],
  );

  const finalizeMarqueeSelection = useCallback(
    (current: MarqueeSelection) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      const dragged = dx > 2 || dy > 2;

      if (!dragged) {
        return;
      }

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
        if (!current.additive) {
          onClearSelection();
        }
        return;
      }

      if (current.additive) {
        const combinedIds = [...selection.selectedIds];
        for (const id of idsInRect) {
          if (!combinedIds.includes(id)) {
            combinedIds.push(id);
          }
        }
        onSelectMultiple(combinedIds);
        return;
      }

      onSelectMultiple(idsInRect);
    },
    [onClearSelection, onSelectMultiple, selection.selectedIds, shapeRenderData],
  );

  const finalizeCreationDrag = useCallback(
    (current: CreationDrag) => {
      const dx = Math.abs(current.currentX - current.startX);
      const dy = Math.abs(current.currentY - current.startY);
      const dragged = dx > 2 || dy > 2;

      if (!dragged) {
        return;
      }

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
    [onCreateFromDrag],
  );

  const handleWindowPointerMove = useCallback(
    (e: PointerEvent) => {
      const current = marqueeRef.current;
      if (!current) {
        return;
      }
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      const nextMarquee: MarqueeSelection = {
        ...current,
        currentX: coords.x,
        currentY: coords.y,
      };
      marqueeRef.current = nextMarquee;
      setMarquee(nextMarquee);
    },
    [widthNum, heightNum],
  );

  const handleWindowCreationPointerMove = useCallback(
    (e: PointerEvent) => {
      const current = creationDragRef.current;
      if (!current) {
        return;
      }
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) {
        return;
      }
      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      const nextDrag: CreationDrag = {
        ...current,
        currentX: coords.x,
        currentY: coords.y,
      };
      creationDragRef.current = nextDrag;
      setCreationDrag(nextDrag);
    },
    [widthNum, heightNum],
  );

  const handleWindowPointerUp = useCallback(() => {
    const current = marqueeRef.current;
    if (!current) {
      return;
    }
    marqueeRef.current = null;
    setMarquee(null);
    finalizeMarqueeSelection(current);
  }, [finalizeMarqueeSelection]);

  const handleWindowCreationPointerUp = useCallback(() => {
    const current = creationDragRef.current;
    if (!current) {
      return;
    }
    creationDragRef.current = null;
    setCreationDrag(null);
    finalizeCreationDrag(current);
  }, [finalizeCreationDrag]);

  useEffect(() => {
    if (!marquee) {
      return;
    }
    const handleWindowPointerCancel = () => {
      marqueeRef.current = null;
      setMarquee(null);
    };
    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowPointerUp, { once: true });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [marquee, handleWindowPointerMove, handleWindowPointerUp]);

  useEffect(() => {
    if (!creationDrag) {
      return;
    }
    const handleWindowPointerCancel = () => {
      creationDragRef.current = null;
      setCreationDrag(null);
    };
    window.addEventListener("pointermove", handleWindowCreationPointerMove);
    window.addEventListener("pointerup", handleWindowCreationPointerUp, { once: true });
    window.addEventListener("pointercancel", handleWindowPointerCancel, { once: true });
    return () => {
      window.removeEventListener("pointermove", handleWindowCreationPointerMove);
      window.removeEventListener("pointerup", handleWindowCreationPointerUp);
      window.removeEventListener("pointercancel", handleWindowPointerCancel);
    };
  }, [creationDrag, handleWindowCreationPointerMove, handleWindowCreationPointerUp]);

  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();

      if (!isSelected(shapeId)) {
        const isModifierKey = e.shiftKey || e.metaKey || e.ctrlKey;
        const isToggle = e.metaKey || e.ctrlKey;
        onSelect(shapeId, isModifierKey, isToggle);
      }

      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartMove(coords.x, coords.y);
    },
    [widthNum, heightNum, isSelected, onSelect, onStartMove],
  );

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartResize(handle, coords.x, coords.y, e.shiftKey);
    },
    [widthNum, heightNum, onStartResize],
  );

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) {
        return;
      }

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartRotate(coords.x, coords.y);
    },
    [widthNum, heightNum, onStartRotate],
  );

  const handleContextMenu = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!isSelected(shapeId)) {
        onSelect(shapeId, false);
      }

      setContextMenu({ x: e.clientX, y: e.clientY });
    },
    [isSelected, onSelect],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  // Styles
  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingBottom: `${(heightNum / widthNum) * 100}%`,
    overflow: "hidden",
    ...style,
  };

  const innerContainerStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  };

  const svgStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    cursor: drag.type !== "idle" ? "grabbing" : "default",
  };

  const selectionRect =
    marquee === null
      ? null
      : {
          x: Math.min(marquee.startX, marquee.currentX),
          y: Math.min(marquee.startY, marquee.currentY),
          width: Math.abs(marquee.currentX - marquee.startX),
          height: Math.abs(marquee.currentY - marquee.startY),
        };

  const creationRect =
    creationDrag === null
      ? null
      : {
          x: Math.min(creationDrag.startX, creationDrag.currentX),
          y: Math.min(creationDrag.startY, creationDrag.currentY),
          width: Math.abs(creationDrag.currentX - creationDrag.startX),
          height: Math.abs(creationDrag.currentY - creationDrag.startY),
        };

  return (
    <div className={className} style={containerStyle} onClick={handleContainerClick}>
      <div style={innerContainerStyle}>
        <svg
          ref={svgRef}
          style={svgStyle}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
          onClick={handleSvgClick}
          onPointerDown={handleSvgPointerDown}
        >
          {/* Background hit area for clicks */}
          <rect
            x={0}
            y={0}
            width={widthNum}
            height={heightNum}
            fill="transparent"
            onClick={handleSvgBackgroundClick}
            style={{ cursor: creationMode?.type !== "select" ? "crosshair" : "default" }}
          />

          {/* React-based slide renderer */}
          <SlideRenderer
            slide={slide}
            slideSize={slideSize}
            colorContext={colorContext}
            resources={resources}
            fontScheme={fontScheme}
            options={renderOptions}
            resolvedBackground={resolvedBackground}
            editingShapeId={editingShapeId}
            layoutShapes={layoutShapes}
          />

          {/* Hit areas for each shape */}
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
                fill={debugHitAreas ? "rgba(0, 100, 255, 0.1)" : "transparent"}
                stroke={debugHitAreas ? "rgba(0, 100, 255, 0.3)" : "none"}
                strokeWidth={1}
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
                showResizeHandles={!isMultiSelection}
                showRotateHandle={!isMultiSelection}
                onResizeStart={handleResizeStart}
                onRotateStart={handleRotateStart}
              />
            ))}

            {isMultiSelection && combinedBounds && (
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

          {selectionRect && (
            <rect
              x={selectionRect.x}
              y={selectionRect.y}
              width={selectionRect.width}
              height={selectionRect.height}
              fill={colorTokens.selection.primary}
              fillOpacity={0.12}
              stroke={colorTokens.selection.primary}
              strokeWidth={1}
              pointerEvents="none"
            />
          )}

          {creationRect && (
            <rect
              x={creationRect.x}
              y={creationRect.y}
              width={creationRect.width}
              height={creationRect.height}
              fill={colorTokens.selection.primary}
              fillOpacity={0.08}
              stroke={colorTokens.selection.primary}
              strokeWidth={1}
              strokeDasharray="4 3"
              pointerEvents="none"
            />
          )}
        </svg>

        {/* Pen tool overlay */}
        {creationMode && isPenMode(creationMode) && onPathCommit && onPathCancel && (
          <PenToolOverlay
            slideWidth={widthNum}
            slideHeight={heightNum}
            onCommit={onPathCommit}
            onCancel={onPathCancel}
            isActive={true}
          />
        )}

        {/* Path edit overlay */}
        {pathEdit && isPathEditEditing(pathEdit) && onPathEditCommit && onPathEditCancel && (() => {
          // Find the shape being edited
          const editingShape = slide.shapes.find((s) => {
            if (s.type === "contentPart") return false;
            return s.nonVisual.id === pathEdit.shapeId;
          });

          if (editingShape?.type !== "sp" || !isCustomGeometry(editingShape.properties.geometry)) {
            return null;
          }

          const transform = editingShape.properties.transform;
          if (!transform) return null;

          const shapeWidth = transform.width as number;
          const shapeHeight = transform.height as number;

          // Convert custom geometry to drawing path
          const drawingPath = customGeometryToDrawingPath(
            editingShape.properties.geometry,
            shapeWidth,
            shapeHeight
          );

          if (!drawingPath) return null;

          return (
            <PathEditOverlay
              initialPath={drawingPath}
              offsetX={transform.x as number}
              offsetY={transform.y as number}
              slideWidth={widthNum}
              slideHeight={heightNum}
              onCommit={(editedPath) => onPathEditCommit(editedPath, pathEdit.shapeId)}
              onCancel={onPathEditCancel}
              isActive={true}
            />
          );
        })()}
      </div>

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
}
