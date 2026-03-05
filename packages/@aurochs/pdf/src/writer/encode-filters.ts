/**
 * @file PDF Stream Encoding Filters
 *
 * Encoding functions for PDF stream filters.
 * @see ISO 32000-1:2008 Section 7.4 (Filters)
 */

import { zlibSync } from "fflate";

/**
 * Encode data using FlateDecode (zlib compression).
 * @see ISO 32000-1:2008 Section 7.4.4
 */
export function encodeFlate(data: Uint8Array): Uint8Array {
  return zlibSync(data);
}

/**
 * Encode data using ASCII85 encoding.
 * Encodes 4 bytes as 5 ASCII characters (base-85).
 * @see ISO 32000-1:2008 Section 7.4.3
 */
export function encodeAscii85(data: Uint8Array): Uint8Array {
  if (data.length === 0) {
    return new TextEncoder().encode("~>");
  }

  const result: number[] = [];

  // Process 4 bytes at a time
  for (let i = 0; i < data.length; i += 4) {
    const remaining = data.length - i;
    const chunkSize = Math.min(4, remaining);

    // Build 32-bit value (big-endian, padded with zeros if needed)
    let value = 0;
    for (let j = 0; j < 4; j++) {
      value = value * 256 + (j < chunkSize ? data[i + j] : 0);
    }

    if (value === 0 && chunkSize === 4) {
      // Special case: 4 zero bytes encode as 'z'
      result.push(0x7a); // 'z'
    } else {
      // Convert to base-85
      const chars: number[] = [];
      for (let j = 0; j < 5; j++) {
        chars.unshift((value % 85) + 33);
        value = Math.floor(value / 85);
      }

      // For partial groups, output only chunkSize + 1 characters
      const outputCount = chunkSize === 4 ? 5 : chunkSize + 1;
      for (let j = 0; j < outputCount; j++) {
        result.push(chars[j]);
      }
    }
  }

  // Append end-of-data marker
  result.push(0x7e); // '~'
  result.push(0x3e); // '>'

  return new Uint8Array(result);
}

/**
 * Encode data using ASCIIHex encoding.
 * Encodes each byte as two hexadecimal digits.
 * @see ISO 32000-1:2008 Section 7.4.2
 */
export function encodeAsciiHex(data: Uint8Array): Uint8Array {
  const hexChars = "0123456789ABCDEF";
  const result = new Uint8Array(data.length * 2 + 1);

  for (let i = 0; i < data.length; i++) {
    const byte = data[i];
    result[i * 2] = hexChars.charCodeAt(byte >> 4);
    result[i * 2 + 1] = hexChars.charCodeAt(byte & 0x0f);
  }

  // Append end-of-data marker
  result[data.length * 2] = 0x3e; // '>'

  return result;
}
