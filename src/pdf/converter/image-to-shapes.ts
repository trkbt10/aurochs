import type { PdfImage } from "../domain";
import type { PicShape, BlipFillProperties } from "../../pptx/domain/shape";
import { pct } from "../../ooxml/domain/units";
import type { ConversionContext } from "./transform-converter";
import { convertMatrix } from "./transform-converter";
import { toDataUrl } from "../../buffer/data-url";
import { encodeRgbaToPngDataUrl, isPng } from "../../png";
import { isJpeg } from "../../jpeg";
import { convertToRgba } from "./pixel-converter";

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
): PicShape {
  if (shapeId.length === 0) {
    throw new Error("shapeId is required");
  }

  const dataUrl = createDataUrl(image);
  const transform = convertMatrix(image.graphicsState.ctm, context);

  const blipFill: BlipFillProperties = {
    resourceId: dataUrl,
    sourceRect: {
      left: pct(0),
      top: pct(0),
      right: pct(0),
      bottom: pct(0),
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
  if (!alpha) return;

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
