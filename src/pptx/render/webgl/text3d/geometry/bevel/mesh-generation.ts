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

  // For holes, we need to invert the profile direction
  const profileDir = isHole ? -1 : 1;

  // Generate vertex grid: path points × profile points
  for (let pi = 0; pi < numPathPoints; pi++) {
    const pathPoint = pathPoints[pi];
    const { position, normal: inwardNormal } = pathPoint;

    // Calculate path-local UV coordinate (along the path)
    const pathU = pi / (numPathPoints - (isClosed ? 0 : 1));

    for (let ri = 0; ri < numProfilePoints; ri++) {
      const profilePoint = profilePoints[ri];

      // Inset along the inward normal
      const insetAmount = profilePoint.inset * width * profileDir;
      const x = position.x + inwardNormal.x * insetAmount;
      const y = position.y + inwardNormal.y * insetAmount;

      // Depth in Z direction
      const z = zPosition + profilePoint.depth * height * zDirection;

      positions.push(x, y, z);

      // Normal calculation for bevel surface
      //
      // The bevel surface faces OUTWARD from the shape, so the normal
      // must point away from the shape center. However, inwardNormal
      // points TOWARD the center, so we negate it for the XY component.
      //
      // Profile curve:
      // - At inset=0 (edge of profile), surface is flat, normal = +Z
      // - At inset=1 (end of profile), surface turns 90°, normal = outward XY
      //
      // For holes, the bevel faces inward (into the hole), so we don't negate.
      const outwardSign = isHole ? 1 : -1;
      const profileNormalZ = zDirection * (1 - profilePoint.inset);
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
      // For outer contour:
      // - Path goes CCW around shape
      // - Profile goes from face (ri=0) toward edge (ri=max)
      // - Surface faces outward (toward viewer for front bevel)
      //
      // Triangle winding must produce normals matching vertex normals.
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
 * Generate bevel geometry for multiple paths.
 *
 * Combines geometry from all paths (outer contour and holes) into
 * a single geometry data structure.
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

  const allPositions: number[] = [];
  const allNormals: number[] = [];
  const allUvs: number[] = [];
  const allIndices: number[] = [];

  // eslint-disable-next-line no-restricted-syntax -- Performance: vertex offset accumulator for indexed geometry
  let vertexOffset = 0;

  for (const path of paths) {
    const { positions, normals, uvs, indices } = generatePathBevel(
      path,
      config,
      vertexOffset,
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
