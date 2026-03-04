/**
 * @file show command - display details for one PDF page
 */

import { buildPdf } from "@aurochs-builder/pdf";
import type { PdfElement, PdfImage, PdfPath, PdfText } from "@aurochs/pdf/domain";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type ElementData =
  | {
      readonly index: number;
      readonly type: "text";
      readonly text: string;
      readonly x: number;
      readonly y: number;
      readonly width: number;
      readonly height: number;
      readonly fontName: string;
      readonly fontSize: number;
    }
  | {
      readonly index: number;
      readonly type: "path";
      readonly operationCount: number;
      readonly paintOp: string;
    }
  | {
      readonly index: number;
      readonly type: "image";
      readonly width: number;
      readonly height: number;
      readonly colorSpace: string;
      readonly bytes: number;
    };

export type ShowData = {
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
  readonly elements: readonly ElementData[];
};

function toTextElementData(index: number, element: PdfText): ElementData {
  return {
    index,
    type: "text",
    text: element.text,
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height,
    fontName: element.baseFont ?? element.fontName,
    fontSize: element.fontSize,
  };
}

function toPathElementData(index: number, element: PdfPath): ElementData {
  return {
    index,
    type: "path",
    operationCount: element.operations.length,
    paintOp: element.paintOp,
  };
}

function toImageElementData(index: number, element: PdfImage): ElementData {
  return {
    index,
    type: "image",
    width: element.width,
    height: element.height,
    colorSpace: element.colorSpace,
    bytes: element.data.length,
  };
}

function toElementData(index: number, element: PdfElement): ElementData {
  if (element.type === "text") {
    return toTextElementData(index, element);
  }
  if (element.type === "path") {
    return toPathElementData(index, element);
  }
  return toImageElementData(index, element);
}

/** Show one 1-indexed page in detail. */
export async function runShow(filePath: string, pageNumber: number): Promise<Result<ShowData>> {
  if (!Number.isInteger(pageNumber) || pageNumber < 1) {
    return error("INVALID_PAGE", `Page number must be a positive integer: ${pageNumber}`);
  }

  try {
    const data = await loadPdfBinary(filePath);
    const document = await buildPdf({
      data,
      parseOptions: { pages: [pageNumber] },
    });

    const page = document.pages[0];
    if (!page) {
      return error("INVALID_PAGE", `Page ${pageNumber} is out of range`);
    }

    const elements = page.elements.map((element, index) => toElementData(index, element));

    return success({
      pageNumber: page.pageNumber,
      width: page.width,
      height: page.height,
      elements,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PDF: ${getErrorMessage(caughtError)}`);
  }
}
