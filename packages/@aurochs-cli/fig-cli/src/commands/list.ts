/**
 * @file list command - list pages (CANVAS nodes) with summary
 */

import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadFigFile } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PageListItem = {
  readonly number: number;
  readonly name: string;
  readonly childCount: number;
  readonly nodeTypeCounts: Readonly<Record<string, number>>;
};

export type ListData = {
  readonly pages: readonly PageListItem[];
};

/**
 * Count all descendant nodes by type within a subtree.
 * This provides an overview of page content (how many frames, text nodes, etc.).
 */
function countNodeTypes(node: FigNode): Record<string, number> {
  const counts: Record<string, number> = {};

  function walk(n: FigNode): void {
    const type = getNodeType(n);
    counts[type] = (counts[type] ?? 0) + 1;
    for (const child of safeChildren(n)) {
      walk(child);
    }
  }

  for (const child of safeChildren(node)) {
    walk(child);
  }

  return counts;
}

/** List fig pages with element counts. */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const loaded = await loadFigFile(filePath);

    const pages = loaded.canvases.map((canvas, index) => {
      const children = safeChildren(canvas);
      return {
        number: index + 1,
        name: canvas.name ?? `Page ${index + 1}`,
        childCount: children.length,
        nodeTypeCounts: countNodeTypes(canvas),
      };
    });

    return success({ pages });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse fig file: ${getErrorMessage(caughtError)}`);
  }
}
