/**
 * @file ZIP Builder for PPTX export
 *
 * Wraps JSZip to provide a simple interface for building PPTX files.
 * Supports copying from source ZIP and adding/updating entries.
 */

import JSZip from "jszip";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for ZIP generation
 */
export type ZipGenerateOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
  /** MIME type for the blob (default: "application/vnd.openxmlformats-officedocument.presentationml.presentation") */
  readonly mimeType?: string;
};

/**
 * Entry to add to the ZIP
 */
export type ZipEntryInput =
  | { type: "text"; path: string; content: string }
  | { type: "binary"; path: string; content: ArrayBuffer | Uint8Array };

// =============================================================================
// ZipBuilder
// =============================================================================

/**
 * Builder for creating PPTX ZIP files.
 *
 * @example
 * ```typescript
 * const builder = await ZipBuilder.fromBuffer(originalPptxBuffer);
 * builder.addText("ppt/slides/slide1.xml", updatedXml);
 * const blob = await builder.toBlob();
 * ```
 */
export type ZipBuilder = {
  /**
   * Add or update a text file in the ZIP
   */
  addText(path: string, content: string): void;

  /**
   * Add or update a binary file in the ZIP
   */
  addBinary(path: string, content: ArrayBuffer | Uint8Array): void;

  /**
   * Remove a file from the ZIP
   */
  remove(path: string): void;

  /**
   * Check if a file exists in the ZIP
   */
  exists(path: string): boolean;

  /**
   * Get all file paths in the ZIP
   */
  getPaths(): string[];

  /**
   * Generate the ZIP as a Blob
   */
  toBlob(options?: ZipGenerateOptions): Promise<Blob>;

  /**
   * Generate the ZIP as an ArrayBuffer
   */
  toArrayBuffer(options?: ZipGenerateOptions): Promise<ArrayBuffer>;
};

/**
 * Create a new empty ZipBuilder
 */
export function createZipBuilder(): ZipBuilder {
  return createZipBuilderFromJSZip(new JSZip());
}

/**
 * Create a ZipBuilder from an existing ZIP buffer
 */
export async function createZipBuilderFromBuffer(
  buffer: ArrayBuffer | Uint8Array,
): Promise<ZipBuilder> {
  const jszip = await JSZip.loadAsync(buffer);
  return createZipBuilderFromJSZip(jszip);
}

/**
 * Create a ZipBuilder from an existing Blob
 */
export async function createZipBuilderFromBlob(blob: Blob): Promise<ZipBuilder> {
  const buffer = await blob.arrayBuffer();
  return createZipBuilderFromBuffer(buffer);
}

// =============================================================================
// Internal Implementation
// =============================================================================

const PPTX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.presentationml.presentation";

function createZipBuilderFromJSZip(jszip: JSZip): ZipBuilder {
  return {
    addText(path: string, content: string): void {
      jszip.file(path, content);
    },

    addBinary(path: string, content: ArrayBuffer | Uint8Array): void {
      jszip.file(path, content);
    },

    remove(path: string): void {
      jszip.remove(path);
    },

    exists(path: string): boolean {
      return jszip.file(path) !== null;
    },

    getPaths(): string[] {
      return Object.keys(jszip.files).filter((path) => !jszip.files[path].dir);
    },

    async toBlob(options: ZipGenerateOptions = {}): Promise<Blob> {
      const compressionLevel = options.compressionLevel ?? 6;
      const mimeType = options.mimeType ?? PPTX_MIME_TYPE;

      return jszip.generateAsync({
        type: "blob",
        mimeType,
        compression: compressionLevel > 0 ? "DEFLATE" : "STORE",
        compressionOptions: { level: compressionLevel },
      });
    },

    async toArrayBuffer(options: ZipGenerateOptions = {}): Promise<ArrayBuffer> {
      const compressionLevel = options.compressionLevel ?? 6;

      return jszip.generateAsync({
        type: "arraybuffer",
        compression: compressionLevel > 0 ? "DEFLATE" : "STORE",
        compressionOptions: { level: compressionLevel },
      });
    },
  };
}
