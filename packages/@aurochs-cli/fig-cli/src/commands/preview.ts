/**
 * @file preview command - render fig pages to SVG
 */

import { renderCanvas } from "@aurochs-renderer/fig/svg";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadFigFile } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type PreviewPage = {
  readonly number: number;
  readonly name: string;
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

    const loaded = await loadFigFile(filePath);
    const pageCount = loaded.canvases.length;

    if (pageNumber !== undefined && pageNumber > pageCount) {
      return error("INVALID_PAGE", `Page ${pageNumber} is out of range (1-${pageCount})`);
    }

    const renderOptions = {
      width: options.width,
      height: options.height,
      backgroundColor: options.backgroundColor,
      blobs: loaded.parsed.blobs,
      images: loaded.parsed.images,
      symbolMap: loaded.tree.nodeMap,
      normalizeRootTransform: true,
    };

    if (pageNumber !== undefined) {
      const canvas = loaded.canvases[pageNumber - 1]!;
      const result = await renderCanvas(canvas, renderOptions);

      return success({
        format: "svg",
        pages: [{
          number: pageNumber,
          name: canvas.name ?? `Page ${pageNumber}`,
          svg: result.svg,
        }],
      });
    }

    const pages: PreviewPage[] = [];
    for (let i = 0; i < loaded.canvases.length; i++) {
      const canvas = loaded.canvases[i]!;
      const result = await renderCanvas(canvas, renderOptions);
      pages.push({
        number: i + 1,
        name: canvas.name ?? `Page ${i + 1}`,
        svg: result.svg,
      });
    }

    return success({ format: "svg", pages });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("RENDER_ERROR", `Failed to render fig file: ${getErrorMessage(caughtError)}`);
  }
}
