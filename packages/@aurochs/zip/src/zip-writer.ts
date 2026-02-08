/**
 * @file ZIP writer (fflate)
 */

import { zipSync } from "fflate";

export type ZipWriterOptions = {
  readonly compressionLevel?: number;
};

type CompressionLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

function normalizeCompressionLevel(level: number): CompressionLevel {
  if (!Number.isInteger(level) || level < 0 || level > 9) {
    throw new Error(`compressionLevel must be an integer 0-9 (got: ${level})`);
  }
  return level as CompressionLevel;
}

/**
 * Write ZIP data from a set of entries.
 */
export function writeZipEntries(
  entries: ReadonlyMap<string, Uint8Array>,
  options: ZipWriterOptions = {},
): Uint8Array {
  const compressionLevel = normalizeCompressionLevel(options.compressionLevel ?? 6);

  const files: Record<string, Uint8Array> = {};
  for (const [path, bytes] of entries) {
    files[path] = bytes;
  }

  return zipSync(files, { level: compressionLevel });
}
