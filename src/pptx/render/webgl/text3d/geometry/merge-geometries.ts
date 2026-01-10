/**
 * @file Three.js Adapter for Geometry Merging
 *
 * Provides THREE.BufferGeometry API for the pure geometry merge module.
 * This is the adapter layer that converts between Three.js types and
 * the renderer-agnostic pure geometry types.
 *
 * ## Architecture
 *
 * - Pure logic: `./pure/merge.ts` (no dependencies)
 * - This file: Three.js adapter (converts THREE.BufferGeometry ↔ GeometryData)
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

import * as THREE from "three";
import type { GeometryData } from "./pure/types";
import { mergeGeometries as mergeGeometriesPure } from "./pure/merge";

// =============================================================================
// Type Conversion: THREE.BufferGeometry ↔ GeometryData
// =============================================================================

/**
 * Convert THREE.BufferGeometry to GeometryData
 *
 * @param geometry - Three.js BufferGeometry
 * @returns Pure GeometryData
 */
export function threeGeometryToGeometryData(
  geometry: THREE.BufferGeometry,
): GeometryData {
  const posAttr = geometry.attributes.position;
  const normalAttr = geometry.attributes.normal;
  const uvAttr = geometry.attributes.uv;
  const indexAttr = geometry.index;

  return {
    positions: posAttr
      ? new Float32Array(posAttr.array as Float32Array)
      : new Float32Array(0),
    normals: normalAttr
      ? new Float32Array(normalAttr.array as Float32Array)
      : new Float32Array(0),
    uvs: uvAttr
      ? new Float32Array(uvAttr.array as Float32Array)
      : new Float32Array(0),
    indices: indexAttr
      ? new Uint32Array(indexAttr.array)
      : new Uint32Array(0),
  };
}

/**
 * Convert GeometryData to THREE.BufferGeometry
 *
 * @param data - Pure GeometryData
 * @returns Three.js BufferGeometry
 */
export function geometryDataToThreeGeometry(
  data: GeometryData,
): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(data.positions, 3),
  );

  if (data.normals.length > 0) {
    geometry.setAttribute(
      "normal",
      new THREE.BufferAttribute(data.normals, 3),
    );
  }

  if (data.uvs.length > 0) {
    geometry.setAttribute(
      "uv",
      new THREE.BufferAttribute(data.uvs, 2),
    );
  }

  if (data.indices.length > 0) {
    geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  }

  return geometry;
}

// =============================================================================
// Options Types
// =============================================================================

/**
 * Options for geometry merging
 */
export type MergeGeometriesOptions = {
  /**
   * If true, disposes input geometries after merging.
   * Use when input geometries are no longer needed.
   * @default false
   */
  readonly disposeInputs?: boolean;

  /**
   * If true, preserves custom attributes beyond position/normal/uv.
   * Custom attributes must have the same name and item size in all geometries.
   * @default false
   */
  readonly preserveCustomAttributes?: boolean;
};

// =============================================================================
// Three.js API (uses pure module internally)
// =============================================================================

/**
 * Merge multiple BufferGeometry instances into a single geometry.
 *
 * Uses the pure geometry merge algorithm internally.
 *
 * ## Attribute Handling
 *
 * - **position**: Always preserved and concatenated
 * - **normal**: Preserved if present; zeros for missing
 * - **uv**: Only preserved if ALL geometries have UVs
 * - **index**: Merged with proper vertex offset adjustment
 *
 * @param geometries - Array of geometries to merge
 * @param options - Merge options
 * @returns New BufferGeometry containing all merged data
 */
export function mergeBufferGeometries(
  geometries: readonly THREE.BufferGeometry[],
  options: MergeGeometriesOptions = {},
): THREE.BufferGeometry {
  const { disposeInputs = false, preserveCustomAttributes = false } = options;

  // Handle empty input
  if (geometries.length === 0) {
    const empty = new THREE.BufferGeometry();
    empty.setAttribute("position", new THREE.BufferAttribute(new Float32Array(0), 3));
    return empty;
  }

  // Handle single geometry (return a clone)
  if (geometries.length === 1) {
    const clone = geometries[0].clone();
    if (disposeInputs) {
      geometries[0].dispose();
    }
    return clone;
  }

  // For preserveCustomAttributes, use the Three.js-specific logic
  // (The pure module doesn't support custom attributes in the same way)
  if (preserveCustomAttributes) {
    return mergeWithCustomAttributes(geometries, disposeInputs);
  }

  // Convert to pure types
  const geometryDataArray = geometries.map(threeGeometryToGeometryData);

  // Use pure merge
  const mergedData = mergeGeometriesPure(geometryDataArray);

  // Dispose inputs if requested
  if (disposeInputs) {
    for (const geom of geometries) {
      geom.dispose();
    }
  }

  // Convert back to Three.js
  return geometryDataToThreeGeometry(mergedData);
}

/**
 * Merge geometries while preserving custom attributes.
 * This is Three.js-specific logic for handling custom attributes.
 */
function mergeWithCustomAttributes(
  geometries: readonly THREE.BufferGeometry[],
  disposeInputs: boolean,
): THREE.BufferGeometry {
  // Analyze for custom attributes
  const customAttrNames = findCommonCustomAttributes(geometries);

  // Convert to pure types for base attributes
  const geometryDataArray = geometries.map(threeGeometryToGeometryData);
  const mergedData = mergeGeometriesPure(geometryDataArray);

  // Create result geometry
  const result = geometryDataToThreeGeometry(mergedData);

  // Merge custom attributes
  for (const attrName of customAttrNames) {
    const merged = mergeCustomAttribute(geometries, attrName);
    if (merged) {
      result.setAttribute(attrName, merged);
    }
  }

  // Dispose inputs if requested
  if (disposeInputs) {
    for (const geom of geometries) {
      geom.dispose();
    }
  }

  return result;
}

/**
 * Find custom attribute names common to all geometries
 */
function findCommonCustomAttributes(
  geometries: readonly THREE.BufferGeometry[],
): string[] {
  const attrCountMap = new Map<string, number>();

  for (const geom of geometries) {
    for (const name of Object.keys(geom.attributes)) {
      if (name !== "position" && name !== "normal" && name !== "uv") {
        attrCountMap.set(name, (attrCountMap.get(name) ?? 0) + 1);
      }
    }
  }

  const commonAttrs: string[] = [];
  for (const [name, count] of attrCountMap.entries()) {
    if (count === geometries.length) {
      commonAttrs.push(name);
    }
  }

  return commonAttrs;
}

/**
 * Merge a custom attribute from all geometries
 */
function mergeCustomAttribute(
  geometries: readonly THREE.BufferGeometry[],
  attrName: string,
): THREE.BufferAttribute | null {
  // Get item size from first geometry
  let itemSize = 0;
  let totalVertices = 0;

  for (const geom of geometries) {
    const attr = geom.attributes[attrName];
    const posAttr = geom.attributes.position;
    if (attr && !itemSize) {
      itemSize = attr.itemSize;
    }
    if (posAttr) {
      totalVertices += posAttr.count;
    }
  }

  if (itemSize === 0) {
    return null;
  }

  const merged = new Float32Array(totalVertices * itemSize);
  let offset = 0;

  for (const geom of geometries) {
    const attr = geom.attributes[attrName];
    const posAttr = geom.attributes.position;
    if (!posAttr) {continue;}

    if (attr && attr.itemSize === itemSize) {
      merged.set(attr.array as Float32Array, offset * itemSize);
    }
    offset += posAttr.count;
  }

  return new THREE.BufferAttribute(merged, itemSize);
}

// =============================================================================
// Legacy Compatibility
// =============================================================================

/**
 * Merge exactly two ExtrudeGeometry instances.
 *
 * @deprecated Use `mergeBufferGeometries` instead.
 *
 * @param geomA - First geometry
 * @param geomB - Second geometry (will be disposed)
 * @returns Merged ExtrudeGeometry
 */
export function mergeExtrudeGeometriesLegacy(
  geomA: THREE.ExtrudeGeometry,
  geomB: THREE.ExtrudeGeometry,
): THREE.ExtrudeGeometry {
  const merged = mergeBufferGeometries([geomA, geomB], {
    disposeInputs: false,
  });

  // Dispose geomB manually (legacy behavior)
  geomB.dispose();

  return merged as THREE.ExtrudeGeometry;
}

// =============================================================================
// Re-exports from pure module
// =============================================================================

export {
  mergeGeometries as mergeGeometriesData,
  mergeExtendedGeometries,
} from "./pure/merge";

export type {
  GeometryData,
  ExtendedGeometryData,
} from "./pure/types";
