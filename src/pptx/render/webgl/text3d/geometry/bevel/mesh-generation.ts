/**
 * @file Bevel Mesh Generation (Three.js Independent)
 *
 * Generates bevel mesh geometry from extracted paths and profiles.
 * Returns raw geometry data that can be converted to any graphics library format.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.1 (bevelT/bevelB)
 */

import type {
  BevelPath,
  BevelMeshConfig,
  BevelGeometryData,
} from "./types";
import { emptyGeometryData } from "./types";

// =============================================================================
// Single Path Bevel Generation
// =============================================================================

/**
 * Result from generating a single path's bevel
 */
type PathBevelResult = {
  readonly positions: number[];
  readonly normals: number[];
  readonly uvs: number[];
  readonly indices: number[];
};

/**
 * Generate bevel geometry for a single path.
 *
 * Creates a triangle strip mesh that follows the path, applying the
 * profile curve to create the beveled edge.
 *
 * @param path - Extracted bevel path with points and normals
 * @param config - Bevel configuration
 * @param vertexOffset - Starting vertex index for this path
 * @returns Raw geometry arrays for this path
 */
function generatePathBevel(
  path: BevelPath,
  config: BevelMeshConfig,
  vertexOffset: number,
): PathBevelResult {
  const { points: pathPoints, isHole, isClosed } = path;
  const { width, height, profile, zPosition, zDirection } = config;
  const profilePoints = profile.points;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const numPathPoints = pathPoints.length;
  const numProfilePoints = profilePoints.length;

  // Profile direction is always positive (toward solid):
  // - Outer: inwardNormal points toward center, inset goes toward center
  // - Hole: inwardNormal points toward solid, inset goes toward solid
  // This matches shrinkShape behavior for inner cap generation.
  const profileDir = 1;

  // Generate vertex grid: path points × profile points
  for (let pi = 0; pi < numPathPoints; pi++) {
    const pathPoint = pathPoints[pi];
    const { position, normal: inwardNormal, miterFactor } = pathPoint;

    // Calculate path-local UV coordinate (along the path)
    const pathU = pi / (numPathPoints - (isClosed ? 0 : 1));

    for (let ri = 0; ri < numProfilePoints; ri++) {
      const profilePoint = profilePoints[ri];

      // Inset along the inward normal, scaled by miter factor for proper corner handling.
      // The miter factor ensures the bevel's inner edge aligns with the shrunk shape
      // used for inner cap generation.
      const insetAmount = profilePoint.inset * width * miterFactor * profileDir;
      const x = position.x + inwardNormal.x * insetAmount;
      const y = position.y + inwardNormal.y * insetAmount;

      // Depth in Z direction
      const z = zPosition + profilePoint.depth * height * zDirection;

      positions.push(x, y, z);

      // Normal calculation for bevel surface
      //
      // The bevel surface should face away from the solid:
      // - Outer: faces outward (away from shape center)
      // - Hole: faces into the hole (toward hole center)
      //
      // inwardNormal points:
      // - Outer: toward shape center
      // - Hole: toward solid (away from hole center)
      //
      // For both cases, the surface normal XY component is -inwardNormal.
      const outwardSign = -1;
      // Normal Z component: bevel surface faces opposite to depth direction
      // For top bevel (zDirection=-1, going into -Z), normal faces +Z (toward viewer)
      // For bottom bevel (zDirection=+1, going into +Z), normal faces -Z (toward back)
      const profileNormalZ = -zDirection * (1 - profilePoint.inset);
      const profileNormalXY = profilePoint.depth;
      const normalLength = Math.sqrt(
        profileNormalZ * profileNormalZ + profileNormalXY * profileNormalXY,
      );

      if (normalLength > 0.001) {
        normals.push(
          (outwardSign * inwardNormal.x * profileNormalXY) / normalLength,
          (outwardSign * inwardNormal.y * profileNormalXY) / normalLength,
          profileNormalZ / normalLength,
        );
      } else {
        normals.push(0, 0, zDirection);
      }

      // UV: u = along path, v = along profile
      const profileV = profilePoint.t;
      uvs.push(pathU, profileV);
    }
  }

  // Generate indices for triangle strip
  for (let pi = 0; pi < numPathPoints - (isClosed ? 0 : 1); pi++) {
    const nextPi = (pi + 1) % numPathPoints;

    for (let ri = 0; ri < numProfilePoints - 1; ri++) {
      const i0 = vertexOffset + pi * numProfilePoints + ri;
      const i1 = vertexOffset + pi * numProfilePoints + ri + 1;
      const i2 = vertexOffset + nextPi * numProfilePoints + ri;
      const i3 = vertexOffset + nextPi * numProfilePoints + ri + 1;

      // Two triangles per quad
      // Winding order determines face normal direction via cross product.
      //
      // Quad layout (pi = path index, ri = profile index):
      //   i0 (pi, ri) -------- i1 (pi, ri+1)
      //       |                    |
      //   i2 (pi+1, ri) ------ i3 (pi+1, ri+1)
      //
      // With unified profile direction (both toward solid):
      // - Outer (CCW): standard winding
      // - Hole (CW): need opposite winding due to path direction
      if (isHole) {
        indices.push(i0, i1, i2);
        indices.push(i2, i1, i3);
      } else {
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }
  }

  return { positions, normals, uvs, indices };
}

// =============================================================================
// Multi-Path Bevel Generation
// =============================================================================

/**
 * Calculate the bounding box of a path at full bevel inset.
 */
function calculateInsetBounds(
  path: BevelPath,
  width: number,
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const pathPoint of path.points) {
    const { position, normal, miterFactor } = pathPoint;
    const insetAmount = width * miterFactor;
    const x = position.x + normal.x * insetAmount;
    const y = position.y + normal.y * insetAmount;

    if (x < minX) {minX = x;}
    if (x > maxX) {maxX = x;}
    if (y < minY) {minY = y;}
    if (y > maxY) {maxY = y;}
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Calculate the maximum safe inset ratio for a hole to stay within outer bounds.
 *
 * @param holePath - The hole bevel path
 * @param outerBounds - Bounds of the shrunk outer at full inset
 * @param width - Bevel width
 * @returns Ratio 0-1 indicating how much of the profile can be applied
 */
function calculateSafeHoleInsetRatio(
  holePath: BevelPath,
  outerBounds: { minX: number; maxX: number; minY: number; maxY: number },
  width: number,
): number {
  // Check how much the hole can expand before exceeding outer bounds
  let minRatio = 1.0;
  let collisionDetected = false;

  for (const pathPoint of holePath.points) {
    const { position, normal, miterFactor } = pathPoint;
    const maxInsetAmount = width * miterFactor;

    // For each axis, calculate how much we can move before hitting the bound
    const dx = normal.x * maxInsetAmount;
    const dy = normal.y * maxInsetAmount;

    if (Math.abs(dx) > 0.001) {
      const targetX = position.x + dx;
      if (dx > 0 && targetX > outerBounds.maxX) {
        const allowedDx = outerBounds.maxX - position.x;
        const ratio = Math.max(0, allowedDx / dx);
        minRatio = Math.min(minRatio, ratio);
        collisionDetected = true;
      } else if (dx < 0 && targetX < outerBounds.minX) {
        const allowedDx = outerBounds.minX - position.x;
        const ratio = Math.max(0, allowedDx / dx);
        minRatio = Math.min(minRatio, ratio);
        collisionDetected = true;
      }
    }

    if (Math.abs(dy) > 0.001) {
      const targetY = position.y + dy;
      if (dy > 0 && targetY > outerBounds.maxY) {
        const allowedDy = outerBounds.maxY - position.y;
        const ratio = Math.max(0, allowedDy / dy);
        minRatio = Math.min(minRatio, ratio);
        collisionDetected = true;
      } else if (dy < 0 && targetY < outerBounds.minY) {
        const allowedDy = outerBounds.minY - position.y;
        const ratio = Math.max(0, allowedDy / dy);
        minRatio = Math.min(minRatio, ratio);
        collisionDetected = true;
      }
    }
  }

  // Only apply safety margin if collision was actually detected
  if (collisionDetected) {
    return Math.max(0, minRatio * 0.9);
  }

  return 1.0;
}

/**
 * Generate bevel geometry for a single path with optional width scaling.
 */
function generatePathBevelWithScale(
  path: BevelPath,
  config: BevelMeshConfig,
  vertexOffset: number,
  widthScale: number,
): PathBevelResult {
  const { points: pathPoints, isHole, isClosed } = path;
  const { width, height, profile, zPosition, zDirection } = config;
  const profilePoints = profile.points;

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const numPathPoints = pathPoints.length;
  const numProfilePoints = profilePoints.length;
  const profileDir = 1;

  // Effective width for this path (may be scaled down for holes to prevent collision)
  const effectiveWidth = width * widthScale;

  for (let pi = 0; pi < numPathPoints; pi++) {
    const pathPoint = pathPoints[pi];
    const { position, normal: inwardNormal, miterFactor } = pathPoint;

    const pathU = pi / (numPathPoints - (isClosed ? 0 : 1));

    for (let ri = 0; ri < numProfilePoints; ri++) {
      const profilePoint = profilePoints[ri];

      // Use effective width for inset calculation
      const insetAmount = profilePoint.inset * effectiveWidth * miterFactor * profileDir;
      const x = position.x + inwardNormal.x * insetAmount;
      const y = position.y + inwardNormal.y * insetAmount;

      const z = zPosition + profilePoint.depth * height * zDirection;

      positions.push(x, y, z);

      const outwardSign = -1;
      // Normal Z component: bevel surface faces opposite to depth direction
      const profileNormalZ = -zDirection * (1 - profilePoint.inset);
      const profileNormalXY = profilePoint.depth;
      const normalLength = Math.sqrt(
        profileNormalZ * profileNormalZ + profileNormalXY * profileNormalXY,
      );

      if (normalLength > 0.001) {
        normals.push(
          (outwardSign * inwardNormal.x * profileNormalXY) / normalLength,
          (outwardSign * inwardNormal.y * profileNormalXY) / normalLength,
          profileNormalZ / normalLength,
        );
      } else {
        normals.push(0, 0, zDirection);
      }

      const profileV = profilePoint.t;
      uvs.push(pathU, profileV);
    }
  }

  for (let pi = 0; pi < numPathPoints - (isClosed ? 0 : 1); pi++) {
    const nextPi = (pi + 1) % numPathPoints;

    for (let ri = 0; ri < numProfilePoints - 1; ri++) {
      const i0 = vertexOffset + pi * numProfilePoints + ri;
      const i1 = vertexOffset + pi * numProfilePoints + ri + 1;
      const i2 = vertexOffset + nextPi * numProfilePoints + ri;
      const i3 = vertexOffset + nextPi * numProfilePoints + ri + 1;

      if (isHole) {
        indices.push(i0, i1, i2);
        indices.push(i2, i1, i3);
      } else {
        indices.push(i0, i2, i1);
        indices.push(i1, i2, i3);
      }
    }
  }

  return { positions, normals, uvs, indices };
}

/**
 * Generate bevel geometry for multiple paths.
 *
 * Combines geometry from all paths (outer contour and holes) into
 * a single geometry data structure.
 *
 * When hole expansion would exceed the shrunk outer bounds, the hole's
 * bevel width is automatically reduced to prevent self-intersection.
 *
 * @param paths - Extracted bevel paths
 * @param config - Bevel configuration
 * @returns Combined geometry data for all paths
 */
export function generateBevelMesh(
  paths: readonly BevelPath[],
  config: BevelMeshConfig,
): BevelGeometryData {
  if (paths.length === 0) {
    return emptyGeometryData();
  }

  const { width } = config;

  // Separate outer paths from holes
  const outerPaths = paths.filter((p) => !p.isHole);
  const holePaths = paths.filter((p) => p.isHole);

  // Calculate combined outer bounds at full inset (union of all outer paths)
  let combinedOuterBounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
  for (const outerPath of outerPaths) {
    const bounds = calculateInsetBounds(outerPath, width);
    combinedOuterBounds.minX = Math.min(combinedOuterBounds.minX, bounds.minX);
    combinedOuterBounds.maxX = Math.max(combinedOuterBounds.maxX, bounds.maxX);
    combinedOuterBounds.minY = Math.min(combinedOuterBounds.minY, bounds.minY);
    combinedOuterBounds.maxY = Math.max(combinedOuterBounds.maxY, bounds.maxY);
  }

  // If no outer paths, use infinite bounds (no collision check needed)
  if (outerPaths.length === 0) {
    combinedOuterBounds = { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };
  }

  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allUvs: number[] = [];
  const allIndices: number[] = [];

  // eslint-disable-next-line no-restricted-syntax -- Performance: vertex offset accumulator for indexed geometry
  let vertexOffset = 0;

  // Generate outer bevels with full width
  for (const outerPath of outerPaths) {
    const { positions, normals, uvs, indices } = generatePathBevelWithScale(
      outerPath,
      config,
      vertexOffset,
      1.0, // Full width for outer
    );

    allPositions.push(...positions);
    allNormals.push(...normals);
    allUvs.push(...uvs);
    allIndices.push(...indices);

    vertexOffset += positions.length / 3;
  }

  // Generate hole bevels with width scaled to prevent collision
  for (const holePath of holePaths) {
    const safeRatio = calculateSafeHoleInsetRatio(holePath, combinedOuterBounds, width);

    const { positions, normals, uvs, indices } = generatePathBevelWithScale(
      holePath,
      config,
      vertexOffset,
      safeRatio,
    );

    allPositions.push(...positions);
    allNormals.push(...normals);
    allUvs.push(...uvs);
    allIndices.push(...indices);

    vertexOffset += positions.length / 3;
  }

  return {
    positions: new Float32Array(allPositions),
    normals: new Float32Array(allNormals),
    uvs: new Float32Array(allUvs),
    indices: new Uint32Array(allIndices),
  };
}

// =============================================================================
// Inner Cap Generation from Bevel Paths
// =============================================================================

/**
 * Extract the innermost ring vertices from bevel paths.
 *
 * These vertices are at profile inset=1.0 and define the inner edge
 * of the bevel. They can be used to create the inner cap that aligns
 * perfectly with the bevel mesh.
 *
 * When hole expansion would exceed the shrunk outer bounds, the hole's
 * expansion is automatically reduced to match what was used in
 * generateBevelMesh, ensuring perfect alignment between bevel and inner cap.
 *
 * @param paths - Bevel paths (outer + holes)
 * @param config - Bevel configuration
 * @returns Outer ring and hole rings at the inner cap position
 */
export function extractInnerRingFromBevelPaths(
  paths: readonly BevelPath[],
  config: BevelMeshConfig,
): {
  outer: { x: number; y: number }[];
  holes: { x: number; y: number }[][];
  zPosition: number;
} {
  const { width, height, profile, zPosition, zDirection } = config;
  const profilePoints = profile.points;
  const lastProfilePoint = profilePoints[profilePoints.length - 1];

  // Inner cap Z position: at the end of the bevel depth
  const innerCapZ = zPosition + lastProfilePoint.depth * height * zDirection;

  // Find outer path and calculate its shrunk bounds (same logic as generateBevelMesh)
  const outerPath = paths.find((p) => !p.isHole);
  const holePaths = paths.filter((p) => p.isHole);

  // Calculate outer ring at full inset
  const outer: { x: number; y: number }[] = [];
  if (outerPath) {
    for (const pathPoint of outerPath.points) {
      const { position, normal: inwardNormal, miterFactor } = pathPoint;
      const insetAmount = lastProfilePoint.inset * width * miterFactor;
      const x = position.x + inwardNormal.x * insetAmount;
      const y = position.y + inwardNormal.y * insetAmount;
      outer.push({ x, y });
    }
  }

  // Calculate outer bounds for hole collision detection
  const outerBounds = outerPath
    ? calculateInsetBounds(outerPath, width)
    : { minX: -Infinity, maxX: Infinity, minY: -Infinity, maxY: Infinity };

  // Generate hole rings with same safe ratio as used in bevel mesh generation
  const finalHoles: { x: number; y: number }[][] = [];

  for (const holePath of holePaths) {
    if (holePath.points.length < 3) {continue;}

    // Calculate same safe ratio as generateBevelMesh
    const safeRatio = calculateSafeHoleInsetRatio(holePath, outerBounds, width);
    const effectiveWidth = width * safeRatio;

    const holeRing: { x: number; y: number }[] = [];
    for (const pathPoint of holePath.points) {
      const { position, normal: inwardNormal, miterFactor } = pathPoint;
      const insetAmount = lastProfilePoint.inset * effectiveWidth * miterFactor;
      const x = position.x + inwardNormal.x * insetAmount;
      const y = position.y + inwardNormal.y * insetAmount;
      holeRing.push({ x, y });
    }

    finalHoles.push(holeRing);
  }

  return { outer, holes: finalHoles, zPosition: innerCapZ };
}

/**
 * Compute axis-aligned bounding box of a polygon.
 */
function computeBounds(points: readonly { x: number; y: number }[]): {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
} {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) {minX = p.x;}
    if (p.x > maxX) {maxX = p.x;}
    if (p.y < minY) {minY = p.y;}
    if (p.y > maxY) {maxY = p.y;}
  }

  return { minX, maxX, minY, maxY };
}

// =============================================================================
// Geometry Merging
// =============================================================================

/**
 * Merge multiple bevel geometry data into one.
 *
 * Useful for combining front and back bevel geometries.
 *
 * @param geometries - Array of geometry data to merge
 * @returns Merged geometry data
 */
export function mergeBevelGeometries(
  geometries: readonly BevelGeometryData[],
): BevelGeometryData {
  if (geometries.length === 0) {
    return emptyGeometryData();
  }

  if (geometries.length === 1) {
    return geometries[0];
  }

  const totalVertices = geometries.reduce(
    (acc, geom) => acc + geom.positions.length / 3,
    0,
  );

  const positions = new Float32Array(totalVertices * 3);
  const normals = new Float32Array(totalVertices * 3);
  const uvs = new Float32Array(totalVertices * 2);
  const indices: number[] = [];

  // Offset accumulators for merging typed arrays
  // eslint-disable-next-line no-restricted-syntax -- Performance: typed array merge requires offset accumulation
  let vertexOffset = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: typed array merge requires offset accumulation
  let positionOffset = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: typed array merge requires offset accumulation
  let normalOffset = 0;
  // eslint-disable-next-line no-restricted-syntax -- Performance: typed array merge requires offset accumulation
  let uvOffset = 0;

  for (const geom of geometries) {
    const vertexCount = geom.positions.length / 3;

    positions.set(geom.positions, positionOffset);
    normals.set(geom.normals, normalOffset);
    uvs.set(geom.uvs, uvOffset);

    for (let i = 0; i < geom.indices.length; i++) {
      indices.push(geom.indices[i] + vertexOffset);
    }

    vertexOffset += vertexCount;
    positionOffset += geom.positions.length;
    normalOffset += geom.normals.length;
    uvOffset += geom.uvs.length;
  }

  return {
    positions,
    normals,
    uvs,
    indices: new Uint32Array(indices),
  };
}
