import type { PdfImage } from "../domain";
import type { PicShape, BlipFillProperties } from "../../pptx/domain/shape";
import { deg, pct } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertBBox, convertMatrix } from "./transform-converter";
import { toDataUrl } from "../../buffer/data-url";
import { encodeRgbaToPngDataUrl, isPng } from "../../png";
import { isJpeg } from "../../jpeg";
import { convertToRgba } from "./pixel-converter";
import type { PdfBBox, PdfMatrix } from "../domain";
import { isSimpleTransform } from "../domain";

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

  const dataUrl = createDataUrl(image);
  const { sourceRect, clippedBBox } = computeRectClipForImage(image.graphicsState.ctm, image.graphicsState.clipBBox);
  const transform = clippedBBox
    ? { ...convertBBox(clippedBBox, context), rotation: deg(0), flipH: false, flipV: false }
    : convertMatrix(image.graphicsState.ctm, context);

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
  applyAlphaMaskInPlace(rgbaData, image.alpha, width, height);

  // Encode to PNG using png module (Canvas API or Pure JS)
  return encodeRgbaToPngDataUrl(rgbaData, width, height);
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
  if (!clipBBox) return {};
  if (!isSimpleTransform(imageCtm)) return {};

  const [a, , , d, e, f] = imageCtm;
  if (!Number.isFinite(a) || !Number.isFinite(d) || a === 0 || d === 0) return {};

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
  if (w <= 0 || h <= 0) return {};

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

  const left = uMin * 100;
  const right = (1 - uMax) * 100;
  const bottom = vMin * 100;
  const top = (1 - vMax) * 100;

  return {
    sourceRect: { left, top, right, bottom },
    clippedBBox: [ix1, iy1, ix2, iy2],
  };
}
