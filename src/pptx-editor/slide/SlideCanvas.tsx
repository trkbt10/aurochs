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

import { useCallback, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { ColorContext, FontScheme } from "../../pptx/domain/resolution";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import type { DragState, SelectionState, ResizeHandlePosition } from "../state";
import type { CreationMode } from "../presentation/types";
import type { ResourceResolver, ResolvedBackgroundFill, RenderOptions } from "../../pptx/render/core/types";
import { clientToSlideCoords } from "../shape/coords";
import { collectShapeRenderData } from "../shape/traverse";
import { findShapeByIdWithParents } from "../shape/query";
import { getAbsoluteBounds } from "../shape/transform";
import { getCombinedBoundsWithRotation } from "../shape/bounds";
import { getSvgRotationTransformForBounds, normalizeAngle } from "../shape/rotate";
import { SlideContextMenu, type ContextMenuActions } from "./context-menu/SlideContextMenu";
import { SelectionBox } from "../selection/SelectionBox";
import { SlideRenderer } from "../../pptx/render/react";

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

  // Callbacks
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
  readonly onDoubleClick?: (shapeId: ShapeId) => void;

  // Creation mode
  readonly creationMode?: CreationMode;
  readonly onCreate?: (x: number, y: number) => void;
};

type ShapeBounds = {
  readonly id: ShapeId;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
  readonly isPrimary: boolean;
};

type BaseBounds = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
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
  onSelect,
  onClearSelection,
  onStartMove,
  onStartResize,
  onStartRotate,
  onDoubleClick,
  creationMode,
  onCreate,
}: SlideCanvasProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

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
          isPrimary: id === selection.primaryId,
        };
      })
      .filter((b): b is ShapeBounds => b !== undefined);
  }, [slide.shapes, selection.selectedIds, selection.primaryId, drag]);

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
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      onSelect(shapeId, addToSelection);
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

  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) {
        return;
      }
      e.stopPropagation();
      e.preventDefault();

      if (!isSelected(shapeId)) {
        const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
        onSelect(shapeId, addToSelection);
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

  return (
    <div className={className} style={containerStyle} onClick={handleContainerClick}>
      <div style={innerContainerStyle}>
        <svg style={svgStyle} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
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
                variant={bounds.isPrimary ? "primary" : "secondary"}
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
        </svg>
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
