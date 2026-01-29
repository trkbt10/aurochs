/**
 * @file Geometry Primitives for React SVG Renderer
 *
 * Provides components for rendering geometry (preset and custom shapes)
 * as SVG path elements.
 */

import type { Geometry, Fill, Line } from "@oxen-office/pptx/domain";
import { renderGeometryData } from "../../svg/geometry";
import { useFillWithDefs, type SvgFillProps } from "./Fill";
import { useStroke, type SvgStrokeProps } from "./Stroke";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for GeometryPath component
 */
type GeometryPathProps = {
  /** Geometry to render */
  readonly geometry: Geometry | undefined;
  /** Shape width in pixels */
  readonly width: number;
  /** Shape height in pixels */
  readonly height: number;
  /** Fill style */
  readonly fill?: Fill;
  /** Line (stroke) style */
  readonly line?: Line;
  /** Additional className */
  readonly className?: string;
};

/**
 * Props for RectPath component (default shape)
 */
type RectPathProps = {
  /** Shape width in pixels */
  readonly width: number;
  /** Shape height in pixels */
  readonly height: number;
  /** Fill style */
  readonly fill?: Fill;
  /** Line (stroke) style */
  readonly line?: Line;
  /** Additional className */
  readonly className?: string;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Renders geometry as an SVG path element.
 * Falls back to a rectangle if no geometry is provided.
 */
export function GeometryPath({
  geometry,
  width,
  height,
  fill,
  line,
  className,
}: GeometryPathProps) {
  const { props: fillProps, defElement } = useFillWithDefs(fill, width, height);
  const strokeProps = useStroke(line);

  if (geometry === undefined) {
    // No geometry - render as rectangle (default shape)
    return (
      <>
        {defElement && <defs>{defElement}</defs>}
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          className={className}
          {...fillProps}
          {...strokeProps}
        />
      </>
    );
  }

  // Get path data from geometry
  const pathData = renderGeometryData(geometry, width, height);

  return (
    <>
      {defElement && <defs>{defElement}</defs>}
      <path
        d={pathData}
        className={className}
        {...fillProps}
        {...strokeProps}
      />
    </>
  );
}

/**
 * Renders a simple rectangle.
 */
export function RectPath({
  width,
  height,
  fill,
  line,
  className,
}: RectPathProps) {
  const { props: fillProps, defElement } = useFillWithDefs(fill, width, height);
  const strokeProps = useStroke(line);

  return (
    <>
      {defElement && <defs>{defElement}</defs>}
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        className={className}
        {...fillProps}
        {...strokeProps}
      />
    </>
  );
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Build SVG path data from geometry.
 * Thin wrapper around the existing geometry renderer.
 */
export function getGeometryPathData(
  geometry: Geometry,
  width: number,
  height: number,
): string {
  return renderGeometryData(geometry, width, height);
}

/**
 * Props for a standalone path element (without hooks).
 */
export type PathElementProps = {
  readonly d: string;
  readonly fill: SvgFillProps;
  readonly stroke?: SvgStrokeProps;
  readonly className?: string;
};

/**
 * Renders a path element with explicit props (no hooks).
 */
export function PathElement({
  d,
  fill,
  stroke,
  className,
}: PathElementProps) {
  return (
    <path
      d={d}
      className={className}
      {...fill}
      {...stroke}
    />
  );
}
