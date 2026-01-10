/**
 * @file PPTX Exporter
 *
 * Main API for exporting PresentationDocument to PPTX format.
 * Phase 1 (MVP): Simple pass-through - exports the original PPTX with updated XML.
 */

import type { PresentationDocument } from "../app/presentation-document";
import type { PresentationFile } from "../domain";
import { serializeDocument } from "../../xml";
import { createZipBuilder, createZipBuilderFromBuffer, type ZipBuilder } from "./zip-builder";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for PPTX export
 */
export type ExportOptions = {
  /** Compression level (0-9, default: 6) */
  readonly compressionLevel?: number;
};

/**
 * Result of PPTX export
 */
export type ExportResult = {
  /** Generated PPTX as Blob */
  readonly blob: Blob;
  /** Size in bytes */
  readonly size: number;
};

// =============================================================================
// Main Export Function
// =============================================================================

/**
 * Export a PresentationDocument to PPTX format.
 *
 * Phase 1 (MVP): Passes through the original PPTX, updating slide XML from apiSlide.content.
 *
 * @example
 * ```typescript
 * const result = await exportPptx(document);
 * // Download the file
 * const url = URL.createObjectURL(result.blob);
 * const a = document.createElement("a");
 * a.href = url;
 * a.download = "presentation.pptx";
 * a.click();
 * ```
 */
export async function exportPptx(
  doc: PresentationDocument,
  options: ExportOptions = {},
): Promise<ExportResult> {
  // Validate that we have a source presentation file
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  // Create a ZIP builder from the source
  const builder = await createBuilderFromPresentationFile(doc.presentationFile);

  // Update slide XMLs from apiSlide.content
  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;
      const xml = serializeDocument(slideWithId.apiSlide.content, {
        declaration: true,
        standalone: true,
      });
      builder.addText(slidePath, xml);
    }
  }

  // Generate the PPTX
  const blob = await builder.toBlob({
    compressionLevel: options.compressionLevel,
  });

  return {
    blob,
    size: blob.size,
  };
}

/**
 * Export a PresentationDocument to PPTX as ArrayBuffer.
 *
 * Useful for Node.js environments or when you need to process the buffer further.
 */
export async function exportPptxAsBuffer(
  doc: PresentationDocument,
  options: ExportOptions = {},
): Promise<ArrayBuffer> {
  if (!doc.presentationFile) {
    throw new Error("PresentationDocument must have a presentationFile for export");
  }

  const builder = await createBuilderFromPresentationFile(doc.presentationFile);

  for (const slideWithId of doc.slides) {
    if (slideWithId.apiSlide) {
      const slidePath = `ppt/slides/${slideWithId.apiSlide.filename}.xml`;
      const xml = serializeDocument(slideWithId.apiSlide.content, {
        declaration: true,
        standalone: true,
      });
      builder.addText(slidePath, xml);
    }
  }

  return builder.toArrayBuffer({
    compressionLevel: options.compressionLevel,
  });
}

// =============================================================================
// Internal Functions
// =============================================================================

/**
 * Create a ZipBuilder by reading all files from PresentationFile.
 *
 * Uses listFiles() if available, otherwise throws an error.
 * This ensures we copy ALL files from the original PPTX without guessing.
 */
async function createBuilderFromPresentationFile(file: PresentationFile): Promise<ZipBuilder> {
  // Require listFiles() for proper export
  if (!file.listFiles) {
    throw new Error(
      "PresentationFile must implement listFiles() for export. " +
        "Ensure the file was loaded using loadPptxFromBuffer or similar.",
    );
  }

  const paths = file.listFiles();
  const builder = createZipBuilder();

  for (const path of paths) {
    // Determine if this is a binary file based on extension
    if (isBinaryFile(path)) {
      const content = file.readBinary(path);
      if (content) {
        builder.addBinary(path, content);
      }
    } else {
      const content = file.readText(path);
      if (content) {
        builder.addText(path, content);
      }
    }
  }

  return builder;
}

/**
 * Check if a file path is a binary file (vs XML/text)
 */
function isBinaryFile(path: string): boolean {
  const binaryExtensions = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".bmp",
    ".wmf",
    ".emf",
    ".svg",
    ".bin",
    ".ole",
    ".vml",
  ];
  const lowerPath = path.toLowerCase();
  return binaryExtensions.some((ext) => lowerPath.endsWith(ext));
}
