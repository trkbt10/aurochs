import { toDataUrl } from "@aurochs/buffer";
import { isJpeg } from "@aurochs/jpeg";
import { convertToRgba } from "@aurochs/pdf/image/pixel-converter";
import type { PdfImage } from "@aurochs/pdf/domain";
import { encodeRgbaToPngDataUrl, isPng } from "@aurochs/png";

function toExactArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function applyAlphaChannel(rgba: Uint8ClampedArray, alpha: Uint8Array | undefined): void {
  if (!alpha) {
    return;
  }

  const pixelCount = rgba.length / 4;
  if (alpha.length !== pixelCount) {
    return;
  }

  for (let i = 0; i < pixelCount; i += 1) {
    rgba[i * 4 + 3] = alpha[i] ?? 255;
  }
}

function encodeRawImageToDataUrl(image: PdfImage): string {
  const rgba = convertToRgba(
    image.data,
    image.width,
    image.height,
    image.colorSpace,
    image.bitsPerComponent,
    { decode: image.decode },
  );
  applyAlphaChannel(rgba, image.alpha);
  return encodeRgbaToPngDataUrl(rgba, image.width, image.height);
}

/** Convert PDF image data into a renderable SVG image href value. */
export function buildPdfImageDataUrl(image: PdfImage): string {
  if (isJpeg(image.data)) {
    return toDataUrl(toExactArrayBuffer(image.data), "image/jpeg");
  }

  if (isPng(image.data)) {
    return toDataUrl(toExactArrayBuffer(image.data), "image/png");
  }

  return encodeRawImageToDataUrl(image);
}
