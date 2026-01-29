/**
 * @file Pure Geometry Merging
 *
 * Merges multiple GeometryData instances into a single geometry.
 * Completely renderer-agnostic - no Three.js or other library dependencies.
 *
 * ## ECMA-376 Compliance
 *
 * Preserves attributes required for:
 * - **gradFill** (Section 20.1.8.33): UV coordinates for gradient texture mapping
 * - **sp3d** (Section 20.1.5.9): Normals for proper 3D lighting
 * - **bevelT/bevelB** (Section 20.1.5.1): Position integrity for bevel rendering
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 */

import type { GeometryData, ExtendedGeometryData } from "./types";
import { emptyGeometry } from "./types";

// =============================================================================
// Analysis
// =============================================================================

type MergeAnalysis = {
  readonly totalVertices: number;
  readonly totalIndices: number;
  readonly hasAllUVs: boolean;
  readonly hasAllNormals: boolean;
};

/**
 * Analyze geometries to determine merge requirements
 */
function analyzeGeometries(geometries: readonly GeometryData[]): MergeAnalysis {
  let totalVertices = 0;
  let totalIndices = 0;
  let hasAllUVs = true;
  let hasAllNormals = true;

  for (const geom of geometries) {
    const vertexCount = geom.positions.length / 3;
    totalVertices += vertexCount;
    totalIndices += geom.indices.length;

    if (geom.uvs.length === 0) {
      hasAllUVs = false;
    }

    if (geom.normals.length === 0) {
      hasAllNormals = false;
    }
  }

  return { totalVertices, totalIndices, hasAllUVs, hasAllNormals };
}

// =============================================================================
// Attribute Merging
// =============================================================================

/**
 * Merge positions from all geometries
 */
function mergePositions(
  geometries: readonly GeometryData[],
  totalVertices: number,
): Float32Array {
  const merged = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geom of geometries) {
    merged.set(geom.positions, offset);
    offset += geom.positions.length;
  }

  return merged;
}

/**
 * Merge normals from all geometries
 * Fills with zeros for geometries without normals
 */
function mergeNormals(
  geometries: readonly GeometryData[],
  totalVertices: number,
): Float32Array {
  const merged = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geom of geometries) {
    const vertexCount = geom.positions.length / 3;

    if (geom.normals.length > 0) {
      merged.set(geom.normals, offset);
    }
    // If no normals, the segment remains zeros (Float32Array default)

    offset += vertexCount * 3;
  }

  return merged;
}

/**
 * Merge UVs from all geometries
 * Returns empty array if any geometry lacks UVs
 */
function mergeUVs(
  geometries: readonly GeometryData[],
  totalVertices: number,
  hasAllUVs: boolean,
): Float32Array {
  if (!hasAllUVs) {
    return new Float32Array(0);
  }

  const merged = new Float32Array(totalVertices * 2);
  let offset = 0;

  for (const geom of geometries) {
    merged.set(geom.uvs, offset);
    offset += geom.uvs.length;
  }

  return merged;
}

/**
 * Merge indices with proper vertex offset adjustment
 */
function mergeIndices(
  geometries: readonly GeometryData[],
  totalIndices: number,
): Uint32Array {
  if (totalIndices === 0) {
    return new Uint32Array(0);
  }

  const merged = new Uint32Array(totalIndices);
  let indexOffset = 0;
  let vertexOffset = 0;

  for (const geom of geometries) {
    const indices = geom.indices;
    for (let i = 0; i < indices.length; i++) {
      merged[indexOffset + i] = indices[i] + vertexOffset;
    }

    indexOffset += indices.length;
    vertexOffset += geom.positions.length / 3;
  }

  return merged;
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Merge multiple GeometryData instances into a single geometry.
 *
 * ## Attribute Handling
 *
 * - **positions**: Always preserved and concatenated
 * - **normals**: Preserved; zeros for geometries without normals
 * - **uvs**: Only preserved if ALL geometries have UVs
 * - **indices**: Merged with proper vertex offset adjustment
 *
 * @param geometries - Array of geometries to merge
 * @returns Merged GeometryData
 *
 * @example
 * ```typescript
 * const merged = mergeGeometries([geomA, geomB, geomC]);
 * ```
 */
export function mergeGeometries(
  geometries: readonly GeometryData[],
): GeometryData {
  // Handle empty input
  if (geometries.length === 0) {
    return emptyGeometry();
  }

  // Handle single geometry (return copy)
  if (geometries.length === 1) {
    const g = geometries[0];
    return {
      positions: new Float32Array(g.positions),
      normals: new Float32Array(g.normals),
      uvs: new Float32Array(g.uvs),
      indices: new Uint32Array(g.indices),
    };
  }

  // Analyze geometries
  const analysis = analyzeGeometries(geometries);

  // Merge all attributes
  return {
    positions: mergePositions(geometries, analysis.totalVertices),
    normals: mergeNormals(geometries, analysis.totalVertices),
    uvs: mergeUVs(geometries, analysis.totalVertices, analysis.hasAllUVs),
    indices: mergeIndices(geometries, analysis.totalIndices),
  };
}

// =============================================================================
// Extended Geometry Merging
// =============================================================================

type ExtendedMergeAnalysis = MergeAnalysis & {
  readonly commonCustomAttrs: readonly string[];
  readonly customAttrSizes: Readonly<Record<string, number>>;
};

/**
 * Analyze extended geometries for merge
 */
function analyzeExtendedGeometries(
  geometries: readonly ExtendedGeometryData[],
): ExtendedMergeAnalysis {
  const base = analyzeGeometries(geometries);

  // Find custom attributes common to all geometries
  const attrCountMap = new Map<string, number>();
  const attrSizeMap = new Map<string, number>();

  for (const geom of geometries) {
    for (const [name, size] of Object.entries(geom.customAttributeSizes)) {
      attrCountMap.set(name, (attrCountMap.get(name) ?? 0) + 1);
      attrSizeMap.set(name, size);
    }
  }

  const commonCustomAttrs: string[] = [];
  const customAttrSizes: Record<string, number> = {};

  for (const [name, count] of attrCountMap.entries()) {
    if (count === geometries.length) {
      commonCustomAttrs.push(name);
      customAttrSizes[name] = attrSizeMap.get(name)!;
    }
  }

  return {
    ...base,
    commonCustomAttrs,
    customAttrSizes,
  };
}

/**
 * Merge a custom attribute from all geometries
 */
function mergeCustomAttribute(
  ...args: [
    geometries: readonly ExtendedGeometryData[],
    attrName: string,
    totalVertices: number,
    componentSize: number,
  ]
): Float32Array {
  const [geometries, attrName, totalVertices, componentSize] = args;
  const merged = new Float32Array(totalVertices * componentSize);
  let offset = 0;

  for (const geom of geometries) {
    const attr = geom.customAttributes[attrName];
    if (attr) {
      merged.set(attr, offset);
    }
    offset += (geom.positions.length / 3) * componentSize;
  }

  return merged;
}

/**
 * Merge multiple ExtendedGeometryData instances.
 *
 * Custom attributes are only preserved if present in ALL geometries.
 *
 * @param geometries - Array of extended geometries to merge
 * @returns Merged ExtendedGeometryData
 */
export function mergeExtendedGeometries(
  geometries: readonly ExtendedGeometryData[],
): ExtendedGeometryData {
  if (geometries.length === 0) {
    return {
      ...emptyGeometry(),
      customAttributes: {},
      customAttributeSizes: {},
    };
  }

  if (geometries.length === 1) {
    const g = geometries[0];
    return {
      positions: new Float32Array(g.positions),
      normals: new Float32Array(g.normals),
      uvs: new Float32Array(g.uvs),
      indices: new Uint32Array(g.indices),
      customAttributes: { ...g.customAttributes },
      customAttributeSizes: { ...g.customAttributeSizes },
    };
  }

  const analysis = analyzeExtendedGeometries(geometries);

  // Merge base attributes
  const base = mergeGeometries(geometries);

  // Merge custom attributes
  const customAttributes: Record<string, Float32Array> = {};
  for (const attrName of analysis.commonCustomAttrs) {
    customAttributes[attrName] = mergeCustomAttribute(
      geometries,
      attrName,
      analysis.totalVertices,
      analysis.customAttrSizes[attrName],
    );
  }

  return {
    ...base,
    customAttributes,
    customAttributeSizes: { ...analysis.customAttrSizes },
  };
}
