/**
 * @file src/pdf/importer/pdf-importer.ts
 */

import type { Pixels } from "@oxen/ooxml/domain/units";
import type { ResourceResolver } from "@oxen/pptx/domain/resource-resolver";
import type { ColorContext } from "@oxen/pptx/domain/color/context";
import type { Presentation } from "@oxen/pptx/domain";
import type { PresentationDocument, SlideWithId } from "@oxen/pptx/app/presentation-document";
import type { Slide } from "@oxen/pptx/domain/slide/types";
import { openPresentation } from "@oxen/pptx/app/open-presentation";
import { parsePdf } from "../parser/core/pdf-parser";
import type { PdfPage } from "../domain";
import { PdfLoadError } from "../parser/core/pdf-load-error";
import {
  buildSlideFromPage,
  createPageNumberShape,
  createSlidesWithIds,
  determineSlideSize,
  type SlideSize,
} from "./slide-builder";
import { createBlankPptxPresentationFile } from "./pptx-template";
import type { PdfEmbeddedFont } from "../domain";
import { generateFontFaceStyle } from "../domain/font/font-css-generator";
import type { EmbeddedFontData } from "@oxen/pptx/app/presentation-document";
import type { PdfGroupingStrategyOptions } from "../converter/grouping-strategy";

const DEFAULT_GROUPING: PdfGroupingStrategyOptions = { preset: "text" } as const;

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
  /** PDF → PPTX 変換時のグルーピング戦略 */
  readonly grouping?: PdfGroupingStrategyOptions;
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

/** Error thrown when PDF import fails. */
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

export type PdfImportErrorCode = "INVALID_PDF" | "ENCRYPTED_PDF" | "PARSE_ERROR" | "CONVERSION_ERROR" | "FETCH_ERROR";

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

    const slide = addPageNumberIfEnabled(baseSlide, page.pageNumber, slideSize, options.addPageNumbers ?? false);

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
    ...createPresentationDocument(slidesWithApi, slideSize, pdfDoc.embeddedFonts),
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
export async function importPdfFromFile(file: File, options: PdfImportOptions = {}): Promise<PdfImportResult> {
  if (!file) {
    throw new PdfImportError("file is required", "PARSE_ERROR");
  }

  const buffer = await file.arrayBuffer().catch((error) => {
    throw wrapError(error, "PARSE_ERROR");
  });

  return importPdf(buffer, options);
}

/**
 * URLからインポート
 */
export async function importPdfFromUrl(url: string, options: PdfImportOptions = {}): Promise<PdfImportResult> {
  if (typeof url !== "string" || url.length === 0) {
    throw new PdfImportError("url is required", "FETCH_ERROR");
  }

  const response = await fetch(url).catch((error) => {
    throw wrapError(error, "FETCH_ERROR");
  });

  if (!response.ok) {
    throw new PdfImportError(`Failed to fetch PDF: ${response.status} ${response.statusText}`, "FETCH_ERROR");
  }

  const buffer = await response.arrayBuffer().catch((error) => {
    throw wrapError(error, "FETCH_ERROR");
  });

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

async function parsePdfOrThrow(buffer: ArrayBuffer | Uint8Array, options: PdfImportOptions) {
  try {
    return await parsePdf(buffer, options.pages ? { pages: options.pages } : {});
  } catch (error) {
    if (error instanceof PdfLoadError) {
      throw wrapError(error, error.code);
    }
    throw wrapError(error, "PARSE_ERROR");
  }
}

function buildSlideFromPageOrThrow(page: PdfPage, slideSize: SlideSize, options: PdfImportOptions): Slide {
  try {
    return buildSlideFromPage(page, {
      slideWidth: slideSize.width,
      slideHeight: slideSize.height,
      fit: options.fit ?? "contain",
      setBackground: options.setWhiteBackground ?? true,
      backgroundColor: { r: 255, g: 255, b: 255 },
      grouping: options.grouping ?? DEFAULT_GROUPING,
    });
  } catch (error) {
    throw wrapError(error, "CONVERSION_ERROR");
  }
}

function addPageNumberIfEnabled(slide: Slide, pageNumber: number, slideSize: SlideSize, enabled: boolean): Slide {
  if (!enabled) {
    return slide;
  }
  return addPageNumber(slide, pageNumber, slideSize);
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
  pdfEmbeddedFonts?: readonly PdfEmbeddedFont[],
): PresentationDocument {
  const presentation: Presentation = {
    slideSize: {
      width: slideSize.width,
      height: slideSize.height,
    },
  };

  // Convert PDF embedded fonts to PresentationDocument format
  const embeddedFonts: EmbeddedFontData[] | undefined = pdfEmbeddedFonts?.map((f) => ({
    fontFamily: f.fontFamily,
    format: f.format,
    data: f.data,
    mimeType: f.mimeType,
  }));

  // Generate @font-face CSS for embedded fonts
  const embeddedFontCss = buildEmbeddedFontCss(pdfEmbeddedFonts);

  return {
    presentation,
    slides,
    slideWidth: slideSize.width,
    slideHeight: slideSize.height,
    colorContext: createDefaultColorContextForPdf(),
    resources: createDataUrlResourceResolver(),
    embeddedFonts,
    embeddedFontCss,
  };
}

function buildEmbeddedFontCss(pdfEmbeddedFonts: readonly PdfEmbeddedFont[] | undefined): string | undefined {
  if (!pdfEmbeddedFonts || pdfEmbeddedFonts.length === 0) {
    return undefined;
  }
  return generateFontFaceStyle(
    pdfEmbeddedFonts.map((f) => ({
      baseFontName: f.fontFamily,
      fontFamily: f.fontFamily,
      format: f.format,
      data: f.data,
      mimeType: f.mimeType,
    })),
  );
}

/**
 * A ResourceResolver that only handles data URLs.
 * Used for PDF imports where all resources are embedded.
 */
type DataUrlResourceResolver = ResourceResolver & {
  readonly resolve: (resourceId: string) => string | undefined;
};

/**
 * Create a ResourceResolver for PDF imports.
 *
 * ## Design Decision: Data URL-based Resources
 *
 * PDFs are not OPC (Open Packaging Conventions) archives. Unlike PPTX files,
 * which have a zip structure with relationship parts, PDFs embed resources
 * directly in the document stream.
 *
 * When importing PDF to PPTX, we convert embedded resources (images, etc.)
 * to data URLs:
 *
 * ```
 * PDF embedded image → data:image/png;base64,... → PPTX blip reference
 * ```
 *
 * This approach:
 * - Avoids creating temporary files
 * - Simplifies the import pipeline
 * - Allows immediate use without file extraction
 *
 * ## Limitations
 *
 * This resolver does NOT support:
 * - External file references (getFilePath returns undefined)
 * - OPC relationship lookups (getTarget, getType return undefined)
 * - File reading from disk (readFile returns null)
 *
 * These limitations are acceptable because PDF imports:
 * - Embed all resources as data URLs
 * - Don't use OPC relationships
 * - Don't reference external files
 *
 * @see ResourceResolver interface in resource-resolver.ts
 */
function createDataUrlResourceResolver(): DataUrlResourceResolver {
  return {
    // OPC relationship methods - not applicable to PDF imports
    getTarget: () => undefined,
    getType: () => undefined,
    resolve: (resourceId: string) => {
      if (resourceId.startsWith("data:")) {
        return resourceId;
      }
      console.warn(
        `[PDF Import] Resource "${resourceId.slice(0, 50)}..." is not a data URL. ` +
          `PDF imports only support embedded resources.`,
      );
      return undefined;
    },
    getMimeType: (id: string) => {
      if (id.startsWith("data:")) {
        const match = id.match(/^data:([^;,]+)/);
        return match?.[1];
      }
      return undefined;
    },
    // File-based methods - not applicable to PDF imports
    getFilePath: () => undefined,
    readFile: () => null,
  };
}

/**
 * Create a default ColorContext for PDF imports.
 *
 * ## Design Decision
 *
 * PDFs do not have a theme color concept like PPTX. However, the PPTX
 * representation requires a ColorContext for:
 * - Resolving schemeClr references (e.g., "dk1", "accent1")
 * - Providing fallback colors when no explicit color is set
 *
 * We provide sensible defaults based on the standard Office theme:
 * - dk1: Black (000000) - Main dark color
 * - lt1: White (FFFFFF) - Main light color
 * - accent1-6: Standard accent colors
 *
 * These colors are only used when the PDF content doesn't specify
 * explicit colors, which should be rare.
 */
export function createDefaultColorContextForPdf(): ColorContext {
  return {
    colorScheme: {
      // Main colors
      dk1: "000000", // Black
      lt1: "FFFFFF", // White
      dk2: "1F497D", // Dark Blue
      lt2: "EEECE1", // Light Tan

      // Accent colors (Office default theme)
      accent1: "4F81BD", // Blue
      accent2: "C0504D", // Red
      accent3: "9BBB59", // Green
      accent4: "8064A2", // Purple
      accent5: "4BACC6", // Cyan
      accent6: "F79646", // Orange

      // Hyperlink colors
      hlink: "0000FF", // Blue
      folHlink: "800080", // Purple
    },
    colorMap: {
      // Identity mapping (scheme color names map to themselves)
      bg1: "lt1",
      tx1: "dk1",
      bg2: "lt2",
      tx2: "dk2",
      accent1: "accent1",
      accent2: "accent2",
      accent3: "accent3",
      accent4: "accent4",
      accent5: "accent5",
      accent6: "accent6",
      hlink: "hlink",
      folHlink: "folHlink",
    },
  };
}

/**
 * Create an empty ColorContext for PDF imports.
 *
 * ## Rationale
 *
 * PDF documents always specify colors explicitly (RGB, CMYK, etc.).
 * They never use theme-based color references like PPTX.
 *
 * Therefore, an empty ColorContext is acceptable because:
 * 1. All colors from PDF are converted to explicit sRGB values
 * 2. No schemeClr references will be generated
 * 3. The PPTX template provides fallback theme colors if needed
 *
 * If issues arise with theme color resolution, consider using
 * createDefaultColorContextForPdf() instead.
 */
export function createEmptyColorContext(): ColorContext {
  return { colorScheme: {}, colorMap: {} };
}

function collectPageStats(page: PdfPage, slide: Slide): PageStats {
  const counts = { pathCount: 0, textCount: 0, imageCount: 0 };

  for (const elem of page.elements) {
    switch (elem.type) {
      case "path":
        counts.pathCount += 1;
        break;
      case "text":
        counts.textCount += 1;
        break;
      case "image":
        counts.imageCount += 1;
        break;
    }
  }

  return {
    pageNumber: page.pageNumber,
    shapeCount: slide.shapes.length,
    pathCount: counts.pathCount,
    textCount: counts.textCount,
    imageCount: counts.imageCount,
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
