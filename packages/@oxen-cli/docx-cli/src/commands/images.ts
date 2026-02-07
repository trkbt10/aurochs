/**
 * @file images command - display embedded images
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadDocument } from "./loader";
import type { DocxBlockContent } from "@oxen-office/docx/domain/document";
import type { DocxParagraph } from "@oxen-office/docx/domain/paragraph";
import type { DocxRun } from "@oxen-office/docx/domain/run";
import type { DocxDrawing } from "@oxen-office/docx/domain/drawing";

// =============================================================================
// Types
// =============================================================================

export type ImageJson = {
  readonly index: number;
  readonly type: "inline" | "anchor";
  readonly name?: string;
  readonly description?: string;
  readonly width?: number;
  readonly height?: number;
  readonly embedId?: string;
  readonly linkId?: string;
  readonly position?: {
    readonly horizontal?: string;
    readonly vertical?: string;
  };
  readonly wrap?: string;
};

export type ImagesData = {
  readonly count: number;
  readonly images: readonly ImageJson[];
};

// =============================================================================
// Image Extraction
// =============================================================================

function extractImageFromDrawing(drawing: DocxDrawing, index: number): ImageJson {
  const base: ImageJson = {
    index,
    type: drawing.type,
    name: drawing.docPr?.name,
    description: drawing.docPr?.descr,
    width: drawing.extent?.cx,
    height: drawing.extent?.cy,
    embedId: drawing.pic?.blipFill?.blip?.rEmbed,
    linkId: drawing.pic?.blipFill?.blip?.rLink,
  };

  if (drawing.type === "anchor") {
    const posH = drawing.positionH;
    const posV = drawing.positionV;
    return {
      ...base,
      position: {
        horizontal: posH ? `${posH.relativeFrom}${posH.align ? `:${posH.align}` : ""}` : undefined,
        vertical: posV ? `${posV.relativeFrom}${posV.align ? `:${posV.align}` : ""}` : undefined,
      },
      wrap: drawing.wrap?.type,
    };
  }

  return base;
}

function extractImagesFromRun(run: DocxRun, images: ImageJson[]): void {
  for (const content of run.content) {
    if (content.type === "drawing") {
      images.push(extractImageFromDrawing(content.drawing, images.length));
    }
  }
}

function extractImagesFromParagraph(paragraph: DocxParagraph, images: ImageJson[]): void {
  for (const content of paragraph.content) {
    if (content.type === "run") {
      extractImagesFromRun(content, images);
    } else if (content.type === "hyperlink") {
      for (const run of content.content) {
        extractImagesFromRun(run, images);
      }
    }
  }
}

function extractImagesFromContent(content: readonly DocxBlockContent[], images: ImageJson[]): void {
  for (const block of content) {
    if (block.type === "paragraph") {
      extractImagesFromParagraph(block, images);
    } else if (block.type === "table") {
      for (const row of block.content) {
        for (const cell of row.content) {
          extractImagesFromContent(cell.content, images);
        }
      }
    }
  }
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display embedded images from a DOCX file.
 */
export async function runImages(filePath: string): Promise<Result<ImagesData>> {
  try {
    const doc = await loadDocument(filePath);

    const images: ImageJson[] = [];
    extractImagesFromContent(doc.body.content, images);

    // Also check headers and footers
    if (doc.headers) {
      for (const [, header] of doc.headers) {
        extractImagesFromContent(header.content, images);
      }
    }
    if (doc.footers) {
      for (const [, footer] of doc.footers) {
        extractImagesFromContent(footer.content, images);
      }
    }

    return success({
      count: images.length,
      images,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
