/**
 * @file Zstandard compression/decompression
 *
 * Uses fzstd for decompression (sync) and zstd-codec for compression (async).
 */

import { decompress as fzstdDecompress } from "fzstd";
import type { ZstdSimple } from "zstd-codec";
import { ZstdCodec } from "zstd-codec";

/**
 * Decompress zstd data (sync).
 *
 * @param data - Compressed data
 * @returns Decompressed data
 */
export function decompressZstd(data: Uint8Array): Uint8Array {
  return fzstdDecompress(data);
}

/**
 * Zstd compressor instance.
 * Use createZstdCompressor() to create one.
 */
export type ZstdCompressor = {
  /**
   * Compress data using Zstandard.
   *
   * @param data - Data to compress
   * @param level - Compression level (1-22, default: 3)
   * @returns Compressed data
   */
  compress(data: Uint8Array, level?: number): Uint8Array;
};

/**
 * Create a new zstd compressor instance.
 * Each instance is independent (no global singleton).
 *
 * @returns Promise resolving to a ZstdCompressor
 */
export function createZstdCompressor(): Promise<ZstdCompressor> {
  return new Promise<ZstdCompressor>((resolve, reject) => {
    ZstdCodec.run((binding) => {
      try {
        const simple: ZstdSimple = new binding.Simple();
        resolve({
          compress(data: Uint8Array, level: number = 3): Uint8Array {
            const result = simple.compress(data, level);
            if (result === null) {
              throw new Error("zstd compression failed");
            }
            return new Uint8Array(result);
          },
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * Compress data using Zstandard (one-shot convenience function).
 * Creates a temporary compressor for the operation.
 *
 * For multiple compressions, create a compressor with createZstdCompressor()
 * and reuse it for better performance.
 *
 * @param data - Data to compress
 * @param level - Compression level (1-22, default: 3)
 * @returns Compressed data
 */
export async function compressZstd(data: Uint8Array, level: number = 3): Promise<Uint8Array> {
  const compressor = await createZstdCompressor();
  return compressor.compress(data, level);
}
