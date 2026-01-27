/**
 * @file PDF content stream parser
 *
 * Main parsing function that processes PDF content stream tokens
 * using the handler registry. Replaces the class-based OperatorParser.
 *
 * Design principles (ts-refine):
 * - Functional approach with explicit dependencies (Rule 4)
 * - Handler registry for O(1) operator lookup (Rule 1)
 * - Pure state transitions (Rule 5)
 * - Higher-order functions for testability
 */

import type { PdfToken } from "../../domain/content-stream";
import type { FontMappings, PdfBBox, PdfSoftMask } from "../../domain";
import { createGraphicsStateStack, type GraphicsStateStack } from "../../domain";
import type {
  ParserContext,
  ParserStateUpdate,
  GraphicsStateOps,
  OperatorHandlerEntry,
  ParsedElement,
} from "./types";
import { createInitialTextState } from "./text-handlers";
import { finalizeArray } from "./stack-ops";
import { PATH_CONSTRUCTION_HANDLERS, PATH_PAINTING_HANDLERS } from "./path-handlers";
import { COLOR_HANDLERS } from "./color-handlers";
import { GRAPHICS_STATE_HANDLERS } from "./graphics-state-handlers";
import { TEXT_HANDLERS } from "./text-handlers";
import { XOBJECT_HANDLERS } from "./xobject-handlers";
import { SHADING_HANDLERS } from "./shading-handlers";
import type { ParsedNamedColorSpace } from "../color/color-space.native";
import type { PdfPattern } from "../pattern/pattern.types";
import type { PdfShading } from "../shading/shading.types";

// =============================================================================
// Handler Registry
// =============================================================================

/**
 * Combined handler registry for all PDF operators.
 *
 * Uses O(1) Map lookup instead of O(n) switch statement.
 */
export const OPERATOR_HANDLERS: ReadonlyMap<string, OperatorHandlerEntry> = new Map([
  ...GRAPHICS_STATE_HANDLERS,
  ...COLOR_HANDLERS,
  ...PATH_CONSTRUCTION_HANDLERS,
  ...PATH_PAINTING_HANDLERS,
  ...TEXT_HANDLERS,
  ...SHADING_HANDLERS,
  ...XOBJECT_HANDLERS,
]);

/**
 * Get list of all supported operators with their categories.
 *
 * Useful for documentation and testing coverage.
 */
export function getSupportedOperators(): ReadonlyArray<{
  operator: string;
  category: string;
  description: string;
}> {
  return [...OPERATOR_HANDLERS.entries()].map(([op, entry]) => ({
    operator: op,
    category: entry.category,
    description: entry.description,
  }));
}

// =============================================================================
// Context Initialization
// =============================================================================

/**
 * Create initial parser context with empty state.
 */
export function createInitialContext(
  fontMappings: FontMappings,
  options: Readonly<{
    readonly extGState?: ReadonlyMap<
      string,
      {
        readonly fillAlpha?: number;
        readonly strokeAlpha?: number;
        readonly blendMode?: string;
        readonly softMaskAlpha?: number;
        readonly softMask?: PdfSoftMask;
        readonly lineWidth?: number;
        readonly lineCap?: 0 | 1 | 2;
        readonly lineJoin?: 0 | 1 | 2;
        readonly miterLimit?: number;
        readonly dashArray?: readonly number[];
        readonly dashPhase?: number;
      }
    >;
    readonly shadings?: ReadonlyMap<string, PdfShading>;
    readonly shadingMaxSize?: number;
    readonly clipPathMaxSize?: number;
    readonly pageBBox?: PdfBBox;
    readonly patterns?: ReadonlyMap<string, PdfPattern>;
    readonly colorSpaces?: ReadonlyMap<string, ParsedNamedColorSpace>;
  }> = {},
): ParserContext {
  return {
    operandStack: [],
    currentPath: [],
    elements: [],
    inTextObject: false,
    textState: createInitialTextState(),
    fontMappings,
    pageBBox: options.pageBBox ?? [0, 0, 0, 0],
    shadings: options.shadings ?? new Map(),
    shadingMaxSize: options.shadingMaxSize ?? 0,
    clipPathMaxSize: options.clipPathMaxSize ?? 0,
    patterns: options.patterns ?? new Map(),
    colorSpaces: options.colorSpaces ?? new Map(),
    extGState: options.extGState ?? new Map(),
  };
}

/**
 * Apply state update to context, returning new context.
 *
 * Only applies defined fields from update.
 */
export function applyUpdate(ctx: ParserContext, update: ParserStateUpdate): ParserContext {
  return {
    operandStack: update.operandStack ?? ctx.operandStack,
    currentPath: update.currentPath ?? ctx.currentPath,
    elements: update.elements ?? ctx.elements,
    inTextObject: update.inTextObject ?? ctx.inTextObject,
    textState: update.textState ?? ctx.textState,
    fontMappings: ctx.fontMappings,
    pageBBox: ctx.pageBBox,
    shadings: ctx.shadings,
    shadingMaxSize: ctx.shadingMaxSize,
    clipPathMaxSize: ctx.clipPathMaxSize,
    patterns: ctx.patterns,
    colorSpaces: ctx.colorSpaces,
    extGState: ctx.extGState,
  };
}

// =============================================================================
// Graphics State Operations Adapter
// =============================================================================

/**
 * Create GraphicsStateOps adapter from GraphicsStateStack.
 *
 * This adapter allows handlers to be tested with mock implementations.
 */
export function createGfxOpsFromStack(stack: GraphicsStateStack): GraphicsStateOps {
  return {
    push: () => stack.push(),
    pop: () => stack.pop(),
    get: () => stack.get(),
    concatMatrix: (m) => stack.concatMatrix(m),
    setClipBBox: (b) => stack.setClipBBox(b),
    setClipMask: (m) => stack.setClipMask(m),
    setBlendMode: (m) => stack.setBlendMode(m),
    setSoftMaskAlpha: (a) => stack.setSoftMaskAlpha(a),
    setSoftMask: (m) => stack.setSoftMask(m),
    setFillPatternName: (n) => stack.setFillPatternName(n),
    setStrokePatternName: (n) => stack.setStrokePatternName(n),
    setFillPatternUnderlyingColorSpace: (s) => stack.setFillPatternUnderlyingColorSpace(s),
    setStrokePatternUnderlyingColorSpace: (s) => stack.setStrokePatternUnderlyingColorSpace(s),
    setFillPatternColor: (c) => stack.setFillPatternColor(c),
    setStrokePatternColor: (c) => stack.setStrokePatternColor(c),
    setFillColorSpaceName: (n) => stack.setFillColorSpaceName(n),
    setStrokeColorSpaceName: (n) => stack.setStrokeColorSpaceName(n),
    setLineWidth: (w) => stack.setLineWidth(w),
    setLineCap: (c) => stack.setLineCap(c),
    setLineJoin: (j) => stack.setLineJoin(j),
    setMiterLimit: (l) => stack.setMiterLimit(l),
    setDashPattern: (a, p) => stack.setDashPattern(a, p),
    setFillGray: (g) => stack.setFillGray(g),
    setStrokeGray: (g) => stack.setStrokeGray(g),
    setFillRgb: (r, g, b) => stack.setFillRgb(r, g, b),
    setStrokeRgb: (r, g, b) => stack.setStrokeRgb(r, g, b),
    setFillCmyk: (c, m, y, k) => stack.setFillCmyk(c, m, y, k),
    setStrokeCmyk: (c, m, y, k) => stack.setStrokeCmyk(c, m, y, k),
    setFillAlpha: (a) => stack.setFillAlpha(a),
    setStrokeAlpha: (a) => stack.setStrokeAlpha(a),
    setCharSpacing: (s) => stack.setCharSpacing(s),
    setWordSpacing: (s) => stack.setWordSpacing(s),
    setHorizontalScaling: (s) => stack.setHorizontalScaling(s),
    setTextLeading: (l) => stack.setTextLeading(l),
    setTextRenderingMode: (m) => stack.setTextRenderingMode(m),
    setTextRise: (r) => stack.setTextRise(r),
  };
}

// =============================================================================
// Token Processing
// =============================================================================

/**
 * Process a single token and return updated context.
 */
export function processToken(
  ctx: ParserContext,
  token: PdfToken,
  gfxOps: GraphicsStateOps
): ParserContext {
  switch (token.type) {
    case "number":
      return {
        ...ctx,
        operandStack: [...ctx.operandStack, token.value as number],
      };

    case "string":
      return {
        ...ctx,
        operandStack: [...ctx.operandStack, token.value as string],
      };

    case "name":
      return {
        ...ctx,
        operandStack: [...ctx.operandStack, token.value as string],
      };

    case "array_start":
      return {
        ...ctx,
        operandStack: [...ctx.operandStack, []],
      };

    case "array_end":
      return {
        ...ctx,
        operandStack: finalizeArray(ctx.operandStack),
      };

    case "operator": {
      const op = token.value as string;
      const handler = OPERATOR_HANDLERS.get(op);

      if (handler) {
        const update = handler.handler(ctx, gfxOps);
        // Clear operand stack after operator (unless it's array building)
        const newCtx = applyUpdate(ctx, update);
        return {
          ...newCtx,
          operandStack: op === "[" ? newCtx.operandStack : [],
        };
      }

      // Unknown operator - just clear stack
      return {
        ...ctx,
        operandStack: [],
      };
    }

    default:
      // dict_start/dict_end and other tokens - pass through
      return ctx;
  }
}

// =============================================================================
// Main Parse Function
// =============================================================================

/**
 * Parse PDF content stream tokens and extract graphical elements.
 *
 * This is the main entry point that replaces the class-based OperatorParser.
 *
 * @param tokens - Token stream from tokenizer
 * @param fontMappings - Font information for text rendering
 * @returns Array of parsed elements (paths, text, images)
 *
 * @example
 * ```typescript
 * import { tokenizeContentStream } from "../domain/content-stream";
 * import { parseContentStream } from "./operator/parse";
 *
 * const tokens = tokenizeContentStream(contentStreamData);
 * const elements = parseContentStream(tokens, fontMappings);
 * ```
 */
export function parseContentStream(
  tokens: readonly PdfToken[],
  fontMappings: FontMappings = new Map(),
  options: Readonly<{
    readonly extGState?: ReadonlyMap<
      string,
      {
        readonly fillAlpha?: number;
        readonly strokeAlpha?: number;
        readonly blendMode?: string;
        readonly softMaskAlpha?: number;
        readonly softMask?: PdfSoftMask;
        readonly lineWidth?: number;
        readonly lineCap?: 0 | 1 | 2;
        readonly lineJoin?: 0 | 1 | 2;
        readonly miterLimit?: number;
        readonly dashArray?: readonly number[];
        readonly dashPhase?: number;
      }
    >;
    readonly shadings?: ReadonlyMap<string, PdfShading>;
    readonly shadingMaxSize?: number;
    readonly clipPathMaxSize?: number;
    readonly pageBBox?: PdfBBox;
    readonly patterns?: ReadonlyMap<string, PdfPattern>;
    readonly colorSpaces?: ReadonlyMap<string, ParsedNamedColorSpace>;
  }> = {},
): readonly ParsedElement[] {
  const gfxStack = createGraphicsStateStack();
  const gfxOps = createGfxOpsFromStack(gfxStack);

  const ctx = tokens.reduce(
    (ctx, token) => processToken(ctx, token, gfxOps),
    createInitialContext(fontMappings, options),
  );
  return ctx.elements;
}

// =============================================================================
// Higher-Order Parse Function for Testing
// =============================================================================

/**
 * Create a parser with injected dependencies.
 *
 * Allows testing with mock graphics state operations.
 *
 * @param gfxOps - Graphics state operations to use
 * @param fontMappings - Font information for text rendering
 * @returns Parser function
 */
export function createParser(
  gfxOps: GraphicsStateOps,
  fontMappings: FontMappings = new Map(),
  options: Readonly<{
    readonly extGState?: ReadonlyMap<
      string,
      {
        readonly fillAlpha?: number;
        readonly strokeAlpha?: number;
        readonly blendMode?: string;
        readonly softMaskAlpha?: number;
        readonly softMask?: PdfSoftMask;
        readonly lineWidth?: number;
        readonly lineCap?: 0 | 1 | 2;
        readonly lineJoin?: 0 | 1 | 2;
        readonly miterLimit?: number;
        readonly dashArray?: readonly number[];
        readonly dashPhase?: number;
      }
    >;
    readonly shadings?: ReadonlyMap<string, PdfShading>;
    readonly shadingMaxSize?: number;
    readonly clipPathMaxSize?: number;
    readonly pageBBox?: PdfBBox;
    readonly patterns?: ReadonlyMap<string, PdfPattern>;
    readonly colorSpaces?: ReadonlyMap<string, ParsedNamedColorSpace>;
  }> = {},
): (tokens: readonly PdfToken[]) => readonly ParsedElement[] {
  return (tokens) => {
    const ctx = tokens.reduce(
      (ctx, token) => processToken(ctx, token, gfxOps),
      createInitialContext(fontMappings, options),
    );
    return ctx.elements;
  };
}
