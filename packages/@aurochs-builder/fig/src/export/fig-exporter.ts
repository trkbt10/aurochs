/**
 * @file Fig export pipeline
 *
 * Exports a FigDesignDocument to .fig binary format.
 *
 * For documents loaded from existing .fig files (_loaded present),
 * uses the roundtrip strategy to preserve schema compatibility.
 * For fresh documents, builds from scratch using the builder API.
 */

import { saveFigFile } from "@aurochs/fig/roundtrip";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import type { FigDesignDocument } from "@aurochs/fig/domain";
import { documentToTree } from "../context/document-to-tree";

// =============================================================================
// Types
// =============================================================================

/**
 * Options for exporting a .fig file.
 */
export type FigExportOptions = {
  /** Compression level for the output ZIP (1-9, default: 6) */
  readonly compressionLevel?: number;
  /** Re-encode the Kiwi schema instead of preserving original bytes (default: false) */
  readonly reencodeSchema?: boolean;
};

/**
 * Result of a .fig export operation.
 */
export type FigExportResult = {
  /** The .fig file as binary data */
  readonly data: Uint8Array;
  /** Size in bytes */
  readonly size: number;
};

// =============================================================================
// Export
// =============================================================================

/**
 * Export a FigDesignDocument to .fig binary format.
 *
 * This is the primary export function. It automatically detects whether
 * the document was loaded from an existing file (roundtrip) or created
 * from scratch, and uses the appropriate strategy.
 */
export async function exportFig(
  doc: FigDesignDocument,
  options?: FigExportOptions,
): Promise<FigExportResult> {
  if (doc._loaded) {
    return exportRoundtrip(doc, doc._loaded, options);
  }
  return exportFresh(doc, options);
}

// =============================================================================
// Roundtrip Export
// =============================================================================

/**
 * Export using the roundtrip strategy (preserving original schema).
 */
async function exportRoundtrip(
  doc: FigDesignDocument,
  loaded: LoadedFigFile,
  options?: FigExportOptions,
): Promise<FigExportResult> {
  // Convert document modifications back to nodeChanges
  const treeResult = documentToTree(doc);

  // Create a modified copy of the loaded file
  const modifiedLoaded: LoadedFigFile = {
    ...loaded,
    nodeChanges: treeResult.nodeChanges,
  };

  // Save using original schema for compatibility
  const data = await saveFigFile(modifiedLoaded, {
    reencodeSchema: options?.reencodeSchema,
  });

  return { data, size: data.length };
}

// =============================================================================
// Fresh Export
// =============================================================================

/**
 * Export a fresh document (not loaded from existing file).
 *
 * Creates a minimal LoadedFigFile structure and delegates to saveFigFile.
 * This produces a valid .fig file that can be opened in Figma.
 */
async function exportFresh(
  doc: FigDesignDocument,
  _options?: FigExportOptions,
): Promise<FigExportResult> {
  // Build nodeChanges from scratch
  const treeResult = documentToTree(doc);

  // Create a minimal LoadedFigFile for saving
  // We need a schema - use the minimal Figma schema
  const minimalLoaded: LoadedFigFile = {
    schema: { definitions: [] },
    compressedSchema: new Uint8Array(0),
    version: "0",
    nodeChanges: treeResult.nodeChanges,
    blobs: treeResult.blobs,
    images: doc.images,
    metadata: doc.metadata,
    thumbnail: null,
    messageHeader: {
      type: { value: 0, name: "FULL_DOCUMENT" },
      sessionID: 1,
      ackID: 0,
    },
  };

  const data = await saveFigFile(minimalLoaded, {
    reencodeSchema: true,
    metadata: doc.metadata ?? undefined,
  });

  return { data, size: data.length };
}
