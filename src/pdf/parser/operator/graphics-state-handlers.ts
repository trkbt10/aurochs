/**
 * @file PDF graphics state operator handlers
 *
 * Handles graphics state operators:
 * - q/Q: Save/restore state
 * - cm: Concatenate matrix
 * - w/J/j/M/d: Line style
 *
 * Design principles (ts-refine):
 * - Handler objects consolidate related operations (Rule 1.1)
 * - Pure functions for testability (Rule 5)
 * - Lookup objects instead of switch (Rule 1)
 */

import type { PdfMatrix } from "../../domain";
import type {
  OperatorHandler,
  OperatorHandlerEntry,
} from "./types";
import { popNumber, popArray, popString } from "./stack-ops";

// =============================================================================
// State Stack Handlers
// =============================================================================

/**
 * q operator: Save graphics state
 */
const handleSaveState: OperatorHandler = (_, gfxOps) => {
  gfxOps.push();
  return {};
};

/**
 * Q operator: Restore graphics state
 */
const handleRestoreState: OperatorHandler = (_, gfxOps) => {
  gfxOps.pop();
  return {};
};

// =============================================================================
// Transformation Matrix Handler
// =============================================================================

/**
 * cm operator: Concatenate matrix to CTM
 *
 * Matrix format: [a b c d e f]
 * Transforms: [x' y'] = [x y] * [a b; c d] + [e f]
 */
const handleConcatMatrix: OperatorHandler = (ctx, gfxOps) => {
  const [f, stack1] = popNumber(ctx.operandStack);
  const [e, stack2] = popNumber(stack1);
  const [d, stack3] = popNumber(stack2);
  const [c, stack4] = popNumber(stack3);
  const [b, stack5] = popNumber(stack4);
  const [a, stack6] = popNumber(stack5);

  const matrix: PdfMatrix = [a, b, c, d, e, f];
  gfxOps.concatMatrix(matrix);

  return { operandStack: stack6 };
};

// =============================================================================
// Line Style Handlers
// =============================================================================

/**
 * w operator: Set line width
 */
const handleLineWidth: OperatorHandler = (ctx, gfxOps) => {
  const [width, newStack] = popNumber(ctx.operandStack);
  gfxOps.setLineWidth(width);

  return { operandStack: newStack };
};

/**
 * J operator: Set line cap style
 *
 * 0 = butt cap
 * 1 = round cap
 * 2 = square cap
 */
const handleLineCap: OperatorHandler = (ctx, gfxOps) => {
  const [cap, newStack] = popNumber(ctx.operandStack);

  if (cap === 0 || cap === 1 || cap === 2) {
    gfxOps.setLineCap(cap);
  }

  return { operandStack: newStack };
};

/**
 * j operator: Set line join style
 *
 * 0 = miter join
 * 1 = round join
 * 2 = bevel join
 */
const handleLineJoin: OperatorHandler = (ctx, gfxOps) => {
  const [join, newStack] = popNumber(ctx.operandStack);

  if (join === 0 || join === 1 || join === 2) {
    gfxOps.setLineJoin(join);
  }

  return { operandStack: newStack };
};

/**
 * M operator: Set miter limit
 */
const handleMiterLimit: OperatorHandler = (ctx, gfxOps) => {
  const [limit, newStack] = popNumber(ctx.operandStack);
  gfxOps.setMiterLimit(limit);

  return { operandStack: newStack };
};

/**
 * d operator: Set dash pattern
 *
 * Format: [array] phase d
 * - array: dash pattern (e.g., [3 2] for 3 on, 2 off)
 * - phase: starting offset into pattern
 */
const handleDashPattern: OperatorHandler = (ctx, gfxOps) => {
  const [phase, stack1] = popNumber(ctx.operandStack);
  const [array, stack2] = popArray(stack1);

  const numArray = array.filter((v): v is number => typeof v === "number");
  gfxOps.setDashPattern(numArray, phase);

  return { operandStack: stack2 };
};

// =============================================================================
// Extended Graphics State (gs)
// =============================================================================

/**
 * gs operator: Set parameters from an ExtGState resource dictionary.
 *
 * This implementation supports a subset of ExtGState keys:
 * - /ca: fill alpha
 * - /CA: stroke alpha
 * - /LW: line width
 * - /LC: line cap
 * - /LJ: line join
 * - /ML: miter limit
 * - /D: dash pattern
 */
const handleExtGState: OperatorHandler = (ctx, gfxOps) => {
  const [name, newStack] = popString(ctx.operandStack);
  const key = name.startsWith("/") ? name.slice(1) : name;
  const gs = ctx.extGState.get(key);
  if (gs) {
    if (typeof gs.fillAlpha === "number") {gfxOps.setFillAlpha(gs.fillAlpha);}
    if (typeof gs.strokeAlpha === "number") {gfxOps.setStrokeAlpha(gs.strokeAlpha);}
    if (typeof gs.lineWidth === "number") {gfxOps.setLineWidth(gs.lineWidth);}
    if (gs.lineCap === 0 || gs.lineCap === 1 || gs.lineCap === 2) {gfxOps.setLineCap(gs.lineCap);}
    if (gs.lineJoin === 0 || gs.lineJoin === 1 || gs.lineJoin === 2) {gfxOps.setLineJoin(gs.lineJoin);}
    if (typeof gs.miterLimit === "number") {gfxOps.setMiterLimit(gs.miterLimit);}
    if (Array.isArray(gs.dashArray) && typeof gs.dashPhase === "number") {gfxOps.setDashPattern(gs.dashArray, gs.dashPhase);}
  }
  return { operandStack: newStack };
};

// =============================================================================
// Handler Registry (Rule 1: Lookup objects instead of switch)
// =============================================================================

/**
 * Graphics state operator handlers.
 */
export const GRAPHICS_STATE_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  // State stack
  ["q", { handler: handleSaveState, category: "graphics-state", description: "Save graphics state" }],
  ["Q", { handler: handleRestoreState, category: "graphics-state", description: "Restore graphics state" }],
  // Transformation
  ["cm", { handler: handleConcatMatrix, category: "graphics-state", description: "Concatenate matrix to CTM" }],
  // ExtGState
  ["gs", { handler: handleExtGState, category: "graphics-state", description: "Set ExtGState parameters" }],
  // Line style
  ["w", { handler: handleLineWidth, category: "graphics-state", description: "Set line width" }],
  ["J", { handler: handleLineCap, category: "graphics-state", description: "Set line cap style" }],
  ["j", { handler: handleLineJoin, category: "graphics-state", description: "Set line join style" }],
  ["M", { handler: handleMiterLimit, category: "graphics-state", description: "Set miter limit" }],
  ["d", { handler: handleDashPattern, category: "graphics-state", description: "Set dash pattern" }],
]);

// =============================================================================
// Exported Functions for Testing
// =============================================================================

export const graphicsStateHandlers = {
  handleSaveState,
  handleRestoreState,
  handleConcatMatrix,
  handleExtGState,
  handleLineWidth,
  handleLineCap,
  handleLineJoin,
  handleMiterLimit,
  handleDashPattern,
} as const;
