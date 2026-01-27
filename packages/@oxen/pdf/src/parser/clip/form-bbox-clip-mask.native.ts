/**
 * @file src/pdf/parser/form-bbox-clip-mask.native.ts
 *
 * Generates a per-pixel clip mask for Form XObject `/BBox` clipping.
 *
 * PDF semantics:
 * - A Form XObject defines a bounding box in its own coordinate space (`/BBox`).
 * - When a Form is painted, the current CTM is concatenated with the Form `/Matrix`,
 *   then the Form `/BBox` acts as an implicit clipping path for subsequent operations.
 *
 * Strategy:
 * - When `clipPathMaxSize>0`, create a `PdfSoftMask` in page space whose bbox is the
 *   axis-aligned bounding box of the transformed Form bbox.
 * - For each pixel center in that page bbox, map the point back into Form space using
 *   `inv(gs.ctm)` and test if it falls inside the Form bbox rectangle.
 * - Intersect with any previous `graphicsState.clipMask` deterministically.
 */

import type { PdfBBox, PdfGraphicsState, PdfMatrix, PdfSoftMask } from "../../domain";
import { IDENTITY_MATRIX, invertMatrix, transformPoint } from "../../domain";

function computeTransformedBBoxAabb(bbox: PdfBBox, ctm: PdfMatrix): PdfBBox {
  const [x1, y1, x2, y2] = bbox;
  const corners = [
    transformPoint({ x: x1, y: y1 }, ctm),
    transformPoint({ x: x2, y: y1 }, ctm),
    transformPoint({ x: x2, y: y2 }, ctm),
    transformPoint({ x: x1, y: y2 }, ctm),
  ];
  const bounds = { minX: corners[0]!.x, minY: corners[0]!.y, maxX: corners[0]!.x, maxY: corners[0]!.y };
  for (const p of corners) {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
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

function sampleClipMaskAtPagePoint(mask: PdfSoftMask, pageX: number, pageY: number): number {
  const pageToMask = invertMatrix(mask.matrix) ?? null;
  const p = pageToMask ? transformPoint({ x: pageX, y: pageY }, pageToMask) : { x: pageX, y: pageY };
  return sampleMaskAlpha(mask, p.x, p.y);
}

export function rasterizeFormBBoxClipToMask(
  gs: PdfGraphicsState,
  formBBox: PdfBBox,
  options: Readonly<{ readonly clipPathMaxSize: number }>,
): PdfSoftMask | null {
  const maxSize = options.clipPathMaxSize;
  if (!(maxSize > 0)) {return null;}
  if (!Number.isFinite(maxSize) || maxSize <= 0) {throw new Error(`clipPathMaxSize must be > 0 (got ${maxSize})`);}

  const ctmInv = invertMatrix(gs.ctm);
  if (!ctmInv) {return null;}

  const formAabbInPage = computeTransformedBBoxAabb(formBBox, gs.ctm);
  const bbox = intersectBBoxes(gs.clipBBox, formAabbInPage);
  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {return null;}

  const maxDim = Math.max(bw, bh);
  const scale = maxSize / maxDim;
  const width = Math.max(1, Math.round(bw * scale));
  const height = Math.max(1, Math.round(bh * scale));

  const pixelCount = width * height;
  const alpha = new Uint8Array(pixelCount);

  const minX = Math.min(formBBox[0], formBBox[2]);
  const maxX = Math.max(formBBox[0], formBBox[2]);
  const minY = Math.min(formBBox[1], formBBox[3]);
  const maxY = Math.max(formBBox[1], formBBox[3]);

  const prev = gs.clipMask;

  for (let row = 0; row < height; row += 1) {
    const pageY = ury - ((row + 0.5) / height) * bh;
    for (let col = 0; col < width; col += 1) {
      const pageX = llx + ((col + 0.5) / width) * bw;
      const idx = row * width + col;

      const formPoint = transformPoint({ x: pageX, y: pageY }, ctmInv);
      const inside = formPoint.x >= minX && formPoint.x <= maxX && formPoint.y >= minY && formPoint.y <= maxY;
      if (!inside) {continue;}

      let a = 255;
      if (prev) {
        a = sampleClipMaskAtPagePoint(prev, pageX, pageY);
        if (a === 0) {continue;}
      }
      alpha[idx] = a;
    }
  }

  return {
    kind: "Alpha",
    width,
    height,
    alpha,
    bbox: [bbox[0], bbox[1], bbox[2], bbox[3]],
    matrix: IDENTITY_MATRIX,
  };
}
