/**
 * @file PDF→PPTX coordinate transformation utilities
 *
 * PDF coordinate system: origin at bottom-left, Y-axis pointing up
 * PPTX coordinate system: origin at top-left, Y-axis pointing down
 */

import type { PdfBBox, PdfMatrix, PdfPoint } from "../domain";
import { decomposeMatrix } from "../domain/coordinate/matrix";
import type { Pixels } from "../../ooxml/domain/units";
import { deg, px } from "../../ooxml/domain/units";
import type { Transform } from "../../pptx/domain/geometry";

export type ConversionContext = {
  /** PDFページ幅（ポイント） */
  readonly pdfWidth: number;
  /** PDFページ高さ（ポイント） */
  readonly pdfHeight: number;
  /** ターゲットスライド幅（ピクセル） */
  readonly slideWidth: Pixels;
  /** ターゲットスライド高さ（ピクセル） */
  readonly slideHeight: Pixels;
};

type TransformComponents = {
  readonly translation: { readonly x: number; readonly y: number };
  readonly scale: { readonly x: number; readonly y: number };
  readonly rotation: number; // radians
  readonly shear: { readonly x: number; readonly y: number };
  readonly isSimple: boolean;
};

function extractTransformComponents(ctm: PdfMatrix): TransformComponents {
  const [, , , , e, f] = ctm;
  const decomposed = decomposeMatrix(ctm);

  return {
    translation: { x: e, y: f },
    scale: { x: decomposed.scaleX, y: decomposed.scaleY },
    rotation: decomposed.rotation,
    shear: { x: decomposed.shearX, y: decomposed.shearY },
    isSimple: decomposed.isSimple,
  };
}

type PptxPoint = { readonly x: number; readonly y: number };

function toNumberPixels(value: Pixels): number {
  return value as number;
}

function convertPointToNumbers(
  point: PdfPoint,
  context: ConversionContext
): PptxPoint {
  const converted = convertPoint(point, context);
  return { x: toNumberPixels(converted.x), y: toNumberPixels(converted.y) };
}

function getImageCornersInPptx(
  ctm: PdfMatrix,
  context: ConversionContext
): {
  readonly tl: PptxPoint;
  readonly tr: PptxPoint;
  readonly bl: PptxPoint;
  readonly br: PptxPoint;
} {
  const [a, b, c, d, e, f] = ctm;

  // PDF image placement uses a unit square [0,0]-[1,1] in image space.
  // We treat PPTX-local (top-left origin, y down) as:
  // - TL: (0,0) -> PDF (0,1)
  // - TR: (1,0) -> PDF (1,1)
  // - BL: (0,1) -> PDF (0,0)
  // - BR: (1,1) -> PDF (1,0)
  const pdfTl: PdfPoint = { x: c + e, y: d + f };
  const pdfTr: PdfPoint = { x: a + c + e, y: b + d + f };
  const pdfBl: PdfPoint = { x: e, y: f };
  const pdfBr: PdfPoint = { x: a + e, y: b + f };

  return {
    tl: convertPointToNumbers(pdfTl, context),
    tr: convertPointToNumbers(pdfTr, context),
    bl: convertPointToNumbers(pdfBl, context),
    br: convertPointToNumbers(pdfBr, context),
  };
}

function normalizeDegrees(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const normalized = ((value % 360) + 360) % 360;
  return normalized > 180 ? normalized - 360 : normalized;
}

function computeBounds(points: readonly PptxPoint[]): {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
} {
  if (points.length === 0) {
    throw new Error("points is required");
  }

  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, minY, maxX, maxY };
}

function getScale(context: ConversionContext): { readonly scaleX: number; readonly scaleY: number } {
  if (!Number.isFinite(context.pdfWidth) || context.pdfWidth <= 0) {
    throw new Error(`Invalid pdfWidth: ${context.pdfWidth}`);
  }
  if (!Number.isFinite(context.pdfHeight) || context.pdfHeight <= 0) {
    throw new Error(`Invalid pdfHeight: ${context.pdfHeight}`);
  }
  if (!Number.isFinite(context.slideWidth as number) || (context.slideWidth as number) <= 0) {
    throw new Error(`Invalid slideWidth: ${context.slideWidth as number}`);
  }
  if (!Number.isFinite(context.slideHeight as number) || (context.slideHeight as number) <= 0) {
    throw new Error(`Invalid slideHeight: ${context.slideHeight as number}`);
  }

  return {
    scaleX: (context.slideWidth as number) / context.pdfWidth,
    scaleY: (context.slideHeight as number) / context.pdfHeight,
  };
}

/**
 * PDF座標をPPTX座標に変換
 */
export function convertPoint(
  point: PdfPoint,
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels } {
  const { scaleX, scaleY } = getScale(context);

  return {
    x: px(point.x * scaleX),
    y: px((context.pdfHeight - point.y) * scaleY),
  };
}

/**
 * PDF寸法をPPTX寸法に変換（Y軸反転なし）
 */
export function convertSize(
  width: number,
  height: number,
  context: ConversionContext
): { readonly width: Pixels; readonly height: Pixels } {
  const { scaleX, scaleY } = getScale(context);

  return {
    width: px(width * scaleX),
    height: px(height * scaleY),
  };
}

/**
 * PDFバウンディングボックスをPPTX座標に変換
 */
export function convertBBox(
  bbox: PdfBBox,
  context: ConversionContext
): { readonly x: Pixels; readonly y: Pixels; readonly width: Pixels; readonly height: Pixels } {
  const [x1, y1, x2, y2] = bbox;

  const p1 = convertPoint({ x: x1, y: y1 }, context);
  const p2 = convertPoint({ x: x2, y: y2 }, context);

  const minX = Math.min(p1.x as number, p2.x as number);
  const minY = Math.min(p1.y as number, p2.y as number);
  const maxX = Math.max(p1.x as number, p2.x as number);
  const maxY = Math.max(p1.y as number, p2.y as number);

  return {
    x: px(minX),
    y: px(minY),
    width: px(maxX - minX),
    height: px(maxY - minY),
  };
}

/**
 * PDF変換行列からPPTX Transformを生成
 *
 * PDF Reference 8.3.3: Transformation Matrices
 * CTM = [a b c d e f] transforms (x, y) to (ax + cy + e, bx + dy + f)
 *
 * For images, the unit square (0,0)-(1,1) maps to:
 * - (0,0) → (e, f) = bottom-left in PDF coordinates
 * - (1,1) → (a+c+e, b+d+f) = top-right in PDF coordinates
 *
 * PPTX uses top-left origin, so we need to:
 * 1. Y-flip the position
 * 2. Adjust for height (since PDF's (e,f) is bottom-left, not top-left)
 *
 * ## Limitations
 *
 * This implementation handles:
 * - Scale transformations (uniform and non-uniform)
 * - Vertical flip (d < 0)
 * - Rotation (extracted from atan2(b, a))
 *
 * NOT fully supported:
 * - Shear (skew) transformations - the matrix may have shear components
 *   that are not correctly decomposed
 * - Complex combined transformations (rotation + shear + non-uniform scale)
 *
 * For complex matrices, consider using decomposeMatrix() from domain/coordinate/matrix.ts
 * for more accurate decomposition.
 *
 * @see PDF Reference 1.7, Section 4.2.2 (Common Transformations)
 */
export function convertMatrix(pdfMatrix: PdfMatrix, context: ConversionContext): Transform {
  const components = extractTransformComponents(pdfMatrix);

  const corners = getImageCornersInPptx(pdfMatrix, context);
  const u = {
    x: corners.tr.x - corners.tl.x,
    y: corners.tr.y - corners.tl.y,
  };
  const v = {
    x: corners.bl.x - corners.tl.x,
    y: corners.bl.y - corners.tl.y,
  };

  const width = Math.hypot(u.x, u.y);
  const height = Math.hypot(v.x, v.y);

  const orthogonality = width > 0 && height > 0 ? Math.abs((u.x * v.x + u.y * v.y) / (width * height)) : 0;
  const hasShear =
    !components.isSimple ||
    Math.abs(components.shear.x) > 1e-6 ||
    Math.abs(components.shear.y) > 1e-6 ||
    orthogonality > 1e-6;

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    const bounds = computeBounds([corners.tl, corners.tr, corners.bl, corners.br]);
    return {
      x: px(bounds.minX),
      y: px(bounds.minY),
      width: px(Math.max(0, bounds.maxX - bounds.minX)),
      height: px(Math.max(0, bounds.maxY - bounds.minY)),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
  }

  if (hasShear) {
    console.warn("[PDF Image] Shear/complex transform not supported; falling back to bounds");
    const bounds = computeBounds([corners.tl, corners.tr, corners.bl, corners.br]);
    return {
      x: px(bounds.minX),
      y: px(bounds.minY),
      width: px(bounds.maxX - bounds.minX),
      height: px(bounds.maxY - bounds.minY),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
  }

  // Center point is invariant to rotation/flip
  const center = {
    x: (corners.tl.x + corners.tr.x + corners.bl.x + corners.br.x) / 4,
    y: (corners.tl.y + corners.tr.y + corners.bl.y + corners.br.y) / 4,
  };

  // Determine flip parity from the mapped axes.
  // Rotation has det=+1, so reflections are represented by flipH/flipV parity.
  const det = u.x * v.y - u.y * v.x;
  const detNegative = det < 0;

  const rotationFromU = Math.atan2(u.y, u.x);

  const candidates: Array<{
    readonly flipH: boolean;
    readonly flipV: boolean;
    readonly rotationRad: number;
    readonly dot: number; // higher is better
    readonly flipCount: number;
    readonly absRotationDeg: number;
  }> = [];

  const possibleFlips = getPossibleFlips(detNegative);

  const vHat = { x: v.x / height, y: v.y / height };
  for (const { flipH, flipV } of possibleFlips) {
    const fx = flipH ? -1 : 1;
    const fy = flipV ? -1 : 1;

    const rotationRad = rotationFromU + (fx === -1 ? Math.PI : 0);
    const sin = Math.sin(rotationRad);
    const cos = Math.cos(rotationRad);

    // Predicted v direction for the candidate.
    const vPredHat = { x: fy * -sin, y: fy * cos };
    const dot = vHat.x * vPredHat.x + vHat.y * vPredHat.y;

    const rotationDeg = normalizeDegrees((rotationRad * 180) / Math.PI);
    candidates.push({
      flipH,
      flipV,
      rotationRad,
      dot,
      flipCount: (flipH ? 1 : 0) + (flipV ? 1 : 0),
      absRotationDeg: Math.abs(rotationDeg),
    });
  }

function getPossibleFlips(detNegative: boolean): ReadonlyArray<{ readonly flipH: boolean; readonly flipV: boolean }> {
  if (detNegative) {
    return [
      { flipH: true, flipV: false },
      { flipH: false, flipV: true },
    ];
  }
  return [
    { flipH: false, flipV: false },
    { flipH: true, flipV: true },
  ];
}

  candidates.sort((a, b) => {
    if (b.dot !== a.dot) {
      return b.dot - a.dot;
    }
    if (a.flipCount !== b.flipCount) {
      return a.flipCount - b.flipCount;
    }
    return a.absRotationDeg - b.absRotationDeg;
  });
  const best = candidates[0];
  const rotationDeg = normalizeDegrees((best.rotationRad * 180) / Math.PI);

  return {
    x: px(center.x - width / 2),
    y: px(center.y - height / 2),
    width: px(width),
    height: px(height),
    rotation: deg(rotationDeg),
    flipH: best.flipH,
    flipV: best.flipV,
  };
}

/**
 * アスペクト比を保持しながらスライドにフィット
 */
export function createFitContext(
  pdfWidth: number,
  pdfHeight: number,
  slideWidth: Pixels,
  slideHeight: Pixels,
  fit: "contain" | "cover" | "stretch" = "contain"
): ConversionContext {
  if (fit === "stretch") {
    return { pdfWidth, pdfHeight, slideWidth, slideHeight };
  }

  if (!Number.isFinite(pdfWidth) || pdfWidth <= 0) {
    throw new Error(`Invalid pdfWidth: ${pdfWidth}`);
  }
  if (!Number.isFinite(pdfHeight) || pdfHeight <= 0) {
    throw new Error(`Invalid pdfHeight: ${pdfHeight}`);
  }

  const pdfAspect = pdfWidth / pdfHeight;
  const slideAspect = (slideWidth as number) / (slideHeight as number);

  let effectiveWidth = slideWidth as number;
  let effectiveHeight = slideHeight as number;

  if (fit === "contain") {
    if (pdfAspect > slideAspect) {
      effectiveHeight = (slideWidth as number) / pdfAspect;
    } else {
      effectiveWidth = (slideHeight as number) * pdfAspect;
    }
  } else {
    if (pdfAspect > slideAspect) {
      effectiveWidth = (slideHeight as number) * pdfAspect;
    } else {
      effectiveHeight = (slideWidth as number) / pdfAspect;
    }
  }

  return {
    pdfWidth,
    pdfHeight,
    slideWidth: px(effectiveWidth),
    slideHeight: px(effectiveHeight),
  };
}
