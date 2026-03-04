/**
 * @file preview command - render PDF pages to SVG
 */

import { getPdfPageCount } from "@aurochs/pdf";
import { renderPdfSourcePageToSvg, renderPdfSourceToSvgs } from "@aurochs-renderer/pdf";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PreviewPage = {
  readonly number: number;
  readonly svg: string;
};

export type PreviewData = {
  readonly format: "svg";
  readonly pages: readonly PreviewPage[];
};

export type PreviewOptions = {
  readonly width?: number;
  readonly height?: number;
  readonly backgroundColor?: string;
};

function validateOptionalDimension(value: number | undefined, name: string): void {
  if (value === undefined) {
    return;
  }
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

/** Render one page or all pages as SVG. */
export async function runPreview(
  filePath: string,
  pageNumber?: number,
  options: PreviewOptions = {},
): Promise<Result<PreviewData>> {
  if (pageNumber !== undefined && (!Number.isInteger(pageNumber) || pageNumber < 1)) {
    return error("INVALID_PAGE", `Page number must be a positive integer: ${pageNumber}`);
  }

  try {
    validateOptionalDimension(options.width, "width");
    validateOptionalDimension(options.height, "height");

    const data = await loadPdfBinary(filePath);
    const pageCount = await getPdfPageCount(data);

    if (pageNumber !== undefined && pageNumber > pageCount) {
      return error("INVALID_PAGE", `Page ${pageNumber} is out of range (1-${pageCount})`);
    }

    const renderOptions = {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor,
    };

    if (pageNumber !== undefined) {
      const svg = await renderPdfSourcePageToSvg({
        data,
        pageNumber,
        renderOptions,
      });

      return success({
        format: "svg",
        pages: [{ number: pageNumber, svg }],
      });
    }

    const svgs = await renderPdfSourceToSvgs({ data, renderOptions });
    const pages = svgs.map((svg, index) => ({ number: index + 1, svg }));

    return success({
      format: "svg",
      pages,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("RENDER_ERROR", `Failed to render PDF: ${getErrorMessage(caughtError)}`);
  }
}
