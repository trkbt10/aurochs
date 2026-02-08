/**
 * @file Deflate compression/decompression
 */

import { deflate, deflateRaw, inflate, inflateRaw } from "pako";

/** Valid compression levels for deflate */
export type DeflateLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Compress data using deflate (with zlib header).
 *
 * @param data - Data to compress
 * @param level - Compression level (0-9, default: 6)
 * @returns Compressed data
 */
export function compressDeflate(data: Uint8Array, level: DeflateLevel = 6): Uint8Array {
  return deflate(data, { level });
}

/**
 * Decompress deflate data (with zlib header).
 *
 * @param data - Compressed data
 * @returns Decompressed data
 */
export function decompressDeflate(data: Uint8Array): Uint8Array {
  return inflate(data);
}

/**
 * Compress data using raw deflate (no header).
 *
 * @param data - Data to compress
 * @param level - Compression level (0-9, default: 6)
 * @returns Compressed data
 */
export function compressDeflateRaw(data: Uint8Array, level: DeflateLevel = 6): Uint8Array {
  return deflateRaw(data, { level });
}

/**
 * Decompress raw deflate data (no header).
 *
 * @param data - Compressed data
 * @returns Decompressed data
 */
export function decompressDeflateRaw(data: Uint8Array): Uint8Array {
  return inflateRaw(data);
}
