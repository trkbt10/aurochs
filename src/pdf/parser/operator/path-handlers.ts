/**
 * @file PDF path construction and painting operator handlers
 *
 * Handles path construction operators (m, l, c, v, y, h, re) and
 * path painting operators (S, s, f, F, f*, B, B*, b, b*, n, W, W*).
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 */

import type { PdfPathOp, PdfPaintOp } from "../../domain";
import type { PdfBBox, PdfMatrix, PdfPoint } from "../../domain";
import { transformPoint } from "../../domain";
import type {
  ParserContext,
  ParserStateUpdate,
  GraphicsStateOps,
  OperatorHandler,
  OperatorHandlerEntry,
  ParsedPath,
} from "./types";
import { popNumber, popNumbers } from "./stack-ops";

// =============================================================================
// Path Construction Handlers
// =============================================================================

/**
 * m operator: Move to point (begin new subpath)
 */
const handleMoveTo: OperatorHandler = (ctx) => {
  const [y, stack1] = popNumber(ctx.operandStack);
  const [x, stack2] = popNumber(stack1);

  const op: PdfPathOp = { type: "moveTo", point: { x, y } };

  return {
    operandStack: stack2,
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * l operator: Line to point
 */
const handleLineTo: OperatorHandler = (ctx) => {
  const [y, stack1] = popNumber(ctx.operandStack);
  const [x, stack2] = popNumber(stack1);

  const op: PdfPathOp = { type: "lineTo", point: { x, y } };

  return {
    operandStack: stack2,
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * c operator: Curve to point (cubic Bezier with two control points)
 */
const handleCurveTo: OperatorHandler = (ctx) => {
  const [[x1, y1, x2, y2, x3, y3], newStack] = popNumbers(ctx.operandStack, 6);

  const op: PdfPathOp = {
    type: "curveTo",
    cp1: { x: x1, y: y1 },
    cp2: { x: x2, y: y2 },
    end: { x: x3, y: y3 },
  };

  return {
    operandStack: newStack,
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * v operator: Curve to point (current point as first control point)
 */
const handleCurveToV: OperatorHandler = (ctx) => {
  const [[x2, y2, x3, y3], newStack] = popNumbers(ctx.operandStack, 4);

  const op: PdfPathOp = {
    type: "curveToV",
    cp2: { x: x2, y: y2 },
    end: { x: x3, y: y3 },
  };

  return {
    operandStack: newStack,
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * y operator: Curve to point (end point as second control point)
 */
const handleCurveToY: OperatorHandler = (ctx) => {
  const [[x1, y1, x3, y3], newStack] = popNumbers(ctx.operandStack, 4);

  const op: PdfPathOp = {
    type: "curveToY",
    cp1: { x: x1, y: y1 },
    end: { x: x3, y: y3 },
  };

  return {
    operandStack: newStack,
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * h operator: Close path (line to start of current subpath)
 */
const handleClosePath: OperatorHandler = (ctx) => {
  const op: PdfPathOp = { type: "closePath" };

  return {
    currentPath: [...ctx.currentPath, op],
  };
};

/**
 * re operator: Rectangle (x, y, width, height)
 */
const handleRectangle: OperatorHandler = (ctx) => {
  const [[x, y, width, height], newStack] = popNumbers(ctx.operandStack, 4);

  const op: PdfPathOp = { type: "rect", x, y, width, height };

  return {
    operandStack: newStack,
    currentPath: [...ctx.currentPath, op],
  };
};

// =============================================================================
// Path Finishing Helper
// =============================================================================

/**
 * Finish current path with specified paint operation.
 *
 * Creates a ParsedPath element if path has operations, clears current path.
 */
function finishPath(
  ctx: ParserContext,
  gfxOps: GraphicsStateOps,
  paintOp: PdfPaintOp
): ParserStateUpdate {
  if (ctx.currentPath.length === 0) {
    return {};
  }

  const element: ParsedPath = {
    type: "path",
    operations: ctx.currentPath,
    paintOp,
    graphicsState: gfxOps.get(),
  };

  return {
    currentPath: [],
    elements: [...ctx.elements, element],
  };
}

/**
 * Close path then finish with paint operation.
 */
function closeAndFinishPath(
  ctx: ParserContext,
  gfxOps: GraphicsStateOps,
  paintOp: PdfPaintOp
): ParserStateUpdate {
  const closeOp: PdfPathOp = { type: "closePath" };
  const closedPath = [...ctx.currentPath, closeOp];

  if (closedPath.length <= 1) {
    return { currentPath: [] };
  }

  const element: ParsedPath = {
    type: "path",
    operations: closedPath,
    paintOp,
    graphicsState: gfxOps.get(),
  };

  return {
    currentPath: [],
    elements: [...ctx.elements, element],
  };
}

// =============================================================================
// Path Painting Handlers
// =============================================================================

/** S operator: Stroke path */
const handleStroke: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "stroke");

/** s operator: Close and stroke path */
const handleCloseStroke: OperatorHandler = (ctx, gfxOps) => closeAndFinishPath(ctx, gfxOps, "stroke");

/** f operator: Fill path (nonzero winding rule) */
const handleFill: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fill");

/** f* operator: Fill path (even-odd rule) */
const handleFillEvenOdd: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fill");

/** B operator: Fill and stroke path (nonzero) */
const handleFillStroke: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fillStroke");

/** B* operator: Fill and stroke path (even-odd) */
const handleFillStrokeEvenOdd: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fillStroke");

/** b operator: Close, fill and stroke (nonzero) */
const handleCloseFillStroke: OperatorHandler = (ctx, gfxOps) => closeAndFinishPath(ctx, gfxOps, "fillStroke");

/** b* operator: Close, fill and stroke (even-odd) */
const handleCloseFillStrokeEvenOdd: OperatorHandler = (ctx, gfxOps) => closeAndFinishPath(ctx, gfxOps, "fillStroke");

/** n operator: End path without filling or stroking */
const handleEndPath: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "none");

function computeClipBBoxFromPath(ops: readonly PdfPathOp[], ctm: PdfMatrix): PdfBBox | null {
  if (ops.length === 0) {
    return null;
  }

  const bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const addPoint = (p: PdfPoint): void => {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  };
  const addTransformed = (p: PdfPoint): void => addPoint(transformPoint(p, ctm));

  let currentPoint: PdfPoint = { x: 0, y: 0 };
  let subpathStartPoint: PdfPoint = { x: 0, y: 0 };

  for (const op of ops) {
    switch (op.type) {
      case "moveTo": {
        currentPoint = op.point;
        subpathStartPoint = op.point;
        addTransformed(op.point);
        break;
      }
      case "lineTo": {
        currentPoint = op.point;
        addTransformed(op.point);
        break;
      }
      case "curveTo": {
        addTransformed(op.cp1);
        addTransformed(op.cp2);
        addTransformed(op.end);
        currentPoint = op.end;
        break;
      }
      case "curveToV": {
        addTransformed(currentPoint);
        addTransformed(op.cp2);
        addTransformed(op.end);
        currentPoint = op.end;
        break;
      }
      case "curveToY": {
        addTransformed(op.cp1);
        addTransformed(op.end);
        currentPoint = op.end;
        break;
      }
      case "rect": {
        const corners = [
          { x: op.x, y: op.y },
          { x: op.x + op.width, y: op.y },
          { x: op.x + op.width, y: op.y + op.height },
          { x: op.x, y: op.y + op.height },
        ];
        for (const p of corners) {
          addTransformed(p);
        }
        currentPoint = { x: op.x, y: op.y };
        subpathStartPoint = currentPoint;
        break;
      }
      case "closePath": {
        addTransformed(subpathStartPoint);
        currentPoint = subpathStartPoint;
        break;
      }
    }
  }

  if (!Number.isFinite(bounds.minX)) {
    return null;
  }
  return [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
}

/** W operator: Set clipping path (nonzero) */
const handleClip: OperatorHandler = (ctx, gfxOps) => {
  if (ctx.currentPath.length === 0) {
    return {};
  }

  const gs = gfxOps.get();
  const bbox = computeClipBBoxFromPath(ctx.currentPath, gs.ctm);
  if (bbox) {
    gfxOps.setClipBBox(bbox);
  }

  return {
    currentPath: [],
  };
};

/** W* operator: Set clipping path (even-odd) */
const handleClipEvenOdd: OperatorHandler = (ctx, gfxOps) => {
  // For rectangular clips, the even-odd rule doesn't change the result.
  return handleClip(ctx, gfxOps);
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * Path construction operator handlers.
 */
export const PATH_CONSTRUCTION_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  ["m", { handler: handleMoveTo, category: "path", description: "Move to point" }],
  ["l", { handler: handleLineTo, category: "path", description: "Line to point" }],
  ["c", { handler: handleCurveTo, category: "path", description: "Cubic Bezier curve" }],
  ["v", { handler: handleCurveToV, category: "path", description: "Curve (current point as cp1)" }],
  ["y", { handler: handleCurveToY, category: "path", description: "Curve (end point as cp2)" }],
  ["h", { handler: handleClosePath, category: "path", description: "Close subpath" }],
  ["re", { handler: handleRectangle, category: "path", description: "Rectangle" }],
]);

/**
 * Path painting operator handlers.
 */
export const PATH_PAINTING_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  ["S", { handler: handleStroke, category: "paint", description: "Stroke path" }],
  ["s", { handler: handleCloseStroke, category: "paint", description: "Close and stroke path" }],
  ["f", { handler: handleFill, category: "paint", description: "Fill path (nonzero)" }],
  ["F", { handler: handleFill, category: "paint", description: "Fill path (nonzero, deprecated)" }],
  ["f*", { handler: handleFillEvenOdd, category: "paint", description: "Fill path (even-odd)" }],
  ["B", { handler: handleFillStroke, category: "paint", description: "Fill and stroke (nonzero)" }],
  ["B*", { handler: handleFillStrokeEvenOdd, category: "paint", description: "Fill and stroke (even-odd)" }],
  ["b", { handler: handleCloseFillStroke, category: "paint", description: "Close, fill and stroke (nonzero)" }],
  ["b*", { handler: handleCloseFillStrokeEvenOdd, category: "paint", description: "Close, fill and stroke (even-odd)" }],
  ["n", { handler: handleEndPath, category: "paint", description: "End path (no paint)" }],
  ["W", { handler: handleClip, category: "paint", description: "Clip path (nonzero)" }],
  ["W*", { handler: handleClipEvenOdd, category: "paint", description: "Clip path (even-odd)" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const pathHandlers = {
  handleMoveTo,
  handleLineTo,
  handleCurveTo,
  handleCurveToV,
  handleCurveToY,
  handleClosePath,
  handleRectangle,
  handleStroke,
  handleCloseStroke,
  handleFill,
  handleFillStroke,
  handleEndPath,
  handleClip,
} as const;
