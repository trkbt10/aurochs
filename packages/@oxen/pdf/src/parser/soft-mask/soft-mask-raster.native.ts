/**
 * @file src/pdf/parser/soft-mask-raster.native.ts
 *
 * Converts a limited subset of soft-masked vector content into raster images.
 *
 * Motivation:
 * - PPTX shape fills cannot represent arbitrary per-pixel soft masks.
 * - For some PDFs, preserving visual output requires rasterizing masked content.
 *
 * Current supported subset:
 * - `ParsedPath` with `paintOp="fill" | "stroke" | "fillStroke"`
 * - `graphicsState.softMask` is present (per-pixel alpha map + bbox + size)
 * - samples mask pixels in mask space and maps them to page space via
 *   `graphicsState.ctm × softMask.matrix`
 *
 * Notes:
 * - Currently uses a simple binary coverage test (no anti-aliasing).
 * - Output image is the soft mask pixel grid placed by the same transform.
 */

import type { PdfColor, PdfImage, PdfMatrix, PdfPoint, PdfSoftMask } from "../../domain";
import { getMatrixScale, multiplyMatrices, transformPoint } from "../../domain";
import { clamp01, cmykToRgb, grayToRgb, toByte } from "../../domain/color";
import type { ParsedPath } from "../operator";

function isIdentityCtm(ctm: PdfMatrix): boolean {
  return ctm[0] === 1 && ctm[1] === 0 && ctm[2] === 0 && ctm[3] === 1 && ctm[4] === 0 && ctm[5] === 0;
}

function bboxEquals(a: readonly [number, number, number, number], b: readonly [number, number, number, number]): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2] && a[3] === b[3];
}

function colorToRgbBytes(color: PdfColor): readonly [number, number, number] {
  switch (color.colorSpace) {
    case "DeviceGray": {
      const [r, g, b] = grayToRgb(color.components[0] ?? 0);
      return [r, g, b];
    }
    case "DeviceRGB":
      return [toByte(color.components[0] ?? 0), toByte(color.components[1] ?? 0), toByte(color.components[2] ?? 0)];
    case "DeviceCMYK": {
      const [r, g, b] = cmykToRgb(
        color.components[0] ?? 0,
        color.components[1] ?? 0,
        color.components[2] ?? 0,
        color.components[3] ?? 0,
      );
      return [r, g, b];
    }
    case "ICCBased": {
      const alt = color.alternateColorSpace;
      if (alt === "DeviceGray") {
        const [r, g, b] = grayToRgb(color.components[0] ?? 0);
        return [r, g, b];
      }
      if (alt === "DeviceRGB") {
        return [toByte(color.components[0] ?? 0), toByte(color.components[1] ?? 0), toByte(color.components[2] ?? 0)];
      }
      if (alt === "DeviceCMYK") {
        const [r, g, b] = cmykToRgb(
          color.components[0] ?? 0,
          color.components[1] ?? 0,
          color.components[2] ?? 0,
          color.components[3] ?? 0,
        );
        return [r, g, b];
      }
      // Unknown ICCBased alternate; fall back to black.
      return [0, 0, 0];
    }
    case "Pattern":
    default:
      return [0, 0, 0];
  }
}

function buildSolidRgbData(width: number, height: number, rgb: readonly [number, number, number]): Uint8Array {
  const pixelCount = width * height;
  const data = new Uint8Array(pixelCount * 3);
  const [r, g, b] = rgb;
  for (let i = 0; i < pixelCount; i += 1) {
    const o = i * 3;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
  }
  return data;
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
    // Fixed-step subdivision; good enough for mask rasterization.
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

    // Standard even-odd ray casting (ray to +X).
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
  // Parity across all subpaths.
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

function distancePointToSegmentRound(p: PdfPoint, a: PdfPoint, b: PdfPoint): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const denom = vx * vx + vy * vy;
  if (denom === 0) {
    const dx = p.x - a.x;
    const dy = p.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
  let t = (wx * vx + wy * vy) / denom;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  const dx = p.x - projX;
  const dy = p.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

function distancePointToSegmentButt(p: PdfPoint, a: PdfPoint, b: PdfPoint): number {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const denom = vx * vx + vy * vy;
  if (denom === 0) {
    return Infinity;
  }
  const t = (wx * vx + wy * vy) / denom;
  if (t < 0 || t > 1) {
    return Infinity;
  }
  const projX = a.x + t * vx;
  const projY = a.y + t * vy;
  const dx = p.x - projX;
  const dy = p.y - projY;
  return Math.sqrt(dx * dx + dy * dy);
}

function distancePointToSegment(p: PdfPoint, a: PdfPoint, b: PdfPoint, cap: 0 | 1 | 2, halfW: number): number {
  if (cap === 1) {
    return distancePointToSegmentRound(p, a, b);
  }
  if (cap === 2) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) {return distancePointToSegmentRound(p, a, b);}
    const ux = dx / len;
    const uy = dy / len;
    const a2 = { x: a.x - ux * halfW, y: a.y - uy * halfW };
    const b2 = { x: b.x + ux * halfW, y: b.y + uy * halfW };
    return distancePointToSegmentButt(p, a2, b2);
  }
  return distancePointToSegmentButt(p, a, b);
}

function pointInStroke(p: PdfPoint, subpaths: readonly FlattenedSubpath[], halfW: number, cap: 0 | 1 | 2): boolean {
  if (!(halfW > 0)) {return false;}
  let minDist = Infinity;
  for (const s of subpaths) {
    const pts = s.points;
    if (pts.length < 2) {continue;}
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1]!;
      const b = pts[i]!;
      minDist = Math.min(minDist, distancePointToSegment(p, a, b, cap, halfW));
      if (minDist <= halfW) {return true;}
    }
    if (s.closed) {
      const a = pts[pts.length - 1]!;
      const b = pts[0]!;
      minDist = Math.min(minDist, distancePointToSegment(p, a, b, cap, halfW));
      if (minDist <= halfW) {return true;}
    }
  }
  return minDist <= halfW;
}

function rasterizeSoftMaskedFillPathInternal(parsed: ParsedPath): PdfImage | null {
  const softMask: PdfSoftMask | undefined = parsed.graphicsState.softMask;
  if (!softMask) {return null;}
  if (parsed.paintOp === "none" || parsed.paintOp === "clip") {return null;}
  if (parsed.operations.length === 0) {return null;}

  const [llx, lly, urx, ury] = softMask.bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const pixelCount = softMask.width * softMask.height;
  if (softMask.width <= 0 || softMask.height <= 0) {return null;}
  if (softMask.alpha.length !== pixelCount) {return null;}

  const gs = parsed.graphicsState;
  const maskToPage = multiplyMatrices(gs.ctm, softMask.matrix);

  const subpaths = flattenSubpaths(parsed.operations, gs.ctm);
  if (subpaths.length === 0) {return null;}

  const fillRgb = colorToRgbBytes(gs.fillColor);
  const strokeRgb = colorToRgbBytes(gs.strokeColor);
  const baseRgb = parsed.paintOp === "stroke" ? strokeRgb : fillRgb;
  const data = buildSolidRgbData(softMask.width, softMask.height, baseRgb);
  const alpha = new Uint8Array(pixelCount);

  const softMaskAlpha = clamp01(gs.softMaskAlpha ?? 1);
  const fillAlpha = clamp01(gs.fillAlpha);
  const strokeAlpha = clamp01(gs.strokeAlpha);
  const fillMul = softMaskAlpha * fillAlpha;
  const strokeMul = softMaskAlpha * strokeAlpha;

  const scale = getMatrixScale(gs.ctm);
  const lineWidth = gs.lineWidth * ((scale.scaleX + scale.scaleY) / 2);
  const halfW = lineWidth / 2;
  const cap: 0 | 1 | 2 = gs.lineCap;

  // Output alpha is stored in top-to-bottom row order (compatible with PNG encoding).
  for (let row = 0; row < softMask.height; row += 1) {
    for (let col = 0; col < softMask.width; col += 1) {
      const idx = row * softMask.width + col;
      const maskX = llx + ((col + 0.5) / softMask.width) * bw;
      const maskY = ury - ((row + 0.5) / softMask.height) * bh;
      const pagePoint = transformPoint({ x: maskX, y: maskY }, maskToPage);

      const maskByte = softMask.alpha[idx] ?? 0;
      if (maskByte === 0) {
        alpha[idx] = 0;
        continue;
      }

      const fillRule = parsed.fillRule ?? "nonzero";
      const fillCov = parsed.paintOp === "fill" || parsed.paintOp === "fillStroke"
        ? pointInSubpaths(pagePoint.x, pagePoint.y, subpaths, fillRule)
        : false;
      const strokeCov = parsed.paintOp === "stroke" || parsed.paintOp === "fillStroke"
        ? pointInStroke(pagePoint, subpaths, halfW, cap)
        : false;

      const fillA = fillCov ? Math.round(maskByte * fillMul) : 0;
      const strokeA = strokeCov ? Math.round(maskByte * strokeMul) : 0;

      if (fillA === 0 && strokeA === 0) {
        alpha[idx] = 0;
        continue;
      }

      const dst = idx * 3;
      if (strokeA === 0) {
        data[dst] = fillRgb[0];
        data[dst + 1] = fillRgb[1];
        data[dst + 2] = fillRgb[2];
        alpha[idx] = fillA;
        continue;
      }
      if (fillA === 0) {
        data[dst] = strokeRgb[0];
        data[dst + 1] = strokeRgb[1];
        data[dst + 2] = strokeRgb[2];
        alpha[idx] = strokeA;
        continue;
      }

      // Composite: stroke over fill (straight alpha).
      const outA = strokeA + Math.round((fillA * (255 - strokeA)) / 255);
      const premFillScale = (255 - strokeA) / 255;
      const premR = strokeRgb[0] * strokeA + Math.round(fillRgb[0] * fillA * premFillScale);
      const premG = strokeRgb[1] * strokeA + Math.round(fillRgb[1] * fillA * premFillScale);
      const premB = strokeRgb[2] * strokeA + Math.round(fillRgb[2] * fillA * premFillScale);

      data[dst] = Math.round(premR / outA);
      data[dst + 1] = Math.round(premG / outA);
      data[dst + 2] = Math.round(premB / outA);
      alpha[idx] = outA;
    }
  }

  const placementInMaskSpace: PdfMatrix = [bw, 0, 0, bh, llx, lly];
  const imageCtm = multiplyMatrices(maskToPage, placementInMaskSpace);
  const imageGs = {
    ...gs,
    ctm: imageCtm,
    softMaskAlpha: 1,
    softMask: undefined,
  };

  return {
    type: "image",
    data,
    alpha,
    width: softMask.width,
    height: softMask.height,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: imageGs,
  };
}

export function rasterizeSoftMaskedFillPath(parsed: ParsedPath): PdfImage | null {
  return rasterizeSoftMaskedFillPathInternal(parsed);
}

/**
 * Backward-compatible alias (historical name).
 *
 * Prefer `rasterizeSoftMaskedFillPath()`.
 */
export function rasterizeSoftMaskedRectPath(parsed: ParsedPath): PdfImage | null {
  const softMask = parsed.graphicsState.softMask;
  if (!softMask) {return null;}
  if (parsed.paintOp !== "fill") {return null;}
  if (!isIdentityCtm(parsed.graphicsState.ctm)) {return null;}
  if (parsed.operations.length !== 1) {return null;}
  const op = parsed.operations[0];
  if (!op || op.type !== "rect") {return null;}
  const bbox: readonly [number, number, number, number] = [op.x, op.y, op.x + op.width, op.y + op.height];
  if (!bboxEquals(bbox, softMask.bbox)) {return null;}

  return rasterizeSoftMaskedFillPathInternal(parsed);
}
