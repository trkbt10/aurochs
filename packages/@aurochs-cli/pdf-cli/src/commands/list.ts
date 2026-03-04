/**
 * @file list command - list pages with summary information
 */

import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfElement } from "@aurochs/pdf/domain";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PageListItem = {
  readonly number: number;
  readonly width: number;
  readonly height: number;
  readonly elementCount: number;
  readonly textCount: number;
  readonly pathCount: number;
  readonly imageCount: number;
};

export type ListData = {
  readonly pages: readonly PageListItem[];
};

function countByType(elements: readonly PdfElement[]): Readonly<{
  textCount: number;
  pathCount: number;
  imageCount: number;
}> {
  const textCount = elements.filter((element) => element.type === "text").length;
  const pathCount = elements.filter((element) => element.type === "path").length;
  const imageCount = elements.filter((element) => element.type === "image").length;
  return { textCount, pathCount, imageCount };
}

/** List PDF pages with element counts. */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const data = await loadPdfBinary(filePath);
    const document = await buildPdf({ data });

    const pages = document.pages.map((page) => {
      const counts = countByType(page.elements);
      return {
        number: page.pageNumber,
        width: page.width,
        height: page.height,
        elementCount: page.elements.length,
        textCount: counts.textCount,
        pathCount: counts.pathCount,
        imageCount: counts.imageCount,
      };
    });

    return success({ pages });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PDF: ${getErrorMessage(caughtError)}`);
  }
}
