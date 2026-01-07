/**
 * @file Three.js Independent Extrusion Generator
 *
 * Generates extruded geometry from 2D shapes without relying on Three.js.
 * Unlike THREE.ExtrudeGeometry, this generator can selectively omit caps
 * to prevent overlap with bevels.
 *
 * Geometry structure:
 * - Front cap: flat face at Z=depth (omitted when front bevel present)
 * - Back cap: flat face at Z=0 (omitted when back bevel present)
 * - Side walls: connect front and back
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import type { ShapeInput, Vector2, BevelGeometryData } from "./types";
import { emptyGeometryData } from "./types";
import { computeSignedArea } from "./path-extraction";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for extrusion generation
 */
export type ExtrusionConfig = {
  /** Extrusion depth (Z direction) */
  readonly depth: number;
  /** Whether to include front cap (at Z=depth) */
  readonly includeFrontCap: boolean;
  /** Whether to include back cap (at Z=0) */
  readonly includeBackCap: boolean;
};

// =============================================================================
// Triangulation (Ear Clipping Algorithm)
// =============================================================================

/**
 * Triangulate a polygon using the ear clipping algorithm.
 * Returns indices into the points array forming triangles.
 *
 * @param points - Polygon vertices (must be in CCW order for outer, CW for holes)
 * @returns Array of triangle indices [i0, i1, i2, i3, i4, i5, ...]
 */
function triangulatePolygon(points: readonly Vector2[]): number[] {
  if (points.length < 3) {
    return [];
  }

  if (points.length === 3) {
    return [0, 1, 2];
  }

  // Use ear clipping algorithm
  const indices: number[] = [];
  const remaining = points.map((_, i) => i);

  while (remaining.length > 3) {
    let earFound = false;

    for (let i = 0; i < remaining.length; i++) {
      const prev = remaining[(i - 1 + remaining.length) % remaining.length];
      const curr = remaining[i];
      const next = remaining[(i + 1) % remaining.length];

      // Check if this is a valid ear
      if (isEar(points, remaining, prev, curr, next)) {
        indices.push(prev, curr, next);
        remaining.splice(i, 1);
        earFound = true;
        break;
      }
    }

    // Fallback if no ear found (degenerate polygon)
    if (!earFound) {
      break;
    }
  }

  // Add the last triangle
  if (remaining.length === 3) {
    indices.push(remaining[0], remaining[1], remaining[2]);
  }

  return indices;
}

/**
 * Check if vertex at index `curr` is an ear.
 */
function isEar(
  points: readonly Vector2[],
  remaining: readonly number[],
  prev: number,
  curr: number,
  next: number,
): boolean {
  const a = points[prev];
  const b = points[curr];
  const c = points[next];

  // Check if the triangle is convex (CCW order)
  const cross = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
  if (cross <= 0) {
    return false;
  }

  // Check if any other vertex is inside the triangle
  for (const idx of remaining) {
    if (idx === prev || idx === curr || idx === next) {
      continue;
    }
    if (isPointInTriangle(points[idx], a, b, c)) {
      return false;
    }
  }

  return true;
}

/**
 * Check if point P is inside triangle ABC.
 */
function isPointInTriangle(
  p: Vector2,
  a: Vector2,
  b: Vector2,
  c: Vector2,
): boolean {
  const sign = (p1: Vector2, p2: Vector2, p3: Vector2): number =>
    (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);

  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);

  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

  return !(hasNeg && hasPos);
}

// =============================================================================
// Shape with Holes Triangulation
// =============================================================================

/**
 * Triangulate a shape with holes by bridging holes to the outer contour.
 * This is a simplified approach that works for most common cases.
 *
 * @param outer - Outer contour points
 * @param holes - Array of hole contours
 * @returns Array of triangle indices
 */
function triangulateShapeWithHoles(
  outer: readonly Vector2[],
  holes: readonly (readonly Vector2[])[],
): { points: Vector2[]; indices: number[] } {
  if (holes.length === 0) {
    const indices = triangulatePolygon(outer);
    return { points: [...outer], indices };
  }

  // For shapes with holes, we use a simple approach:
  // Create separate triangulations and combine them with proper winding
  // This is less optimal than bridging but more robust

  const allPoints: Vector2[] = [...outer];
  const allIndices: number[] = [];

  // Triangulate outer contour
  const outerIndices = triangulatePolygon(outer);
  allIndices.push(...outerIndices);

  // For each hole, add its triangles with reversed winding
  for (const hole of holes) {
    const holeOffset = allPoints.length;
    allPoints.push(...hole);

    const holeIndices = triangulatePolygon(hole);
    // Reverse winding for holes
    for (let i = 0; i < holeIndices.length; i += 3) {
      allIndices.push(
        holeOffset + holeIndices[i],
        holeOffset + holeIndices[i + 2],
        holeOffset + holeIndices[i + 1],
      );
    }
  }

  return { points: allPoints, indices: allIndices };
}

// =============================================================================
// Extrusion Generation
// =============================================================================

/**
 * Generate extruded geometry from a shape.
 *
 * This function creates:
 * 1. Front cap at Z=depth (if includeFrontCap)
 * 2. Back cap at Z=0 (if includeBackCap)
 * 3. Side walls connecting front and back
 *
 * When bevels are present, the corresponding cap should be omitted
 * to prevent z-fighting with the bevel surface.
 *
 * @param shape - Input shape with optional holes
 * @param config - Extrusion configuration
 * @returns Geometry data (positions, normals, uvs, indices)
 */
export function generateExtrusion(
  shape: ShapeInput,
  config: ExtrusionConfig,
): BevelGeometryData {
  if (shape.points.length < 3) {
    return emptyGeometryData();
  }

  const { depth, includeFrontCap, includeBackCap } = config;

  // Ensure outer contour is CCW
  const signedArea = computeSignedArea(shape.points);
  const outerPoints = signedArea < 0
    ? [...shape.points].reverse()
    : [...shape.points];

  // Ensure holes are CW
  const holes = shape.holes.map((hole) => {
    const holeArea = computeSignedArea(hole);
    return holeArea > 0 ? [...hole].reverse() : [...hole];
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Track vertex offset for combining different parts
  let vertexOffset = 0;

  // Generate front cap (at Z=depth)
  if (includeFrontCap) {
    const { points: capPoints, indices: capIndices } = triangulateShapeWithHoles(
      outerPoints,
      holes,
    );

    for (const pt of capPoints) {
      positions.push(pt.x, pt.y, depth);
      normals.push(0, 0, 1); // Front cap normal points +Z
      uvs.push(pt.x, pt.y);
    }

    for (const idx of capIndices) {
      indices.push(vertexOffset + idx);
    }

    vertexOffset += capPoints.length;
  }

  // Generate back cap (at Z=0)
  if (includeBackCap) {
    const { points: capPoints, indices: capIndices } = triangulateShapeWithHoles(
      outerPoints,
      holes,
    );

    for (const pt of capPoints) {
      positions.push(pt.x, pt.y, 0);
      normals.push(0, 0, -1); // Back cap normal points -Z
      uvs.push(pt.x, pt.y);
    }

    // Reverse winding for back cap (face -Z direction)
    for (let i = 0; i < capIndices.length; i += 3) {
      indices.push(
        vertexOffset + capIndices[i],
        vertexOffset + capIndices[i + 2],
        vertexOffset + capIndices[i + 1],
      );
    }

    vertexOffset += capPoints.length;
  }

  // Generate side walls
  const sideResult = generateSideWalls(outerPoints, holes, depth, vertexOffset);
  positions.push(...sideResult.positions);
  normals.push(...sideResult.normals);
  uvs.push(...sideResult.uvs);
  indices.push(...sideResult.indices);

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

/**
 * Generate side walls for extrusion.
 */
function generateSideWalls(
  outer: readonly Vector2[],
  holes: readonly (readonly Vector2[])[],
  depth: number,
  vertexOffset: number,
): {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
} {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let currentOffset = vertexOffset;

  // Helper to generate side wall for a contour
  const generateContourSideWall = (
    points: readonly Vector2[],
    isHole: boolean,
  ): void => {
    const n = points.length;

    // Create vertices for front and back of each edge
    for (let i = 0; i < n; i++) {
      const curr = points[i];
      const next = points[(i + 1) % n];

      // Compute edge normal (perpendicular to edge, pointing outward)
      const edgeX = next.x - curr.x;
      const edgeY = next.y - curr.y;
      const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

      // Normal perpendicular to edge
      // For CCW outer: (-edgeY, edgeX) points outward
      // For CW hole: (edgeY, -edgeX) points outward (into hole)
      let nx: number, ny: number;
      if (edgeLen > 0.0001) {
        if (isHole) {
          nx = edgeY / edgeLen;
          ny = -edgeX / edgeLen;
        } else {
          nx = -edgeY / edgeLen;
          ny = edgeX / edgeLen;
        }
      } else {
        nx = 0;
        ny = 0;
      }

      // Four vertices per quad: curr-front, curr-back, next-front, next-back
      positions.push(curr.x, curr.y, depth); // front
      positions.push(curr.x, curr.y, 0);     // back
      positions.push(next.x, next.y, depth); // front
      positions.push(next.x, next.y, 0);     // back

      // All four vertices have same normal
      for (let j = 0; j < 4; j++) {
        normals.push(nx, ny, 0);
      }

      // UVs based on position along perimeter
      const u0 = i / n;
      const u1 = (i + 1) / n;
      uvs.push(u0, 1); // curr-front
      uvs.push(u0, 0); // curr-back
      uvs.push(u1, 1); // next-front
      uvs.push(u1, 0); // next-back

      // Two triangles per quad
      const base = currentOffset + i * 4;
      if (isHole) {
        // Reversed winding for holes
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      } else {
        indices.push(base, base + 1, base + 2);
        indices.push(base + 2, base + 1, base + 3);
      }
    }

    currentOffset += n * 4;
  };

  // Generate outer contour side walls
  generateContourSideWall(outer, false);

  // Generate hole side walls
  for (const hole of holes) {
    generateContourSideWall(hole, true);
  }

  return { positions, normals, uvs, indices };
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Merge multiple extrusion geometry data into one.
 */
export function mergeExtrusionGeometries(
  geometries: readonly BevelGeometryData[],
): BevelGeometryData {
  if (geometries.length === 0) {
    return emptyGeometryData();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  const totalPositions = geometries.reduce(
    (acc, g) => acc + g.positions.length,
    0,
  );
  const totalNormals = geometries.reduce(
    (acc, g) => acc + g.normals.length,
    0,
  );
  const totalUvs = geometries.reduce(
    (acc, g) => acc + g.uvs.length,
    0,
  );
  const totalIndices = geometries.reduce(
    (acc, g) => acc + g.indices.length,
    0,
  );

  const positions = new Float32Array(totalPositions);
  const normals = new Float32Array(totalNormals);
  const uvs = new Float32Array(totalUvs);
  const indices: number[] = [];

  let posOffset = 0;
  let normalOffset = 0;
  let uvOffset = 0;
  let vertexOffset = 0;

  for (const g of geometries) {
    positions.set(g.positions, posOffset);
    normals.set(g.normals, normalOffset);
    uvs.set(g.uvs, uvOffset);

    for (let i = 0; i < g.indices.length; i++) {
      indices.push(g.indices[i] + vertexOffset);
    }

    posOffset += g.positions.length;
    normalOffset += g.normals.length;
    uvOffset += g.uvs.length;
    vertexOffset += g.positions.length / 3;
  }

  return {
    positions,
    normals,
    uvs,
    indices: new Uint32Array(indices),
  };
}
