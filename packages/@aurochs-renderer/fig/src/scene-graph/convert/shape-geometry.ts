/**
 * @file Synthesize path geometry for parametric shapes
 *
 * When star, polygon, and line nodes lack pre-computed fillGeometry blobs
 * (e.g., builder-generated documents), we compute their contours from
 * the parametric shape definition (pointCount, starInnerRadius, size).
 *
 * This matches Figma's geometry generation:
 * - Star: alternating outer/inner vertices
 * - Regular polygon: evenly spaced vertices on a circle
 * - Line: horizontal line from (0,0) to (width, 0)
 */

import type { PathContour, PathCommand } from "../types";

/**
 * Generate a regular polygon contour.
 *
 * Vertices are placed on an ellipse inscribed in the bounding box,
 * starting from the top center (-90°) and going clockwise.
 *
 * @param width - Bounding box width
 * @param height - Bounding box height
 * @param pointCount - Number of vertices (minimum 3)
 */
export function generatePolygonContour(
  width: number,
  height: number,
  pointCount: number,
): PathContour {
  const n = Math.max(3, pointCount);
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const commands: PathCommand[] = [];

  for (let i = 0; i < n; i++) {
    // Start from top center (-π/2), go clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / n;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);

    if (i === 0) {
      commands.push({ type: "M", x, y });
    } else {
      commands.push({ type: "L", x, y });
    }
  }

  commands.push({ type: "Z" });

  return { commands, windingRule: "nonzero" };
}

type GenerateStarContourOptions = {
  readonly width: number;
  readonly height: number;
  readonly pointCount: number;
  readonly innerRadiusRatio?: number;
};

/**
 * Generate a star contour.
 *
 * Alternates between outer radius vertices and inner radius vertices.
 * The inner radius is expressed as a ratio (0-1) of the outer radius,
 * matching Figma's `starInnerRadius` field.
 */
export function generateStarContour(
  { width, height, pointCount, innerRadiusRatio = 0.382 }: GenerateStarContourOptions,
): PathContour {
  const n = Math.max(3, pointCount);
  const cx = width / 2;
  const cy = height / 2;
  const outerRx = width / 2;
  const outerRy = height / 2;
  const innerRx = outerRx * innerRadiusRatio;
  const innerRy = outerRy * innerRadiusRatio;

  const commands: PathCommand[] = [];
  const totalVertices = n * 2;

  for (let i = 0; i < totalVertices; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / totalVertices;
    const isOuter = i % 2 === 0;
    const rx = isOuter ? outerRx : innerRx;
    const ry = isOuter ? outerRy : innerRy;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);

    if (i === 0) {
      commands.push({ type: "M", x, y });
    } else {
      commands.push({ type: "L", x, y });
    }
  }

  commands.push({ type: "Z" });

  return { commands, windingRule: "nonzero" };
}

/**
 * Generate a line contour.
 *
 * A line is a horizontal segment from (0, 0) to (width, 0).
 * The actual position/rotation is handled by the node's transform.
 * Lines have no fill — they're rendered via stroke only.
 *
 * For the scene graph, we represent the line as a degenerate path
 * so it can receive stroke rendering.
 *
 * @param width - Line length (from node.size.x)
 */
export function generateLineContour(width: number): PathContour {
  return {
    commands: [
      { type: "M", x: 0, y: 0 },
      { type: "L", x: width, y: 0 },
    ],
    windingRule: "nonzero",
  };
}
