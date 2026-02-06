/**
 * @file Stencil-based path fill for WebGL
 *
 * Uses the stencil buffer to implement fill rules (nonzero / even-odd)
 * without requiring proper polygon triangulation (earcut). This handles
 * complex paths that earcut cannot triangulate.
 *
 * Algorithm:
 * 1. Create triangle fan from contour edges (no need for valid triangulation)
 * 2. Draw fans to stencil:
 *    - Nonzero: INCR_WRAP for front-facing, DECR_WRAP for back-facing
 *    - Even-odd: INVERT
 * 3. Draw a covering quad masked by stencil result
 * 4. Clean up stencil bits
 *
 * Stencil bit allocation:
 * - Bit 7 (0x80): Frame clipping
 * - Bits 0-6 (0x7F): Fill counter (nonzero) or toggle bit (even-odd)
 */

import type { PathContour } from "../scene-graph/types";
import { flattenPathCommands } from "./tessellation";

/** Stencil bit for frame clipping (bit 7) */
export const CLIP_STENCIL_BIT = 0x80;

/** Stencil mask for fill counter/toggle (bits 0-6) */
export const FILL_STENCIL_MASK = 0x7f;

/** Axis-aligned bounding box */
export type Bounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/**
 * Create triangle fan vertices from path contours.
 *
 * Two modes depending on fill rule:
 *
 * **Per-contour anchor (default, for even-odd):**
 * Each contour uses its first vertex as the fan center. This minimizes
 * fan triangle extent and works correctly with INVERT-based even-odd fill.
 *
 * **Single anchor (for nonzero):**
 * All contours share a single anchor point (bounding box corner).
 * This ensures correct winding number computation via INCR/DECR
 * stencilOpSeparate, because the "return paths" from the shared anchor
 * correctly cancel winding contributions outside contours.
 *
 * Also computes the axis-aligned bounding box of all contours.
 */
export function prepareFanTriangles(
  contours: readonly PathContour[],
  tolerance: number = 0.25,
  singleAnchor: boolean = false
): { fanVertices: Float32Array; bounds: Bounds } | null {
  // First pass: flatten all contours and compute bounds
  type FlatContour = { coords: number[] };
  const flatContours: FlatContour[] = [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let hasPoints = false;

  for (const contour of contours) {
    const coords = flattenPathCommands(contour.commands, tolerance);
    if (coords.length < 6) continue; // Need at least 3 points

    for (let i = 0; i < coords.length; i += 2) {
      const x = coords[i];
      const y = coords[i + 1];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      hasPoints = true;
    }

    flatContours.push({ coords });
  }

  if (!hasPoints || flatContours.length === 0) return null;

  // Second pass: create fan triangles
  const allTriangles: number[] = [];

  // For nonzero: use a single anchor outside all contours
  const anchorX = singleAnchor ? minX - 1 : 0;
  const anchorY = singleAnchor ? minY - 1 : 0;

  // Include anchor in bounds so coverQuad cleanup covers all stencil writes
  if (singleAnchor) {
    minX = anchorX;
    minY = anchorY;
  }

  for (const fc of flatContours) {
    const coords = fc.coords;
    const n = coords.length / 2;

    if (singleAnchor) {
      // Single anchor: fan from shared anchor to each edge of the contour
      for (let i = 0; i < n - 1; i++) {
        allTriangles.push(
          anchorX, anchorY,
          coords[i * 2], coords[i * 2 + 1],
          coords[(i + 1) * 2], coords[(i + 1) * 2 + 1]
        );
      }
      // Close: last vertex to first vertex
      allTriangles.push(
        anchorX, anchorY,
        coords[(n - 1) * 2], coords[(n - 1) * 2 + 1],
        coords[0], coords[1]
      );
    } else {
      // Per-contour anchor: fan from first vertex
      const cx = coords[0];
      const cy = coords[1];
      for (let i = 1; i < n - 1; i++) {
        allTriangles.push(
          cx, cy,
          coords[i * 2], coords[i * 2 + 1],
          coords[(i + 1) * 2], coords[(i + 1) * 2 + 1]
        );
      }
    }
  }

  if (allTriangles.length === 0) return null;

  return {
    fanVertices: new Float32Array(allTriangles),
    bounds: { minX, minY, maxX, maxY },
  };
}

/**
 * Generate a covering quad (2 triangles) from a bounding box.
 * Used for the fill pass after stencil write.
 */
export function generateCoverQuad(bounds: Bounds): Float32Array {
  const { minX, minY, maxX, maxY } = bounds;
  return new Float32Array([
    minX, minY, maxX, minY, maxX, maxY,
    minX, minY, maxX, maxY, minX, maxY,
  ]);
}
