/**
 * @file Slide canvas component
 *
 * Self-contained canvas for slide editing with:
 * - SVG rendering
 * - Shape hit areas for selection
 * - Selection boxes with resize/rotate handles
 * - Context menu
 *
 * This is a pure view component - all state is passed in as props.
 */

import { useCallback, useMemo, useState, type CSSProperties, type MouseEvent } from "react";
import type { Slide, Shape } from "../../pptx/domain";
import type { Pixels, ShapeId } from "../../pptx/domain/types";
import type { DragState, SelectionState, ResizeHandlePosition } from "../state";
import { clientToSlideCoords } from "../shape/coords";
import { collectShapeRenderData } from "../shape/traverse";
import { findShapeByIdWithParents } from "../shape/query";
import { getAbsoluteBounds } from "../shape/transform";
import { SlideContextMenu, type ContextMenuActions } from "./context-menu/SlideContextMenu";
import { SelectionBox } from "./components/SelectionBox";
import { MultiSelectionBox } from "./components/MultiSelectionBox";

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
  /** Pre-rendered SVG content */
  readonly svgContent?: string;
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

  // Callbacks
  readonly onSelect: (shapeId: ShapeId, addToSelection: boolean) => void;
  readonly onClearSelection: () => void;
  readonly onStartMove: (startX: number, startY: number) => void;
  readonly onStartResize: (handle: ResizeHandlePosition, startX: number, startY: number, aspectLocked: boolean) => void;
  readonly onStartRotate: (startX: number, startY: number) => void;
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

// =============================================================================
// Helper Functions
// =============================================================================

function getRotationTransform(
  rotation: number,
  x: number,
  y: number,
  width: number,
  height: number
): string | undefined {
  if (rotation === 0) return undefined;
  return `rotate(${rotation}, ${x + width / 2}, ${y + height / 2})`;
}

function getRotatedCorners(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): Array<{ x: number; y: number }> {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];

  return corners.map((corner) => {
    const dx = corner.x - centerX;
    const dy = corner.y - centerY;
    return {
      x: centerX + dx * cos - dy * sin,
      y: centerY + dx * sin + dy * cos,
    };
  });
}

function calculateCombinedBounds(
  bounds: readonly ShapeBounds[]
): { x: number; y: number; width: number; height: number } | undefined {
  if (bounds.length === 0) return undefined;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const b of bounds) {
    if (b.rotation !== 0) {
      const corners = getRotatedCorners(b.x, b.y, b.width, b.height, b.rotation);
      for (const corner of corners) {
        minX = Math.min(minX, corner.x);
        minY = Math.min(minY, corner.y);
        maxX = Math.max(maxX, corner.x);
        maxY = Math.max(maxY, corner.y);
      }
    } else {
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    }
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
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
  svgContent,
  width,
  height,
  primaryShape,
  selectedShapes,
  contextMenuActions,
  debugHitAreas = false,
  className,
  style,
  onSelect,
  onClearSelection,
  onStartMove,
  onStartResize,
  onStartRotate,
}: SlideCanvasProps) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const widthNum = width as number;
  const heightNum = height as number;

  // Extract inner SVG content
  const svgInnerContent = useMemo(() => {
    if (!svgContent) return undefined;
    const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match?.[1] ?? undefined;
  }, [svgContent]);

  // Collect shape render data for hit areas
  const shapeRenderData = useMemo(
    () => collectShapeRenderData(slide.shapes),
    [slide.shapes]
  );

  // Get bounds for selected shapes
  const selectedBounds = useMemo(() => {
    const bounds: ShapeBounds[] = [];

    for (const id of selection.selectedIds) {
      const result = findShapeByIdWithParents(slide.shapes, id);
      if (!result) continue;

      const absoluteBounds = getAbsoluteBounds(result.shape, result.parentGroups);
      if (!absoluteBounds) continue;

      bounds.push({
        id,
        x: absoluteBounds.x,
        y: absoluteBounds.y,
        width: absoluteBounds.width,
        height: absoluteBounds.height,
        rotation: absoluteBounds.rotation,
        isPrimary: id === selection.primaryId,
      });
    }

    return bounds;
  }, [slide.shapes, selection.selectedIds, selection.primaryId]);

  const combinedBounds = useMemo(() => {
    if (selectedBounds.length <= 1) return undefined;
    return calculateCombinedBounds(selectedBounds);
  }, [selectedBounds]);

  const isMultiSelection = selectedBounds.length > 1;

  const isSelected = useCallback(
    (shapeId: ShapeId) => selection.selectedIds.includes(shapeId),
    [selection.selectedIds]
  );

  // Handlers
  const handleShapeClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
      onSelect(shapeId, addToSelection);
    },
    [onSelect]
  );

  const handleBackgroundClick = useCallback(() => {
    onClearSelection();
  }, [onClearSelection]);

  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();

      if (!isSelected(shapeId)) {
        const addToSelection = e.shiftKey || e.metaKey || e.ctrlKey;
        onSelect(shapeId, addToSelection);
      }

      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartMove(coords.x, coords.y);
    },
    [widthNum, heightNum, isSelected, onSelect, onStartMove]
  );

  const handleResizeStart = useCallback(
    (handle: ResizeHandlePosition, e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartResize(handle, coords.x, coords.y, e.shiftKey);
    },
    [widthNum, heightNum, onStartResize]
  );

  const handleRotateStart = useCallback(
    (e: React.PointerEvent) => {
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, widthNum, heightNum);
      onStartRotate(coords.x, coords.y);
    },
    [widthNum, heightNum, onStartRotate]
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
    [isSelected, onSelect]
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
    <div className={className} style={containerStyle} onClick={handleBackgroundClick}>
      <div style={innerContainerStyle}>
        <svg
          style={svgStyle}
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Rendered content layer */}
          {svgInnerContent && (
            <g dangerouslySetInnerHTML={{ __html: svgInnerContent }} />
          )}

          {/* Fallback renderer (when no svgContent) */}
          {!svgContent && shapeRenderData.map((shape) => (
            <g
              key={`render-${shape.id}`}
              transform={getRotationTransform(shape.rotation, shape.x, shape.y, shape.width, shape.height)}
            >
              <rect
                x={shape.x}
                y={shape.y}
                width={shape.width}
                height={shape.height}
                fill={shape.fill ?? "#e0e0e0"}
                stroke={shape.stroke ?? "#666"}
                strokeWidth={shape.strokeWidth}
              />
              {shape.name && (
                <text
                  x={shape.x + shape.width / 2}
                  y={shape.y + shape.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={Math.min(14, shape.width / 10, shape.height / 3)}
                  fill="#333"
                  style={{ pointerEvents: "none" }}
                >
                  {shape.name}
                </text>
              )}
            </g>
          ))}

          {/* Hit areas for each shape */}
          {shapeRenderData.map((shape) => (
            <g
              key={`hit-${shape.id}`}
              transform={getRotationTransform(shape.rotation, shape.x, shape.y, shape.width, shape.height)}
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
                isPrimary={bounds.isPrimary}
                showResizeHandles={!isMultiSelection && bounds.isPrimary}
                showRotateHandle={!isMultiSelection && bounds.isPrimary}
                onResizeStart={handleResizeStart}
                onRotateStart={handleRotateStart}
              />
            ))}

            {isMultiSelection && combinedBounds && (
              <MultiSelectionBox
                x={combinedBounds.x}
                y={combinedBounds.y}
                width={combinedBounds.width}
                height={combinedBounds.height}
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
