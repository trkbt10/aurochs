/**
 * @file Image dimension extraction from binary headers
 *
 * Extracts pixel dimensions from PNG (IHDR) and JPEG (SOF0/SOF2) binary data
 * without decoding the full image. Used for image fill pattern calculations
 * where the natural image size determines the pattern transform.
 */

export type ImageDimensions = {
  readonly width: number;
  readonly height: number;
};

/**
 * Extract pixel dimensions from image binary data.
 *
 * Supports JPEG (SOF0/SOF2 markers) and PNG (IHDR chunk).
 * Returns undefined if the format is unrecognized or data is too short.
 */
export function getImageDimensions(data: Uint8Array, mimeType: string): ImageDimensions | undefined {
  if (mimeType === "image/png" && data.length >= 24) {
    // PNG IHDR: bytes 16-19 = width (big-endian), 20-23 = height
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const width = view.getUint32(16);
    const height = view.getUint32(20);
    if (width > 0 && height > 0) {
      return { width, height };
    }
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    // JPEG: scan for SOF0 (0xFFC0) or SOF2 (0xFFC2) marker
    for (let i = 0; i < data.length - 9; i++) {
      if (data[i] === 0xFF && (data[i + 1] === 0xC0 || data[i + 1] === 0xC2)) {
        const view = new DataView(data.buffer, data.byteOffset + i + 5, 4);
        const height = view.getUint16(0);
        const width = view.getUint16(2);
        if (width > 0 && height > 0) {
          return { width, height };
        }
      }
    }
  }

  return undefined;
}
