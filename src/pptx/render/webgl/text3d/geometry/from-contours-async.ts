/**
 * @file Async geometry generation from text layout
 *
 * Uses Web Worker for glyph extraction.
 */

import * as THREE from "three";
import type { ContourPath } from "../../../glyph";
import { layoutTextAsync } from "../../../glyph";
import { getBevelConfig } from "./bevel";
import type { Bevel3d } from "../../../../domain/three-d";

// =============================================================================
// Types
// =============================================================================

export type TextGeometryConfig = {
  readonly text: string;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
  readonly extrusionDepth: number;
  readonly bevel?: Bevel3d;
  readonly letterSpacing?: number;
  readonly enableKerning?: boolean;
};

// =============================================================================
// Main API
// =============================================================================

/**
 * Create empty fallback geometry
 */
function createEmptyGeometry(): THREE.ExtrudeGeometry {
  return new THREE.ExtrudeGeometry(new THREE.Shape(), { depth: 0 });
}

/**
 * Generate extruded geometry from text (async - uses Web Worker)
 */
export async function createTextGeometryAsync(
  config: TextGeometryConfig,
): Promise<THREE.ExtrudeGeometry> {
  try {
    // Layout text using worker
    const layout = await layoutTextAsync(config.text, {
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: config.fontStyle,
      letterSpacing: config.letterSpacing,
      enableKerning: config.enableKerning,
    });

    if (!layout?.combinedPaths?.length) {
      return createEmptyGeometry();
    }

    // Convert paths to THREE.Shape
    const shapes = pathsToShapes(layout.combinedPaths);

    // Filter out any invalid shapes
    const validShapes = shapes.filter(
      (s): s is THREE.Shape => s != null && s instanceof THREE.Shape,
    );

    if (validShapes.length === 0) {
      return createEmptyGeometry();
    }

    // Get bevel configuration
    const bevelConfig = getBevelConfig(config.bevel);

    // Create extrude settings
    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: config.extrusionDepth / 96,
      bevelEnabled: bevelConfig !== undefined,
      bevelThickness: bevelConfig?.thickness ?? 0,
      bevelSize: bevelConfig?.size ?? 0,
      bevelSegments: bevelConfig?.segments ?? 1,
      curveSegments: 8,
    };

    // Create geometry - process one shape at a time
    let geometry: THREE.ExtrudeGeometry;
    if (validShapes.length === 1) {
      geometry = new THREE.ExtrudeGeometry(validShapes[0], extrudeSettings);
    } else {
      geometry = new THREE.ExtrudeGeometry(validShapes[0], extrudeSettings);
      for (let i = 1; i < validShapes.length; i++) {
        const shapeGeom = new THREE.ExtrudeGeometry(validShapes[i], extrudeSettings);
        geometry = mergeExtrudeGeometries(geometry, shapeGeom);
      }
    }

    // Center geometry
    geometry.computeBoundingBox();
    if (geometry.boundingBox) {
      const center = new THREE.Vector3();
      geometry.boundingBox.getCenter(center);
      geometry.translate(-center.x, -center.y, -center.z);
    }

    return geometry;
  } catch (error) {
    console.warn("Failed to create text geometry:", error);
    return createEmptyGeometry();
  }
}

// =============================================================================
// Path to Shape Conversion
// =============================================================================

function pathsToShapes(paths: readonly ContourPath[]): THREE.Shape[] {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  const outerPaths = paths.filter((p) => p && !p.isHole);
  const holePaths = paths.filter((p) => p && p.isHole);

  const shapes: THREE.Shape[] = [];

  for (const outerPath of outerPaths) {
    const shape = pathToShape(outerPath);
    if (!shape) continue;

    for (const holePath of holePaths) {
      if (isPathContainedIn(holePath, outerPath)) {
        const hole = pathToPath(holePath);
        if (hole) {
          shape.holes.push(hole);
        }
      }
    }

    shapes.push(shape);
  }

  return shapes;
}

function pathToShape(contourPath: ContourPath): THREE.Shape | null {
  const { points } = contourPath;
  if (!points || !Array.isArray(points) || points.length < 3) {
    return null;
  }

  try {
    const shape = new THREE.Shape();
    const first = points[0];
    if (typeof first?.x !== "number" || typeof first?.y !== "number") {
      return null;
    }
    shape.moveTo(first.x, -first.y);

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      if (typeof pt?.x !== "number" || typeof pt?.y !== "number") {
        continue;
      }
      shape.lineTo(pt.x, -pt.y);
    }

    shape.closePath();
    return shape;
  } catch {
    return null;
  }
}

function pathToPath(contourPath: ContourPath): THREE.Path | null {
  const { points } = contourPath;
  if (!points || !Array.isArray(points) || points.length < 3) {
    return null;
  }

  try {
    const path = new THREE.Path();
    const first = points[0];
    if (typeof first?.x !== "number" || typeof first?.y !== "number") {
      return null;
    }
    path.moveTo(first.x, -first.y);

    for (let i = 1; i < points.length; i++) {
      const pt = points[i];
      if (typeof pt?.x !== "number" || typeof pt?.y !== "number") {
        continue;
      }
      path.lineTo(pt.x, -pt.y);
    }

    path.closePath();
    return path;
  } catch {
    return null;
  }
}

function isPathContainedIn(hole: ContourPath, outer: ContourPath): boolean {
  if (!hole?.points?.length || !outer?.points || outer.points.length < 3) {
    return false;
  }
  return isPointInPolygon(hole.points[0], outer.points);
}

function isPointInPolygon(
  point: { x: number; y: number },
  polygon: readonly { x: number; y: number }[],
): boolean {
  let inside = false;
  const n = polygon.length;

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x,
      yi = polygon[i].y;
    const xj = polygon[j].x,
      yj = polygon[j].y;

    if (yi > point.y !== yj > point.y && point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

// =============================================================================
// Geometry Merging
// =============================================================================

function mergeExtrudeGeometries(
  geomA: THREE.ExtrudeGeometry,
  geomB: THREE.ExtrudeGeometry,
): THREE.ExtrudeGeometry {
  const posA = geomA.attributes.position;
  const posB = geomB.attributes.position;
  const normalA = geomA.attributes.normal;
  const normalB = geomB.attributes.normal;
  const uvA = geomA.attributes.uv;
  const uvB = geomB.attributes.uv;

  const mergedPositions = new Float32Array(posA.count * 3 + posB.count * 3);
  mergedPositions.set(posA.array as Float32Array, 0);
  mergedPositions.set(posB.array as Float32Array, posA.count * 3);

  const mergedNormals = new Float32Array(normalA.count * 3 + normalB.count * 3);
  mergedNormals.set(normalA.array as Float32Array, 0);
  mergedNormals.set(normalB.array as Float32Array, normalA.count * 3);

  const mergedUvs = uvA && uvB
    ? new Float32Array(uvA.count * 2 + uvB.count * 2)
    : null;

  if (mergedUvs && uvA && uvB) {
    mergedUvs.set(uvA.array as Float32Array, 0);
    mergedUvs.set(uvB.array as Float32Array, uvA.count * 2);
  }

  const indexA = geomA.index;
  const indexB = geomB.index;
  let mergedIndices: number[] = [];

  if (indexA && indexB) {
    mergedIndices = [...(indexA.array as Uint16Array | Uint32Array)];
    for (let i = 0; i < indexB.count; i++) {
      mergedIndices.push((indexB.array as Uint16Array | Uint32Array)[i] + posA.count);
    }
  }

  const merged = new THREE.ExtrudeGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPositions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));
  if (mergedUvs) {
    merged.setAttribute("uv", new THREE.BufferAttribute(mergedUvs, 2));
  } else {
    merged.deleteAttribute("uv");
  }
  if (mergedIndices.length > 0) {
    merged.setIndex(mergedIndices);
  }

  geomB.dispose();
  return merged;
}

// =============================================================================
// Utility
// =============================================================================

export function scaleGeometryToFit(
  geometry: THREE.BufferGeometry,
  maxWidth: number,
  maxHeight: number,
): void {
  geometry.computeBoundingBox();
  if (!geometry.boundingBox) return;

  const size = new THREE.Vector3();
  geometry.boundingBox.getSize(size);

  const scaleX = size.x > 0 ? maxWidth / size.x : 1;
  const scaleY = size.y > 0 ? maxHeight / size.y : 1;
  const scale = Math.min(scaleX, scaleY, 1);

  if (scale < 1) {
    geometry.scale(scale, scale, scale);
  }
}
