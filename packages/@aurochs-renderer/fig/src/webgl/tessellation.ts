/**
 * @file Path tessellation for WebGL rendering
 *
 * Converts bezier paths into triangle meshes for GPU rendering.
 * Uses earcut for polygon triangulation after flattening curves to polylines.
 */

import earcut from "earcut";
import type { CornerRadius, PathContour, PathCommand } from "../scene-graph/types";

// =============================================================================
// SVG Arc → Cubic Bezier Conversion
// =============================================================================

type CubicSegment = {
  x0: number; y0: number;
  x1: number; y1: number;
  x2: number; y2: number;
  x3: number; y3: number;
};

type SvgArcParams = {
  readonly x0: number;
  readonly y0: number;
  readonly rxIn: number;
  readonly ryIn: number;
  readonly rotationDeg: number;
  readonly largeArc: boolean;
  readonly sweep: boolean;
  readonly x: number;
  readonly y: number;
};

/**
 * Convert an SVG elliptical arc to cubic bezier segments.
 *
 * Implements the SVG spec arc-to-center parameterization, then splits
 * the arc into segments of ≤π/4 radians, each approximated by a cubic bezier.
 */
function arcToCubicBeziers(
  { x0, y0, rxIn, ryIn, rotationDeg, largeArc, sweep, x, y }: SvgArcParams,
): CubicSegment[] {
  // Degenerate cases
  if (x0 === x && y0 === y) { return []; }
  let rx = Math.abs(rxIn);
  let ry = Math.abs(ryIn);
  if (rx === 0 || ry === 0) {
    // Treat as line
    return [{ x0, y0, x1: x0, y1: y0, x2: x, y2: y, x3: x, y3: y }];
  }

  const phi = (rotationDeg * Math.PI) / 180;
  const cosPhi = Math.cos(phi);
  const sinPhi = Math.sin(phi);

  // Step 1: Compute (x1', y1') — rotated midpoint
  const dx = (x0 - x) / 2;
  const dy = (y0 - y) / 2;
  const x1p = cosPhi * dx + sinPhi * dy;
  const y1p = -sinPhi * dx + cosPhi * dy;

  // Step 2: Adjust radii if too small
  const x1pSq = x1p * x1p;
  const y1pSq = y1p * y1p;
  let rxSq = rx * rx;
  let rySq = ry * ry;
  const lambda = x1pSq / rxSq + y1pSq / rySq;
  if (lambda > 1) {
    const sqrtLambda = Math.sqrt(lambda);
    rx *= sqrtLambda;
    ry *= sqrtLambda;
    rxSq = rx * rx;
    rySq = ry * ry;
  }

  // Step 3: Compute center point (cx', cy')
  const num = Math.max(0, rxSq * rySq - rxSq * y1pSq - rySq * x1pSq);
  const den = rxSq * y1pSq + rySq * x1pSq;
  const sq = den > 0 ? Math.sqrt(num / den) : 0;
  const sign = largeArc === sweep ? -1 : 1;
  const cxp = sign * sq * (rx * y1p / ry);
  const cyp = sign * sq * -(ry * x1p / rx);

  // Step 4: Compute center (cx, cy) in original coordinates
  const cx = cosPhi * cxp - sinPhi * cyp + (x0 + x) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y0 + y) / 2;

  // Step 5: Compute start and sweep angles
  const ux = (x1p - cxp) / rx;
  const uy = (y1p - cyp) / ry;
  const vx = (-x1p - cxp) / rx;
  const vy = (-y1p - cyp) / ry;

  const theta1 = Math.atan2(uy, ux);
  let dTheta = Math.atan2(vy * ux - vx * uy, vx * ux + vy * uy);

  if (!sweep && dTheta > 0) { dTheta -= 2 * Math.PI; }
  if (sweep && dTheta < 0) { dTheta += 2 * Math.PI; }

  // Step 6: Split into segments of at most π/16. This keeps ellipse arc
  // approximation error below the raster threshold used in SVG comparison.
  const maxSegmentAngle = Math.PI / 16;
  const segCount = Math.max(1, Math.ceil(Math.abs(dTheta) / maxSegmentAngle));
  const segAngle = dTheta / segCount;

  const segments: CubicSegment[] = [];
  let prevX = x0;
  let prevY = y0;

  for (let i = 0; i < segCount; i++) {
    const a1 = theta1 + i * segAngle;
    const a2 = theta1 + (i + 1) * segAngle;

    // Unit circle arc → cubic bezier control points
    const alpha = Math.sin(segAngle) * (Math.sqrt(4 + 3 * Math.tan(segAngle / 2) ** 2) - 1) / 3;

    const cos1 = Math.cos(a1), sin1 = Math.sin(a1);
    const cos2 = Math.cos(a2), sin2 = Math.sin(a2);

    // Control points on the unit circle, scaled by radii
    const ep1x = rx * cos1, ep1y = ry * sin1;
    const ep2x = rx * cos2, ep2y = ry * sin2;

    const cp1x = ep1x - alpha * rx * sin1;
    const cp1y = ep1y + alpha * ry * cos1;
    const cp2x = ep2x + alpha * rx * sin2;
    const cp2y = ep2y - alpha * ry * cos2;

    // Rotate back and translate to center
    const bx1 = cosPhi * cp1x - sinPhi * cp1y + cx;
    const by1 = sinPhi * cp1x + cosPhi * cp1y + cy;
    const bx2 = cosPhi * cp2x - sinPhi * cp2y + cx;
    const by2 = sinPhi * cp2x + cosPhi * cp2y + cy;
    const bx3 = cosPhi * ep2x - sinPhi * ep2y + cx;
    const by3 = sinPhi * ep2x + cosPhi * ep2y + cy;

    segments.push({ x0: prevX, y0: prevY, x1: bx1, y1: by1, x2: bx2, y2: by2, x3: bx3, y3: by3 });
    prevX = bx3;
    prevY = by3;
  }

  return segments;
}

// =============================================================================
// Bezier Flattening
// =============================================================================

/** Parameters for flattening a cubic bezier curve */
type CubicBezierParams = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x3: number;
  y3: number;
  tolerance: number;
  points: number[];
};

/**
 * Flatten a cubic bezier curve into line segments
 *
 * Uses De Casteljau subdivision with adaptive tolerance.
 * Produces enough segments for visual quality while minimizing vertex count.
 */
function flattenCubicBezier(params: CubicBezierParams): void {
  const { x0, y0, x1, y1, x2, y2, x3, y3, tolerance, points } = params;
  // Check if the curve is flat enough (all control points close to line)
  const dx = x3 - x0;
  const dy = y3 - y0;
  const d1 = Math.abs((x1 - x3) * dy - (y1 - y3) * dx);
  const d2 = Math.abs((x2 - x3) * dy - (y2 - y3) * dx);
  const dd = d1 + d2;

  if (dd * dd < tolerance * (dx * dx + dy * dy)) {
    // Flat enough - add endpoint
    points.push(x3, y3);
    return;
  }

  // Subdivide at midpoint using De Casteljau
  const x01 = (x0 + x1) * 0.5;
  const y01 = (y0 + y1) * 0.5;
  const x12 = (x1 + x2) * 0.5;
  const y12 = (y1 + y2) * 0.5;
  const x23 = (x2 + x3) * 0.5;
  const y23 = (y2 + y3) * 0.5;
  const x012 = (x01 + x12) * 0.5;
  const y012 = (y01 + y12) * 0.5;
  const x123 = (x12 + x23) * 0.5;
  const y123 = (y12 + y23) * 0.5;
  const x0123 = (x012 + x123) * 0.5;
  const y0123 = (y012 + y123) * 0.5;

  flattenCubicBezier({ x0, y0, x1: x01, y1: y01, x2: x012, y2: y012, x3: x0123, y3: y0123, tolerance, points });
  flattenCubicBezier({ x0: x0123, y0: y0123, x1: x123, y1: y123, x2: x23, y2: y23, x3, y3, tolerance, points });
}

/** Parameters for flattening a quadratic bezier curve */
type QuadBezierParams = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tolerance: number;
  points: number[];
};

/**
 * Flatten a quadratic bezier curve into line segments
 */
function flattenQuadBezier(params: QuadBezierParams): void {
  const { x0, y0, x1, y1, x2, y2, tolerance, points } = params;
  // Convert to cubic and flatten
  const cx1 = x0 + (2 / 3) * (x1 - x0);
  const cy1 = y0 + (2 / 3) * (y1 - y0);
  const cx2 = x2 + (2 / 3) * (x1 - x2);
  const cy2 = y2 + (2 / 3) * (y1 - y2);
  flattenCubicBezier({ x0, y0, x1: cx1, y1: cy1, x2: cx2, y2: cy2, x3: x2, y3: y2, tolerance, points });
}

// =============================================================================
// Path to Polyline
// =============================================================================

/**
 * Flatten path commands to a polyline (array of [x, y] pairs)
 *
 * @param commands - Path commands to flatten
 * @param tolerance - Bezier flattening tolerance (smaller = more segments)
 * @returns Flat array of coordinates [x0, y0, x1, y1, ...]
 */
export function flattenPathCommands(
  commands: readonly PathCommand[],
  tolerance: number = 0.25
): number[] {
  const points: number[] = [];
  const currentXRef = { value: 0 };
  const currentYRef = { value: 0 };
  const startXRef = { value: 0 };
  const startYRef = { value: 0 };

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        currentXRef.value = cmd.x;
        currentYRef.value = cmd.y;
        startXRef.value = currentXRef.value;
        startYRef.value = currentYRef.value;
        points.push(currentXRef.value, currentYRef.value);
        break;

      case "L":
        currentXRef.value = cmd.x;
        currentYRef.value = cmd.y;
        points.push(currentXRef.value, currentYRef.value);
        break;

      case "C":
        flattenCubicBezier({
          x0: currentXRef.value,
          y0: currentYRef.value,
          x1: cmd.x1,
          y1: cmd.y1,
          x2: cmd.x2,
          y2: cmd.y2,
          x3: cmd.x,
          y3: cmd.y,
          tolerance,
          points,
        });
        currentXRef.value = cmd.x;
        currentYRef.value = cmd.y;
        break;

      case "Q":
        flattenQuadBezier({
          x0: currentXRef.value,
          y0: currentYRef.value,
          x1: cmd.x1,
          y1: cmd.y1,
          x2: cmd.x,
          y2: cmd.y,
          tolerance,
          points,
        });
        currentXRef.value = cmd.x;
        currentYRef.value = cmd.y;
        break;

      case "A": {
        // SVG Arc → approximate with cubic bezier segments
        const arcCubics = arcToCubicBeziers({
          x0: currentXRef.value,
          y0: currentYRef.value,
          rxIn: cmd.rx,
          ryIn: cmd.ry,
          rotationDeg: cmd.rotation,
          largeArc: cmd.largeArc,
          sweep: cmd.sweep,
          x: cmd.x,
          y: cmd.y,
        });
        for (const seg of arcCubics) {
          flattenCubicBezier({
            x0: seg.x0, y0: seg.y0,
            x1: seg.x1, y1: seg.y1,
            x2: seg.x2, y2: seg.y2,
            x3: seg.x3, y3: seg.y3,
            tolerance,
            points,
          });
        }
        currentXRef.value = cmd.x;
        currentYRef.value = cmd.y;
        break;
      }

      case "Z":
        if (currentXRef.value !== startXRef.value || currentYRef.value !== startYRef.value) {
          points.push(startXRef.value, startYRef.value);
        }
        currentXRef.value = startXRef.value;
        currentYRef.value = startYRef.value;
        break;
    }
  }

  return points;
}

// =============================================================================
// Earcut Integration
// =============================================================================

/**
 * Triangulate a polygon with optional holes using earcut
 *
 * @param coords - Flat array of coordinates [x0, y0, x1, y1, ...]
 * @param holeIndices - Indices into coords/2 where each hole starts
 * @returns Array of triangle vertex indices
 */
export function triangulate(
  coords: readonly number[],
  holeIndices?: readonly number[]
): number[] {
  const n = coords.length >> 1;
  if (n < 3) {return [];}

  return earcut(coords as number[], holeIndices as number[] | undefined, 2);
}

// =============================================================================
// Contour Tessellation
// =============================================================================

/**
 * Compute signed area of a polygon from flat coordinates.
 * Positive = counter-clockwise, negative = clockwise.
 */
function signedArea(coords: readonly number[]): number {
  const n = coords.length >> 1;
  const areaRef = { value: 0 };
  for (let i = 0, j = n - 1; i < n; j = i++) {
    areaRef.value += (coords[j * 2] - coords[i * 2]) * (coords[j * 2 + 1] + coords[i * 2 + 1]);
  }
  return areaRef.value;
}

/**
 * Tessellate a single path contour into triangles
 *
 * @param contour - Path contour to tessellate
 * @param tolerance - Bezier flattening tolerance
 * @returns Float32Array of triangle vertices [x0, y0, x1, y1, x2, y2, ...]
 */
export function tessellateContour(
  contour: PathContour,
  tolerance: number = 0.25
): Float32Array {
  const flatCoords = flattenPathCommands(contour.commands, tolerance);

  if (flatCoords.length < 6) {
    return new Float32Array(0);
  }

  const indices = triangulate(flatCoords);

  // Convert indices to vertex positions
  const vertices = new Float32Array(indices.length * 2);
  for (let i = 0; i < indices.length; i++) {
    const idx = indices[i];
    vertices[i * 2] = flatCoords[idx * 2];
    vertices[i * 2 + 1] = flatCoords[idx * 2 + 1];
  }

  return vertices;
}

/**
 * Tessellate multiple contours into a single vertex buffer.
 *
 * Groups outer contours with their holes for correct triangulation.
 * Outer contours are clockwise (negative signed area), holes are CCW (positive).
 * For glyphs like 'O', the outer ring and inner hole are combined so the hole
 * is properly subtracted.
 *
 * @param contours - Path contours to tessellate
 * @param tolerance - Bezier flattening tolerance (default 0.25)
 * @param autoDetectWinding - When true, auto-detects the outer/hole winding
 *   convention by majority vote. Necessary for font glyph data where different
 *   fonts may use TrueType (CW=outer) or PostScript/CFF (CCW=outer) conventions.
 */

type FlatContour = { coords: number[]; area: number };

/** Determine whether outer contours have negative signed area */
function resolveOuterIsNegative(autoDetectWinding: boolean, flatContours: FlatContour[]): boolean {
  if (!autoDetectWinding) {
    return true; // default: TrueType convention
  }
  const negativeCountRef = { value: 0 };
  const positiveCountRef = { value: 0 };
  for (const fc of flatContours) {
    if (fc.area < 0) {negativeCountRef.value++;}
    else if (fc.area > 0) {positiveCountRef.value++;}
  }
  return negativeCountRef.value >= positiveCountRef.value;
}

/**
 * Tessellate path contours into triangles for WebGL rendering.
 *
 * Groups outer contours with their holes for correct triangulation.
 */
export function tessellateContours(
  contours: readonly PathContour[],
  tolerance: number = 0.25,
  autoDetectWinding: boolean = false
): Float32Array {
  if (contours.length === 0) {return new Float32Array(0);}

  // Flatten all contours and compute signed areas
  const flatContours: FlatContour[] = [];
  for (const contour of contours) {
    const coords = flattenPathCommands(contour.commands, tolerance);
    if (coords.length < 6) {continue;}
    flatContours.push({ coords, area: signedArea(coords) });
  }

  if (flatContours.length === 0) {return new Float32Array(0);}

  // Determine which sign represents "outer" contours
  // Default: negative signed area = outer (TrueType CW convention)
  // When autoDetectWinding: use majority sign to detect the convention.
  // The majority of contours in text are outers (simple glyphs without holes),
  // so the dominant sign indicates the outer convention.
  const outerIsNegative = resolveOuterIsNegative(autoDetectWinding, flatContours);

  // Classify as outer / hole and compute bounding boxes
  type ClassifiedContour = {
    coords: number[];
    isHole: boolean;
    absArea: number;
    minX: number; minY: number; maxX: number; maxY: number;
  };
  const classifiedContours: ClassifiedContour[] = flatContours.map((fc) => {
    const boundsRef = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (let i = 0; i < fc.coords.length; i += 2) {
      const x = fc.coords[i], y = fc.coords[i + 1];
      if (x < boundsRef.minX) {boundsRef.minX = x;}
      if (x > boundsRef.maxX) {boundsRef.maxX = x;}
      if (y < boundsRef.minY) {boundsRef.minY = y;}
      if (y > boundsRef.maxY) {boundsRef.maxY = y;}
    }
    return {
      coords: fc.coords,
      isHole: outerIsNegative ? fc.area > 0 : fc.area < 0,
      absArea: Math.abs(fc.area),
      minX: boundsRef.minX, minY: boundsRef.minY, maxX: boundsRef.maxX, maxY: boundsRef.maxY,
    };
  });

  // Separate outers and holes, sort outers by area (largest first)
  const outers = classifiedContours.filter((c) => !c.isHole);
  const holes = classifiedContours.filter((c) => c.isHole);
  outers.sort((a, b) => b.absArea - a.absArea);

  // Group: assign each hole to the smallest outer whose bbox contains it
  type ContourGroup = { outer: number[]; holes: number[][] };
  const groups: ContourGroup[] = outers.map((o) => ({ outer: o.coords, holes: [] }));

  for (const hole of holes) {
    // Find the smallest containing outer by bounding box
    const bestIdxRef = { value: -1 };
    const bestAreaRef = { value: Infinity };
    const hCx = (hole.minX + hole.maxX) / 2;
    const hCy = (hole.minY + hole.maxY) / 2;
    for (let i = 0; i < outers.length; i++) {
      const o = outers[i];
      if (hCx >= o.minX && hCx <= o.maxX && hCy >= o.minY && hCy <= o.maxY) {
        if (o.absArea < bestAreaRef.value) {
          bestAreaRef.value = o.absArea;
          bestIdxRef.value = i;
        }
      }
    }
    if (bestIdxRef.value >= 0) {
      groups[bestIdxRef.value].holes.push(hole.coords);
    }
    // Holes not contained by any outer are dropped
  }

  // Tessellate each group
  const allVertices: Float32Array[] = [];
  const totalLengthRef = { value: 0 };

  for (const group of groups) {
    const combined: number[] = [...group.outer];
    const holeIndices: number[] = [];

    for (const hole of group.holes) {
      holeIndices.push(combined.length / 2);
      combined.push(...hole);
    }

    const indices = triangulate(combined, holeIndices.length > 0 ? holeIndices : undefined);

    const vertices = new Float32Array(indices.length * 2);
    for (let i = 0; i < indices.length; i++) {
      const idx = indices[i];
      vertices[i * 2] = combined[idx * 2];
      vertices[i * 2 + 1] = combined[idx * 2 + 1];
    }

    allVertices.push(vertices);
    totalLengthRef.value += vertices.length;
  }

  const result = new Float32Array(totalLengthRef.value);
  const offsetRef = { value: 0 };
  for (const vertices of allVertices) {
    result.set(vertices, offsetRef.value);
    offsetRef.value += vertices.length;
  }

  return result;
}

// =============================================================================
// Geometry Generators
// =============================================================================

/**
 * Generate rectangle vertices (2 triangles)
 */
export function generateRectVertices(
  width: number,
  height: number,
  cornerRadius?: CornerRadius
): Float32Array {
  const radii = normalizeCornerRadii({ width, height, cornerRadius });
  if (radii.every((r) => r <= 0)) {
    // Simple rectangle: 2 triangles
    return new Float32Array([
      0, 0, width, 0, width, height,
      0, 0, width, height, 0, height,
    ]);
  }

  const points = roundedRectFillPoints({ width, height, radii, segments: 8 });

  const indices = triangulate(points);
  const vertices = new Float32Array(indices.length * 2);
  for (let i = 0; i < indices.length; i++) {
    vertices[i * 2] = points[indices[i] * 2];
    vertices[i * 2 + 1] = points[indices[i] * 2 + 1];
  }

  return vertices;
}

function normalizeCornerRadii(
  { width, height, cornerRadius }: { width: number; height: number; cornerRadius?: CornerRadius },
): readonly [number, number, number, number] {
  const maxRadius = Math.min(width / 2, height / 2);
  if (cornerRadius === undefined) {
    return [0, 0, 0, 0];
  }
  if (typeof cornerRadius === "number") {
    const radius = Math.max(0, Math.min(cornerRadius, maxRadius));
    return [radius, radius, radius, radius];
  }
  return [
    Math.max(0, Math.min(cornerRadius[0], maxRadius)),
    Math.max(0, Math.min(cornerRadius[1], maxRadius)),
    Math.max(0, Math.min(cornerRadius[2], maxRadius)),
    Math.max(0, Math.min(cornerRadius[3], maxRadius)),
  ];
}

function pushRoundedCornerPoints(
  { points, cx, cy, radius, startAngle, endAngle, segments }: {
    points: number[];
    cx: number;
    cy: number;
    radius: number;
    startAngle: number;
    endAngle: number;
    segments: number;
  },
): void {
  if (radius <= 0) {
    points.push(cx, cy);
    return;
  }

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    points.push(cx + radius * Math.cos(angle), cy + radius * Math.sin(angle));
  }
}

function roundedRectFillPoints(
  { width, height, radii, segments }: {
    width: number;
    height: number;
    radii: readonly [number, number, number, number];
    segments: number;
  },
): number[] {
  const [tl, tr, br, bl] = radii;
  const points: number[] = [];

  pushRoundedCornerPoints({
    points,
    cx: width - tr,
    cy: tr,
    radius: tr,
    startAngle: -Math.PI / 2,
    endAngle: 0,
    segments,
  });
  pushRoundedCornerPoints({
    points,
    cx: width - br,
    cy: height - br,
    radius: br,
    startAngle: 0,
    endAngle: Math.PI / 2,
    segments,
  });
  pushRoundedCornerPoints({
    points,
    cx: bl,
    cy: height - bl,
    radius: bl,
    startAngle: Math.PI / 2,
    endAngle: Math.PI,
    segments,
  });
  pushRoundedCornerPoints({
    points,
    cx: tl,
    cy: tl,
    radius: tl,
    startAngle: Math.PI,
    endAngle: Math.PI * 1.5,
    segments,
  });

  return points;
}

/** Parameters for generating ellipse vertices */
type EllipseVerticesParams = {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  segments?: number;
};

/**
 * Generate ellipse vertices (triangle fan)
 */
export function generateEllipseVertices(
  { cx, cy, rx, ry, segments = 64 }: EllipseVerticesParams
): Float32Array {
  // Triangle fan from center
  const vertices = new Float32Array(segments * 6);

  for (let i = 0; i < segments; i++) {
    const a0 = (2 * Math.PI * i) / segments;
    const a1 = (2 * Math.PI * (i + 1)) / segments;

    const idx = i * 6;
    vertices[idx] = cx;
    vertices[idx + 1] = cy;
    vertices[idx + 2] = cx + rx * Math.cos(a0);
    vertices[idx + 3] = cy + ry * Math.sin(a0);
    vertices[idx + 4] = cx + rx * Math.cos(a1);
    vertices[idx + 5] = cy + ry * Math.sin(a1);
  }

  return vertices;
}
