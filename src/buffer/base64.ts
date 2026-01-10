/**
 * @file Base64 encoding/decoding utilities
 */

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

// Lookup table for decoding
const BASE64_LOOKUP = new Uint8Array(256);
for (let i = 0; i < BASE64_CHARS.length; i++) {
  BASE64_LOOKUP[BASE64_CHARS.charCodeAt(i)] = i;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
  const bytes = new Uint8Array(arrayBuffer);
  const byteLength = bytes.byteLength;
  const byteRemainder = byteLength % 3;
  const mainLength = byteLength - byteRemainder;

  const chunks: string[] = [];

  for (let i = 0; i < mainLength; i += 3) {
    const chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
    const a = (chunk & 16515072) >> 18;
    const b = (chunk & 258048) >> 12;
    const c = (chunk & 4032) >> 6;
    const d = chunk & 63;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + BASE64_CHARS[c] + BASE64_CHARS[d]);
  }

  if (byteRemainder === 1) {
    const chunk = bytes[mainLength];
    const a = (chunk & 252) >> 2;
    const b = (chunk & 3) << 4;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + "==");
  } else if (byteRemainder === 2) {
    const chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1];
    const a = (chunk & 64512) >> 10;
    const b = (chunk & 1008) >> 4;
    const c = (chunk & 15) << 2;
    chunks.push(BASE64_CHARS[a] + BASE64_CHARS[b] + BASE64_CHARS[c] + "=");
  }

  return chunks.join("");
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  // Remove padding and calculate length
  const paddingLength = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  const base64Length = base64.length;
  const byteLength = (base64Length * 3) / 4 - paddingLength;

  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;

  for (let i = 0; i < base64Length; i += 4) {
    const a = BASE64_LOOKUP[base64.charCodeAt(i)];
    const b = BASE64_LOOKUP[base64.charCodeAt(i + 1)];
    const c = BASE64_LOOKUP[base64.charCodeAt(i + 2)];
    const d = BASE64_LOOKUP[base64.charCodeAt(i + 3)];

    bytes[byteIndex++] = (a << 2) | (b >> 4);
    if (byteIndex < byteLength) {
      bytes[byteIndex++] = ((b & 15) << 4) | (c >> 2);
    }
    if (byteIndex < byteLength) {
      bytes[byteIndex++] = ((c & 3) << 6) | d;
    }
  }

  return bytes.buffer;
}
