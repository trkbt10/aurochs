/**
 * @file src/pdf/parser/jpeg2000/bytes.ts
 */































/** Read a 16-bit unsigned integer in big-endian byte order. */
export function readU16BE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset] ?? 0;
  const b = bytes[offset + 1] ?? 0;
  return ((a << 8) | b) >>> 0;
}































/** Read a 32-bit unsigned integer in big-endian byte order. */
export function readU32BE(bytes: Uint8Array, offset: number): number {
  const a = bytes[offset] ?? 0;
  const b = bytes[offset + 1] ?? 0;
  const c = bytes[offset + 2] ?? 0;
  const d = bytes[offset + 3] ?? 0;
  return ((a << 24) | (b << 16) | (c << 8) | d) >>> 0;
}































/** Read a 4-character ASCII string from byte array. */
export function readAscii4(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

