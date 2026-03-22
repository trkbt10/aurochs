/**
 * @file ZipFile adapter for PackageFile
 * Creates a ZipFile interface adapter from PackageFile
 */

import type { PackageFile, ZipFile } from "@aurochs-office/opc";

/**
 * Create a ZipFile adapter from PackageFile
 * This allows existing code that expects ZipFile to work with PackageFile
 * @param file - The PackageFile to wrap
 * @returns A ZipFile-compatible adapter
 */
export function createZipAdapter(file: PackageFile): ZipFile {
  return {
    file(filePath: string) {
      if (!file.exists(filePath)) {
        return null;
      }
      return {
        asText(): string {
          const text = file.readText(filePath);
          if (text === null) {
            return "";
          }
          return text;
        },
        asArrayBuffer(): ArrayBuffer {
          const binary = file.readBinary(filePath);
          if (binary === null) {
            return new ArrayBuffer(0);
          }
          return binary;
        },
      };
    },
    load(): ZipFile {
      // Not supported in this adapter
      throw new Error("ZipFile.load() is not supported in PackageFile adapter");
    },
  };
}
