import type { Pixels } from "../../ooxml/domain/units";
import type { ResourceResolver } from "../../pptx/domain/resource-resolver";
import type { ColorContext } from "../../pptx/domain/color/context";
import type { Presentation } from "../../pptx/domain";
import type { PresentationDocument, SlideWithId } from "../../pptx/app/presentation-document";
import type { Slide } from "../../pptx/domain/slide/types";
import { openPresentation } from "../../pptx/app/open-presentation";
import { parsePdf } from "../parser/pdf-parser";
import type { PdfPage } from "../domain";
import {
  buildSlideFromPage,
  createPageNumberShape,
  createSlidesWithIds,
  determineSlideSize,
  type SlideSize,
} from "./slide-builder";
import { createBlankPptxPresentationFile } from "./pptx-template";

export type PdfImportOptions = {
  /** インポートするページ番号（1始まり）。省略時は全ページ */
  readonly pages?: readonly number[];
  /** ターゲットスライドサイズ */
  readonly slideSize?: {
    readonly width: Pixels;
    readonly height: Pixels;
  };
  /** フィットモード */
  readonly fit?: "contain" | "cover" | "stretch";
  /** 背景を白に設定するか */
  readonly setWhiteBackground?: boolean;
  /** ページ番号を追加するか */
  readonly addPageNumbers?: boolean;
  /** 進捗通知 */
  readonly onProgress?: (progress: PdfImportProgress) => void;
};

export type PdfImportProgress = {
  readonly currentPage: number;
  readonly totalPages: number;
};

export type PdfImportResult = {
  /** 生成されたプレゼンテーションドキュメント */
  readonly document: PresentationDocument;
  /** インポートされたページ数 */
  readonly pageCount: number;
  /** 各ページの統計情報 */
  readonly pageStats: readonly PageStats[];
};

export type PageStats = {
  readonly pageNumber: number;
  readonly shapeCount: number;
  readonly pathCount: number;
  readonly textCount: number;
  readonly imageCount: number;
};

export class PdfImportError extends Error {
  constructor(
    message: string,
    public readonly code: PdfImportErrorCode,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = "PdfImportError";
  }
}

export type PdfImportErrorCode =
  | "INVALID_PDF"
  | "ENCRYPTED_PDF"
  | "PARSE_ERROR"
  | "CONVERSION_ERROR"
  | "FETCH_ERROR";

/**
 * PDFをインポートしてPresentationDocumentを生成
 */
export async function importPdf(
  buffer: ArrayBuffer | Uint8Array,
  options: PdfImportOptions = {},
): Promise<PdfImportResult> {
  if (!buffer) {
    throw new PdfImportError("buffer is required", "PARSE_ERROR");
  }

  const pdfDoc = await parsePdfOrThrow(buffer, options);
  if (pdfDoc.pages.length === 0) {
    throw new PdfImportError("No pages to import", "PARSE_ERROR");
  }

  const firstPage = pdfDoc.pages[0];
  if (!firstPage) {
    throw new PdfImportError("No pages to import", "PARSE_ERROR");
  }

  const slideSize = determineSlideSizeOrThrow(firstPage, options);

  const slides: Slide[] = [];
  const pageStats: PageStats[] = [];

  for (let pageIndex = 0; pageIndex < pdfDoc.pages.length; pageIndex++) {
    const page = pdfDoc.pages[pageIndex];
    if (!page) {
      continue;
    }
    const baseSlide = buildSlideFromPageOrThrow(page, slideSize, options);

    const slide = options.addPageNumbers
      ? addPageNumber(baseSlide, page.pageNumber, slideSize)
      : baseSlide;

    slides.push(slide);
    pageStats.push(collectPageStats(page, slide));

    options.onProgress?.({
      currentPage: pageIndex + 1,
      totalPages: pdfDoc.pages.length,
    });
  }

  const slidesWithIds = createSlidesWithIds(slides);
  const templateFile = createBlankPptxPresentationFile(slidesWithIds.length, slideSize);
  const templatePresentation = openPresentation(templateFile);
  const slidesWithApi = slidesWithIds.map((slideWithId, index) => ({
    ...slideWithId,
    apiSlide: templatePresentation.getSlide(index + 1),
  }));

  const document = {
    ...createPresentationDocument(slidesWithApi, slideSize),
    presentationFile: templateFile,
  };

  return {
    document,
    pageCount: pdfDoc.pages.length,
    pageStats,
  };
}

/**
 * Fileオブジェクトからインポート
 */
export async function importPdfFromFile(
  file: File,
  options: PdfImportOptions = {},
): Promise<PdfImportResult> {
  if (!file) {
    throw new PdfImportError("file is required", "PARSE_ERROR");
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (error) {
    throw wrapError(error, "PARSE_ERROR");
  }

  return importPdf(buffer, options);
}

/**
 * URLからインポート
 */
export async function importPdfFromUrl(
  url: string,
  options: PdfImportOptions = {},
): Promise<PdfImportResult> {
  if (typeof url !== "string" || url.length === 0) {
    throw new PdfImportError("url is required", "FETCH_ERROR");
  }

  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw wrapError(error, "FETCH_ERROR");
  }

  if (!response.ok) {
    throw new PdfImportError(
      `Failed to fetch PDF: ${response.status} ${response.statusText}`,
      "FETCH_ERROR",
    );
  }

  let buffer: ArrayBuffer;
  try {
    buffer = await response.arrayBuffer();
  } catch (error) {
    throw wrapError(error, "FETCH_ERROR");
  }

  return importPdf(buffer, options);
}

function determineSlideSizeOrThrow(firstPage: PdfPage, options: PdfImportOptions): SlideSize {
  try {
    if (options.slideSize) {
      return determineSlideSize(firstPage.width, firstPage.height, options.slideSize);
    }
    return determineSlideSize(firstPage.width, firstPage.height);
  } catch (error) {
    throw wrapError(error, "CONVERSION_ERROR");
  }
}

async function parsePdfOrThrow(
  buffer: ArrayBuffer | Uint8Array,
  options: PdfImportOptions,
) {
  try {
    return await parsePdf(buffer, options.pages ? { pages: options.pages } : {});
  } catch (error) {
    throw wrapError(error, detectPdfParseErrorCode(error));
  }
}

function detectPdfParseErrorCode(error: unknown): PdfImportErrorCode {
  const message = error instanceof Error ? error.message : String(error);
  const lower = message.toLowerCase();

  if (lower.includes("encrypted") || lower.includes("password")) {
    return "ENCRYPTED_PDF";
  }

  if (lower.includes("no pdf header") || lower.includes("failed to parse") || lower.includes("invalid pdf")) {
    return "INVALID_PDF";
  }

  return "PARSE_ERROR";
}

function buildSlideFromPageOrThrow(page: PdfPage, slideSize: SlideSize, options: PdfImportOptions): Slide {
  try {
    return buildSlideFromPage(page, {
      slideWidth: slideSize.width,
      slideHeight: slideSize.height,
      fit: options.fit ?? "contain",
      setBackground: options.setWhiteBackground ?? true,
      backgroundColor: { r: 255, g: 255, b: 255 },
    });
  } catch (error) {
    throw wrapError(error, "CONVERSION_ERROR");
  }
}

function addPageNumber(slide: Slide, pageNumber: number, slideSize: SlideSize): Slide {
  const pageNumberShape = createPageNumberShape(pageNumber, slideSize, `pageNum-${pageNumber}`);
  return {
    ...slide,
    shapes: [...slide.shapes, pageNumberShape],
  };
}

function createPresentationDocument(
  slides: readonly SlideWithId[],
  slideSize: { readonly width: Pixels; readonly height: Pixels },
): PresentationDocument {
  const presentation: Presentation = {
    slideSize: {
      width: slideSize.width,
      height: slideSize.height,
    },
  };

  return {
    presentation,
    slides,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
    colorContext: createEmptyColorContext(),
    resources: createDataUrlResourceResolver(),
  };
}

/**
 * Create a resource resolver that handles data: URLs directly.
 *
 * PDF-imported images use data: URLs as resourceIds.
 * This resolver returns them as-is for rendering.
 */
function createDataUrlResourceResolver(): ResourceResolver {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    resolve: (resourceId: string) => {
      // Data URLs are self-contained - return them directly
      if (resourceId.startsWith("data:")) {
        return resourceId;
      }
      return undefined;
    },
    getMimeType: (id: string) => {
      // Extract MIME type from data URL if present
      if (id.startsWith("data:")) {
        const match = id.match(/^data:([^;,]+)/);
        return match?.[1];
      }
      return undefined;
    },
    getFilePath: () => undefined,
    readFile: () => null,
  };
}

function createEmptyColorContext(): ColorContext {
  return { colorScheme: {}, colorMap: {} };
}

function collectPageStats(page: PdfPage, slide: Slide): PageStats {
  let pathCount = 0;
  let textCount = 0;
  let imageCount = 0;

  for (const elem of page.elements) {
    switch (elem.type) {
      case "path":
        pathCount++;
        break;
      case "text":
        textCount++;
        break;
      case "image":
        imageCount++;
        break;
    }
  }

  return {
    pageNumber: page.pageNumber,
    shapeCount: slide.shapes.length,
    pathCount,
    textCount,
    imageCount,
  };
}

/**
 * エラーをラップ
 */
function wrapError(error: unknown, code: PdfImportErrorCode): PdfImportError {
  if (error instanceof PdfImportError) {
    return error;
  }
  if (error instanceof Error) {
    return new PdfImportError(error.message, code, error);
  }
  return new PdfImportError(String(error), code);
}
