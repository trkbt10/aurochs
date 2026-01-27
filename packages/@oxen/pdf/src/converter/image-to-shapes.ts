/**
 * @file src/pdf/converter/image-to-shapes.ts
 */

import type { PdfColorSpace, PdfImage } from "../domain";
import type { PicShape, BlipFillProperties } from "@oxen/pptx/domain/shape";
import { deg, pct } from "@oxen/ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, convertMatrix, convertSize } from "./transform-converter";
import { toDataUrl } from "@oxen/buffer";
import { encodeRgbaToPngDataUrl, isPng } from "@oxen/png";
import { isJpeg } from "@oxen/jpeg";
import { convertToRgba } from "./pixel-converter";
import type { PdfBBox, PdfMatrix, PdfSoftMask } from "../domain";
import { clamp01, cmykToRgb, grayToRgb, hasShear, invertMatrix, isSimpleTransform, rgbToRgbBytes, transformPoint } from "../domain";

/**
 * PdfImageをPicShapeに変換
 *
 * PDF画像データはRAWピクセルバイト形式で格納されている。
 * これをPNG形式にエンコードしてからPPTXに埋め込む。
 */
export function convertImageToShape(
  image: PdfImage,
  context: ConversionContext,
  shapeId: string
): PicShape | null {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const clipBBox = image.graphicsState.clipBBox;
  if (clipBBox) {
    const imageBBox = computeImageBBoxFromCtm(image.graphicsState.ctm);
    if (!bboxIntersects(imageBBox, clipBBox)) {
      return null;
    }
  }

  const ctm = image.graphicsState.ctm;
  const clipMask = image.graphicsState.clipMask;

  if (clipMask) {
    const imageBBox = computeImageBBoxFromCtm(ctm);
    const clipped = intersectBBoxes(imageBBox, clipMask.bbox);
    if (!clipped) {
      return null;
    }
    const warped = warpTransformedImageToPngDataUrl(image, context, clipped, { clipMask });
    if (warped) {
      return {
        type: "pic",
        nonVisual: {
          id: shapeId,
          name: `Picture ${shapeId}`,
        },
        blipFill: {
          resourceId: warped.dataUrl,
          sourceRect: {
            left: pct(0),
            top: pct(0),
            right: pct(0),
            bottom: pct(0),
          },
          stretch: true,
        },
        properties: {
          transform: { ...convertBBox(warped.bbox, context), rotation: deg(0), flipH: false, flipV: false },
        },
      };
    }
  }

  // PPTX cannot represent arbitrary clipping for rotated/sheared images.
  // For bbox-only clipBBox, preserve appearance by baking the transform into a PNG and
  // placing it axis-aligned at the clipped bbox.
  if (clipBBox && !isSimpleTransform(ctm)) {
    const imageBBox = computeImageBBoxFromCtm(ctm);
    const clipped = intersectBBoxes(imageBBox, clipBBox);
    if (!clipped) {
      return null;
    }
    if (!isBBoxEqual(clipped, imageBBox)) {
      const warped = warpTransformedImageToPngDataUrl(image, context, clipped);
      if (warped) {
        return {
          type: "pic",
          nonVisual: {
            id: shapeId,
            name: `Picture ${shapeId}`,
          },
          blipFill: {
            resourceId: warped.dataUrl,
            sourceRect: {
              left: pct(0),
              top: pct(0),
              right: pct(0),
              bottom: pct(0),
            },
            stretch: true,
          },
          properties: {
            transform: { ...convertBBox(warped.bbox, context), rotation: deg(0), flipH: false, flipV: false },
          },
        };
      }
    }
  }

  // PPTX Transform cannot represent shear; preserve appearance by baking into a PNG.
  if (hasShear(ctm)) {
    const imageBBox = computeImageBBoxFromCtm(ctm);
    const warped = warpTransformedImageToPngDataUrl(image, context, imageBBox);
    if (!warped) {return null;}
    return {
      type: "pic",
      nonVisual: {
        id: shapeId,
        name: `Picture ${shapeId}`,
      },
      blipFill: {
        resourceId: warped.dataUrl,
        sourceRect: {
          left: pct(0),
          top: pct(0),
          right: pct(0),
          bottom: pct(0),
        },
        stretch: true,
      },
      properties: {
        transform: { ...convertBBox(warped.bbox, context), rotation: deg(0), flipH: false, flipV: false },
      },
    };
  }

  const dataUrl = createDataUrl(image);
  const { sourceRect, clippedBBox } = computeRectClipForImage(image.graphicsState.ctm, clipBBox);
  const transform = createImageTransform(image.graphicsState.ctm, clippedBBox ?? null, context);

  if (clippedBBox && ((transform.width as number) <= 0 || (transform.height as number) <= 0)) {
    return null;
  }

  const blipFill: BlipFillProperties = {
    resourceId: dataUrl,
    sourceRect: {
      left: pct(sourceRect?.left ?? 0),
      top: pct(sourceRect?.top ?? 0),
      right: pct(sourceRect?.right ?? 0),
      bottom: pct(sourceRect?.bottom ?? 0),
    },
    stretch: true,
  };

  return {
    type: "pic",
    nonVisual: {
      id: shapeId,
      name: `Picture ${shapeId}`,
    },
    blipFill,
    properties: {
      transform,
    },
  };
}

function createImageTransform(ctm: PdfMatrix, clippedBBox: PdfBBox | null, context: ConversionContext) {
  if (clippedBBox) {
    return { ...convertBBox(clippedBBox, context), rotation: deg(0), flipH: false, flipV: false };
  }
  return convertMatrix(ctm, context);
}

function warpTransformedImageToPngDataUrl(
  image: PdfImage,
  context: ConversionContext,
  bbox: PdfBBox,
  options: Readonly<{ readonly clipMask?: PdfSoftMask }> = {},
): Readonly<{ readonly bbox: PdfBBox; readonly dataUrl: string }> | null {
  const format = detectImageFormat(image.data);
  if (format !== "raw") {
    return null;
  }

  const ctm = image.graphicsState.ctm;
  const inv = invertMatrix(ctm);
  if (!inv) {
    return null;
  }

  const [llx, lly, urx, ury] = bbox;
  const bw = urx - llx;
  const bh = ury - lly;
  if (!Number.isFinite(bw) || !Number.isFinite(bh) || bw <= 0 || bh <= 0) {
    return null;
  }

  const size = convertSize(bw, bh, context);
  const outWidth = Math.max(1, Math.round(size.width as number));
  const outHeight = Math.max(1, Math.round(size.height as number));

  const srcRgba = convertToRgba(image.data, image.width, image.height, image.colorSpace, image.bitsPerComponent, { decode: image.decode });
  applySoftMaskMatteInPlace(srcRgba, image.alpha, image.softMaskMatte, image.colorSpace, image.width, image.height);
  applyAlphaMaskInPlace(srcRgba, image.alpha, image.width, image.height);

  const out = new Uint8ClampedArray(outWidth * outHeight * 4);

  for (let row = 0; row < outHeight; row += 1) {
    const y = ury - ((row + 0.5) / outHeight) * bh;
    for (let col = 0; col < outWidth; col += 1) {
      const x = llx + ((col + 0.5) / outWidth) * bw;
      const uv = transformPoint({ x, y }, inv);
      const u = uv.x;
      const v = uv.y;
      if (u < 0 || u >= 1 || v < 0 || v >= 1) {continue;}

      const srcCol = Math.min(image.width - 1, Math.max(0, Math.floor(u * image.width)));
      const srcRow = Math.min(image.height - 1, Math.max(0, Math.floor((1 - v) * image.height)));
      const srcIdx = (srcRow * image.width + srcCol) * 4;
      const dstIdx = (row * outWidth + col) * 4;

      out[dstIdx] = srcRgba[srcIdx] ?? 0;
      out[dstIdx + 1] = srcRgba[srcIdx + 1] ?? 0;
      out[dstIdx + 2] = srcRgba[srcIdx + 2] ?? 0;
      const baseA = srcRgba[srcIdx + 3] ?? 0;
      const mask = options.clipMask;
      if (!mask || baseA === 0) {
        out[dstIdx + 3] = baseA;
      } else {
        const clipA = sampleMaskAlpha(mask, x, y);
        out[dstIdx + 3] = Math.round((baseA * clipA) / 255);
      }
    }
  }

  return {
    bbox,
    dataUrl: encodeRgbaToPngDataUrl(out, outWidth, outHeight),
  };
}

/**
 * PDF画像データをData URLに変換
 *
 * 画像データが既にPNG/JPEG形式の場合はそのまま使用。
 * RAWピクセルデータの場合はPNG形式にエンコードする。
 */
function createDataUrl(image: PdfImage): string {
  const format = detectImageFormat(image.data);

  if (format !== "raw") {
    // Already encoded as PNG or JPEG - use as-is
    const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
    // Ensure we have a plain ArrayBuffer (buffer can be ArrayBufferLike)
    return toDataUrl(image.data.buffer.slice(0) as ArrayBuffer, mimeType);
  }

  // Raw pixel data - encode to PNG
  return encodeRawToPngDataUrl(image);
}

/**
 * 画像フォーマットを検出
 *
 * PDF Reference 8.9.5: 画像データは直接埋め込み(JPEG/PNG等)または
 * RAWピクセルデータとして格納される。
 */
function detectImageFormat(data: Uint8Array): "jpeg" | "png" | "raw" {
  if (isJpeg(data)) {
    return "jpeg";
  }

  if (isPng(data)) {
    return "png";
  }

  return "raw";
}

/**
 * RAWピクセルデータをPNG Data URLにエンコード
 */
function encodeRawToPngDataUrl(image: PdfImage): string {
  const { width, height, data, colorSpace, bitsPerComponent, decode } = image;

  // Convert raw pixels to RGBA
  const rgbaData = convertToRgba(data, width, height, colorSpace, bitsPerComponent, { decode });
  applySoftMaskMatteInPlace(rgbaData, image.alpha, image.softMaskMatte, colorSpace, width, height);
  applyAlphaMaskInPlace(rgbaData, image.alpha, width, height);

  // Encode to PNG using png module (Canvas API or Pure JS)
  return encodeRgbaToPngDataUrl(rgbaData, width, height);
}

function applySoftMaskMatteInPlace(
  rgbaData: Uint8ClampedArray,
  alpha: Uint8Array | undefined,
  matte: readonly number[] | undefined,
  colorSpace: PdfColorSpace,
  width: number,
  height: number,
): void {
  if (!alpha || !matte) {return;}

  const pixelCount = width * height;
  if (alpha.length !== pixelCount) {
    console.warn(
      `[PDF Image] Alpha length mismatch: expected ${pixelCount} bytes for ${width}x${height}, got ${alpha.length}`,
    );
    return;
  }

  const matteRgb = toMatteRgbBytes(matte, colorSpace);
  if (!matteRgb) {return;}

  const mR = matteRgb[0] / 255;
  const mG = matteRgb[1] / 255;
  const mB = matteRgb[2] / 255;

  for (let i = 0; i < pixelCount; i += 1) {
    const aByte = alpha[i] ?? 0;
    if (aByte === 0) {continue;}
    const a = aByte / 255;

    const base = i * 4;
    const r = (rgbaData[base] ?? 0) / 255;
    const g = (rgbaData[base + 1] ?? 0) / 255;
    const b = (rgbaData[base + 2] ?? 0) / 255;

    const rUnmatted = (r - mR * (1 - a)) / a;
    const gUnmatted = (g - mG * (1 - a)) / a;
    const bUnmatted = (b - mB * (1 - a)) / a;

    rgbaData[base] = Math.round(clamp01(rUnmatted) * 255);
    rgbaData[base + 1] = Math.round(clamp01(gUnmatted) * 255);
    rgbaData[base + 2] = Math.round(clamp01(bUnmatted) * 255);
  }
}

function toMatteRgbBytes(matte: readonly number[], colorSpace: PdfColorSpace): readonly [number, number, number] | null {
  switch (colorSpace) {
    case "DeviceGray": {
      if (matte.length !== 1) {
        console.warn(`[PDF Image] /Matte length mismatch for DeviceGray: expected 1, got ${matte.length}`);
        return null;
      }
      return grayToRgb(matte[0] ?? 0);
    }
    case "DeviceRGB": {
      if (matte.length !== 3) {
        console.warn(`[PDF Image] /Matte length mismatch for DeviceRGB: expected 3, got ${matte.length}`);
        return null;
      }
      return rgbToRgbBytes(matte[0] ?? 0, matte[1] ?? 0, matte[2] ?? 0);
    }
    case "DeviceCMYK": {
      if (matte.length !== 4) {
        console.warn(`[PDF Image] /Matte length mismatch for DeviceCMYK: expected 4, got ${matte.length}`);
        return null;
      }
      return cmykToRgb(matte[0] ?? 0, matte[1] ?? 0, matte[2] ?? 0, matte[3] ?? 0);
    }
    case "ICCBased":
    case "Pattern":
    default:
      console.warn(`[PDF Image] /Matte is not supported for colorSpace=${colorSpace}`);
      return null;
  }
}

function applyAlphaMaskInPlace(
  rgbaData: Uint8ClampedArray,
  alpha: Uint8Array | undefined,
  width: number,
  height: number
): void {
  if (!alpha) {return;}

  const expectedLength = width * height;
  if (alpha.length !== expectedLength) {
    console.warn(
      `[PDF Image] Alpha length mismatch: expected ${expectedLength} bytes for ${width}x${height}, got ${alpha.length}`
    );
    return;
  }

  for (let i = 0; i < expectedLength; i += 1) {
    rgbaData[i * 4 + 3] = alpha[i] ?? 255;
  }
}

function computeRectClipForImage(
  imageCtm: PdfMatrix,
  clipBBox: PdfBBox | undefined,
): Readonly<{
  readonly sourceRect?: Readonly<{ left: number; top: number; right: number; bottom: number }>;
  readonly clippedBBox?: PdfBBox;
}> {
  if (!clipBBox) {
    return {};
  }
  if (!isSimpleTransform(imageCtm)) {
    return {};
  }

  const [a, , , d, e, f] = imageCtm;
  if (!Number.isFinite(a) || !Number.isFinite(d) || a === 0 || d === 0) {
    return {};
  }

  const x0 = e;
  const x1 = a + e;
  const y0 = f;
  const y1 = d + f;

  const imgMinX = Math.min(x0, x1);
  const imgMaxX = Math.max(x0, x1);
  const imgMinY = Math.min(y0, y1);
  const imgMaxY = Math.max(y0, y1);

  const [cx1, cy1, cx2, cy2] = clipBBox;
  const clipMinX = Math.min(cx1, cx2);
  const clipMaxX = Math.max(cx1, cx2);
  const clipMinY = Math.min(cy1, cy2);
  const clipMaxY = Math.max(cy1, cy2);

  const ix1 = Math.max(imgMinX, clipMinX);
  const iy1 = Math.max(imgMinY, clipMinY);
  const ix2 = Math.min(imgMaxX, clipMaxX);
  const iy2 = Math.min(imgMaxY, clipMaxY);

  const w = imgMaxX - imgMinX;
  const h = imgMaxY - imgMinY;
  if (w <= 0 || h <= 0) {
    return {};
  }

  if (ix2 <= ix1 || iy2 <= iy1) {
    return { clippedBBox: [0, 0, 0, 0] };
  }

  const uA = (ix1 - e) / a;
  const uB = (ix2 - e) / a;
  const vA = (iy1 - f) / d;
  const vB = (iy2 - f) / d;

  const uMin = Math.max(0, Math.min(uA, uB));
  const uMax = Math.min(1, Math.max(uA, uB));
  const vMin = Math.max(0, Math.min(vA, vB));
  const vMax = Math.min(1, Math.max(vA, vB));

  const roundPercent = (value: number): number => {
    const clamped = Math.max(0, Math.min(100, value));
    // OOXML percentages serialize to 100000ths, so 0.001% is the practical resolution.
    return Math.round(clamped * 1000) / 1000;
  };

  const left = roundPercent(uMin * 100);
  const right = roundPercent((1 - uMax) * 100);
  const bottom = roundPercent(vMin * 100);
  const top = roundPercent((1 - vMax) * 100);

  return {
    sourceRect: { left, top, right, bottom },
    clippedBBox: [ix1, iy1, ix2, iy2],
  };
}

function computeImageBBoxFromCtm(ctm: PdfMatrix): PdfBBox {
  const [a, b, c, d, e, f] = ctm;
  const p0 = { x: e, y: f };
  const p1 = { x: a + e, y: b + f };
  const p2 = { x: c + e, y: d + f };
  const p3 = { x: a + c + e, y: b + d + f };

  const bounds = { minX: p0.x, minY: p0.y, maxX: p0.x, maxY: p0.y };
  for (const p of [p1, p2, p3]) {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  }

  return [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
}

function bboxIntersects(a: PdfBBox, b: PdfBBox): boolean {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const aMinX = Math.min(ax1, ax2);
  const aMinY = Math.min(ay1, ay2);
  const aMaxX = Math.max(ax1, ax2);
  const aMaxY = Math.max(ay1, ay2);
  const bMinX = Math.min(bx1, bx2);
  const bMinY = Math.min(by1, by2);
  const bMaxX = Math.max(bx1, bx2);
  const bMaxY = Math.max(by1, by2);
  return aMaxX > bMinX && aMinX < bMaxX && aMaxY > bMinY && aMinY < bMaxY;
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

function isBBoxEqual(a: PdfBBox, b: PdfBBox): boolean {
  const eps = 1e-6;
  return (
    Math.abs((a[0] ?? 0) - (b[0] ?? 0)) < eps &&
    Math.abs((a[1] ?? 0) - (b[1] ?? 0)) < eps &&
    Math.abs((a[2] ?? 0) - (b[2] ?? 0)) < eps &&
    Math.abs((a[3] ?? 0) - (b[3] ?? 0)) < eps
  );
}

function intersectBBoxes(a: PdfBBox, b: PdfBBox): PdfBBox | null {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const aMinX = Math.min(ax1, ax2);
  const aMinY = Math.min(ay1, ay2);
  const aMaxX = Math.max(ax1, ax2);
  const aMaxY = Math.max(ay1, ay2);
  const bMinX = Math.min(bx1, bx2);
  const bMinY = Math.min(by1, by2);
  const bMaxX = Math.max(bx1, bx2);
  const bMaxY = Math.max(by1, by2);

  const ix1 = Math.max(aMinX, bMinX);
  const iy1 = Math.max(aMinY, bMinY);
  const ix2 = Math.min(aMaxX, bMaxX);
  const iy2 = Math.min(aMaxY, bMaxY);

  if (ix2 <= ix1 || iy2 <= iy1) {return null;}
  return [ix1, iy1, ix2, iy2];
}
