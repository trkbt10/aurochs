/**
 * @file Fig design document creation from various sources
 *
 * Entry points for creating a FigDesignDocument from:
 * - A raw buffer (file bytes)
 * - A pre-loaded LoadedFigFile (roundtrip module)
 * - Scratch (empty document)
 */

import { loadFigFile } from "@aurochs/fig/roundtrip";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import { buildNodeTree } from "@aurochs/fig/parser";
import type { FigDesignDocument, FigPage } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY, toPageId } from "@aurochs/fig/domain";
import { treeToDocument } from "./tree-to-document";

// =============================================================================
// From Loaded File
// =============================================================================

/**
 * Create a FigDesignDocument from a LoadedFigFile.
 *
 * Use this when you already have a loaded file (e.g., from loadFigFile()).
 */
export function createFigDesignDocumentFromLoaded(loaded: LoadedFigFile): FigDesignDocument {
  const tree = buildNodeTree(loaded.nodeChanges);
  return treeToDocument(tree, loaded);
}

// =============================================================================
// From Buffer
// =============================================================================

/**
 * Create a FigDesignDocument from a raw .fig file buffer.
 *
 * This is the primary entry point for loading .fig files.
 * Internally loads the file via roundtrip (preserving schema for re-export)
 * and converts the node tree to the high-level document model.
 */
export async function createFigDesignDocument(buffer: Uint8Array): Promise<FigDesignDocument> {
  const loaded = await loadFigFile(buffer);
  return createFigDesignDocumentFromLoaded(loaded);
}

// =============================================================================
// Empty Document
// =============================================================================

/**
 * Create an empty FigDesignDocument with a single blank page.
 *
 * Use this when creating a new .fig file from scratch.
 */
export function createEmptyFigDesignDocument(pageName = "Page 1"): FigDesignDocument {
  const pageId = toPageId("0:1");
  const page: FigPage = {
    id: pageId,
    name: pageName,
    backgroundColor: DEFAULT_PAGE_BACKGROUND,
    children: [],
  };

  return {
    pages: [page],
    components: new Map(),
    images: new Map(),
    blobs: [],
    metadata: null,
    styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  };
}
