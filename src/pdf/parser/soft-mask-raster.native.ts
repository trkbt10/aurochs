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
 * - `ParsedPath` with `paintOp="fill"`
 * - `graphicsState.softMask` is present (per-pixel alpha map + bbox + size)
 * - samples mask pixels in mask space and maps them to page space via
 *   `graphicsState.ctm × softMask.matrix`
 *
 * Notes:
 * - Currently rasterizes only the fill (not strokes).
 * - The output image is the soft mask pixel grid placed by the same transform.
 */

import type { PdfColor, PdfImage, PdfMatrix, PdfPoint, PdfSoftMask } from "../domain";
import { multiplyMatrices, transformPoint } from "../domain";
import { clamp01, cmykToRgb, grayToRgb, toByte } from "../domain/color";
import type { ParsedPath } from "./operator";

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

function cubicAt(p0: number, p1: number, p2: number, p3: number, t: number): number {
  const mt = 1 - t;
  return (
    mt * mt * mt * p0 +
    3 * mt * mt * t * p1 +
    3 * mt * t * t * p2 +
    t * t * t * p3
  );
}

function flattenToPolylines(ops: ParsedPath["operations"], ctm: PdfMatrix): readonly Poly[] {
  const polylines: PdfPoint[][] = [];

  let current: PdfPoint = { x: 0, y: 0 };
  let start: PdfPoint = { x: 0, y: 0 };
  let currentPoly: PdfPoint[] | null = null;

  const startNew = (p: PdfPoint): void => {
    if (currentPoly && currentPoly.length > 0) {
      polylines.push(currentPoly);
    }
    start = p;
    currentPoly = [transformPoint(p, ctm)];
    current = p;
  };

  const lineTo = (p: PdfPoint): void => {
    if (!currentPoly) {
      startNew(current);
    }
    currentPoly!.push(transformPoint(p, ctm));
    current = p;
  };

  const close = (): void => {
    if (!currentPoly || currentPoly.length === 0) {return;}
    // PDF fill implicitly closes subpaths; ensure we have a closing edge.
    const first = currentPoly[0] ?? transformPoint(start, ctm);
    const last = currentPoly[currentPoly.length - 1] ?? transformPoint(current, ctm);
    if (first.x !== last.x || first.y !== last.y) {
      currentPoly.push(first);
    }
    polylines.push(currentPoly);
    currentPoly = null;
    current = start;
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
        close();
        break;
      }
      case "closePath":
        close();
        break;
    }
  }
  close();

  return polylines;
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

function pointInPolylinesEvenOdd(x: number, y: number, polylines: readonly Poly[]): boolean {
  // Parity across all subpaths.
  let inside = false;
  for (const poly of polylines) {
    if (pointInPolyEvenOdd(x, y, poly)) {
      inside = !inside;
    }
  }
  return inside;
}

function rasterizeSoftMaskedFillPathInternal(parsed: ParsedPath): PdfImage | null {
  const softMask: PdfSoftMask | undefined = parsed.graphicsState.softMask;
  if (!softMask) {return null;}
  if (parsed.paintOp !== "fill") {return null;}
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

  const polylines = flattenToPolylines(parsed.operations, gs.ctm);
  if (polylines.length === 0) {return null;}

  const rgb = colorToRgbBytes(gs.fillColor);
  const data = buildSolidRgbData(softMask.width, softMask.height, rgb);
  const alpha = new Uint8Array(pixelCount);

  const softMaskAlpha = clamp01(gs.softMaskAlpha ?? 1);
  const fillAlpha = clamp01(gs.fillAlpha);
  const alphaMul = softMaskAlpha * fillAlpha;

  // Output alpha is stored in top-to-bottom row order (compatible with PNG encoding).
  for (let row = 0; row < softMask.height; row += 1) {
    for (let col = 0; col < softMask.width; col += 1) {
      const idx = row * softMask.width + col;
      const maskX = llx + ((col + 0.5) / softMask.width) * bw;
      const maskY = ury - ((row + 0.5) / softMask.height) * bh;
      const pagePoint = transformPoint({ x: maskX, y: maskY }, maskToPage);

      if (!pointInPolylinesEvenOdd(pagePoint.x, pagePoint.y, polylines)) {
        alpha[idx] = 0;
        continue;
      }
      alpha[idx] = Math.round((softMask.alpha[idx] ?? 0) * alphaMul);
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
