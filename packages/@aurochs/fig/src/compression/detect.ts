/**
 * @file Compression detection
 */

import { ZSTD_MAGIC, type CompressionType } from "./types";

/**
 * Detect compression type from data magic bytes.
 *
 * @param data - Compressed data
 * @returns Detected compression type
 */
export function detectCompression(data: Uint8Array): CompressionType {
  if (data.length < 4) {
    return "none";
  }

  // Check for zstd magic bytes
  if (
    data[0] === ZSTD_MAGIC[0] &&
    data[1] === ZSTD_MAGIC[1] &&
    data[2] === ZSTD_MAGIC[2] &&
    data[3] === ZSTD_MAGIC[3]
  ) {
    return "zstd";
  }

  // Otherwise assume deflate (raw deflate has no header to detect)
  return "deflate";
}
