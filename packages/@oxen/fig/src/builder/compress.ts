/**
 * @file Compression utilities for fig files
 */

import { deflate } from "pako";
import type { CompressionType } from "../types";
import { FigBuildError } from "../errors";

/** Valid compression levels for pako */
type DeflateLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Compress data using pako (zlib/deflate).
 *
 * @param data - Data to compress
 * @param level - Compression level (0-9, default: 6)
 * @returns Compressed data
 */
export function compressDeflate(
  data: Uint8Array,
  level: DeflateLevel = 6
): Uint8Array {
  try {
    return deflate(data, { level });
  } catch (error) {
    throw new FigBuildError(
      `Failed to compress data with deflate: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Compress data using Zstandard.
 * Note: fzstd only supports decompression, so we use deflate as fallback.
 *
 * @param data - Data to compress
 * @param level - Compression level (0-9, default: 6)
 * @returns Compressed data
 */
export function compressZstd(
  data: Uint8Array,
  level: DeflateLevel = 6
): Uint8Array {
  // fzstd only supports decompression
  // For now, fall back to deflate for compression
  // TODO: Add zstd compression library if needed
  return compressDeflate(data, level);
}

/**
 * Compress data using the specified algorithm.
 *
 * @param data - Data to compress
 * @param type - Compression type
 * @param level - Compression level (0-9, default: 6)
 * @returns Compressed data
 */
export function compress(
  data: Uint8Array,
  type: CompressionType,
  level: DeflateLevel = 6
): Uint8Array {
  switch (type) {
    case "deflate":
      return compressDeflate(data, level);
    case "zstd":
      return compressZstd(data, level);
    case "none":
      return data;
  }
}
