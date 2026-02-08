/**
 * @file ZipFile adapter utilities
 *
 * Adapters to bridge between different zip interface types.
 */

import type { ZipFile, ZipEntry } from "./types";

/**
 * Interface for a package that provides read access to text and binary files.
 * Matches the ZipPackage interface from @aurochs/zip.
 */
type ReadablePackage = {
  readonly readText: (path: string) => string | null;
  readonly readBinary: (path: string) => ArrayBuffer | null;
};

/**
 * Create a ZipFile adapter from a readable package.
 * Bridges ZipPackage (from @aurochs/zip) to ZipFile (OPC interface).
 */
export function createZipFileAdapter(pkg: ReadablePackage): ZipFile {
  return {
    file(path: string): ZipEntry | null {
      const text = pkg.readText(path);
      const binary = pkg.readBinary(path);

      if (text === null && binary === null) {
        return null;
      }

      return {
        asText(): string {
          return text ?? "";
        },
        asArrayBuffer(): ArrayBuffer {
          return binary ?? new ArrayBuffer(0);
        },
      };
    },
  };
}
