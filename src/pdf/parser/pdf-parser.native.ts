import type { PdfDocument, PdfElement, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { tokenizeContentStream } from "../domain/content-stream";
import { decodeText, type FontMappings } from "../domain/font";
import type { NativePdfPage } from "../native";
import { buildPath, builtPathToPdfPath } from "./path-builder";
import { parseContentStream, type ParsedElement, type ParsedImage, type ParsedPath, type ParsedText } from "./operator";
import { extractFontMappingsNative } from "./font-decoder.native";
import { extractImagesNative } from "./image-extractor.native";
import { loadNativePdfDocumentForParser } from "./native-load";
import { extractEmbeddedFontsFromNativePages } from "../domain/font/font-extractor.native";
import type { PdfLoadEncryption } from "./pdf-load-error";
import { extractExtGStateAlphaNative } from "./ext-gstate.native";

export type PdfParserOptions = {
  readonly pages?: readonly number[];
  readonly minPathComplexity?: number;
  readonly includeText?: boolean;
  readonly includePaths?: boolean;
  readonly encryption?: PdfLoadEncryption;
};

const DEFAULT_OPTIONS: Required<PdfParserOptions> = {
  pages: [],
  minPathComplexity: 0,
  includeText: true,
  includePaths: true,
  encryption: { mode: "reject" },
};

export async function parsePdfNative(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "parse",
    encryption: opts.encryption,
    updateMetadata: false,
  });

  // Extract embedded fonts first to get accurate metrics (best-effort).
  const embeddedFontsRaw = (() => {
    try {
      return extractEmbeddedFontsFromNativePages(pdfDoc.getPages());
    } catch (error) {
      console.warn("Failed to extract embedded fonts:", error);
      return [];
    }
  })();

  const embeddedFontMetrics = new Map<string, { ascender: number; descender: number }>();
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
    const nativePage = pdfPages[pageNum - 1]!;
    const parsedPage = await parsePage(nativePage, pageNum, opts, embeddedFontMetrics);
    pages.push(parsedPage);
  }

  const metadata = pdfDoc.getMetadata();

  const embeddedFonts = embeddedFontsRaw.length > 0
    ? embeddedFontsRaw.map((f) => ({
        fontFamily: f.fontFamily,
        format: f.format,
        data: f.data,
        mimeType: f.mimeType,
      }))
    : undefined;

  return { pages, metadata, embeddedFonts };
}

async function parsePage(
  page: NativePdfPage,
  pageNumber: number,
  opts: Required<PdfParserOptions>,
  embeddedFontMetrics: Map<string, { ascender: number; descender: number }>,
): Promise<PdfPage> {
  const { width, height } = page.getSize();

  const contentStreams = page.getDecodedContentStreams();
  const contentStream = contentStreams.length === 0
    ? null
    : contentStreams.map((b) => new TextDecoder("latin1").decode(b)).join("\n");

  if (!contentStream) {
    return { pageNumber, width, height, elements: [] };
  }

  const fontMappings = extractFontMappingsNative(page);
  mergeFontMetrics(fontMappings, embeddedFontMetrics);
  const tokens = tokenizeContentStream(contentStream);
  const extGState = extractExtGStateAlphaNative(page);
  const parsedElements = [...parseContentStream(tokens, fontMappings, { extGState })];

  const parsedImages = parsedElements.filter((e): e is ParsedImage => e.type === "image");
  const images = await extractImagesNative(page, parsedImages, { pageHeight: height });

  const elements = convertElements(parsedElements, opts, height, images, fontMappings);

  return { pageNumber, width, height, elements };
}

function mergeFontMetrics(
  fontMappings: FontMappings,
  embeddedFontMetrics: Map<string, { ascender: number; descender: number }>,
): void {
  for (const [fontName, fontInfo] of fontMappings) {
    const baseFont = fontInfo.baseFont;
    if (!baseFont) continue;

    const normalizedName = normalizeBaseFontForMetricsLookup(baseFont);
    const embeddedMetrics = embeddedFontMetrics.get(normalizedName);
    if (!embeddedMetrics) continue;

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

function normalizeBaseFontForMetricsLookup(baseFont: string): string {
  const clean = baseFont.startsWith("/") ? baseFont.slice(1) : baseFont;
  const plusIndex = clean.indexOf("+");
  return plusIndex > 0 ? clean.slice(plusIndex + 1) : clean;
}

function convertElements(
  parsed: ParsedElement[],
  opts: Required<PdfParserOptions>,
  _pageHeight: number,
  extractedImages: PdfImage[],
  fontMappings: FontMappings,
): PdfElement[] {
  const elements: PdfElement[] = [];
  for (const elem of parsed) {
    switch (elem.type) {
      case "path":
        if (opts.includePaths) {
          const pdfPath = convertPath(elem, opts.minPathComplexity);
          if (pdfPath) elements.push(pdfPath);
        }
        break;
      case "text":
        if (opts.includeText) {
          const pdfTexts = convertText(elem, fontMappings);
          elements.push(...pdfTexts);
        }
        break;
      case "image":
        break;
    }
  }
  elements.push(...extractedImages);
  return elements;
}

function convertPath(parsed: ParsedPath, minComplexity: number): PdfPath | null {
  if (parsed.paintOp === "none" || parsed.paintOp === "clip") return null;
  const built = buildPath(parsed);
  if (built.operations.length < minComplexity) return null;
  return builtPathToPdfPath(built);
}

function getFontInfo(fontName: string, fontMappings: FontMappings) {
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;
  let fontInfo = fontMappings.get(cleanName);
  if (!fontInfo) {
    const plusIndex = cleanName.indexOf("+");
    if (plusIndex > 0) {
      fontInfo = fontMappings.get(cleanName.slice(plusIndex + 1));
    }
  }
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

function convertText(parsed: ParsedText, fontMappings: FontMappings): PdfText[] {
  const results: PdfText[] = [];

  for (const run of parsed.runs) {
    const fontInfo = getFontInfo(run.fontName, fontMappings);
    const decodedText = decodeText(run.text, run.fontName, fontMappings);

    const metrics = fontInfo?.metrics;
    const ascender = metrics?.ascender ?? 800;
    const descender = metrics?.descender ?? -200;

    const effectiveSize = run.effectiveFontSize;
    const textHeight = ((ascender - descender) * effectiveSize) / 1000;
    const minY = run.y + (descender * effectiveSize) / 1000;
    const width = Math.max(run.endX - run.x, 1);

    const actualFontName = run.baseFont ?? fontInfo?.baseFont ?? run.fontName;

    results.push({
      type: "text" as const,
      text: decodedText,
      x: run.x,
      y: minY,
      width,
      height: Math.max(textHeight, 1),
      fontName: actualFontName,
      baseFont: run.baseFont ?? fontInfo?.baseFont,
      fontSize: effectiveSize,
      graphicsState: parsed.graphicsState,
      charSpacing: run.charSpacing,
      wordSpacing: run.wordSpacing,
      horizontalScaling: run.horizontalScaling,
      fontMetrics: { ascender, descender },
      isBold: fontInfo?.isBold,
      isItalic: fontInfo?.isItalic,
      cidOrdering: fontInfo?.ordering,
    });
  }

  return results;
}
