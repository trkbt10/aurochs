/**
 * @file extract command - extract text from PDF pages
 */

import { buildPdf } from "@aurochs-builder/pdf";
import { getPdfPageCount } from "@aurochs/pdf";
import type { PdfPage, PdfText } from "@aurochs/pdf/domain";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { parseOptionalPageSelection } from "./page-selection";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PageTextData = {
  readonly number: number;
  readonly textItemCount: number;
  readonly lineCount: number;
  readonly text: string;
};

export type ExtractData = {
  readonly pages: readonly PageTextData[];
};

export type ExtractOptions = {
  readonly pages?: string;
};

function isTextElement(value: PdfPage["elements"][number]): value is PdfText {
  return value.type === "text";
}

function buildPageTextData(page: PdfPage): PageTextData {
  const lines = page.elements
    .filter(isTextElement)
    .map((element) => element.text.trim())
    .filter((text) => text.length > 0);

  return {
    number: page.pageNumber,
    textItemCount: lines.length,
    lineCount: lines.length,
    text: lines.join("\n"),
  };
}

async function buildDocumentForExtract(data: Uint8Array, selectedPages: readonly number[] | undefined) {
  if (selectedPages === undefined) {
    return await buildPdf({
      data,
      buildOptions: {
        includeText: true,
        includePaths: false,
      },
    });
  }
  return await buildPdf({
    data,
    parseOptions: { pages: selectedPages },
    buildOptions: {
      includeText: true,
      includePaths: false,
    },
  });
}

/** Extract page text with optional page selection. */
export async function runExtract(filePath: string, options: ExtractOptions = {}): Promise<Result<ExtractData>> {
  try {
    const data = await loadPdfBinary(filePath);
    const pageCount = await getPdfPageCount(data);

    const selectedPages = parseOptionalPageSelection(options.pages, pageCount);

    const document = await buildDocumentForExtract(data, selectedPages);

    const pages = document.pages.map(buildPageTextData);
    return success({ pages });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PDF: ${getErrorMessage(caughtError)}`);
  }
}
