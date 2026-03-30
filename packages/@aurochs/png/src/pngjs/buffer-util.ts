/**
 * @file Buffer utility functions replacing Node.js Buffer methods with DataView
 *
 * Provides pure TypeScript equivalents for Buffer operations used in pngjs.
 */

/** Read an unsigned 32-bit big-endian integer from a Uint8Array at the given offset. */
export function readUInt32BE(data: Uint8Array, offset: number): number {
  return (
    ((data[offset] << 24) >>> 0) +
    (data[offset + 1] << 16) +
    (data[offset + 2] << 8) +
    data[offset + 3]
  ) >>> 0;
}

/** Read a signed 32-bit big-endian integer from a Uint8Array at the given offset. */
export function readInt32BE(data: Uint8Array, offset: number): number {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  );
}

/** Read an unsigned 16-bit big-endian integer from a Uint8Array at the given offset. */
export function readUInt16BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 8) | data[offset + 1];
}

/** Write an unsigned 32-bit big-endian integer into a Uint8Array at the given offset. */
export function writeUInt32BE(data: Uint8Array, value: number, offset: number): void {
  data[offset] = (value >>> 24) & 0xff;
  data[offset + 1] = (value >>> 16) & 0xff;
  data[offset + 2] = (value >>> 8) & 0xff;
  data[offset + 3] = value & 0xff;
}

/** Write a signed 32-bit big-endian integer into a Uint8Array at the given offset. */
export function writeInt32BE(data: Uint8Array, value: number, offset: number): void {
  data[offset] = (value >> 24) & 0xff;
  data[offset + 1] = (value >> 16) & 0xff;
  data[offset + 2] = (value >> 8) & 0xff;
  data[offset + 3] = value & 0xff;
}

/** Concatenate multiple Uint8Array instances into a single contiguous Uint8Array. */
export function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  const totalLength = { current: 0 };
  for (const arr of arrays) {
    totalLength.current += arr.length;
  }
  const result = new Uint8Array(totalLength.current);
  const offset = { current: 0 };
  for (const arr of arrays) {
    result.set(arr, offset.current);
    offset.current += arr.length;
  }
  return result;
}
