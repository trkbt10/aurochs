/**
 * @file WordprocessingML Shape Component
 *
 * Renders wps:wsp elements as SVG groups.
 * Supports basic geometry, fill, and outline rendering.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.19 (wsp)
 */

import { memo, useMemo } from "react";
import type { DocxWordprocessingShape } from "@aurochs-office/docx/domain/drawing";
import { TextBox } from "./TextBox";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for WordprocessingShape component.
 */
export type WordprocessingShapeProps = {
  /** Shape data */
  readonly shape: DocxWordprocessingShape;
  /** Width in pixels */
  readonly width: number;
  /** Height in pixels */
  readonly height: number;
  /** Unique ID prefix for patterns/gradients */
  readonly idPrefix?: string;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Get preset geometry path for common shapes.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (prst - Preset Shape Type)
 */
function getPresetPath(prst: string, width: number, height: number): string {
  switch (prst) {
    case "rect":
    case "rectangle":
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;

    case "roundRect":
    case "roundedRectangle": {
      const r = Math.min(width, height) * 0.1;
      return `M ${r} 0 L ${width - r} 0 Q ${width} 0 ${width} ${r} L ${width} ${height - r} Q ${width} ${height} ${width - r} ${height} L ${r} ${height} Q 0 ${height} 0 ${height - r} L 0 ${r} Q 0 0 ${r} 0 Z`;
    }

    case "ellipse":
    case "oval": {
      const rx = width / 2;
      const ry = height / 2;
      return `M ${rx} 0 A ${rx} ${ry} 0 1 1 ${rx} ${height} A ${rx} ${ry} 0 1 1 ${rx} 0 Z`;
    }

    case "triangle":
    case "isoTriangle":
      return `M ${width / 2} 0 L ${width} ${height} L 0 ${height} Z`;

    case "rtTriangle":
      return `M 0 0 L ${width} ${height} L 0 ${height} Z`;

    case "diamond":
      return `M ${width / 2} 0 L ${width} ${height / 2} L ${width / 2} ${height} L 0 ${height / 2} Z`;

    case "pentagon":
      return createRegularPolygonPath(5, width, height);

    case "hexagon":
      return createRegularPolygonPath(6, width, height);

    case "star5":
      return createStarPath({ points: 5, width, height, innerRatio: 0.382 });

    case "star6":
      return createStarPath({ points: 6, width, height, innerRatio: 0.382 });

    case "line":
      return `M 0 ${height / 2} L ${width} ${height / 2}`;

    case "straightConnector1":
      return `M 0 0 L ${width} ${height}`;

    default:
      // Default to rectangle for unknown shapes
      return `M 0 0 L ${width} 0 L ${width} ${height} L 0 ${height} Z`;
  }
}

/**
 * Create a regular polygon path.
 */
function createRegularPolygonPath(sides: number, width: number, height: number): string {
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy);
  const angleStep = (2 * Math.PI) / sides;
  const startAngle = -Math.PI / 2; // Start from top

  const points = Array.from({ length: sides }, (_, i) => {
    const angle = startAngle + i * angleStep;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return `${x} ${y}`;
  });

  return `M ${points[0]} ${points.slice(1).map((p) => `L ${p}`).join(" ")} Z`;
}

/**
 * Create a star path.
 */
function createStarPath(params: {
  points: number;
  width: number;
  height: number;
  innerRatio: number;
}): string {
  const { points, width, height, innerRatio } = params;
  const cx = width / 2;
  const cy = height / 2;
  const outerRadius = Math.min(cx, cy);
  const innerRadius = outerRadius * innerRatio;
  const angleStep = Math.PI / points;
  const startAngle = -Math.PI / 2;

  const pathPoints = Array.from({ length: points * 2 }, (_, i) => {
    const angle = startAngle + i * angleStep;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return `${x} ${y}`;
  });

  return `M ${pathPoints[0]} ${pathPoints.slice(1).map((p) => `L ${p}`).join(" ")} Z`;
}

/**
 * Format a color string to CSS color.
 * The color is expected to be a hex string without the # prefix.
 */
function formatColor(color: string | undefined): string | undefined {
  if (color === undefined) {
    return undefined;
  }
  // Add # prefix if not present
  return color.startsWith("#") ? color : `#${color}`;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders a WordprocessingML shape (wps:wsp) as SVG elements.
 */
function WordprocessingShapeBase({ shape, width, height, idPrefix }: WordprocessingShapeProps) {
  const { spPr, txbx, bodyPr } = shape;

  // Extract geometry
  const geometryPath = useMemo(() => {
    if (spPr?.prstGeom !== undefined) {
      // prstGeom is a string like "rect", "ellipse", etc.
      return getPresetPath(spPr.prstGeom, width, height);
    }
    // Default to rectangle
    return getPresetPath("rect", width, height);
  }, [spPr?.prstGeom, width, height]);

  // Extract fill color
  const fillColor = useMemo(() => {
    if (spPr?.noFill === true) {
      return "none";
    }
    if (spPr?.solidFill !== undefined) {
      return formatColor(spPr.solidFill) ?? "#ffffff";
    }
    // Default fill
    return "#ffffff";
  }, [spPr?.noFill, spPr?.solidFill]);

  // Extract line (outline) properties
  const strokeColor = useMemo(() => {
    if (spPr?.ln?.noFill === true) {
      return "none";
    }
    if (spPr?.ln?.solidFill !== undefined) {
      return formatColor(spPr.ln.solidFill) ?? "#000000";
    }
    // Default stroke
    return "#000000";
  }, [spPr?.ln?.noFill, spPr?.ln?.solidFill]);

  // Line width in pixels (convert from EMUs if needed)
  const strokeWidth = useMemo(() => {
    if (spPr?.ln?.w !== undefined) {
      // Line width is in EMUs, convert to pixels
      // 1 inch = 914400 EMUs = 96 px
      // 1 EMU = 96/914400 px
      return ((spPr.ln.w as number) * 96) / 914400;
    }
    return 1;
  }, [spPr?.ln?.w]);

  const clipId = `${idPrefix ?? "wsp"}-clip`;

  // Check if shape has text content
  const hasTextBox = txbx !== undefined && txbx.content.length > 0;

  return (
    <g data-element-type="wordprocessing-shape" data-has-textbox={hasTextBox}>
      {/* Shape geometry */}
      <path
        d={geometryPath}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Text box content */}
      {hasTextBox && txbx !== undefined && (
        <TextBox
          content={txbx}
          bodyPr={bodyPr}
          width={width}
          height={height}
          idPrefix={clipId}
        />
      )}
    </g>
  );
}

/**
 * Memoized WordprocessingShape component.
 */
export const WordprocessingShape = memo(WordprocessingShapeBase);
