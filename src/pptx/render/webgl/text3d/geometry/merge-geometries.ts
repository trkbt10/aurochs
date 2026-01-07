/**
 * @file Unified Geometry Merging for WebGL 3D Text
 *
 * Provides a single, well-tested function for merging multiple THREE.BufferGeometry
 * instances while properly handling all standard attributes.
 *
 * ## ECMA-376 Compliance
 *
 * This module ensures proper attribute preservation for:
 * - **gradFill** (Section 20.1.8.33): UV coordinates for gradient texture mapping
 * - **sp3d** (Section 20.1.5.9): Normals for proper 3D lighting
 * - **bevelT/bevelB** (Section 20.1.5.1): Position integrity for bevel rendering
 *
 * ## Attributes Handled
 *
 * | Attribute | Components | Required | Notes |
 * |-----------|------------|----------|-------|
 * | position  | 3 (x,y,z)  | Yes      | Concatenated in order |
 * | normal    | 3 (nx,ny,nz) | No     | Zeros if missing |
 * | uv        | 2 (u,v)    | No       | Omitted if ANY geometry lacks UVs |
 * | index     | 1          | No       | Offset-adjusted |
 *
 * @see ECMA-376 Part 1, Section 20.1.5 (3D Properties)
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill)
 */

import * as THREE from "three";

// =============================================================================
// Types
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

/**
 * Result of analyzing geometries before merge
 */
type GeometryAnalysis = {
  readonly totalVertices: number;
  readonly totalIndices: number;
  readonly hasAllUVs: boolean;
  readonly hasAllNormals: boolean;
  readonly hasAnyIndex: boolean;
  readonly customAttributeNames: readonly string[];
};

// =============================================================================
// Analysis
// =============================================================================

/**
 * Analyze geometries to determine merge strategy
 */
function analyzeGeometries(
  geometries: readonly THREE.BufferGeometry[],
  preserveCustomAttributes: boolean,
): GeometryAnalysis {
  let totalVertices = 0;
  let totalIndices = 0;
  let hasAllUVs = true;
  let hasAllNormals = true;
  let hasAnyIndex = false;
  const customAttrSets: Set<string>[] = [];

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    if (!posAttr) {
      continue;
    }

    totalVertices += posAttr.count;

    if (!geom.attributes.uv) {
      hasAllUVs = false;
    }

    if (!geom.attributes.normal) {
      hasAllNormals = false;
    }

    if (geom.index) {
      hasAnyIndex = true;
      totalIndices += geom.index.count;
    }

    // Collect custom attributes
    if (preserveCustomAttributes) {
      const customAttrs = new Set<string>();
      for (const name of Object.keys(geom.attributes)) {
        if (name !== "position" && name !== "normal" && name !== "uv") {
          customAttrs.add(name);
        }
      }
      customAttrSets.push(customAttrs);
    }
  }

  // Find common custom attributes (present in ALL geometries)
  const customAttributeNames: string[] = [];
  if (preserveCustomAttributes && customAttrSets.length > 0) {
    const firstSet = customAttrSets[0];
    for (const name of firstSet) {
      const inAll = customAttrSets.every((set) => set.has(name));
      if (inAll) {
        customAttributeNames.push(name);
      }
    }
  }

  return {
    totalVertices,
    totalIndices,
    hasAllUVs,
    hasAllNormals,
    hasAnyIndex,
    customAttributeNames,
  };
}

// =============================================================================
// Attribute Merging
// =============================================================================

/**
 * Merge position attributes from all geometries
 */
function mergePositions(
  geometries: readonly THREE.BufferGeometry[],
  totalVertices: number,
): THREE.BufferAttribute {
  const merged = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    if (!posAttr) {
      continue;
    }

    const array = posAttr.array as Float32Array;
    merged.set(array, offset * 3);
    offset += posAttr.count;
  }

  return new THREE.BufferAttribute(merged, 3);
}

/**
 * Merge normal attributes from all geometries
 * Fills with zeros for geometries without normals
 */
function mergeNormals(
  geometries: readonly THREE.BufferGeometry[],
  totalVertices: number,
): THREE.BufferAttribute {
  const merged = new Float32Array(totalVertices * 3);
  let offset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    if (!posAttr) {
      continue;
    }

    const normalAttr = geom.attributes.normal;
    if (normalAttr) {
      const array = normalAttr.array as Float32Array;
      merged.set(array, offset * 3);
    }
    // If no normals, the array segment remains zeros (Float32Array default)

    offset += posAttr.count;
  }

  return new THREE.BufferAttribute(merged, 3);
}

/**
 * Merge UV attributes from all geometries
 * Returns null if any geometry lacks UVs
 */
function mergeUVs(
  geometries: readonly THREE.BufferGeometry[],
  totalVertices: number,
  hasAllUVs: boolean,
): THREE.BufferAttribute | null {
  if (!hasAllUVs) {
    return null;
  }

  const merged = new Float32Array(totalVertices * 2);
  let offset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    const uvAttr = geom.attributes.uv;
    if (!posAttr || !uvAttr) {
      continue;
    }

    const array = uvAttr.array as Float32Array;
    merged.set(array, offset * 2);
    offset += posAttr.count;
  }

  return new THREE.BufferAttribute(merged, 2);
}

/**
 * Merge index buffers with proper offset adjustment
 */
function mergeIndices(
  geometries: readonly THREE.BufferGeometry[],
  totalIndices: number,
): number[] | null {
  if (totalIndices === 0) {
    return null;
  }

  const merged: number[] = [];
  let vertexOffset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    if (!posAttr) {
      continue;
    }

    const index = geom.index;
    if (index) {
      const array = index.array;
      for (let i = 0; i < array.length; i++) {
        merged.push(array[i] + vertexOffset);
      }
    }

    vertexOffset += posAttr.count;
  }

  return merged.length > 0 ? merged : null;
}

/**
 * Merge a custom attribute from all geometries
 */
function mergeCustomAttribute(
  geometries: readonly THREE.BufferGeometry[],
  attrName: string,
  totalVertices: number,
): THREE.BufferAttribute | null {
  // Get item size from first geometry that has this attribute
  let itemSize = 0;
  for (const geom of geometries) {
    const attr = geom.attributes[attrName];
    if (attr) {
      itemSize = attr.itemSize;
      break;
    }
  }

  if (itemSize === 0) {
    return null;
  }

  const merged = new Float32Array(totalVertices * itemSize);
  let offset = 0;

  for (const geom of geometries) {
    const posAttr = geom.attributes.position;
    const customAttr = geom.attributes[attrName];
    if (!posAttr) {
      continue;
    }

    if (customAttr && customAttr.itemSize === itemSize) {
      const array = customAttr.array as Float32Array;
      merged.set(array, offset * itemSize);
    }
    // If no attribute or different item size, segment remains zeros

    offset += posAttr.count;
  }

  return new THREE.BufferAttribute(merged, itemSize);
}

// =============================================================================
// Main API
// =============================================================================

/**
 * Merge multiple BufferGeometry instances into a single geometry.
 *
 * This is the unified geometry merge function that handles all standard
 * attributes (position, normal, uv) and optionally custom attributes.
 *
 * ## Usage
 *
 * ```typescript
 * const merged = mergeBufferGeometries([geomA, geomB, geomC]);
 *
 * // With options
 * const merged = mergeBufferGeometries(geometries, {
 *   disposeInputs: true,  // Free memory from input geometries
 *   preserveCustomAttributes: true,  // Keep custom attributes
 * });
 * ```
 *
 * ## Attribute Handling
 *
 * - **position**: Always preserved and concatenated
 * - **normal**: Preserved if present; zeros for missing
 * - **uv**: Only preserved if ALL geometries have UVs (for gradient consistency)
 * - **index**: Merged with proper vertex offset adjustment
 * - **custom**: Only if preserveCustomAttributes is true and present in ALL geometries
 *
 * @param geometries - Array of geometries to merge
 * @param options - Merge options
 * @returns New BufferGeometry containing all merged data
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (gradFill - UV requirement)
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

  // Analyze geometries
  const analysis = analyzeGeometries(geometries, preserveCustomAttributes);

  // Create merged geometry
  const merged = new THREE.BufferGeometry();

  // Merge position (required)
  merged.setAttribute("position", mergePositions(geometries, analysis.totalVertices));

  // Merge normals
  merged.setAttribute("normal", mergeNormals(geometries, analysis.totalVertices));

  // Merge UVs (only if all have them)
  const uvAttribute = mergeUVs(geometries, analysis.totalVertices, analysis.hasAllUVs);
  if (uvAttribute) {
    merged.setAttribute("uv", uvAttribute);
  }

  // Merge indices
  const indices = mergeIndices(geometries, analysis.totalIndices);
  if (indices) {
    merged.setIndex(indices);
  }

  // Merge custom attributes
  if (preserveCustomAttributes) {
    for (const attrName of analysis.customAttributeNames) {
      const customAttr = mergeCustomAttribute(geometries, attrName, analysis.totalVertices);
      if (customAttr) {
        merged.setAttribute(attrName, customAttr);
      }
    }
  }

  // Dispose inputs if requested
  if (disposeInputs) {
    for (const geom of geometries) {
      geom.dispose();
    }
  }

  return merged;
}

// =============================================================================
// Legacy Compatibility
// =============================================================================

/**
 * Merge exactly two ExtrudeGeometry instances.
 *
 * @deprecated Use `mergeBufferGeometries` instead.
 * This function exists for backward compatibility only.
 *
 * @param geomA - First geometry
 * @param geomB - Second geometry (will be disposed)
 * @returns Merged ExtrudeGeometry
 */
export function mergeExtrudeGeometriesLegacy(
  geomA: THREE.ExtrudeGeometry,
  geomB: THREE.ExtrudeGeometry,
): THREE.ExtrudeGeometry {
  // Use the unified function, disposing geomB for backward compatibility
  const merged = mergeBufferGeometries([geomA, geomB], {
    disposeInputs: false, // Don't dispose geomA
  });

  // Dispose geomB manually (legacy behavior)
  geomB.dispose();

  // Cast to ExtrudeGeometry (safe because it has all required attributes)
  return merged as THREE.ExtrudeGeometry;
}
