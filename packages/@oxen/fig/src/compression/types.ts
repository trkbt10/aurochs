/**
 * @file Compression types
 */

/** Compression type used in fig payload */
export type CompressionType = "deflate" | "zstd" | "none";

/** Zstandard magic bytes */
export const ZSTD_MAGIC = new Uint8Array([0x28, 0xb5, 0x2f, 0xfd]);
