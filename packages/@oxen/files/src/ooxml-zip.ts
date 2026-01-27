/**
 * @file OOXML zip access helpers
 *
 * Wraps ZipPackage to provide a simple `(path) => text` accessor for OOXML packages.
 */

import { loadZipPackage } from "@oxen/zip";

export type GetZipTextFileContent = (path: string) => Promise<string | undefined>;

/**
 * Create a function that reads text entries from an OOXML zip byte array.
 */
export async function createGetZipTextFileContentFromBytes(
  bytes: ArrayBuffer | Uint8Array,
): Promise<GetZipTextFileContent> {
  const pkg = await loadZipPackage(bytes);
  return async (path: string) => {
    return pkg.readText(path) ?? undefined;
  };
}
