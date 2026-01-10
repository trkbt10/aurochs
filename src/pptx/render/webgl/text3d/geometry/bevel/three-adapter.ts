/**
 * @file Three.js Adapter for Bevel Geometry
 *
 * Provides conversion functions between Three.js types and the
 * Three.js-independent bevel geometry types.
 *
 * This is the only file in the bevel/ directory that depends on Three.js.
 */

import * as THREE from "three";
import { ShapeUtils } from "three";
import type {
  Vector2,
  ShapeInput,
  BevelGeometryData,
  BevelMeshConfig,
  BevelProfile,
} from "./types";
import { vec2 } from "./types";
import { generateExtrusion, mergeExtrusionGeometries, generateCapAtZ } from "./extrusion";
import { extractBevelPathsFromShape } from "./path-extraction";
import { generateBevelMesh, mergeBevelGeometries, extractInnerRingFromBevelPaths } from "./mesh-generation";
import { getBevelProfile } from "./profiles";

// =============================================================================
// THREE.Shape → ShapeInput Conversion
// =============================================================================

/**
 * Convert a THREE.Shape to a ShapeInput.
 *
 * Extracts points from the shape and its holes using the specified
 * number of curve divisions.
 *
 * @param shape - Three.js Shape to convert
 * @param divisions - Number of divisions per curve segment (default: 12)
 * @returns ShapeInput with extracted points
 */
export function threeShapeToShapeInput(
  shape: THREE.Shape,
  divisions = 12,
): ShapeInput {
  const points = threeVector2ArrayToVector2Array(shape.getPoints(divisions));

  const holes = shape.holes.map((hole) =>
    threeVector2ArrayToVector2Array(hole.getPoints(divisions)),
  );

  return { points, holes };
}

/**
 * Convert array of THREE.Vector2 to array of Vector2
 */
function threeVector2ArrayToVector2Array(
  points: THREE.Vector2[],
): readonly Vector2[] {
  return points.map((p) => vec2(p.x, p.y));
}

// =============================================================================
// BevelGeometryData → THREE.BufferGeometry Conversion
// =============================================================================

/**
 * Convert BevelGeometryData to THREE.BufferGeometry.
 *
 * Creates a BufferGeometry with position, normal, and uv attributes.
 *
 * @param data - Raw geometry data
 * @returns Three.js BufferGeometry
 */
export function bevelGeometryDataToThreeGeometry(
  data: BevelGeometryData,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute(
    "normal",
    new THREE.BufferAttribute(data.normals, 3),
  );
  geometry.setAttribute(
    "uv",
    new THREE.BufferAttribute(data.uvs, 2),
  );

  if (data.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  }

  return geometry;
}

// =============================================================================
// ShapeInput → THREE.Shape Conversion
// =============================================================================

/**
 * Convert a ShapeInput back to THREE.Shape.
 *
 * Useful for converting expanded shapes back to Three.js format
 * for use with ExtrudeGeometry or other Three.js operations.
 *
 * @param input - ShapeInput to convert
 * @returns Three.js Shape
 */
export function shapeInputToThreeShape(input: ShapeInput): THREE.Shape {
  const shape = new THREE.Shape();

  if (input.points.length > 0) {
    shape.moveTo(input.points[0].x, input.points[0].y);
    for (let i = 1; i < input.points.length; i++) {
      shape.lineTo(input.points[i].x, input.points[i].y);
    }
    shape.closePath();
  }

  for (const holePoints of input.holes) {
    if (holePoints.length > 0) {
      const hole = new THREE.Path();
      hole.moveTo(holePoints[0].x, holePoints[0].y);
      for (let i = 1; i < holePoints.length; i++) {
        hole.lineTo(holePoints[i].x, holePoints[i].y);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  return shape;
}

/**
 * Convert multiple ShapeInputs to THREE.Shapes.
 *
 * @param inputs - Array of ShapeInputs to convert
 * @returns Array of Three.js Shapes
 */
export function shapeInputsToThreeShapes(inputs: readonly ShapeInput[]): THREE.Shape[] {
  return inputs.map(shapeInputToThreeShape);
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Convert a single THREE.Vector2 to Vector2
 */
export function threeVector2ToVector2(v: THREE.Vector2): Vector2 {
  return vec2(v.x, v.y);
}

/**
 * Convert a Vector2 to THREE.Vector2
 */
export function vector2ToThreeVector2(v: Vector2): THREE.Vector2 {
  return new THREE.Vector2(v.x, v.y);
}

// =============================================================================
// Triangulation using THREE.ShapeUtils
// =============================================================================

/**
 * Triangulate a shape with holes using THREE.ShapeGeometry.
 *
 * This approach creates a THREE.Shape, uses ShapeGeometry to triangulate,
 * then extracts the positions and indices.
 *
 * @param outer - Outer contour points
 * @param holes - Array of hole contours
 * @returns Combined points array and triangle indices
 */
export function triangulateShapeWithThree(
  outer: readonly Vector2[],
  holes: readonly (readonly Vector2[])[],
): { points: Vector2[]; indices: number[] } {
  // Create THREE.Shape from outer contour
  const shape = new THREE.Shape();
  if (outer.length > 0) {
    shape.moveTo(outer[0].x, outer[0].y);
    for (let i = 1; i < outer.length; i++) {
      shape.lineTo(outer[i].x, outer[i].y);
    }
    shape.closePath();
  }

  // Add holes
  for (const hole of holes) {
    if (hole.length > 0) {
      const holePath = new THREE.Path();
      holePath.moveTo(hole[0].x, hole[0].y);
      for (let i = 1; i < hole.length; i++) {
        holePath.lineTo(hole[i].x, hole[i].y);
      }
      holePath.closePath();
      shape.holes.push(holePath);
    }
  }

  // Use ShapeGeometry to triangulate - this handles holes correctly
  const geom = new THREE.ShapeGeometry(shape);
  const posAttr = geom.getAttribute("position");
  const indexAttr = geom.getIndex();

  // Extract points from geometry
  const points: Vector2[] = [];
  for (let i = 0; i < posAttr.count; i++) {
    points.push(vec2(posAttr.getX(i), posAttr.getY(i)));
  }

  // Extract indices
  const indices: number[] = [];
  if (indexAttr) {
    for (let i = 0; i < indexAttr.count; i++) {
      indices.push(indexAttr.getX(i));
    }
  } else {
    // Non-indexed geometry - create sequential indices
    for (let i = 0; i < posAttr.count; i++) {
      indices.push(i);
    }
  }

  geom.dispose();
  return { points, indices };
}

/**
 * Generate extruded geometry using THREE.ShapeUtils for triangulation.
 *
 * This is a Three.js-dependent version that produces more reliable
 * triangulation than the pure JavaScript implementation.
 *
 * @param shape - Input shape with optional holes
 * @param config - Extrusion configuration
 * @returns Geometry data (positions, normals, uvs, indices)
 */
export function generateExtrusionWithThree(
  shape: ShapeInput,
  config: {
    depth: number;
    includeFrontCap: boolean;
    includeBackCap: boolean;
  },
): BevelGeometryData {
  if (shape.points.length < 3) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      uvs: new Float32Array(0),
      indices: new Uint32Array(0),
    };
  }

  const { depth, includeFrontCap, includeBackCap } = config;

  // Ensure outer contour is CCW (positive signed area)
  const signedArea = computeSignedAreaLocal(shape.points);
  const outerPoints = signedArea < 0 ? [...shape.points].reverse() : [...shape.points];

  // Ensure holes are CW (negative signed area from the hole's perspective)
  const holes = shape.holes.map((hole) => {
    const holeArea = computeSignedAreaLocal(hole);
    return holeArea > 0 ? [...hole].reverse() : [...hole];
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  let vertexOffset = 0;

  // Generate front cap (at Z=depth)
  if (includeFrontCap) {
    const { points: capPoints, indices: capIndices } = triangulateShapeWithThree(
      outerPoints,
      holes,
    );

    for (const pt of capPoints) {
      positions.push(pt.x, pt.y, depth);
      normals.push(0, 0, 1);
      uvs.push(pt.x, pt.y);
    }

    for (const idx of capIndices) {
      indices.push(vertexOffset + idx);
    }

    vertexOffset += capPoints.length;
  }

  // Generate back cap (at Z=0)
  if (includeBackCap) {
    const { points: capPoints, indices: capIndices } = triangulateShapeWithThree(
      outerPoints,
      holes,
    );

    for (const pt of capPoints) {
      positions.push(pt.x, pt.y, 0);
      normals.push(0, 0, -1);
      uvs.push(pt.x, pt.y);
    }

    // Reverse winding for back cap
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
  const sideResult = generateSideWallsLocal(outerPoints, holes, depth, vertexOffset);
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
 * Generate a cap at a specific Z position using THREE.ShapeUtils triangulation.
 */
export function generateCapAtZWithThree(
  shape: ShapeInput,
  config: {
    zPosition: number;
    normalDirection: 1 | -1;
  },
): BevelGeometryData {
  if (shape.points.length < 3) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      uvs: new Float32Array(0),
      indices: new Uint32Array(0),
    };
  }

  const { zPosition, normalDirection } = config;

  // Ensure outer contour is CCW
  const signedArea = computeSignedAreaLocal(shape.points);
  const outerPoints = signedArea < 0 ? [...shape.points].reverse() : [...shape.points];

  // Ensure holes are CW
  const holes = shape.holes.map((hole) => {
    const holeArea = computeSignedAreaLocal(hole);
    return holeArea > 0 ? [...hole].reverse() : [...hole];
  });

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const { points: capPoints, indices: capIndices } = triangulateShapeWithThree(
    outerPoints,
    holes,
  );

  for (const pt of capPoints) {
    positions.push(pt.x, pt.y, zPosition);
    normals.push(0, 0, normalDirection);
    uvs.push(pt.x, pt.y);
  }

  if (normalDirection === 1) {
    for (const idx of capIndices) {
      indices.push(idx);
    }
  } else {
    for (let i = 0; i < capIndices.length; i += 3) {
      indices.push(capIndices[i], capIndices[i + 2], capIndices[i + 1]);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

// Local helper: compute signed area
function computeSignedAreaLocal(points: readonly Vector2[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const next = points[(i + 1) % points.length];
    area += curr.x * next.y - next.x * curr.y;
  }
  return area / 2;
}

// Local helper: generate side walls
function generateSideWallsLocal(
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

  const generateContourSideWall = (
    points: readonly Vector2[],
    isHole: boolean,
  ): void => {
    const n = points.length;

    for (let i = 0; i < n; i++) {
      const curr = points[i];
      const next = points[(i + 1) % n];

      const edgeX = next.x - curr.x;
      const edgeY = next.y - curr.y;
      const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY);

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

      positions.push(curr.x, curr.y, depth);
      positions.push(curr.x, curr.y, 0);
      positions.push(next.x, next.y, depth);
      positions.push(next.x, next.y, 0);

      for (let j = 0; j < 4; j++) {
        normals.push(nx, ny, 0);
      }

      const u0 = i / n;
      const u1 = (i + 1) / n;
      uvs.push(u0, 1);
      uvs.push(u0, 0);
      uvs.push(u1, 1);
      uvs.push(u1, 0);

      const base = currentOffset + i * 4;
      if (isHole) {
        indices.push(base, base + 2, base + 1);
        indices.push(base + 1, base + 2, base + 3);
      } else {
        indices.push(base, base + 1, base + 2);
        indices.push(base + 2, base + 1, base + 3);
      }
    }

    currentOffset += n * 4;
  };

  generateContourSideWall(outer, false);

  for (const hole of holes) {
    generateContourSideWall(hole, true);
  }

  return { positions, normals, uvs, indices };
}

// =============================================================================
// Inner Cap Generation from Bevel Ring
// =============================================================================

/**
 * Generate a cap from the bevel's innermost ring.
 *
 * This function triangulates the inner ring extracted from bevel paths,
 * guaranteeing perfect alignment with the bevel mesh regardless of
 * whether shrinkShape would succeed.
 *
 * @param outer - Outer ring points
 * @param holes - Hole ring points
 * @param config - Cap configuration
 * @returns Cap geometry data
 */
function generateCapFromRing(
  outer: readonly { x: number; y: number }[],
  holes: readonly (readonly { x: number; y: number }[])[],
  config: {
    zPosition: number;
    normalDirection: 1 | -1;
  },
): BevelGeometryData {
  if (outer.length < 3) {
    return {
      positions: new Float32Array(0),
      normals: new Float32Array(0),
      uvs: new Float32Array(0),
      indices: new Uint32Array(0),
    };
  }

  const { zPosition, normalDirection } = config;

  // Ensure outer is CCW for correct triangulation
  const outerPoints = ensureCCW(outer);

  // Ensure holes are CW (opposite winding)
  const holePoints = holes.map((hole) => ensureCW(hole));

  // Use THREE.ShapeUtils for triangulation
  const { points, indices: rawIndices } = triangulateShapeWithThree(
    outerPoints.map((p) => vec2(p.x, p.y)),
    holePoints.map((hole) => hole.map((p) => vec2(p.x, p.y))),
  );

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (const pt of points) {
    positions.push(pt.x, pt.y, zPosition);
    normals.push(0, 0, normalDirection);
    uvs.push(pt.x, pt.y);
  }

  if (normalDirection === 1) {
    for (const idx of rawIndices) {
      indices.push(idx);
    }
  } else {
    // Reverse winding for back-facing cap
    for (let i = 0; i < rawIndices.length; i += 3) {
      indices.push(rawIndices[i], rawIndices[i + 2], rawIndices[i + 1]);
    }
  }

  return {
    positions: new Float32Array(positions),
    normals: new Float32Array(normals),
    uvs: new Float32Array(uvs),
    indices: new Uint32Array(indices),
  };
}

/**
 * Ensure polygon is counter-clockwise.
 */
function ensureCCW<T extends { x: number; y: number }>(
  points: readonly T[],
): T[] {
  const area = computeSignedAreaLocal(points.map((p) => vec2(p.x, p.y)));
  if (area < 0) {
    return [...points].reverse();
  }
  return [...points];
}

/**
 * Ensure polygon is clockwise.
 */
function ensureCW<T extends { x: number; y: number }>(
  points: readonly T[],
): T[] {
  const area = computeSignedAreaLocal(points.map((p) => vec2(p.x, p.y)));
  if (area > 0) {
    return [...points].reverse();
  }
  return [...points];
}

// =============================================================================
// Asymmetric Extrusion with Bevel (Three.js Independent Core)
// =============================================================================

/**
 * Bevel configuration for extrusion
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */
export type BevelSpec = {
  /** Bevel width (inset amount) */
  readonly width: number;
  /** Bevel height (depth amount) */
  readonly height: number;
  /** Bevel preset type for profile selection */
  readonly preset: string;
};

/**
 * Asymmetric bevel configuration for ECMA-376 compliant extrusion.
 * Supports separate top (front) and bottom (back) bevels.
 * @see ECMA-376 Part 1, Section 20.1.5.9 (sp3d)
 */
export type AsymmetricBevelSpec = {
  /** Front face bevel (bevelT in ECMA-376) */
  readonly top?: BevelSpec;
  /** Back face bevel (bevelB in ECMA-376) */
  readonly bottom?: BevelSpec;
};

/**
 * Create extruded 3D geometry with asymmetric bevels.
 *
 * Uses Three.js independent core to avoid the z-fighting issue that occurred
 * with THREE.ExtrudeGeometry (which always created front/back caps that
 * overlapped with bevel surfaces).
 *
 * Key behavior: When bevel is present on a face, the corresponding cap is
 * OMITTED from the extrusion, and a bevel surface is generated instead.
 *
 * @param shapes - Three.js shapes to extrude
 * @param extrusionDepth - Depth of extrusion
 * @param bevel - Asymmetric bevel configuration
 * @returns Three.js BufferGeometry
 */
export function createExtrudedGeometryWithBevel(
  shapes: THREE.Shape[],
  extrusionDepth: number,
  bevel: AsymmetricBevelSpec,
): THREE.BufferGeometry {
  if (shapes.length === 0) {
    return new THREE.BufferGeometry();
  }

  const geometryDataList: BevelGeometryData[] = [];

  // Clamp bevel heights to prevent exceeding extrusion depth
  const maxBevelRatio = bevel.top && bevel.bottom ? 0.45 : 0.9;
  const maxBevelHeight = extrusionDepth * maxBevelRatio;

  const topBevelHeight = bevel.top
    ? Math.min(bevel.top.height, maxBevelHeight)
    : 0;
  const bottomBevelHeight = bevel.bottom
    ? Math.min(bevel.bottom.height, maxBevelHeight)
    : 0;

  // Process each shape
  for (const shape of shapes) {
    const shapeInput = threeShapeToShapeInput(shape);

    // Generate extrusion with selective cap omission
    // - Omit front cap if top bevel is present (front cap would overlap with bevel)
    // - Omit back cap if bottom bevel is present
    // Use THREE.ShapeUtils for reliable triangulation
    const extrusionData = generateExtrusionWithThree(shapeInput, {
      depth: extrusionDepth,
      includeFrontCap: !bevel.top,
      includeBackCap: !bevel.bottom,
    });

    geometryDataList.push(extrusionData);

    // Generate top bevel (front face, at Z=depth)
    if (bevel.top && topBevelHeight > 0) {
      const topProfile = getBevelProfile(bevel.top.preset) ?? getBevelProfile("circle")!;
      const topPaths = extractBevelPathsFromShape(shapeInput);

      const topBevelConfig: BevelMeshConfig = {
        width: bevel.top.width,
        height: topBevelHeight,
        profile: topProfile,
        zPosition: extrusionDepth, // Start at front face
        zDirection: -1, // Bevel goes inward (-Z direction)
      };

      const topBevelData = generateBevelMesh(topPaths, topBevelConfig);
      geometryDataList.push(topBevelData);

      // Generate inner cap at recessed position (after bevel inset)
      // Extract the innermost ring from bevel paths to guarantee alignment
      const innerRing = extractInnerRingFromBevelPaths(topPaths, topBevelConfig);
      if (innerRing.outer.length >= 3) {
        const innerCapData = generateCapFromRing(innerRing.outer, innerRing.holes, {
          zPosition: innerRing.zPosition,
          normalDirection: 1, // Front-facing (+Z)
        });
        geometryDataList.push(innerCapData);
      }
    }

    // Generate bottom bevel (back face, at Z=0)
    if (bevel.bottom && bottomBevelHeight > 0) {
      const bottomProfile = getBevelProfile(bevel.bottom.preset) ?? getBevelProfile("circle")!;
      const bottomPaths = extractBevelPathsFromShape(shapeInput);

      const bottomBevelConfig: BevelMeshConfig = {
        width: bevel.bottom.width,
        height: bottomBevelHeight,
        profile: bottomProfile,
        zPosition: 0, // Start at back face
        zDirection: 1, // Bevel goes outward (+Z direction)
      };

      const bottomBevelData = generateBevelMesh(bottomPaths, bottomBevelConfig);
      geometryDataList.push(bottomBevelData);

      // Generate inner cap at recessed position (after bevel inset)
      // Extract the innermost ring from bevel paths to guarantee alignment
      const innerRing = extractInnerRingFromBevelPaths(bottomPaths, bottomBevelConfig);
      if (innerRing.outer.length >= 3) {
        const innerCapData = generateCapFromRing(innerRing.outer, innerRing.holes, {
          zPosition: innerRing.zPosition,
          normalDirection: -1, // Back-facing (-Z)
        });
        geometryDataList.push(innerCapData);
      }
    }
  }

  // Merge all geometry data
  const mergedData = mergeBevelGeometries(geometryDataList);

  // Convert to Three.js BufferGeometry
  const geometry = bevelGeometryDataToThreeGeometry(mergedData);

  // Translate so front face is at Z=0 (matching old behavior)
  const translateZ = -(extrusionDepth);
  translateGeometryZ(geometry, translateZ);

  return geometry;
}

/**
 * Translate geometry along Z axis
 */
function translateGeometryZ(geometry: THREE.BufferGeometry, z: number): void {
  const positions = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!positions) {return;}

  for (let i = 0; i < positions.count; i++) {
    positions.setZ(i, positions.getZ(i) + z);
  }

  positions.needsUpdate = true;
}
