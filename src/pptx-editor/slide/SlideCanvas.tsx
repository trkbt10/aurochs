/**
 * @file Slide canvas component
 *
 * Renders a slide with interactive shape selection.
 * Uses an overlay pattern to add interactivity on top of SVG rendering.
 */

import { useCallback, useMemo, useRef, type CSSProperties, type MouseEvent } from "react";
import type { Shape, SpShape, CxnShape, GrpShape } from "../../pptx/domain";
import type { Pixels } from "../../pptx/domain/types";
import type { SolidFill } from "../../pptx/domain/color";
import { isShapeHidden } from "../../pptx/render/svg/slide-utils";
import { useSlideEditor } from "../context/SlideEditorContext";
import { getAbsoluteBounds, clientToSlideCoords } from "../utils";
import { useSelection } from "./hooks/useSelection";
import type { ShapeId } from "./types";

// =============================================================================
// Helper: Extract fill color from shape
// =============================================================================

function getFillColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) return undefined;
  const fill = shape.properties.fill;
  if (!fill) return undefined;
  if (fill.type === "solidFill") {
    const solidFill = fill as SolidFill;
    if (solidFill.color.spec.type === "srgb") {
      return `#${solidFill.color.spec.value}`;
    }
  }
  return "#cccccc"; // Default gray for other fill types
}

function getStrokeColor(shape: Shape): string | undefined {
  if (!("properties" in shape)) return undefined;
  // Only SpShape and CxnShape have line property
  if (shape.type !== "sp" && shape.type !== "cxnSp") return undefined;
  const shapeWithLine = shape as SpShape | CxnShape;
  const line = shapeWithLine.properties.line;
  if (!line?.fill) return undefined;
  if (line.fill.type === "solidFill") {
    const solidFill = line.fill as SolidFill;
    if (solidFill.color.spec.type === "srgb") {
      return `#${solidFill.color.spec.value}`;
    }
  }
  return "#333333";
}

function getStrokeWidth(shape: Shape): number {
  if (!("properties" in shape)) return 1;
  // Only SpShape and CxnShape have line property
  if (shape.type !== "sp" && shape.type !== "cxnSp") return 1;
  const shapeWithLine = shape as SpShape | CxnShape;
  const line = shapeWithLine.properties.line;
  if (!line?.width) return 1;
  return line.width as number;
}

// =============================================================================
// Types
// =============================================================================

export type SlideCanvasProps = {
  /** Pre-rendered SVG content (if not using render function) */
  readonly svgContent?: string;
  /** Slide dimensions */
  readonly width: Pixels;
  readonly height: Pixels;
  /** Whether to show shape hit areas (for debugging) */
  readonly debugHitAreas?: boolean;
  /** Custom class name */
  readonly className?: string;
  /** Custom style */
  readonly style?: CSSProperties;
};

// =============================================================================
// Component
// =============================================================================

/**
 * Slide canvas with interactive shape selection.
 *
 * Renders the slide SVG with an overlay for shape interaction.
 */
export function SlideCanvas({
  svgContent,
  width,
  height,
  debugHitAreas = false,
  className,
  style,
}: SlideCanvasProps) {
  const { slide, state, dispatch } = useSlideEditor();
  const { isSelected, select, toggleSelect, clearSelection } = useSelection();
  const { drag } = state;
  // Extract inner content from SVG string (removes <svg> wrapper)
  // This allows us to embed the content in our own SVG element
  const svgInnerContent = useMemo(() => {
    if (!svgContent) return undefined;
    // Extract content between opening and closing svg tags
    const match = svgContent.match(/<svg[^>]*>([\s\S]*)<\/svg>/i);
    return match?.[1] ?? undefined;
  }, [svgContent]);

  // Collect all shapes with transforms for rendering and hit areas
  const shapeRenderData = useMemo(() => {
    const shapes: Array<{
      id: ShapeId;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
      fill?: string;
      stroke?: string;
      strokeWidth: number;
      name: string;
    }> = [];

    const collectShapes = (shapeList: readonly Shape[], parentGroups: readonly GrpShape[] = []) => {
      for (const shape of shapeList) {
        if (isShapeHidden(shape)) continue;

        const id = "nonVisual" in shape ? shape.nonVisual.id : undefined;
        if (!id) continue;

        // Use getAbsoluteBounds for proper group transform handling
        const bounds = getAbsoluteBounds(shape, parentGroups);
        if (!bounds) continue;

        shapes.push({
          id,
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          rotation: bounds.rotation,
          fill: getFillColor(shape),
          stroke: getStrokeColor(shape),
          strokeWidth: getStrokeWidth(shape),
          name: "nonVisual" in shape ? shape.nonVisual.name ?? "" : "",
        });

        // Handle group children with proper parent chain
        if (shape.type === "grpSp") {
          collectShapes(shape.children, [...parentGroups, shape]);
        }
      }
    };

    collectShapes(slide.shapes);
    return shapes;
  }, [slide.shapes]);

  // Handle shape click
  const handleShapeClick = useCallback(
    (shapeId: ShapeId, e: MouseEvent) => {
      e.stopPropagation();
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        toggleSelect(shapeId);
      } else {
        select(shapeId);
      }
    },
    [select, toggleSelect]
  );

  // Handle background click
  const handleBackgroundClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle pointer down for drag
  const handlePointerDown = useCallback(
    (shapeId: ShapeId, e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left click
      e.stopPropagation();
      e.preventDefault();

      // Select if not already selected
      if (!isSelected(shapeId)) {
        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          toggleSelect(shapeId);
        } else {
          select(shapeId);
        }
      }

      // Start move drag using unified coordinate conversion
      const rect = (e.target as SVGElement).ownerSVGElement?.getBoundingClientRect();
      if (!rect) return;

      const coords = clientToSlideCoords(e.clientX, e.clientY, rect, width as number, height as number);

      dispatch({
        type: "START_MOVE",
        startX: coords.x as Pixels,
        startY: coords.y as Pixels,
      });
    },
    [dispatch, width, height, isSelected, select, toggleSelect]
  );

  const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    height: 0,
    paddingBottom: `${((height as number) / (width as number)) * 100}%`, // Maintain aspect ratio
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
    <div
      className={className}
      style={containerStyle}
      onClick={handleBackgroundClick}
    >
      <div style={innerContainerStyle}>
        {/* Single SVG element containing both rendered content and hit areas */}
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
              transform={
                shape.rotation !== 0
                  ? `rotate(${shape.rotation}, ${shape.x + shape.width / 2}, ${shape.y + shape.height / 2})`
                  : undefined
              }
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
              {/* Shape name text */}
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
              transform={
                shape.rotation !== 0
                  ? `rotate(${shape.rotation}, ${shape.x + shape.width / 2}, ${shape.y + shape.height / 2})`
                  : undefined
              }
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
                data-shape-id={shape.id}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
