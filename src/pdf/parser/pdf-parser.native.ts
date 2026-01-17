import type { PdfDocument, PdfElement, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { tokenizeContentStream } from "../domain/content-stream";
import { decodeText, type FontMappings } from "../domain/font";
import { GraphicsStateStack, type PdfMatrix } from "../domain";
import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfNumber, PdfObject, PdfRef, PdfStream } from "../native";
import { decodePdfStream } from "../native/stream";
import { buildPath, builtPathToPdfPath } from "./path-builder";
import {
  parseContentStream,
  createParser,
  createGfxOpsFromStack,
  type ParsedElement,
  type ParsedImage,
  type ParsedPath,
  type ParsedText,
} from "./operator";
import { extractFontMappingsFromResourcesNative, extractFontMappingsNative } from "./font-decoder.native";
import { extractImagesNative } from "./image-extractor.native";
import { loadNativePdfDocumentForParser } from "./native-load";
import { extractEmbeddedFontsFromNativePages } from "../domain/font/font-extractor.native";
import type { PdfLoadEncryption } from "./pdf-load-error";
import { extractExtGStateFromResourcesNative, extractExtGStateNative, type ExtGStateParams } from "./ext-gstate.native";

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
  const extGState = extractExtGStateNative(page);
  const parsedElements = [...parseContentStream(tokens, fontMappings, { extGState })];

  const { elements: expandedElements, imageGroups } = expandFormXObjectsNative(
    page,
    parsedElements,
    fontMappings,
    extGState,
    embeddedFontMetrics,
  );

  const images: PdfImage[] = [];
  for (const [xObjects, group] of imageGroups) {
    const extracted = await extractImagesNative(page, group, { pageHeight: height }, xObjects);
    images.push(...extracted);
  }

  const elements = convertElements(expandedElements, opts, height, images, fontMappings);

  return { pageNumber, width, height, elements };
}

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) return undefined;
  return page.lookup(obj);
}

function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  return asDict(resolve(page, obj));
}

function parseMatrix6(page: NativePdfPage, obj: PdfObject | undefined): PdfMatrix | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr || arr.items.length !== 6) return null;
  const nums: number[] = [];
  for (const item of arr.items) {
    const v = asNumber(resolve(page, item));
    if (v == null || !Number.isFinite(v)) return null;
    nums.push(v);
  }
  return nums as unknown as PdfMatrix;
}

type ImageGroupMap = Map<PdfDict, ParsedImage[]>;

function addImageToGroup(groups: ImageGroupMap, xObjects: PdfDict, img: ParsedImage): void {
  const prev = groups.get(xObjects);
  if (prev) {
    prev.push(img);
    return;
  }
  groups.set(xObjects, [img]);
}

function expandFormXObjectsNative(
  page: NativePdfPage,
  parsedElements: readonly ParsedElement[],
  fontMappings: FontMappings,
  extGState: ReadonlyMap<string, ExtGStateParams>,
  embeddedFontMetrics: Map<string, { ascender: number; descender: number }>,
): Readonly<{ elements: ParsedElement[]; imageGroups: ImageGroupMap }> {
  const resources = page.getResourcesDict();
  const xObjects = resources ? resolveDict(page, dictGet(resources, "XObject")) : null;
  const outElements: ParsedElement[] = [];
  const imageGroups: ImageGroupMap = new Map();

  const expandInScope = (
    elements: readonly ParsedElement[],
    scope: Readonly<{
      readonly resources: PdfDict | null;
      readonly xObjects: PdfDict | null;
      readonly fontMappings: FontMappings;
      readonly extGState: ReadonlyMap<string, ExtGStateParams>;
    }>,
    callStack: Set<string>,
    depth: number,
  ): void => {
    if (depth > 16) return;

    for (const elem of elements) {
      if (elem.type !== "image") {
        outElements.push(elem);
        continue;
      }

      const xObjDict = scope.xObjects;
      if (!xObjDict) continue;

      const cleanName = elem.name.startsWith("/") ? elem.name.slice(1) : elem.name;
      const refOrObj = dictGet(xObjDict, cleanName);
      const stackKey = refOrObj?.type === "ref" ? `${refOrObj.obj} ${refOrObj.gen}` : null;
      const resolved = resolve(page, refOrObj);
      const stream = asStream(resolved);
      if (!stream) continue;

      const subtype = asName(dictGet(stream.dict, "Subtype"))?.value ?? "";
      if (subtype === "Image") {
        addImageToGroup(imageGroups, xObjDict, elem);
        continue;
      }

      if (subtype !== "Form") continue;

      if (stackKey && callStack.has(stackKey)) continue;
      if (stackKey) callStack.add(stackKey);

      const formResources = resolveDict(page, dictGet(stream.dict, "Resources")) ?? scope.resources;
      const formXObjects =
        (formResources ? resolveDict(page, dictGet(formResources, "XObject")) : null) ?? scope.xObjects;

      const scopedFonts = new Map(scope.fontMappings);
      const formFonts = formResources ? extractFontMappingsFromResourcesNative(page, formResources) : new Map();
      for (const [k, v] of formFonts) scopedFonts.set(k, v);
      mergeFontMetrics(scopedFonts, embeddedFontMetrics);
      for (const info of formFonts.values()) {
        if (!info.baseFont) continue;
        const key = normalizeBaseFontForMetricsLookup(info.baseFont);
        if (!fontMappings.has(key)) fontMappings.set(key, info);
      }
      mergeFontMetrics(fontMappings, embeddedFontMetrics);

      const localExt = formResources ? extractExtGStateFromResourcesNative(page, formResources) : new Map();
      const mergedExt = new Map(scope.extGState);
      for (const [k, v] of localExt) mergedExt.set(k, v);

      const matrix = parseMatrix6(page, dictGet(stream.dict, "Matrix")) ?? ([1, 0, 0, 1, 0, 0] as PdfMatrix);

      const decoded = decodePdfStream(stream);
      const content = new TextDecoder("latin1").decode(decoded);
      if (!content) {
        if (stackKey) callStack.delete(stackKey);
        continue;
      }

      const gfxStack = new GraphicsStateStack(elem.graphicsState);
      gfxStack.concatMatrix(matrix);
      const gfxOps = createGfxOpsFromStack(gfxStack);
      const tokens = tokenizeContentStream(content);
      const parse = createParser(gfxOps, scopedFonts, { extGState: mergedExt });
      const inner = parse(tokens);

      expandInScope(
        inner,
        {
          resources: formResources,
          xObjects: formXObjects,
          fontMappings: scopedFonts,
          extGState: mergedExt,
        },
        callStack,
        depth + 1,
      );

      if (stackKey) callStack.delete(stackKey);
    }
  };

  expandInScope(
    parsedElements,
    { resources, xObjects: xObjects ?? null, fontMappings, extGState },
    new Set(),
    0,
  );

  return { elements: outElements, imageGroups };
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
    const fontKey = run.baseFont ?? run.fontName;
    const fontInfo = getFontInfo(fontKey, fontMappings);
    const decodedText = decodeText(run.text, fontKey, fontMappings);

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
