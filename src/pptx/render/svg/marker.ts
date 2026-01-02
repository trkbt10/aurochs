/**
 * @file SVG marker renderer for line ends (arrows)
 *
 * Converts LineEnd domain objects to SVG marker definitions.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (tailEnd)
 * @see ECMA-376 Part 1, Section 20.1.10.55 (ST_LineEndType)
 * @see ECMA-376 Part 1, Section 20.1.10.56 (ST_LineEndWidth)
 * @see ECMA-376 Part 1, Section 20.1.10.57 (ST_LineEndLength)
 */

import type { LineEnd } from "../../domain";
import type { HtmlString } from "../html/primitives";
import { marker, polygon, polyline, ellipse, path } from "./primitives";

// =============================================================================
// Size Multipliers
// =============================================================================

/**
 * Width multiplier based on ST_LineEndWidth.
 *
 * Per ECMA-376 Part 1, Section 20.1.10.56:
 * - sm (small): ~2x line width
 * - med (medium): ~3x line width (default)
 * - lg (large): ~5x line width
 *
 * @see ECMA-376 Part 1, Section 20.1.10.56
 */
const WIDTH_MULTIPLIER: Record<LineEnd["width"], number> = {
  sm: 2,
  med: 3,
  lg: 5,
};

/**
 * Length multiplier based on ST_LineEndLength.
 *
 * Per ECMA-376 Part 1, Section 20.1.10.57:
 * - sm (small): ~2x line width
 * - med (medium): ~3x line width (default)
 * - lg (large): ~5x line width
 *
 * @see ECMA-376 Part 1, Section 20.1.10.57
 */
const LENGTH_MULTIPLIER: Record<LineEnd["length"], number> = {
  sm: 2,
  med: 3,
  lg: 5,
};

// =============================================================================
// Marker ID Generation
// =============================================================================

/**
 * Generate a unique marker ID based on line end properties and color.
 *
 * Format: marker-{type}-{width}-{length}-{colorHex}
 */
export function generateMarkerId(
  lineEnd: LineEnd,
  colorHex: string,
  position: "head" | "tail",
): string {
  return `marker-${position}-${lineEnd.type}-${lineEnd.width}-${lineEnd.length}-${colorHex.replace("#", "")}`;
}

// =============================================================================
// Marker Shape Generators
// =============================================================================

/**
 * Generate triangle arrow marker shape.
 *
 * Creates a filled triangle pointing right.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (triangle)
 */
function generateTriangleShape(
  width: number,
  height: number,
  color: string,
): HtmlString {
  // Triangle points: left-top, right-center, left-bottom
  const points = `0,0 ${width},${height / 2} 0,${height}`;
  return polygon({ points, fill: color });
}

/**
 * Generate stealth arrow marker shape.
 *
 * Creates a notched/stealth arrow (like a stealth fighter).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (stealth)
 */
function generateStealthShape(
  width: number,
  height: number,
  color: string,
): HtmlString {
  // Stealth arrow: notched triangle
  // Points: left-quarter, right-center, left-3quarter, center-notch
  const notchDepth = width * 0.3;
  const points = [
    `0,0`,
    `${width},${height / 2}`,
    `0,${height}`,
    `${notchDepth},${height / 2}`,
  ].join(" ");
  return polygon({ points, fill: color });
}

/**
 * Generate diamond marker shape.
 *
 * Creates a diamond/rhombus shape.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (diamond)
 */
function generateDiamondShape(
  width: number,
  height: number,
  color: string,
): HtmlString {
  // Diamond: 4 points at cardinal directions
  const points = [
    `${width / 2},0`,
    `${width},${height / 2}`,
    `${width / 2},${height}`,
    `0,${height / 2}`,
  ].join(" ");
  return polygon({ points, fill: color });
}

/**
 * Generate oval marker shape.
 *
 * Creates a filled ellipse/circle.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (oval)
 */
function generateOvalShape(
  width: number,
  height: number,
  color: string,
): HtmlString {
  return ellipse({
    cx: width / 2,
    cy: height / 2,
    rx: width / 2,
    ry: height / 2,
    fill: color,
  });
}

/**
 * Generate open arrow marker shape.
 *
 * Creates a V-shaped open arrow (not filled).
 *
 * @see ECMA-376 Part 1, Section 20.1.10.55 (arrow)
 */
function generateArrowShape(
  width: number,
  height: number,
  color: string,
  strokeWidth: number,
): HtmlString {
  // Open arrow: V-shape, stroke only
  const points = `0,0 ${width},${height / 2} 0,${height}`;
  return polyline({
    points,
    fill: "none",
    stroke: color,
    "stroke-width": strokeWidth,
    "stroke-linejoin": "miter",
  });
}

// =============================================================================
// Marker Definition Generation
// =============================================================================

/**
 * Marker generation result.
 */
export type MarkerResult = {
  /** Marker ID for referencing */
  id: string;
  /** SVG marker definition element */
  def: HtmlString;
};

/**
 * Generate shape element for a specific line end type.
 */
function generateShapeForType(
  type: LineEnd["type"],
  markerWidth: number,
  markerHeight: number,
  colorHex: string,
  strokeWidth: number,
): HtmlString {
  switch (type) {
    case "triangle":
      return generateTriangleShape(markerWidth, markerHeight, colorHex);
    case "stealth":
      return generateStealthShape(markerWidth, markerHeight, colorHex);
    case "diamond":
      return generateDiamondShape(markerWidth, markerHeight, colorHex);
    case "oval":
      return generateOvalShape(markerWidth, markerHeight, colorHex);
    case "arrow":
      return generateArrowShape(markerWidth, markerHeight, colorHex, strokeWidth * 0.5);
    case "none":
    default:
      // Should not reach here, but return empty marker
      return path({ d: "", fill: "none" });
  }
}

/**
 * Generate SVG marker definition for a line end.
 *
 * @param lineEnd - Line end specification
 * @param strokeWidth - Line stroke width in pixels
 * @param colorHex - Stroke color in hex format (e.g., "#000000")
 * @param position - Whether this is head or tail marker
 * @returns Marker result with ID and SVG definition
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (tailEnd)
 */
export function generateMarkerDef(
  lineEnd: LineEnd,
  strokeWidth: number,
  colorHex: string,
  position: "head" | "tail",
): MarkerResult {
  const id = generateMarkerId(lineEnd, colorHex, position);

  // Calculate marker dimensions based on line width
  const markerWidth = strokeWidth * WIDTH_MULTIPLIER[lineEnd.width];
  const markerHeight = strokeWidth * LENGTH_MULTIPLIER[lineEnd.length];

  // Generate shape based on type
  const shape = generateShapeForType(
    lineEnd.type,
    markerWidth,
    markerHeight,
    colorHex,
    strokeWidth,
  );

  // Calculate refX based on position
  // For tail markers, refX should be at the tip (markerWidth)
  // For head markers, refX should be at 0 (line starts from tip)
  const refX = position === "tail" ? markerWidth : 0;
  const refY = markerHeight / 2;

  const def = marker(
    {
      id,
      markerWidth,
      markerHeight,
      refX,
      refY,
      orient: "auto",
      markerUnits: "userSpaceOnUse",
    },
    shape,
  );

  return { id, def };
}

// =============================================================================
// Marker Collection
// =============================================================================

/**
 * Collected markers for a shape.
 */
export type MarkerCollection = {
  /** Marker definitions to include in <defs> */
  defs: HtmlString[];
  /** marker-start attribute value (if headEnd exists) */
  markerStart?: string;
  /** marker-end attribute value (if tailEnd exists) */
  markerEnd?: string;
};

/**
 * Generate head marker if applicable.
 */
function generateHeadMarkerResult(
  headEnd: LineEnd | undefined,
  strokeWidth: number,
  colorHex: string,
): { def: HtmlString; url: string } | undefined {
  if (!headEnd || headEnd.type === "none") {
    return undefined;
  }
  const result = generateMarkerDef(headEnd, strokeWidth, colorHex, "head");
  return { def: result.def, url: `url(#${result.id})` };
}

/**
 * Generate tail marker if applicable.
 */
function generateTailMarkerResult(
  tailEnd: LineEnd | undefined,
  strokeWidth: number,
  colorHex: string,
): { def: HtmlString; url: string } | undefined {
  if (!tailEnd || tailEnd.type === "none") {
    return undefined;
  }
  const result = generateMarkerDef(tailEnd, strokeWidth, colorHex, "tail");
  return { def: result.def, url: `url(#${result.id})` };
}

/**
 * Generate markers for line head and tail ends.
 *
 * @param headEnd - Head (start) line end specification
 * @param tailEnd - Tail (end) line end specification
 * @param strokeWidth - Line stroke width in pixels
 * @param colorHex - Stroke color in hex format
 * @returns Collection of marker definitions and attributes
 */
export function generateLineMarkers(
  headEnd: LineEnd | undefined,
  tailEnd: LineEnd | undefined,
  strokeWidth: number,
  colorHex: string,
): MarkerCollection {
  const headResult = generateHeadMarkerResult(headEnd, strokeWidth, colorHex);
  const tailResult = generateTailMarkerResult(tailEnd, strokeWidth, colorHex);

  const defs: HtmlString[] = [];
  if (headResult) {
    defs.push(headResult.def);
  }
  if (tailResult) {
    defs.push(tailResult.def);
  }

  return {
    defs,
    markerStart: headResult?.url,
    markerEnd: tailResult?.url,
  };
}
