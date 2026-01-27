/**
 * @file src/pdf/parser/pattern-fill-raster.ts
 *
 * Rasterize PatternType 2 (shading patterns) fills into `PdfImage`.
 *
 * Strategy:
 * - Evaluate the referenced `/Shading` into a raster (using `rasterizeShadingFill`)
 *   in the pattern coordinate system (pattern matrix is applied).
 * - Multiply the shading alpha by:
 *   - path coverage (fill rule)
 *   - fillAlpha and softMaskAlpha
 *   - per-pixel soft mask when present
 *
 * Limitations:
 * - Only fill component is rasterized (stroke patterns not implemented).
 * - Coverage test is non-AA and curve flattening is fixed-step.
 */

import type { PdfBBox, PdfGraphicsState, PdfImage, PdfMatrix, PdfPoint, PdfSoftMask } from "../../domain";
import { clamp01, invertMatrix, multiplyMatrices, transformPoint } from "../../domain";
import type { ParsedPath } from "../operator";
import type { PdfShadingPattern } from "./pattern.types";
import { rasterizeShadingFill } from "../shading/shading-raster";

function sampleSoftMaskAlphaInMaskSpace(mask: PdfSoftMask, x: number, y: number): number {
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

function intersectBBoxes(a: PdfBBox, b: PdfBBox): PdfBBox | null {
  const aMinX = Math.min(a[0], a[2]);
  const aMinY = Math.min(a[1], a[3]);
  const aMaxX = Math.max(a[0], a[2]);
  const aMaxY = Math.max(a[1], a[3]);
  const bMinX = Math.min(b[0], b[2]);
  const bMinY = Math.min(b[1], b[3]);
  const bMaxX = Math.max(b[0], b[2]);
  const bMaxY = Math.max(b[1], b[3]);
  const minX = Math.max(aMinX, bMinX);
  const minY = Math.max(aMinY, bMinY);
  const maxX = Math.min(aMaxX, bMaxX);
  const maxY = Math.min(aMaxY, bMaxY);
  if (maxX <= minX || maxY <= minY) {return null;}
  return [minX, minY, maxX, maxY];
}

type Poly = readonly PdfPoint[];
type FlattenedSubpath = Readonly<{ readonly points: Poly; readonly closed: boolean }>;

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

function flattenSubpaths(ops: ParsedPath["operations"], ctm: PdfMatrix): readonly FlattenedSubpath[] {
  const subpaths: Array<{ points: PdfPoint[]; closed: boolean }> = [];

  let current: PdfPoint = { x: 0, y: 0 };
  let currentSubpath: { points: PdfPoint[]; closed: boolean } | null = null;

  const finish = (closed: boolean): void => {
    if (!currentSubpath || currentSubpath.points.length === 0) {return;}
    subpaths.push({ points: currentSubpath.points, closed });
    currentSubpath = null;
  };

  const startNew = (p: PdfPoint): void => {
    finish(false);
    currentSubpath = { points: [transformPoint(p, ctm)], closed: false };
    current = p;
  };

  const lineTo = (p: PdfPoint): void => {
    if (!currentSubpath) {
      startNew(current);
    }
    currentSubpath!.points.push(transformPoint(p, ctm));
    current = p;
  };

  const flattenCubic = (cp1: PdfPoint, cp2: PdfPoint, end: PdfPoint): void => {
    const p0 = current;
    const steps = 20;
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      lineTo({
        x: cubicAt(p0.x, cp1.x, cp2.x, end.x, t),
        y: cubicAt(p0.y, cp1.y, cp2.y, end.y, t),
      });
    }
    current = end;
  };

  for (const op of ops) {
    switch (op.type) {
      case "moveTo":
        startNew(op.point);
        break;
      case "lineTo":
        lineTo(op.point);
        break;
      case "curveTo":
        flattenCubic(op.cp1, op.cp2, op.end);
        break;
      case "curveToV":
        flattenCubic(current, op.cp2, op.end);
        break;
      case "curveToY":
        flattenCubic(op.cp1, op.end, op.end);
        break;
      case "rect": {
        const p1 = { x: op.x, y: op.y };
        const p2 = { x: op.x + op.width, y: op.y };
        const p3 = { x: op.x + op.width, y: op.y + op.height };
        const p4 = { x: op.x, y: op.y + op.height };
        startNew(p1);
        lineTo(p2);
        lineTo(p3);
        lineTo(p4);
        finish(true);
        break;
      }
      case "closePath":
        finish(true);
        break;
    }
  }
  finish(false);

  return subpaths.map((s) => ({ points: s.points, closed: s.closed }));
}

function pointInPolyEvenOdd(x: number, y: number, poly: Poly): boolean {
  if (poly.length < 2) {return false;}
  let inside = false;

  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const pi = poly[i]!;
    const pj = poly[j]!;

    const xi = pi.x;
    const yi = pi.y;
    const xj = pj.x;
    const yj = pj.y;

    if ((yi > y) === (yj > y)) {
      continue;
    }
    const dy = yj - yi;
    if (dy === 0) {
      continue;
    }
    const t = (y - yi) / dy;
    const xInt = xi + (xj - xi) * t;
    if (x < xInt) {
      inside = !inside;
    }
  }

  return inside;
}

function pointInSubpathsEvenOdd(x: number, y: number, subpaths: readonly FlattenedSubpath[]): boolean {
  let inside = false;
  for (const s of subpaths) {
    if (pointInPolyEvenOdd(x, y, s.points)) {
      inside = !inside;
    }
  }
  return inside;
}

function isLeft(ax: number, ay: number, bx: number, by: number, px: number, py: number): number {
  return (bx - ax) * (py - ay) - (px - ax) * (by - ay);
}

function windingNumber(x: number, y: number, poly: Poly): number {
  if (poly.length < 2) {return 0;}
  let winding = 0;

  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i]!;
    const b = poly[(i + 1) % poly.length]!;

    if (a.y <= y) {
      if (b.y > y && isLeft(a.x, a.y, b.x, b.y, x, y) > 0) {
        winding += 1;
      }
    } else {
      if (b.y <= y && isLeft(a.x, a.y, b.x, b.y, x, y) < 0) {
        winding -= 1;
      }
    }
  }

  return winding;
}

function pointInSubpathsNonZero(x: number, y: number, subpaths: readonly FlattenedSubpath[]): boolean {
  let winding = 0;
  for (const s of subpaths) {
    winding += windingNumber(x, y, s.points);
  }
  return winding !== 0;
}

function pointInSubpaths(x: number, y: number, subpaths: readonly FlattenedSubpath[], fillRule: ParsedPath["fillRule"]): boolean {
  if (fillRule === "evenodd") {
    return pointInSubpathsEvenOdd(x, y, subpaths);
  }
  return pointInSubpathsNonZero(x, y, subpaths);
}

function computePathBBox(subpaths: readonly FlattenedSubpath[]): PdfBBox | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of subpaths) {
    for (const p of s.points) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }
  if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {return null;}
  if (maxX <= minX || maxY <= minY) {return null;}
  return [minX, minY, maxX, maxY];
}

export function rasterizeShadingPatternFillPath(
  parsed: ParsedPath,
  pattern: PdfShadingPattern,
  options: Readonly<{ readonly shadingMaxSize: number; readonly pageBBox: PdfBBox }>,
): PdfImage | null {
  if (!parsed) {throw new Error("parsed is required");}
  if (!pattern) {throw new Error("pattern is required");}
  if (!options) {throw new Error("options is required");}

  if (!Number.isFinite(options.shadingMaxSize) || options.shadingMaxSize < 0) {
    throw new Error(`shadingMaxSize must be >= 0 (got ${options.shadingMaxSize})`);
  }
  if (options.shadingMaxSize === 0) {return null;}

  if (parsed.paintOp !== "fill" && parsed.paintOp !== "fillStroke") {return null;}

  const gs = parsed.graphicsState;
  const fillRule = parsed.fillRule ?? "nonzero";
  const subpaths = flattenSubpaths(parsed.operations, gs.ctm);
  if (subpaths.length === 0) {return null;}

  const pathBBox = computePathBBox(subpaths);
  if (!pathBBox) {return null;}

  const paintBBox = gs.clipBBox ? intersectBBoxes(pathBBox, gs.clipBBox) : pathBBox;
  if (!paintBBox) {return null;}

  const patternCtm = multiplyMatrices(gs.ctm, pattern.matrix);
  const shadingBase = rasterizeShadingFill(
    pattern.shading,
    {
      ...gs,
      ctm: patternCtm,
      clipBBox: paintBBox,
      fillAlpha: 1,
      softMaskAlpha: 1,
      softMask: undefined,
      fillPatternName: undefined,
      strokePatternName: undefined,
      fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
    } satisfies PdfGraphicsState,
    { shadingMaxSize: options.shadingMaxSize, pageBBox: paintBBox },
  );
  if (!shadingBase) {return null;}

  const width = shadingBase.width;
  const height = shadingBase.height;
  const [llx, lly, urx, ury] = paintBBox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const fillMul = clamp01(gs.fillAlpha) * clamp01(gs.softMaskAlpha ?? 1);
  const softMask = gs.softMask;
  const pageToMask = (() => {
    if (!softMask) {return null;}
    const maskToPage = multiplyMatrices(gs.ctm, softMask.matrix);
    return invertMatrix(maskToPage);
  })();

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  for (let row = 0; row < height; row += 1) {
    const pageY = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const pageX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;

      if (!pointInSubpaths(pageX, pageY, subpaths, fillRule)) {
        alpha[idx] = 0;
        continue;
      }

      let a = Math.round(255 * fillMul);
      if (softMask && pageToMask) {
        const maskPoint = transformPoint({ x: pageX, y: pageY }, pageToMask);
        const m = sampleSoftMaskAlphaInMaskSpace(softMask, maskPoint.x, maskPoint.y);
        a = Math.round((a * m) / 255);
      }
      alpha[idx] = a;
    }
  }

  return {
    ...shadingBase,
    alpha,
    graphicsState: {
      ...shadingBase.graphicsState,
      softMaskAlpha: 1,
      softMask: undefined,
      fillPatternName: undefined,
      strokePatternName: undefined,
      clipBBox: undefined,
    },
  };
}
