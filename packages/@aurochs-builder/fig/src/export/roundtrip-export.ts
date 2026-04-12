/**
 * @file Explicit roundtrip export
 *
 * For cases where the caller has both the original LoadedFigFile
 * and the modified FigDesignDocument, providing finer control
 * over the roundtrip process.
 */

import { saveFigFile } from "@aurochs/fig/roundtrip";
import type { LoadedFigFile } from "@aurochs/fig/roundtrip";
import type { FigDesignDocument } from "../types/document";
import type { FigExportResult, FigExportOptions } from "./fig-exporter";
import { documentToTree } from "../context/document-to-tree";

/**
 * Export a FigDesignDocument using an explicit LoadedFigFile for roundtrip.
 *
 * Use this when you want to control which loaded file provides the
 * base schema, rather than relying on the document's internal _loaded.
 */
export async function exportFigRoundtrip(
  loaded: LoadedFigFile,
  doc: FigDesignDocument,
  options?: FigExportOptions,
): Promise<FigExportResult> {
  const treeResult = documentToTree(doc);

  const modifiedLoaded: LoadedFigFile = {
    ...loaded,
    nodeChanges: treeResult.nodeChanges,
  };

  const data = await saveFigFile(modifiedLoaded, {
    reencodeSchema: options?.reencodeSchema,
  });

  return { data, size: data.length };
}
