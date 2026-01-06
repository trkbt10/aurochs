/**
 * @file Generate Three.js geometry from text layout
 *
 * Creates ExtrudeGeometry from:
 * 1. TextLayoutResult (combined contour paths)
 * 2. Extrusion and bevel configuration
 */

import * as THREE from "three";
import type { ContourPath, TextLayoutResult, TextLayoutConfig } from "../../../glyph";
import { layoutText } from "../../../glyph";
import { getBevelConfig } from "./bevel";
import type { Bevel3d } from "../../../../domain/three-d";

// =============================================================================
// Types
// =============================================================================

/**
 * Configuration for text geometry generation
 */
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
 * Generate extruded geometry from text
 */
export function createTextGeometryFromCanvas(
  config: TextGeometryConfig,
): THREE.ExtrudeGeometry {
  try {
    // Layout text (extracts and positions all glyphs)
    const layoutConfig: TextLayoutConfig = {
      fontFamily: config.fontFamily,
      fontSize: config.fontSize,
      fontWeight: config.fontWeight,
      fontStyle: config.fontStyle,
      letterSpacing: config.letterSpacing,
      enableKerning: config.enableKerning,
    };

    const layout = layoutText(config.text, layoutConfig);

    console.log("[3D Text] Layout result:", {
      text: config.text,
      pathCount: layout?.combinedPaths?.length ?? 0,
      extrusionDepth: config.extrusionDepth,
    });

    if (!layout?.combinedPaths?.length) {
      // Return empty geometry for whitespace-only text
      console.warn("[3D Text] No paths extracted for text:", config.text);
      return createEmptyGeometry();
    }

    // Convert paths to THREE.Shape
    const shapes = pathsToShapes(layout.combinedPaths);

    console.log("[3D Text] Shapes created:", shapes.length);

    // Filter out any invalid shapes
    const validShapes = shapes.filter(
      (s): s is THREE.Shape => s != null && s instanceof THREE.Shape,
    );

    console.log("[3D Text] Valid shapes:", validShapes.length);

    if (validShapes.length === 0) {
      console.warn("[3D Text] No valid shapes created");
      return createEmptyGeometry();
    }

    // Get bevel configuration
    const bevelConfig = getBevelConfig(config.bevel);

    // Create extrude settings
    // extrusionDepth is in pixels, keep same scale as shape paths (also in pixels)
    // The scaleGroupToFit in core.ts handles final sizing
    const depth = Math.max(config.extrusionDepth, 1);

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: bevelConfig !== undefined,
      bevelThickness: bevelConfig?.thickness ?? 0,
      bevelSize: bevelConfig?.size ?? 0,
      bevelSegments: bevelConfig?.segments ?? 1,
      curveSegments: 8,
    };

    console.log("[3D Text] Extrude settings:", extrudeSettings);

    // Create geometry - use Three.js built-in array support (safer than manual merge)
    let geometry: THREE.ExtrudeGeometry;
    try {
      // Three.js ExtrudeGeometry accepts an array of shapes
      geometry = new THREE.ExtrudeGeometry(validShapes, extrudeSettings);
      console.log("[3D Text] Geometry created:", {
        vertices: geometry.attributes.position?.count ?? 0,
        hasIndex: !!geometry.index,
      });
    } catch (e) {
      console.error("[3D Text] ExtrudeGeometry failed:", e);
      return createEmptyGeometry();
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

/**
 * Convert ContourPath array to THREE.Shape array
 */
function pathsToShapes(paths: readonly ContourPath[]): THREE.Shape[] {
  if (!paths || !Array.isArray(paths)) {
    return [];
  }

  // Separate outer paths and holes
  const outerPaths = paths.filter((p) => p && !p.isHole);
  const holePaths = paths.filter((p) => p && p.isHole);

  const shapes: THREE.Shape[] = [];

  for (const outerPath of outerPaths) {
    const shape = pathToShape(outerPath);
    if (!shape) continue;

    // Find holes contained in this outer path
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
    shape.moveTo(first.x, -first.y); // Flip Y

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
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    if ((yi > point.y) !== (yj > point.y) &&
        point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

// =============================================================================
// Geometry Merging
// =============================================================================

/**
 * Merge two ExtrudeGeometry objects into one
 */
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

  // Merge positions
  const mergedPositions = new Float32Array(posA.count * 3 + posB.count * 3);
  mergedPositions.set(posA.array as Float32Array, 0);
  mergedPositions.set(posB.array as Float32Array, posA.count * 3);

  // Merge normals
  const mergedNormals = new Float32Array(normalA.count * 3 + normalB.count * 3);
  mergedNormals.set(normalA.array as Float32Array, 0);
  mergedNormals.set(normalB.array as Float32Array, normalA.count * 3);

  // Merge UVs (required for texture/gradient materials)
  let mergedUvs: Float32Array | undefined;
  if (uvA && uvB) {
    mergedUvs = new Float32Array(uvA.count * 2 + uvB.count * 2);
    mergedUvs.set(uvA.array as Float32Array, 0);
    mergedUvs.set(uvB.array as Float32Array, uvA.count * 2);
  }

  // Merge indices
  const indexA = geomA.index;
  const indexB = geomB.index;
  let mergedIndices: number[] = [];

  if (indexA && indexB) {
    mergedIndices = [...(indexA.array as Uint16Array | Uint32Array)];
    for (let i = 0; i < indexB.count; i++) {
      mergedIndices.push((indexB.array as Uint16Array | Uint32Array)[i] + posA.count);
    }
  }

  // Create merged geometry
  const merged = new THREE.ExtrudeGeometry();
  merged.setAttribute("position", new THREE.BufferAttribute(mergedPositions, 3));
  merged.setAttribute("normal", new THREE.BufferAttribute(mergedNormals, 3));
  if (mergedUvs) {
    merged.setAttribute("uv", new THREE.BufferAttribute(mergedUvs, 2));
  }
  if (mergedIndices.length > 0) {
    merged.setIndex(mergedIndices);
  }

  // Dispose old geometries
  geomB.dispose();

  return merged;
}

// =============================================================================
// Utility
// =============================================================================

/**
 * Scale geometry to fit within bounds
 */
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
