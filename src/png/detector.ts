/**
 * @file PNG format detection
 *
 * Detects PNG format by checking the 8-byte signature.
 * RFC 2083: PNG file signature is 89 50 4E 47 0D 0A 1A 0A
 */

/**
 * PNG Signature (8 bytes)
 * RFC 2083 Section 3.1
 */
export const PNG_SIGNATURE = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/**
 * Check if data starts with PNG signature
 *
 * @param data - Binary data to check
 * @returns true if data is PNG format
 */
export function isPng(data: Uint8Array): boolean {
  if (data.length < 8) {
    return false;
  }
  return (
    data[0] === 0x89 &&
    data[1] === 0x50 &&
    data[2] === 0x4e &&
    data[3] === 0x47 &&
    data[4] === 0x0d &&
    data[5] === 0x0a &&
    data[6] === 0x1a &&
    data[7] === 0x0a
  );
}
