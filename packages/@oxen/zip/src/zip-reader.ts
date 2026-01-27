/**
 * @file ZIP reader (fflate)
 */

import { unzipSync } from "fflate";

export type ZipEntries = ReadonlyMap<string, Uint8Array>;

function toUint8Array(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  return buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
}

/**
 * Read all files from a ZIP buffer.
 */
export function readZipEntries(buffer: ArrayBuffer | Uint8Array): ZipEntries {
  const files = unzipSync(toUint8Array(buffer));
  const entries = new Map<string, Uint8Array>();

  for (const [path, bytes] of Object.entries(files)) {
    if (!path) {
      continue;
    }
    entries.set(path, bytes);
  }

  return entries;
}
