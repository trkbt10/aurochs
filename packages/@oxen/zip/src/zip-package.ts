/**
 * @file ZIP Package - Unified ZIP handling for OPC packages (fflate)
 */

import { readZipEntries } from "./zip-reader";
import { writeZipEntries } from "./zip-writer";
import type { PresentationFileLike, ZipGenerateOptions, ZipPackage } from "./types";

// =============================================================================
// Constants
// =============================================================================

const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

/**
 * Binary file extensions in OPC packages.
 * These files should be read/written as binary, not text.
 */
const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".tif",
  ".wmf",
  ".emf",
  ".svg",
  ".bin",
  ".ole",
  ".vml",
  ".wav",
  ".mp3",
  ".mp4",
  ".m4a",
  ".wma",
  ".wmv",
  ".avi",
]);

// =============================================================================
// Internal Helpers
// =============================================================================

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

function u8ToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
}

function toUint8Array(content: ArrayBuffer | Uint8Array): Uint8Array {
  if (content instanceof Uint8Array) {
    const isWholeBuffer =
      content.byteOffset === 0 && content.byteLength === content.buffer.byteLength;
    if (isWholeBuffer) {
      return content;
    }
    return content.slice();
  }
  return new Uint8Array(content);
}

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Load a ZIP package from a buffer.
 *
 * Kept async for backward compatibility with the former JSZip implementation.
 */
export async function loadZipPackage(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ZipPackage> {
  const entries = readZipEntries(buffer);
  return Promise.resolve(createZipPackageFromEntries(entries));
}

/**
 * Create an empty ZIP package.
 */
export function createEmptyZipPackage(): ZipPackage {
  return createZipPackageFromEntries(new Map());
}

// =============================================================================
// ZipPackage Implementation
// =============================================================================

function createZipPackageFromEntries(initialEntries: ReadonlyMap<string, Uint8Array>): ZipPackage {
  const entries = new Map<string, Uint8Array>(initialEntries);
  const textCache = new Map<string, string>();

  const pkg: ZipPackage = {
    // Read operations
    readText(path: string): string | null {
      const cached = textCache.get(path);
      if (cached !== undefined) {
        return cached;
      }

      const bytes = entries.get(path);
      if (!bytes) {
        return null;
      }

      const text = textDecoder.decode(bytes);
      textCache.set(path, text);
      return text;
    },

    readBinary(path: string): ArrayBuffer | null {
      const bytes = entries.get(path);
      if (!bytes) {
        return null;
      }
      return u8ToArrayBuffer(bytes);
    },

    exists(path: string): boolean {
      return entries.has(path);
    },

    listFiles(): readonly string[] {
      return Array.from(entries.keys());
    },

    // Write operations
    writeText(path: string, content: string): void {
      const bytes = textEncoder.encode(content);
      entries.set(path, bytes);
      textCache.set(path, content);
    },

    writeBinary(path: string, content: ArrayBuffer | Uint8Array): void {
      entries.set(path, toUint8Array(content));
      textCache.delete(path);
    },

    remove(path: string): void {
      entries.delete(path);
      textCache.delete(path);
    },

    // Export operations
    async toBlob(options: ZipGenerateOptions = {}): Promise<Blob> {
      const compressionLevel = options.compressionLevel ?? 6;
      const mimeType = options.mimeType ?? PPTX_MIME_TYPE;
      const bytes = writeZipEntries(entries, { compressionLevel });
      return new Blob([bytes as BlobPart], { type: mimeType });
    },

    async toArrayBuffer(options: ZipGenerateOptions = {}): Promise<ArrayBuffer> {
      const compressionLevel = options.compressionLevel ?? 6;
      const bytes = writeZipEntries(entries, { compressionLevel });
      return u8ToArrayBuffer(bytes);
    },

    // Conversion
    asPresentationFile(): PresentationFileLike {
      return {
        readText: (path) => pkg.readText(path),
        readBinary: (path) => pkg.readBinary(path),
        exists: (path) => pkg.exists(path),
        listFiles: () => pkg.listFiles(),
      };
    },
  };

  return pkg;
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Check if a file path is a binary file based on extension.
 */
export function isBinaryFile(path: string): boolean {
  const lowerPath = path.toLowerCase();
  const lastDot = lowerPath.lastIndexOf(".");
  if (lastDot === -1) {
    return false;
  }
  const ext = lowerPath.slice(lastDot);
  return BINARY_EXTENSIONS.has(ext);
}
