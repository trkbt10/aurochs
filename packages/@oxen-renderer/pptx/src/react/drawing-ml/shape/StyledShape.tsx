/**
 * @file Styled Shape Component
 *
 * A React component that renders a shape with complete DrawingML styling.
 * Supports fill, stroke, effects, and common shape types.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.44 (spPr)
 */

import type { ReactNode } from "react";
import type { Fill, Line } from "@oxen-office/pptx/domain";
import type { Effects } from "@oxen-office/pptx/domain/effects";
import { useShapeStyle, type ShapeStyleInput } from "./useShapeStyle";

// =============================================================================
// Types
// =============================================================================

/**
 * Common shape type
 */
export type ShapeType = "rect" | "ellipse" | "roundRect" | "line" | "path";

/**
 * Props for StyledShape component
 */
type StyledShapeProps = {
  /** Shape type */
  readonly type: ShapeType;
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Fill definition */
  readonly fill?: Fill;
  /** Line/stroke definition */
  readonly line?: Line;
  /** Effects definition */
  readonly effects?: Effects;
  /** Corner radius for roundRect (percentage 0-100) */
  readonly cornerRadius?: number;
  /** Path data for path type */
  readonly pathData?: string;
  /** Additional class name */
  readonly className?: string;
  /** Transform string */
  readonly transform?: string;
  /** Child content (e.g., text) */
  readonly children?: ReactNode;
};

/**
 * Props for shape with style input
 */
type StyledShapeWithStyleProps = {
  /** Shape type */
  readonly type: ShapeType;
  /** X position */
  readonly x: number;
  /** Y position */
  readonly y: number;
  /** Width */
  readonly width: number;
  /** Height */
  readonly height: number;
  /** Style input (fill, line, effects) */
  readonly style: ShapeStyleInput;
  /** Corner radius for roundRect (percentage 0-100) */
  readonly cornerRadius?: number;
  /** Path data for path type */
  readonly pathData?: string;
  /** Additional class name */
  readonly className?: string;
  /** Transform string */
  readonly transform?: string;
  /** Child content (e.g., text) */
  readonly children?: ReactNode;
};

// =============================================================================
// Components
// =============================================================================

/**
 * Renders a shape with complete DrawingML styling.
 *
 * @example
 * ```tsx
 * <svg viewBox="0 0 200 100">
 *   <StyledShape
 *     type="roundRect"
 *     x={10} y={10}
 *     width={180} height={80}
 *     cornerRadius={10}
 *     fill={{ type: "solidFill", color: { spec: { type: "srgb", value: "4F81BD" } } }}
 *     line={{ fill: { type: "solidFill", color: { spec: { type: "srgb", value: "1F497D" } } }, width: px(2), ... }}
 *     effects={{ shadow: { ... } }}
 *   />
 * </svg>
 * ```
 */
export function StyledShape({
  type,
  x,
  y,
  width,
  height,
  fill,
  line,
  effects,
  cornerRadius,
  pathData,
  className,
  transform,
  children,
}: StyledShapeProps): ReactNode {
  const style = useShapeStyle({ fill, line, effects, width, height });

  return (
    <>
      {style.defs && <defs>{style.defs}</defs>}
      <g className={className} transform={transform}>
        <ShapeElement
          type={type}
          x={x}
          y={y}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          pathData={pathData}
          svgProps={style.svgProps}
        />
        {children}
      </g>
    </>
  );
}

/**
 * Styled shape with pre-computed style input.
 * Use when you need to pass style as a single object.
 */
export function StyledShapeWithStyle({
  type,
  x,
  y,
  width,
  height,
  style: styleInput,
  cornerRadius,
  pathData,
  className,
  transform,
  children,
}: StyledShapeWithStyleProps): ReactNode {
  const style = useShapeStyle({ ...styleInput, width, height });

  return (
    <>
      {style.defs && <defs>{style.defs}</defs>}
      <g className={className} transform={transform}>
        <ShapeElement
          type={type}
          x={x}
          y={y}
          width={width}
          height={height}
          cornerRadius={cornerRadius}
          pathData={pathData}
          svgProps={style.svgProps}
        />
        {children}
      </g>
    </>
  );
}

// =============================================================================
// Shape Element
// =============================================================================

type ShapeElementProps = {
  readonly type: ShapeType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly cornerRadius?: number;
  readonly pathData?: string;
  readonly svgProps: Record<string, unknown>;
};

function ShapeElement({
  type,
  x,
  y,
  width,
  height,
  cornerRadius,
  pathData,
  svgProps,
}: ShapeElementProps): ReactNode {
  switch (type) {
    case "rect":
      return <rect x={x} y={y} width={width} height={height} {...svgProps} />;

    case "roundRect": {
      const rx = cornerRadius !== undefined ? (width * cornerRadius) / 100 : 0;
      const ry = cornerRadius !== undefined ? (height * cornerRadius) / 100 : 0;
      return <rect x={x} y={y} width={width} height={height} rx={rx} ry={ry} {...svgProps} />;
    }

    case "ellipse":
      return (
        <ellipse
          cx={x + width / 2}
          cy={y + height / 2}
          rx={width / 2}
          ry={height / 2}
          {...svgProps}
        />
      );

    case "line":
      return <line x1={x} y1={y} x2={x + width} y2={y + height} {...svgProps} />;

    case "path":
      return <path d={pathData} {...svgProps} />;
  }
}
