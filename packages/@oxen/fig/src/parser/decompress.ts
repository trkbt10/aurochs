/**
 * @file Decompression utilities for fig files (parser wrapper)
 *
 * Re-exports from the compression module with parser-specific error handling.
 */

import {
  decompress as baseDecompress,
  decompressDeflate as baseDecompressDeflate,
  decompressDeflateRaw as baseDecompressDeflateRaw,
  decompressZstd as baseDecompressZstd,
} from "../compression";
import { FigDecompressError } from "../errors";

/**
 * Decompress data using pako zlib (with header).
 *
 * @param data - Compressed data with zlib header
 * @returns Decompressed data
 * @throws FigDecompressError if decompression fails
 */
export function decompressDeflate(data: Uint8Array): Uint8Array {
  try {
    return baseDecompressDeflate(data);
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
    return baseDecompressDeflateRaw(data);
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
    return baseDecompressZstd(data);
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
  try {
    return baseDecompress(data);
  } catch (error) {
    throw new FigDecompressError(
      "Failed to decompress data",
      error instanceof Error ? error : undefined
    );
  }
}
