/**
 * @file Shared fig file loader
 *
 * Parses a .fig file and builds the node tree in one step.
 * Multiple commands need both the parsed data and tree structure,
 * so this centralizes the loading pipeline.
 */

import * as fs from "node:fs/promises";
import type { FigNode } from "@aurochs/fig/types";
import {
  parseFigFile,
  buildNodeTree,
  findNodesByType,
  type ParsedFigFile,
  type NodeTreeResult,
} from "@aurochs/fig/parser";

export type LoadedFigFile = {
  /** Raw parsed fig file data (schema, nodeChanges, blobs, images) */
  readonly parsed: ParsedFigFile;
  /** Tree structure with parent-child hierarchy reconstructed */
  readonly tree: NodeTreeResult;
  /** CANVAS nodes representing pages, in document order */
  readonly canvases: readonly FigNode[];
};

/**
 * Load and parse a .fig file, building the full node tree.
 *
 * Pipeline: readFile -> parseFigFile -> buildNodeTree -> extract CANVASes
 */
export async function loadFigFile(filePath: string): Promise<LoadedFigFile> {
  const buffer = await fs.readFile(filePath);
  const data = new Uint8Array(buffer);
  const parsed = await parseFigFile(data);
  const tree = buildNodeTree(parsed.nodeChanges);
  const canvases = findNodesByType(tree.roots, "CANVAS");
  return { parsed, tree, canvases };
}
