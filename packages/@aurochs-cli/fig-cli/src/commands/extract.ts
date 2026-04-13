/**
 * @file extract command - extract text from TEXT nodes
 */

import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadFigFile } from "./loader";
import { parseOptionalPageSelection } from "./page-selection";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PageTextData = {
  readonly number: number;
  readonly name: string;
  readonly textItemCount: number;
  readonly text: string;
};

export type ExtractData = {
  readonly pages: readonly PageTextData[];
};

export type ExtractOptions = {
  readonly pages?: string;
};

/**
 * Collect text content from all TEXT nodes under a given node.
 * Walks the tree depth-first, extracting textData.characters from each TEXT node.
 */
function collectTextFromNode(node: FigNode): readonly string[] {
  const texts: string[] = [];

  function walk(n: FigNode): void {
    if (getNodeType(n) === "TEXT") {
      const characters = n.textData?.characters;
      if (typeof characters === "string" && characters.length > 0) {
        texts.push(characters);
      }
    }
    for (const child of safeChildren(n)) {
      walk(child);
    }
  }

  walk(node);
  return texts;
}

function selectCanvases(
  canvases: readonly FigNode[],
  selectedPages: readonly number[] | undefined,
): { index: number; canvas: FigNode }[] {
  if (selectedPages) {
    return selectedPages.map((num) => ({ index: num - 1, canvas: canvases[num - 1]! }));
  }
  return canvases.map((canvas, index) => ({ index, canvas }));
}

/** Extract text from fig pages with optional page selection. */
export async function runExtract(filePath: string, options: ExtractOptions = {}): Promise<Result<ExtractData>> {
  try {
    const loaded = await loadFigFile(filePath);
    const pageCount = loaded.canvases.length;

    const selectedPages = parseOptionalPageSelection(options.pages, pageCount);

    const canvases = selectCanvases(loaded.canvases, selectedPages);

    const pages = canvases.map(({ index, canvas }) => {
      const texts = collectTextFromNode(canvas);
      return {
        number: index + 1,
        name: canvas.name ?? `Page ${index + 1}`,
        textItemCount: texts.length,
        text: texts.join("\n"),
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
