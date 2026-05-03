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

import type { PathContour, PathCommand, CornerRadius } from "../types";

const KAPPA = 0.5522847498307936;

/** Generate a rectangle contour, including rounded corners when provided. */
export function generateRectContour(width: number, height: number, cornerRadius?: CornerRadius): PathContour {
  const [tl, tr, br, bl] = resolveCornerRadii(cornerRadius);
  if (tl === 0 && tr === 0 && br === 0 && bl === 0) {
    return {
      commands: [
        { type: "M", x: 0, y: 0 },
        { type: "L", x: width, y: 0 },
        { type: "L", x: width, y: height },
        { type: "L", x: 0, y: height },
        { type: "Z" },
      ],
      windingRule: "nonzero",
    };
  }
  return generateRoundedRectContour({ width, height, topLeft: tl, topRight: tr, bottomRight: br, bottomLeft: bl });
}

/** Generate an ellipse contour using cubic Beziers. */
export function generateEllipseContour(width: number, height: number): PathContour {
  const rx = width / 2;
  const ry = height / 2;
  const cx = rx;
  const cy = ry;
  const ox = rx * KAPPA;
  const oy = ry * KAPPA;
  return {
    commands: [
      { type: "M", x: cx, y: 0 },
      { type: "C", x1: cx + ox, y1: 0, x2: width, y2: cy - oy, x: width, y: cy },
      { type: "C", x1: width, y1: cy + oy, x2: cx + ox, y2: height, x: cx, y: height },
      { type: "C", x1: cx - ox, y1: height, x2: 0, y2: cy + oy, x: 0, y: cy },
      { type: "C", x1: 0, y1: cy - oy, x2: cx - ox, y2: 0, x: cx, y: 0 },
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

type GenerateRoundedRectContourOptions = {
  readonly width: number;
  readonly height: number;
  readonly topLeft: number;
  readonly topRight: number;
  readonly bottomRight: number;
  readonly bottomLeft: number;
};

function generateRoundedRectContour({
  width,
  height,
  topLeft,
  topRight,
  bottomRight,
  bottomLeft,
}: GenerateRoundedRectContourOptions): PathContour {
  const tl = clampRadius(topLeft, width, height);
  const tr = clampRadius(topRight, width, height);
  const br = clampRadius(bottomRight, width, height);
  const bl = clampRadius(bottomLeft, width, height);
  const ctl = tl * KAPPA;
  const ctr = tr * KAPPA;
  const cbr = br * KAPPA;
  const cbl = bl * KAPPA;
  return {
    commands: [
      { type: "M", x: tl, y: 0 },
      { type: "L", x: width - tr, y: 0 },
      { type: "C", x1: width - tr + ctr, y1: 0, x2: width, y2: tr - ctr, x: width, y: tr },
      { type: "L", x: width, y: height - br },
      { type: "C", x1: width, y1: height - br + cbr, x2: width - br + cbr, y2: height, x: width - br, y: height },
      { type: "L", x: bl, y: height },
      { type: "C", x1: bl - cbl, y1: height, x2: 0, y2: height - bl + cbl, x: 0, y: height - bl },
      { type: "L", x: 0, y: tl },
      { type: "C", x1: 0, y1: tl - ctl, x2: tl - ctl, y2: 0, x: tl, y: 0 },
      { type: "Z" },
    ],
    windingRule: "nonzero",
  };
}

function clampRadius(radius: number, width: number, height: number): number {
  return Math.max(0, Math.min(radius, width / 2, height / 2));
}

function resolveCornerRadii(cornerRadius: CornerRadius | undefined): readonly [number, number, number, number] {
  if (cornerRadius === undefined) {
    return [0, 0, 0, 0];
  }
  if (typeof cornerRadius === "number") {
    return [cornerRadius, cornerRadius, cornerRadius, cornerRadius];
  }
  return cornerRadius;
}

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
