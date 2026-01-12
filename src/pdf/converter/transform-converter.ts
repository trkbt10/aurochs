/**
 * @file PDF→PPTX coordinate transformation utilities
 *
 * PDF coordinate system: origin at bottom-left, Y-axis pointing up
 * PPTX coordinate system: origin at top-left, Y-axis pointing down
 */

import type { PdfBBox, PdfMatrix, PdfPoint } from "../domain";
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
 */
export function convertMatrix(pdfMatrix: PdfMatrix, context: ConversionContext): Transform {
  const [a, b, c, d, e, f] = pdfMatrix;
  const { scaleX, scaleY } = getScale(context);

  // Extract scale factors (absolute values - sign indicates flip)
  const matrixScaleX = Math.sqrt(a * a + b * b);
  const matrixScaleY = Math.sqrt(c * c + d * d);
  const rotation = Math.atan2(b, a) * (180 / Math.PI);

  // Determine if image is vertically flipped in PDF
  // d < 0 means image is flipped (Y-axis inverted in PDF space)
  const isFlippedV = d < 0;

  // Calculate top-left position in PPTX coordinates
  // In PDF: (e, f) is bottom-left of the image
  // If d > 0: top-left in PDF is at (e, f + height), where height = |d|
  // If d < 0: image hangs down from f, so top is at (e, f)
  // After Y-flip to PPTX: need to account for this
  const pdfTopY = isFlippedV ? f : f + Math.abs(d);
  const position = convertPoint({ x: e, y: pdfTopY }, context);

  return {
    x: position.x,
    y: position.y,
    width: px(matrixScaleX * scaleX),
    height: px(matrixScaleY * scaleY),
    rotation: deg(-rotation),
    flipH: false,
    flipV: isFlippedV,
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

