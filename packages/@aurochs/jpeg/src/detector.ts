/**
 * @file JPEG format detection
 *
 * Detects JPEG format by checking the SOI (Start of Image) marker.
 * JPEG files start with FF D8 FF (SOI + APP marker)
 */

/**
 * JPEG SOI Marker (3 bytes minimum for detection)
 * FF D8 = Start of Image
 * FF = Start of next marker (typically APP0/APP1)
 */
export const JPEG_SOI_MARKER = new Uint8Array([0xff, 0xd8, 0xff]);

/**
 * Check if data starts with JPEG SOI marker
 *
 * @param data - Binary data to check
 * @returns true if data is JPEG format
 */
export function isJpeg(data: Uint8Array): boolean {
  if (data.length < 3) {
    return false;
  }
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
}
