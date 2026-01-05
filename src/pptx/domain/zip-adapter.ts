/**
 * @file ZipFile adapter for PresentationFile
 * Creates a ZipFile interface adapter from PresentationFile
 */

import type { PresentationFile, ZipFile } from "./opc";

/**
 * Create a ZipFile adapter from PresentationFile
 * This allows existing code that expects ZipFile to work with PresentationFile
 * @param file - The PresentationFile to wrap
 * @returns A ZipFile-compatible adapter
 */
export function createZipAdapter(file: PresentationFile): ZipFile {
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
      throw new Error("ZipFile.load() is not supported in PresentationFile adapter");
    },
  };
}
