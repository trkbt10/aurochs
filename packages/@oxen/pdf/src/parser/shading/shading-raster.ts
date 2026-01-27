/**
 * @file src/pdf/parser/shading-raster.ts
 *
 * Rasterize `/Shading` paints (`sh` operator) into `PdfImage`.
 *
 * This is a deterministic, limited subset intended to preserve appearance
 * when converting to PPTX (which cannot represent PDF shadings directly).
 */

import type { PdfBBox, PdfGraphicsState, PdfImage, PdfMatrix, PdfSoftMask } from "../../domain";
import { clamp01, invertMatrix, multiplyMatrices, transformPoint } from "../../domain";
import type { PdfShading, PdfShadingFunctionType2, ShadingRasterizeOptions } from "./shading.types";

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

function computeGridSize(bbox: PdfBBox, maxSize: number): { readonly width: number; readonly height: number } | null {
  if (!Number.isFinite(maxSize) || maxSize <= 0) {return null;}

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const maxDim = Math.max(bw, bh);
  const scale = maxSize / maxDim;
  const width = Math.max(1, Math.round(bw * scale));
  const height = Math.max(1, Math.round(bh * scale));
  return { width, height };
}

function evaluateFunctionType2(fn: PdfShadingFunctionType2, t: number, componentCount: number): readonly number[] {
  const tt = Math.pow(t, fn.n);
  const out: number[] = [];
  for (let i = 0; i < componentCount; i += 1) {
    const c0 = fn.c0[i] ?? 0;
    const c1 = fn.c1[i] ?? 0;
    out.push(c0 + tt * (c1 - c0));
  }
  return out;
}

function clamp01OrZero(v: number): number {
  if (!Number.isFinite(v)) {return 0;}
  return clamp01(v);
}

function shadingColorToRgbBytes(shading: PdfShading, comps: readonly number[]): readonly [number, number, number] {
  if (shading.colorSpace === "DeviceGray") {
    const g = Math.round(clamp01OrZero(comps[0] ?? 0) * 255);
    return [g, g, g];
  }
  const r = Math.round(clamp01OrZero(comps[0] ?? 0) * 255);
  const g = Math.round(clamp01OrZero(comps[1] ?? 0) * 255);
  const b = Math.round(clamp01OrZero(comps[2] ?? 0) * 255);
  return [r, g, b];
}

function computeAxialT(
  coords: readonly [number, number, number, number],
  p: Readonly<{ x: number; y: number }>,
): number {
  const [x0, y0, x1, y1] = coords;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const denom = dx * dx + dy * dy;
  if (!Number.isFinite(denom) || denom <= 1e-12) {return 0;}
  return ((p.x - x0) * dx + (p.y - y0) * dy) / denom;
}

function computeRadialT(
  coords: readonly [number, number, number, number, number, number],
  p: Readonly<{ x: number; y: number }>,
): number | null {
  const [x0, y0, r0, x1, y1, r1] = coords;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dr = r1 - r0;

  const fx = p.x - x0;
  const fy = p.y - y0;

  // Solve for t:
  // |(p - (c0 + t*(c1-c0)))|^2 = (r0 + t*(r1-r0))^2
  // => A t^2 + B t + C = 0
  const A = dx * dx + dy * dy - dr * dr;
  const B = -2 * (fx * dx + fy * dy) - 2 * r0 * dr;
  const C = fx * fx + fy * fy - r0 * r0;

  if (!Number.isFinite(A) || !Number.isFinite(B) || !Number.isFinite(C)) {return null;}

  const eps = 1e-12;
  if (Math.abs(A) < eps) {
    if (Math.abs(B) < eps) {return null;}
    const t = -C / B;
    return Number.isFinite(t) ? t : null;
  }

  const disc = B * B - 4 * A * C;
  if (!Number.isFinite(disc) || disc < 0) {return null;}
  const sqrt = Math.sqrt(disc);
  const denom = 2 * A;
  if (Math.abs(denom) < eps) {return null;}

  const t0 = (-B - sqrt) / denom;
  const t1 = (-B + sqrt) / denom;
  if (!Number.isFinite(t0) || !Number.isFinite(t1)) {return null;}

  // Deterministic choice: pick the larger root (concentric case has one negative root).
  return Math.max(t0, t1);
}

function clampToDomain(t: number, domain: readonly [number, number] | undefined): number {
  if (!domain) {return t;}
  const [d0, d1] = domain;
  if (!Number.isFinite(d0) || !Number.isFinite(d1)) {return t;}
  if (d0 === d1) {return d0;}
  if (d0 < d1) {return Math.min(d1, Math.max(d0, t));}
  return Math.min(d0, Math.max(d1, t));
}

function resolvePaintBBox(gs: PdfGraphicsState, pageBBox: PdfBBox): PdfBBox | null {
  const bbox = gs.clipBBox ?? pageBBox;
  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}
  return bbox;
}

export function rasterizeShadingFill(
  shading: PdfShading,
  gs: PdfGraphicsState,
  options: ShadingRasterizeOptions,
): PdfImage | null {
  if (!options) {throw new Error("options is required");}
  if (!options.pageBBox) {throw new Error("options.pageBBox is required");}
  if (!Number.isFinite(options.shadingMaxSize) || options.shadingMaxSize < 0) {
    throw new Error(`shadingMaxSize must be >= 0 (got ${options.shadingMaxSize})`);
  }
  if (options.shadingMaxSize === 0) {return null;}

  const bbox = resolvePaintBBox(gs, options.pageBBox);
  if (!bbox) {return null;}

  const size = computeGridSize(bbox, options.shadingMaxSize);
  if (!size) {return null;}
  const { width, height } = size;

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const fillMul = clamp01(gs.fillAlpha) * clamp01(gs.softMaskAlpha ?? 1);

  const pageToUser = invertMatrix(gs.ctm);
  const maskToPage = gs.softMask ? multiplyMatrices(gs.ctm, gs.softMask.matrix) : null;
  const pageToMask = gs.softMask && maskToPage ? invertMatrix(maskToPage) : null;

  const pixelCount = width * height;
  const data = new Uint8Array(pixelCount * 3);
  const alpha = new Uint8Array(pixelCount);

  for (let row = 0; row < height; row += 1) {
    const pageY = ury - ((row + 0.5) / height) * bh; // top-down
    for (let col = 0; col < width; col += 1) {
      const pageX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;
      const pagePoint = { x: pageX, y: pageY };

      const userPoint = pageToUser ? transformPoint(pagePoint, pageToUser) : pagePoint;

      let t = 0;
      if (shading.shadingType === 2) {
        t = computeAxialT(shading.coords, userPoint);
      } else if (shading.shadingType === 3) {
        const out = computeRadialT(shading.coords, userPoint);
        if (out == null) {
          alpha[idx] = 0;
          continue;
        }
        t = out;
      }

      const [extendStart, extendEnd] = shading.extend;
      if ((!extendStart && t < 0) || (!extendEnd && t > 1)) {
        alpha[idx] = 0;
        continue;
      }

      t = clamp01(t);
      const domain = shading.fn.domain ?? ([0, 1] as const);
      const [d0, d1] = domain;
      const x = d0 + t * (d1 - d0);
      const xClamped = clampToDomain(x, shading.fn.domain);

      const componentCount = shading.colorSpace === "DeviceRGB" ? 3 : 1;
      const comps = shading.fn.type === "FunctionType2"
        ? evaluateFunctionType2(shading.fn, xClamped, componentCount)
        : new Array(componentCount).fill(0);

      const [r, g, b] = shadingColorToRgbBytes(shading, comps);
      const o = idx * 3;
      data[o] = r;
      data[o + 1] = g;
      data[o + 2] = b;

      let a = Math.round(255 * fillMul);
      if (gs.softMask && pageToMask) {
        const maskPoint = transformPoint(pagePoint, pageToMask);
        const m = sampleSoftMaskAlphaInMaskSpace(gs.softMask, maskPoint.x, maskPoint.y);
        a = Math.round((a * m) / 255);
      }
      alpha[idx] = a;
    }
  }

  const placementInPage: PdfMatrix = [bw, 0, 0, bh, llx, lly];
  const imageGs: PdfGraphicsState = {
    ...gs,
    ctm: placementInPage,
    softMaskAlpha: 1,
    softMask: undefined,
  };

  return {
    type: "image",
    data,
    alpha,
    width,
    height,
    colorSpace: "DeviceRGB",
    bitsPerComponent: 8,
    graphicsState: imageGs,
  };
}
