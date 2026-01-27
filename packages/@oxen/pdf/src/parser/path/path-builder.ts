/**
 * @file PDF path builder
 *
 * Transforms parsed paths by applying CTM and normalizing operations.
 * Produces paths ready for conversion to PPTX CustomGeometry.
 */

import type {
  PdfPathOp,
  PdfGraphicsState,
  PdfPoint,
  PdfBBox,
  PdfPaintOp,
  PdfPath,
} from "../../domain";
import { transformPoint } from "../../domain";
import type { ParsedPath } from "../core/operator-parser";

// =============================================================================
// Built Path Types
// =============================================================================

/**
 * Normalized path operation (all coordinates in page space)
 */
export type NormalizedPathOp =
  | { readonly type: "moveTo"; readonly x: number; readonly y: number }
  | { readonly type: "lineTo"; readonly x: number; readonly y: number }
  | {
      readonly type: "curveTo";
      readonly cp1x: number;
      readonly cp1y: number;
      readonly cp2x: number;
      readonly cp2y: number;
      readonly x: number;
      readonly y: number;
    }
  | { readonly type: "closePath" };

/**
 * Built path with normalized operations and computed bounds
 */
export type BuiltPath = {
  readonly operations: readonly NormalizedPathOp[];
  readonly bounds: PdfBBox;
  readonly paintOp: PdfPaintOp;
  readonly graphicsState: PdfGraphicsState;
};

// =============================================================================
// Path Builder
// =============================================================================

/**
 * Build normalized paths from parsed paths
 */
export function buildPaths(parsedPaths: readonly ParsedPath[]): readonly BuiltPath[] {
  return parsedPaths.map(buildPath);
}

/**
 * Build a single normalized path
 */
export function buildPath(parsed: ParsedPath): BuiltPath {
  const ctm = parsed.graphicsState.ctm;
  const normalizedOps: NormalizedPathOp[] = [];
  const state = {
    currentPoint: { x: 0, y: 0 } satisfies PdfPoint,
    startPoint: { x: 0, y: 0 } satisfies PdfPoint,
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
  };

  const updateBounds = (x: number, y: number): void => {
    state.minX = Math.min(state.minX, x);
    state.minY = Math.min(state.minY, y);
    state.maxX = Math.max(state.maxX, x);
    state.maxY = Math.max(state.maxY, y);
  };

  for (const op of parsed.operations) {
    switch (op.type) {
      case "moveTo": {
        const transformed = transformPoint(op.point, ctm);
        normalizedOps.push({
          type: "moveTo",
          x: transformed.x,
          y: transformed.y,
        });
        state.currentPoint = transformed;
        state.startPoint = transformed;
        updateBounds(transformed.x, transformed.y);
        break;
      }

      case "lineTo": {
        const transformed = transformPoint(op.point, ctm);
        normalizedOps.push({
          type: "lineTo",
          x: transformed.x,
          y: transformed.y,
        });
        state.currentPoint = transformed;
        updateBounds(transformed.x, transformed.y);
        break;
      }

      case "curveTo": {
        const cp1 = transformPoint(op.cp1, ctm);
        const cp2 = transformPoint(op.cp2, ctm);
        const end = transformPoint(op.end, ctm);
        normalizedOps.push({
          type: "curveTo",
          cp1x: cp1.x,
          cp1y: cp1.y,
          cp2x: cp2.x,
          cp2y: cp2.y,
          x: end.x,
          y: end.y,
        });
        state.currentPoint = end;
        // Include control points in bounds for safety
        updateBounds(cp1.x, cp1.y);
        updateBounds(cp2.x, cp2.y);
        updateBounds(end.x, end.y);
        break;
      }

      case "curveToV": {
        // v operator: cp1 = current point
        const cp2 = transformPoint(op.cp2, ctm);
        const end = transformPoint(op.end, ctm);
        normalizedOps.push({
          type: "curveTo",
          cp1x: state.currentPoint.x,
          cp1y: state.currentPoint.y,
          cp2x: cp2.x,
          cp2y: cp2.y,
          x: end.x,
          y: end.y,
        });
        state.currentPoint = end;
        updateBounds(cp2.x, cp2.y);
        updateBounds(end.x, end.y);
        break;
      }

      case "curveToY": {
        // y operator: cp2 = end point
        const cp1 = transformPoint(op.cp1, ctm);
        const end = transformPoint(op.end, ctm);
        normalizedOps.push({
          type: "curveTo",
          cp1x: cp1.x,
          cp1y: cp1.y,
          cp2x: end.x,
          cp2y: end.y,
          x: end.x,
          y: end.y,
        });
        state.currentPoint = end;
        updateBounds(cp1.x, cp1.y);
        updateBounds(end.x, end.y);
        break;
      }

      case "rect": {
        // Convert rectangle to moveTo + 4 lineTo + closePath
        const p1 = transformPoint({ x: op.x, y: op.y }, ctm);
        const p2 = transformPoint({ x: op.x + op.width, y: op.y }, ctm);
        const p3 = transformPoint({ x: op.x + op.width, y: op.y + op.height }, ctm);
        const p4 = transformPoint({ x: op.x, y: op.y + op.height }, ctm);

        normalizedOps.push({ type: "moveTo", x: p1.x, y: p1.y });
        normalizedOps.push({ type: "lineTo", x: p2.x, y: p2.y });
        normalizedOps.push({ type: "lineTo", x: p3.x, y: p3.y });
        normalizedOps.push({ type: "lineTo", x: p4.x, y: p4.y });
        normalizedOps.push({ type: "closePath" });

        state.currentPoint = p1;
        state.startPoint = p1;
        updateBounds(p1.x, p1.y);
        updateBounds(p2.x, p2.y);
        updateBounds(p3.x, p3.y);
        updateBounds(p4.x, p4.y);
        break;
      }

      case "closePath": {
        normalizedOps.push({ type: "closePath" });
        state.currentPoint = state.startPoint;
        break;
      }
    }
  }

  // Handle empty or degenerate paths
  if (state.minX === Infinity) {
    state.minX = 0;
    state.minY = 0;
    state.maxX = 0;
    state.maxY = 0;
  }

  return {
    operations: normalizedOps,
    bounds: [state.minX, state.minY, state.maxX, state.maxY],
    paintOp: parsed.paintOp,
    graphicsState: parsed.graphicsState,
  };
}

/**
 * Convert built path to PdfPath type for external use
 */
export function builtPathToPdfPath(built: BuiltPath): PdfPath {
  // Convert normalized ops back to PdfPathOp format
  const operations: PdfPathOp[] = built.operations.map((op): PdfPathOp => {
    switch (op.type) {
      case "moveTo":
        return { type: "moveTo", point: { x: op.x, y: op.y } };
      case "lineTo":
        return { type: "lineTo", point: { x: op.x, y: op.y } };
      case "curveTo":
        return {
          type: "curveTo",
          cp1: { x: op.cp1x, y: op.cp1y },
          cp2: { x: op.cp2x, y: op.cp2y },
          end: { x: op.x, y: op.y },
        };
      case "closePath":
        return { type: "closePath" };
    }
  });

  return {
    type: "path",
    operations,
    paintOp: built.paintOp,
    graphicsState: built.graphicsState,
  };
}

// =============================================================================
// Path Utilities
// =============================================================================

/**
 * Compute bounding box for a PdfPath from its operations.
 *
 * Note: Includes bezier control points for safety.
 */
export function computePathBBox(path: PdfPath): PdfBBox {
  const state = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    currentPoint: { x: 0, y: 0 } satisfies PdfPoint,
    subpathStartPoint: { x: 0, y: 0 } satisfies PdfPoint,
  };

  const updateBounds = (point: PdfPoint): void => {
    state.minX = Math.min(state.minX, point.x);
    state.minY = Math.min(state.minY, point.y);
    state.maxX = Math.max(state.maxX, point.x);
    state.maxY = Math.max(state.maxY, point.y);
  };

  for (const op of path.operations) {
    switch (op.type) {
      case "moveTo": {
        updateBounds(op.point);
        state.currentPoint = op.point;
        state.subpathStartPoint = op.point;
        break;
      }

      case "lineTo": {
        updateBounds(op.point);
        state.currentPoint = op.point;
        break;
      }

      case "curveTo": {
        updateBounds(op.cp1);
        updateBounds(op.cp2);
        updateBounds(op.end);
        state.currentPoint = op.end;
        break;
      }

      case "curveToV": {
        updateBounds(state.currentPoint);
        updateBounds(op.cp2);
        updateBounds(op.end);
        state.currentPoint = op.end;
        break;
      }

      case "curveToY": {
        updateBounds(op.cp1);
        updateBounds(op.end);
        state.currentPoint = op.end;
        break;
      }

      case "rect": {
        const p1 = { x: op.x, y: op.y };
        const p2 = { x: op.x + op.width, y: op.y };
        const p3 = { x: op.x + op.width, y: op.y + op.height };
        const p4 = { x: op.x, y: op.y + op.height };

        updateBounds(p1);
        updateBounds(p2);
        updateBounds(p3);
        updateBounds(p4);

        state.currentPoint = p1;
        state.subpathStartPoint = p1;
        break;
      }

      case "closePath": {
        updateBounds(state.subpathStartPoint);
        state.currentPoint = state.subpathStartPoint;
        break;
      }
    }
  }

  if (state.minX === Infinity) {
    return [0, 0, 0, 0];
  }

  return [state.minX, state.minY, state.maxX, state.maxY];
}

/**
 * Calculate path complexity (number of operations)
 * Used for filtering noise/trivial paths
 */
export function getPathComplexity(path: BuiltPath): number {
  return path.operations.length;
}

/**
 * Check if path is degenerate (zero area/length)
 *
 * Uses floating-point epsilon for near-zero comparison.
 * This is a numerical computing necessity, not an arbitrary threshold.
 */
export function isDegenerate(path: BuiltPath): boolean {
  const [minX, minY, maxX, maxY] = path.bounds;
  const width = maxX - minX;
  const height = maxY - minY;

  // Floating-point epsilon for near-zero comparison (IEEE 754 precision consideration)
  const FLOAT_EPSILON = 1e-10;

  // Path with no extent is degenerate
  if (width < FLOAT_EPSILON && height < FLOAT_EPSILON) {
    return true;
  }

  // Path with only moveTo operations is degenerate
  const hasDrawingOp = path.operations.some(
    (op) => op.type === "lineTo" || op.type === "curveTo"
  );

  return !hasDrawingOp;
}

/**
 * Get path bounds width
 */
export function getPathWidth(path: BuiltPath): number {
  const [minX, , maxX] = path.bounds;
  return maxX - minX;
}

/**
 * Get path bounds height
 */
export function getPathHeight(path: BuiltPath): number {
  const [, minY, , maxY] = path.bounds;
  return maxY - minY;
}

/**
 * Check if path is a simple rectangle
 * (4 line segments forming axis-aligned rectangle)
 */
export function isSimpleRectangle(path: BuiltPath): boolean {
  const ops = path.operations;

  // Must have moveTo + 4 lineTo (or 3 lineTo + close)
  if (ops.length < 4 || ops.length > 6) {return false;}

  // First must be moveTo
  if (ops[0].type !== "moveTo") {return false;}

  // Count line operations
  const lineOps = ops.filter((op) => op.type === "lineTo");
  if (lineOps.length < 3 || lineOps.length > 4) {return false;}

  // Check if all lines are horizontal or vertical
  const points: { x: number; y: number }[] = [];
  for (const op of ops) {
    if (op.type === "moveTo" || op.type === "lineTo") {
      points.push({ x: op.x, y: op.y });
    }
  }

  if (points.length < 4) {return false;}

  // Floating-point epsilon for near-zero comparison (IEEE 754 precision consideration)
  const FLOAT_EPSILON = 1e-10;

  // Check for axis-aligned edges
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dx = Math.abs(p2.x - p1.x);
    const dy = Math.abs(p2.y - p1.y);

    // Edge must be horizontal or vertical (floating-point precision check)
    if (dx > FLOAT_EPSILON && dy > FLOAT_EPSILON) {
      return false;
    }
  }

  return true;
}

/**
 * Merge multiple paths with same paint operation and graphics state
 * into a single compound path
 */
export function mergePaths(paths: readonly BuiltPath[]): BuiltPath | null {
  if (paths.length === 0) {return null;}
  if (paths.length === 1) {return paths[0];}

  const first = paths[0];
  const allOps: NormalizedPathOp[] = [];
  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };

  for (const path of paths) {
    // Ensure all paths have same paint op
    if (path.paintOp !== first.paintOp) {
      return null;
    }

    allOps.push(...path.operations);

    const [pMinX, pMinY, pMaxX, pMaxY] = path.bounds;
    bounds.minX = Math.min(bounds.minX, pMinX);
    bounds.minY = Math.min(bounds.minY, pMinY);
    bounds.maxX = Math.max(bounds.maxX, pMaxX);
    bounds.maxY = Math.max(bounds.maxY, pMaxY);
  }

  return {
    operations: allOps,
    bounds: [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY],
    paintOp: first.paintOp,
    graphicsState: first.graphicsState,
  };
}
