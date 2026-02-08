/**
 * @file PNG format detection
 *
 * Detects PNG format by checking the 8-byte signature.
 * RFC 2083: PNG file signature is 89 50 4E 47 0D 0A 1A 0A
 */

import { PNG_SIGNATURE } from "./constants";

export { PNG_SIGNATURE };

/**
 * Check if data starts with PNG signature
 *
 * @param data - Binary data to check
 * @returns true if data is PNG format
 */
export function isPng(data: Uint8Array): boolean {
  if (data.length < PNG_SIGNATURE.length) {
    return false;
  }
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (data[i] !== PNG_SIGNATURE[i]) {
      return false;
    }
  }
  return true;
}
