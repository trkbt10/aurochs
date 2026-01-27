/**
 * @file src/pdf/parser/soft-mask-apply.native.ts
 *
 * Applies ExtGState `/SMask` (soft mask) to raster images.
 *
 * Rationale:
 * - `PdfImage` supports only an explicit per-pixel alpha channel (`image.alpha`).
 * - ExtGState `/SMask` may provide:
 *   - constant alpha (`graphicsState.softMaskAlpha`)
 *   - per-pixel alpha map (`graphicsState.softMask`)
 * - Downstream converters do not interpret `graphicsState.softMask` for images, so we
 *   pre-compose it here and clear the graphics-state mask to avoid double application.
 */

import type { PdfImage, PdfSoftMask } from "../../domain";
import { clamp01, invertMatrix, multiplyMatrices, transformPoint } from "../../domain";

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

function applyConstantAlphaToByte(a: number, mul: number): number {
  const m = clamp01(mul);
  if (m === 1) {return a;}
  return Math.round(a * m);
}

export function applyGraphicsSoftMaskToPdfImage(image: PdfImage): PdfImage {
  const gs = image.graphicsState;
  const softMaskAlpha = gs.softMaskAlpha ?? 1;
  const softMask = gs.softMask;

  const needsConstantAlpha = softMaskAlpha !== 1;
  const needsPerPixel = softMask != null;
  if (!needsConstantAlpha && !needsPerPixel) {return image;}

  const pixelCount = image.width * image.height;
  if (image.width <= 0 || image.height <= 0 || pixelCount <= 0) {return image;}

  const pageToMask = (() => {
    if (!softMask) {return null;}
    const maskToPage = multiplyMatrices(gs.ctm, softMask.matrix);
    return invertMatrix(maskToPage);
  })();

  const baseAlphaOk = image.alpha && image.alpha.length === pixelCount;
  const newAlpha = new Uint8Array(pixelCount);

  for (let row = 0; row < image.height; row += 1) {
    const v = 1 - (row + 0.5) / image.height; // image space origin is bottom-left
    for (let col = 0; col < image.width; col += 1) {
      const u = (col + 0.5) / image.width;
      const idx = row * image.width + col;

      const base = baseAlphaOk ? (image.alpha![idx] ?? 255) : 255;
      let a = applyConstantAlphaToByte(base, softMaskAlpha);

      if (softMask && pageToMask) {
        const p = transformPoint({ x: u, y: v }, gs.ctm);
        const maskPoint = transformPoint(p, pageToMask);
        const m = sampleSoftMaskAlphaInMaskSpace(softMask, maskPoint.x, maskPoint.y);
        a = Math.round((a * m) / 255);
      }

      newAlpha[idx] = a;
    }
  }

  return {
    ...image,
    alpha: newAlpha,
    graphicsState: {
      ...gs,
      softMaskAlpha: 1,
      softMask: undefined,
    },
  };
}
