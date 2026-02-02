/**
 * @file Decompression utilities for fig files
 */

import { inflate, inflateRaw } from "pako";
import { decompress as zstdDecompress } from "fzstd";
import type { CompressionType } from "../types";
import { ZSTD_MAGIC } from "../types";
import { FigDecompressError } from "../errors";

/**
 * Detect compression type from data by checking magic bytes.
 *
 * @param data - Data to analyze
 * @returns Detected compression type
 */
export function detectCompression(data: Uint8Array): CompressionType {
  if (data.length < 4) {
    return "none";
  }

  // Check for Zstandard magic: 0x28 0xB5 0x2F 0xFD
  if (
    data[0] === ZSTD_MAGIC[0] &&
    data[1] === ZSTD_MAGIC[1] &&
    data[2] === ZSTD_MAGIC[2] &&
    data[3] === ZSTD_MAGIC[3]
  ) {
    return "zstd";
  }

  // Check for zlib/deflate header
  // CMF (Compression Method and Flags) byte:
  // - Low 4 bits (CM): 8 = deflate
  // - High 4 bits (CINFO): window size
  // FLG (Flags) byte follows
  // (CMF * 256 + FLG) must be divisible by 31
  const cmf = data[0];
  const flg = data[1];
  const cm = cmf & 0x0f;

  if (cm === 8 && (cmf * 256 + flg) % 31 === 0) {
    return "deflate";
  }

  return "none";
}

/**
 * Decompress data using pako zlib (with header).
 *
 * @param data - Compressed data with zlib header
 * @returns Decompressed data
 * @throws FigDecompressError if decompression fails
 */
export function decompressDeflate(data: Uint8Array): Uint8Array {
  try {
    return inflate(data);
  } catch (error) {
    throw new FigDecompressError(
      "Failed to decompress deflate data",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using pako raw deflate (no header).
 * This is the format used by fig-kiwi files.
 *
 * @param data - Raw deflate compressed data
 * @returns Decompressed data
 * @throws FigDecompressError if decompression fails
 */
export function decompressDeflateRaw(data: Uint8Array): Uint8Array {
  try {
    return inflateRaw(data);
  } catch (error) {
    throw new FigDecompressError(
      "Failed to decompress raw deflate data",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using fzstd (Zstandard).
 *
 * @param data - Compressed data
 * @returns Decompressed data
 * @throws FigDecompressError if decompression fails
 */
export function decompressZstd(data: Uint8Array): Uint8Array {
  try {
    return zstdDecompress(data);
  } catch (error) {
    throw new FigDecompressError(
      "Failed to decompress zstd data",
      error instanceof Error ? error : undefined
    );
  }
}

/**
 * Decompress data using the appropriate algorithm.
 * Automatically detects the compression type.
 *
 * @param data - Compressed data
 * @returns Decompressed data
 * @throws FigDecompressError if decompression fails
 */
export function decompress(data: Uint8Array): Uint8Array {
  const type = detectCompression(data);

  switch (type) {
    case "deflate":
      return decompressDeflate(data);
    case "zstd":
      return decompressZstd(data);
    case "none":
      return data;
  }
}
