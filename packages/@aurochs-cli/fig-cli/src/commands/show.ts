/**
 * @file show command - display detailed content of one page (CANVAS)
 */

import { getNodeType, safeChildren } from "@aurochs/fig/parser";
import type { FigNode } from "@aurochs/fig/types";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadFigFile } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type NodeData = {
  readonly index: number;
  readonly type: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly textPreview?: string;
  readonly childCount: number;
};

export type ShowData = {
  readonly pageNumber: number;
  readonly name: string;
  readonly nodes: readonly NodeData[];
};

/** Maximum length for text preview in show output. */
const TEXT_PREVIEW_MAX_LENGTH = 100;

function getTextPreview(node: FigNode): string | undefined {
  const characters = node.textData?.characters;
  if (typeof characters !== "string" || characters.length === 0) {
    return undefined;
  }
  if (characters.length > TEXT_PREVIEW_MAX_LENGTH) {
    return `${characters.slice(0, TEXT_PREVIEW_MAX_LENGTH - 3)}...`;
  }
  return characters;
}

function toNodeData(node: FigNode, index: number): NodeData {
  const type = getNodeType(node);
  return {
    index,
    type,
    name: node.name ?? "",
    x: node.transform?.m02 ?? 0,
    y: node.transform?.m12 ?? 0,
    width: node.size?.x ?? 0,
    height: node.size?.y ?? 0,
    textPreview: type === "TEXT" ? getTextPreview(node) : undefined,
    childCount: safeChildren(node).length,
  };
}

/** Show one 1-indexed page in detail. */
export async function runShow(filePath: string, pageNumber: number): Promise<Result<ShowData>> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return error("INVALID_PAGE", `Page number must be a positive integer: ${pageNumber}`);
  }

  try {
    const loaded = await loadFigFile(filePath);
    const canvas = loaded.canvases[pageNumber - 1];

    if (!canvas) {
      return error(
        "INVALID_PAGE",
        `Page ${pageNumber} is out of range (1-${loaded.canvases.length})`,
      );
    }

    const children = safeChildren(canvas);
    const nodes = children.map((child, index) => toNodeData(child, index));

    return success({
      pageNumber,
      name: canvas.name ?? `Page ${pageNumber}`,
      nodes,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse fig file: ${getErrorMessage(caughtError)}`);
  }
}
