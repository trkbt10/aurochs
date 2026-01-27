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
import type { PdfBBox, PdfMatrix, PdfPoint, PdfSoftMask } from "../../domain";
import { IDENTITY_MATRIX, invertMatrix, transformPoint } from "../../domain";
import type { PdfPattern } from "../pattern/pattern.types";
import type {
  ParserContext,
  ParserStateUpdate,
  GraphicsStateOps,
  OperatorHandler,
  OperatorHandlerEntry,
  ParsedPath,
  ParsedRasterImage,
} from "./types";
import { popNumber, popNumbers } from "./stack-ops";
import { rasterizeShadingPatternFillPath } from "../pattern/pattern-fill-raster";
import { rasterizeTilingPatternFillPath } from "../pattern/pattern-tiling-raster";
import { rasterizeSoftMaskedFillPath } from "../soft-mask/soft-mask-raster.native";

// =============================================================================
// Path Construction Handlers
// =============================================================================

function rasterizePatternFillPath(
  parsed: ParsedPath,
  pattern: PdfPattern,
  ctx: Pick<ParserContext, "shadingMaxSize" | "pageBBox">,
): ReturnType<typeof rasterizeShadingPatternFillPath> {
  const options = { shadingMaxSize: ctx.shadingMaxSize, pageBBox: ctx.pageBBox };
  if (pattern.patternType === 2) {
    return rasterizeShadingPatternFillPath(parsed, pattern, options);
  }
  return rasterizeTilingPatternFillPath(parsed, pattern, options);
}

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
  paintOp: PdfPaintOp,
  fillRule?: ParsedPath["fillRule"],
): ParserStateUpdate {
  if (ctx.currentPath.length === 0) {
    return {};
  }

  const element: ParsedPath = {
    type: "path",
    operations: ctx.currentPath,
    paintOp,
    fillRule,
    graphicsState: gfxOps.get(),
  };

  // PatternType 2 (shading) fills: rasterize now so resource scoping is correct.
  if ((paintOp === "fill" || paintOp === "fillStroke") && element.graphicsState.fillPatternName) {
    const name = element.graphicsState.fillPatternName;
    const key = name.startsWith("/") ? name.slice(1) : name;
    const pattern = ctx.patterns.get(key);
    if (pattern && ctx.shadingMaxSize > 0) {
      const image = rasterizePatternFillPath(element, pattern, ctx);
      if (image) {
        const rasterElem: ParsedRasterImage = { type: "rasterImage", image };
        const elements: Array<ParsedRasterImage | ParsedPath> = [rasterElem];

        if (paintOp === "fillStroke") {
          elements.push({
            ...element,
            paintOp: "stroke",
            fillRule: undefined,
            graphicsState: { ...element.graphicsState, fillPatternName: undefined },
          });
        }

        return { currentPath: [], elements: [...ctx.elements, ...elements] };
      }
    }
  }

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
  paintOp: PdfPaintOp,
  fillRule?: ParsedPath["fillRule"],
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
    fillRule,
    graphicsState: gfxOps.get(),
  };

  if ((paintOp === "fill" || paintOp === "fillStroke") && element.graphicsState.fillPatternName) {
    const name = element.graphicsState.fillPatternName;
    const key = name.startsWith("/") ? name.slice(1) : name;
    const pattern = ctx.patterns.get(key);
    if (pattern && ctx.shadingMaxSize > 0) {
      const image = rasterizePatternFillPath(element, pattern, ctx);
      if (image) {
        const rasterElem: ParsedRasterImage = { type: "rasterImage", image };
        const elements: Array<ParsedRasterImage | ParsedPath> = [rasterElem];
        if (paintOp === "fillStroke") {
          elements.push({
            ...element,
            paintOp: "stroke",
            fillRule: undefined,
            graphicsState: { ...element.graphicsState, fillPatternName: undefined },
          });
        }
        return { currentPath: [], elements: [...ctx.elements, ...elements] };
      }
    }
  }

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
const handleFill: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fill", "nonzero");

/** f* operator: Fill path (even-odd rule) */
const handleFillEvenOdd: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fill", "evenodd");

/** B operator: Fill and stroke path (nonzero) */
const handleFillStroke: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fillStroke", "nonzero");

/** B* operator: Fill and stroke path (even-odd) */
const handleFillStrokeEvenOdd: OperatorHandler = (ctx, gfxOps) => finishPath(ctx, gfxOps, "fillStroke", "evenodd");

/** b operator: Close, fill and stroke (nonzero) */
const handleCloseFillStroke: OperatorHandler = (ctx, gfxOps) => closeAndFinishPath(ctx, gfxOps, "fillStroke", "nonzero");

/** b* operator: Close, fill and stroke (even-odd) */
const handleCloseFillStrokeEvenOdd: OperatorHandler = (ctx, gfxOps) => closeAndFinishPath(ctx, gfxOps, "fillStroke", "evenodd");

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

function intersectBBoxes(prev: PdfBBox | undefined, next: PdfBBox): PdfBBox {
  if (!prev) {return next;}
  return [
    Math.max(prev[0], next[0]),
    Math.max(prev[1], next[1]),
    Math.min(prev[2], next[2]),
    Math.min(prev[3], next[3]),
  ];
}

function sampleMaskAlpha(mask: PdfSoftMask, x: number, y: number): number {
  const [llx, lly, urx, ury] = mask.bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return 0;}

  const nx = (x - llx) / bw;
  const ny = (ury - y) / bh; // top-down mapping
  if (!Number.isFinite(nx) || !Number.isFinite(ny)) {return 0;}
  if (nx < 0 || nx >= 1 || ny < 0 || ny >= 1) {return 0;}

  const col = Math.min(mask.width - 1, Math.max(0, Math.floor(nx * mask.width)));
  const row = Math.min(mask.height - 1, Math.max(0, Math.floor(ny * mask.height)));
  return mask.alpha[row * mask.width + col] ?? 0;
}

function rasterizeClipPathToMask(
  ctx: ParserContext,
  gfxOps: GraphicsStateOps,
  fillRule: "nonzero" | "evenodd",
  bbox: PdfBBox,
): PdfSoftMask | null {
  const maxSize = ctx.clipPathMaxSize;
  if (!(maxSize > 0)) {return null;}
  if (!Number.isFinite(maxSize) || maxSize <= 0) {throw new Error(`clipPathMaxSize must be > 0 (got ${maxSize})`);}
  if (ctx.currentPath.length === 0) {return null;}

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const maxDim = Math.max(bw, bh);
  const scale = maxSize / maxDim;
  const width = Math.max(1, Math.round(bw * scale));
  const height = Math.max(1, Math.round(bh * scale));

  const pixelCount = width * height;
  const opaque = new Uint8Array(pixelCount);
  opaque.fill(255);
  const renderGrid: PdfSoftMask = {
    kind: "Alpha",
    width,
    height,
    alpha: opaque,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    matrix: IDENTITY_MATRIX,
  };

  const gs = gfxOps.get();
  const ctmInv = invertMatrix(gs.ctm);
  if (!ctmInv) {return null;}

  const clipAsSoftMaskedFill: ParsedPath = {
    type: "path",
    operations: ctx.currentPath,
    paintOp: "fill",
    fillRule,
    graphicsState: {
      ...gs,
      softMaskAlpha: 1,
      softMask: { ...renderGrid, matrix: ctmInv },
      fillAlpha: 1,
      strokeAlpha: 1,
      fillColor: { colorSpace: "DeviceGray", components: [0] },
      strokeColor: { colorSpace: "DeviceGray", components: [0] },
    },
  };

  const raster = rasterizeSoftMaskedFillPath(clipAsSoftMaskedFill);
  if (!raster || !raster.alpha) {return null;}
  if (raster.width !== width || raster.height !== height) {return null;}

  const prev = gs.clipMask;
  if (!prev) {
    return { kind: "Alpha", width, height, alpha: raster.alpha, bbox: [bbox[0], bbox[1], bbox[2], bbox[3]], matrix: IDENTITY_MATRIX };
  }

  const out = new Uint8Array(pixelCount);
  for (let row = 0; row < height; row += 1) {
    const y = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const x = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;
      const a = raster.alpha[idx] ?? 0;
      if (a === 0) {continue;}
      const p = sampleMaskAlpha(prev, x, y);
      out[idx] = Math.round((a * p) / 255);
    }
  }

  return { kind: "Alpha", width, height, alpha: out, bbox: [bbox[0], bbox[1], bbox[2], bbox[3]], matrix: IDENTITY_MATRIX };
}

function handleClipInternal(
  ctx: ParserContext,
  gfxOps: GraphicsStateOps,
  fillRule: "nonzero" | "evenodd",
): ParserStateUpdate {
  if (ctx.currentPath.length === 0) {
    return {};
  }

  const gs = gfxOps.get();
  const bbox = computeClipBBoxFromPath(ctx.currentPath, gs.ctm);
  if (bbox) {
    const merged = intersectBBoxes(gs.clipBBox, bbox);
    gfxOps.setClipBBox(bbox);
    if (ctx.clipPathMaxSize > 0) {
      const mask = rasterizeClipPathToMask(ctx, gfxOps, fillRule, merged);
      gfxOps.setClipMask(mask ?? undefined);
    }
  }

  return {
    currentPath: [],
  };
};

/** W operator: Set clipping path (nonzero) */
const handleClip: OperatorHandler = (ctx, gfxOps) => handleClipInternal(ctx, gfxOps, "nonzero");

/** W* operator: Set clipping path (even-odd) */
const handleClipEvenOdd: OperatorHandler = (ctx, gfxOps) => {
  return handleClipInternal(ctx, gfxOps, "evenodd");
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
