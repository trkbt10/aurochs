/**
 * @file Main PDF parser
 *
 * Uses pdf-lib to load PDF files and extract content streams.
 * Parses content streams using tokenizer + operator parser + path builder.
 */

import { PDFDocument, PDFPage, PDFRawStream, decodePDFRawStream, PDFArray, PDFRef } from "pdf-lib";
import type { PdfDocument, PdfPage, PdfElement, PdfPath, PdfText, PdfImage, PdfGraphicsState } from "../domain";
import { tokenizeContentStream } from "./tokenizer";
import { OperatorParser, type ParsedElement, type ParsedPath, type ParsedText, type ParsedImage } from "./operator-parser";
import { buildPath, builtPathToPdfPath } from "./path-builder";
import { extractImages } from "./image-extractor";
import { extractFontMappings, decodeText, type FontMappings } from "./font-decoder";
import { extractEmbeddedFonts, type EmbeddedFont } from "../domain/font/font-extractor";

// =============================================================================
// Parser Options
// =============================================================================

export type PdfParserOptions = {
  /** Pages to parse (1-based). Default: all pages */
  readonly pages?: readonly number[];
  /** Minimum path complexity to include. Default: 0 (include all) */
  readonly minPathComplexity?: number;
  /** Include text elements. Default: true */
  readonly includeText?: boolean;
  /** Include path elements. Default: true */
  readonly includePaths?: boolean;
};

const DEFAULT_OPTIONS: Required<PdfParserOptions> = {
  pages: [],
  minPathComplexity: 0,
  includeText: true,
  includePaths: true,
};

// =============================================================================
// Main Parser Function
// =============================================================================

/**
 * Embedded font metrics lookup map.
 * Maps fontFamily to accurate metrics from hhea table.
 */
type EmbeddedFontMetricsMap = Map<string, { ascender: number; descender: number }>;

/**
 * Parse a PDF file and extract elements
 */
export async function parsePdf(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {}
): Promise<PdfDocument> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Load PDF with pdf-lib
  const pdfDoc = await PDFDocument.load(data, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  // Extract embedded fonts first to get accurate metrics
  const embeddedFontsRaw = extractEmbeddedFonts(pdfDoc);

  // Build metrics lookup map from embedded fonts
  const embeddedFontMetrics: EmbeddedFontMetricsMap = new Map();
  for (const font of embeddedFontsRaw) {
    if (font.metrics) {
      embeddedFontMetrics.set(font.fontFamily, font.metrics);
    }
  }

  const pdfPages = pdfDoc.getPages();
  const pagesToParse = opts.pages.length > 0
    ? opts.pages.filter((p) => p >= 1 && p <= pdfPages.length)
    : Array.from({ length: pdfPages.length }, (_, i) => i + 1);

  const pages: PdfPage[] = [];

  for (const pageNum of pagesToParse) {
    const pdfPage = pdfPages[pageNum - 1];
    const parsedPage = await parsePage(pdfPage, pageNum, opts, embeddedFontMetrics);
    pages.push(parsedPage);
  }

  // Extract metadata
  const metadata = extractMetadata(pdfDoc);

  // Convert embedded fonts for output
  const embeddedFonts = embeddedFontsRaw.length > 0
    ? embeddedFontsRaw.map((f) => ({
        fontFamily: f.fontFamily,
        format: f.format,
        data: f.data,
        mimeType: f.mimeType,
      }))
    : undefined;

  return {
    pages,
    metadata,
    embeddedFonts,
  };
}

/**
 * Parse a single PDF page
 */
async function parsePage(
  pdfPage: PDFPage,
  pageNumber: number,
  opts: Required<PdfParserOptions>,
  embeddedFontMetrics: EmbeddedFontMetricsMap
): Promise<PdfPage> {
  const { width, height } = pdfPage.getSize();

  // Get content stream
  const contentStream = await getContentStream(pdfPage);

  if (!contentStream) {
    return {
      pageNumber,
      width,
      height,
      elements: [],
    };
  }

  // Extract font mappings for text decoding
  const fontMappings = extractFontMappings(pdfPage);

  // Override font metrics with accurate values from embedded fonts (hhea table)
  // FontDescriptor metrics may be inaccurate, while hhea table values are authoritative
  mergeFontMetrics(fontMappings, embeddedFontMetrics);

  // Tokenize content stream
  const tokens = tokenizeContentStream(contentStream);

  // Parse operators with font mappings for accurate text displacement
  const operatorParser = new OperatorParser(fontMappings);
  const parsedElements = operatorParser.parse(tokens);

  // Extract images from XObject resources
  const parsedImages = parsedElements.filter((e): e is ParsedImage => e.type === "image");
  const images = await extractImages(pdfPage, parsedImages, { pageHeight: height });

  // Convert to PdfElements
  const elements = convertElements(parsedElements, opts, height, images, fontMappings);

  return {
    pageNumber,
    width,
    height,
    elements,
  };
}

/**
 * Merge embedded font metrics into font mappings.
 *
 * PDF FontDescriptor metrics may be inaccurate or use default values.
 * Embedded font hhea table contains authoritative ascender/descender values.
 * This function updates fontMappings with accurate metrics from embedded fonts.
 */
function mergeFontMetrics(
  fontMappings: FontMappings,
  embeddedFontMetrics: EmbeddedFontMetricsMap
): void {
  for (const [fontName, fontInfo] of fontMappings) {
    // Try to match by baseFont name (actual font name)
    const baseFont = fontInfo.baseFont;
    if (!baseFont) continue;

    // Normalize baseFont name for lookup (remove subset prefix)
    const normalizedName = normalizeBaseFontForMetricsLookup(baseFont);

    // Look up metrics from embedded fonts
    const embeddedMetrics = embeddedFontMetrics.get(normalizedName);
    if (embeddedMetrics) {
      // Update metrics with authoritative values from hhea table
      fontMappings.set(fontName, {
        ...fontInfo,
        metrics: {
          ...fontInfo.metrics,
          ascender: embeddedMetrics.ascender,
          descender: embeddedMetrics.descender,
        },
      });
    }
  }
}

/**
 * Normalize baseFont name for metrics lookup.
 * Handles subset prefixes (e.g., "ABCDEF+FontName" → "FontName").
 *
 * IMPORTANT: Do NOT modify the font name beyond removing the subset prefix.
 * Font names must match exactly with embedded font family names.
 */
function normalizeBaseFontForMetricsLookup(baseFont: string): string {
  // Remove subset prefix (e.g., "XGIAKD+Helvetica" → "Helvetica")
  const plusIndex = baseFont.indexOf("+");
  return plusIndex > 0 ? baseFont.slice(plusIndex + 1) : baseFont;
}

/**
 * Get decoded content stream from a PDF page
 */
async function getContentStream(pdfPage: PDFPage): Promise<string | null> {
  const node = pdfPage.node;
  const contentsRef = node.Contents();

  if (!contentsRef) {
    return null;
  }

  try {
    // Contents can be a single stream or an array of streams
    const context = node.context;
    const contents = context.lookup(contentsRef);

    if (!contents) {
      return null;
    }

    // Handle array of content streams
    if (contents instanceof PDFArray) {
      const streams: string[] = [];
      for (let i = 0; i < contents.size(); i++) {
        const ref = contents.get(i);
        if (ref instanceof PDFRef) {
          const stream = context.lookup(ref);
          if (stream instanceof PDFRawStream) {
            const decoded = decodePDFRawStream(stream);
            streams.push(new TextDecoder("latin1").decode(decoded.decode()));
          }
        }
      }
      return streams.join("\n");
    }

    // Handle single stream
    if (contents instanceof PDFRawStream) {
      const decoded = decodePDFRawStream(contents);
      return new TextDecoder("latin1").decode(decoded.decode());
    }

    return null;
  } catch (error) {
    console.warn("Failed to decode content stream:", error);
    return null;
  }
}

/**
 * Convert parsed elements to PdfElements
 */
function convertElements(
  parsed: ParsedElement[],
  opts: Required<PdfParserOptions>,
  pageHeight: number,
  extractedImages: PdfImage[],
  fontMappings: FontMappings
): PdfElement[] {
  const elements: PdfElement[] = [];

  for (const elem of parsed) {
    switch (elem.type) {
      case "path":
        if (opts.includePaths) {
          const pdfPath = convertPath(elem, opts.minPathComplexity, pageHeight);
          if (pdfPath) {
            elements.push(pdfPath);
          }
        }
        break;

      case "text":
        if (opts.includeText) {
          const pdfTexts = convertText(elem, pageHeight, fontMappings);
          elements.push(...pdfTexts);
        }
        break;

      case "image":
        // Images are added from extractedImages array below
        break;
    }
  }

  // Add extracted images
  elements.push(...extractedImages);

  return elements;
}

/**
 * Convert parsed path to PdfPath
 * Note: Y-flip is handled in transform-converter.ts during PDF→PPTX conversion
 */
function convertPath(
  parsed: ParsedPath,
  minComplexity: number,
  _pageHeight: number
): PdfPath | null {
  // Skip paths that don't paint anything
  if (parsed.paintOp === "none" || parsed.paintOp === "clip") {
    return null;
  }

  // Build normalized path with CTM applied
  const built = buildPath(parsed);

  // Check complexity threshold
  if (built.operations.length < minComplexity) {
    return null;
  }

  // Convert to PdfPath (Y-flip is done in transform-converter.ts)
  return builtPathToPdfPath(built);
}

/**
 * Convert parsed text to PdfText elements
 *
 * PDF Reference 9.4: TextObject (BT...ET) may contain multiple text runs
 * at different positions. Each run is converted to a separate PdfText element
 * to preserve exact positioning (important for tables, multi-column layouts, etc.).
 *
 * ## Coordinate Pipeline
 *
 * 1. **OperatorParser** extracts text runs with:
 *    - run.x, run.y: Baseline position (from text matrix + CTM)
 *    - run.effectiveFontSize: Scaled font size in page coordinates
 *
 * 2. **This Function** calculates:
 *    - textHeight: (ascender - descender) * effectiveSize / 1000
 *      With defaults (800, -200): textHeight = effectiveSize (1:1 ratio)
 *    - minY: run.y + (descender * effectiveSize / 1000)
 *      This is the bottom edge of the text bounding box
 *
 * 3. **PdfText.y** represents the bottom edge (minY) for text-to-shapes.ts
 *    which converts to PPTX coordinates (top-left origin)
 *
 * Note: Y-flip is handled in transform-converter.ts during PDF→PPTX conversion
 */
function convertText(parsed: ParsedText, _pageHeight: number, fontMappings: FontMappings): PdfText[] {
  const results: PdfText[] = [];

  for (const run of parsed.runs) {
    const fontInfo = getFontInfo(run.fontName, fontMappings);
    const metrics = fontInfo?.metrics;

    // Use effectiveFontSize which includes text matrix and CTM scaling
    // This gives the actual rendered font size in page coordinates
    const effectiveSize = run.effectiveFontSize;

    // PDF Reference 5.7.1: Text height from ascender/descender
    // All values are in 1/1000 em units (glyph space)
    // Height = (ascender - descender) * effectiveFontSize / 1000
    // With default ascender=800, descender=-200: height = 1000/1000 * size = size
    const ascender = metrics?.ascender ?? 800;
    const descender = metrics?.descender ?? -200;
    const textHeight = ((ascender - descender) * effectiveSize) / 1000;

    const decodedText = decodeText(run.text, run.fontName, fontMappings);
    if (decodedText.length === 0) {
      continue;
    }

    // Calculate bounding box bottom edge from baseline
    // run.y = baseline position in PDF coordinates (Y increases upward)
    // descender is negative (e.g., -200), so minY = baseline - |descender|*size/1000
    // This gives the bottom edge of the text bounding box
    const minY = run.y + (descender * effectiveSize) / 1000;
    const width = Math.max(run.endX - run.x, 1); // Ensure non-zero width

    // Use baseFont (actual font name) if available, otherwise fall back to resource identifier
    // Priority: run.baseFont (from operator parser) > fontInfo.baseFont (from mappings) > run.fontName
    // baseFont is the real font name from BaseFont entry (e.g., "ABCDEF+Arial" or "Helvetica")
    // run.fontName is the resource identifier (e.g., "F1" or "JRLKGN")
    const actualFontName = run.baseFont ?? fontInfo?.baseFont ?? run.fontName;

    results.push({
      type: "text" as const,
      text: decodedText,
      x: run.x,
      y: minY,
      width,
      height: Math.max(textHeight, 1), // Ensure non-zero height
      fontName: actualFontName,
      baseFont: run.baseFont ?? fontInfo?.baseFont,
      fontSize: effectiveSize, // Use effective font size for PPTX rendering
      graphicsState: parsed.graphicsState,
      // Spacing properties from text state operators
      charSpacing: run.charSpacing,
      wordSpacing: run.wordSpacing,
      horizontalScaling: run.horizontalScaling,
      // Font metrics for precise positioning
      fontMetrics: {
        ascender,
        descender,
      },
      // Font style from FontDescriptor or font name
      isBold: fontInfo?.isBold,
      isItalic: fontInfo?.isItalic,
      // CID ordering for script type detection (ISO 32000-1 Section 9.7)
      cidOrdering: fontInfo?.ordering,
    });
  }

  return results;
}

/**
 * Get font info by name, handling subset prefixes and leading slashes
 */
function getFontInfo(fontName: string, fontMappings: FontMappings) {
  // Clean font name (remove leading slash)
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

  // Try exact match first
  let fontInfo = fontMappings.get(cleanName);

  // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
  if (!fontInfo) {
    const plusIndex = cleanName.indexOf("+");
    if (plusIndex > 0) {
      fontInfo = fontMappings.get(cleanName.slice(plusIndex + 1));
    }
  }

  // Try matching by prefix/suffix
  if (!fontInfo) {
    for (const [key, value] of fontMappings.entries()) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        fontInfo = value;
        break;
      }
    }
  }

  return fontInfo;
}

/**
 * Extract metadata from PDF document
 */
function extractMetadata(pdfDoc: PDFDocument): PdfDocument["metadata"] {
  try {
    const title = pdfDoc.getTitle();
    const author = pdfDoc.getAuthor();
    const subject = pdfDoc.getSubject();

    if (!title && !author && !subject) {
      return undefined;
    }

    return {
      title: title || undefined,
      author: author || undefined,
      subject: subject || undefined,
    };
  } catch {
    return undefined;
  }
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get page count without full parsing
 */
export async function getPdfPageCount(data: Uint8Array | ArrayBuffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(data, {
    ignoreEncryption: true,
    updateMetadata: false,
  });
  return pdfDoc.getPageCount();
}

/**
 * Get page dimensions without full parsing
 */
export async function getPdfPageDimensions(
  data: Uint8Array | ArrayBuffer,
  pageNumber: number = 1
): Promise<{ width: number; height: number } | null> {
  const pdfDoc = await PDFDocument.load(data, {
    ignoreEncryption: true,
    updateMetadata: false,
  });

  const pages = pdfDoc.getPages();
  if (pageNumber < 1 || pageNumber > pages.length) {
    return null;
  }

  const page = pages[pageNumber - 1];
  return page.getSize();
}
