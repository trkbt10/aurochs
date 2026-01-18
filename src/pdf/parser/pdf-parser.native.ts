/**
 * @file src/pdf/parser/pdf-parser.native.ts
 */

import type { PdfDocument, PdfElement, PdfEmbeddedFont, PdfImage, PdfPage, PdfPath, PdfText } from "../domain";
import { tokenizeContentStream } from "../domain/content-stream";
import { decodeText, type FontMappings } from "../domain/font";
import { createGraphicsStateStack, transformPoint, type PdfBBox, type PdfMatrix } from "../domain";
import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "../native";
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
import { preprocessInlineImages } from "./inline-image.native";
import { expandType3TextElementsNative } from "./type3-expand.native";
import { rasterizeSoftMaskedFillPath } from "./soft-mask-raster.native";
import { applyGraphicsSoftMaskToPdfImage } from "./soft-mask-apply.native";
import { rasterizeSoftMaskedText } from "./soft-mask-text-raster.native";

export type PdfParserOptions = {
  readonly pages?: readonly number[];
  readonly minPathComplexity?: number;
  readonly includeText?: boolean;
  readonly includePaths?: boolean;
  /**
   * Enables rasterization for per-pixel `/SMask` groups that contain only vector
   * paths (no images). This sets the maximum `{width,height}` of the generated
   * mask grid.
   *
   * Set to `0` (default) to keep this feature disabled.
   */
  readonly softMaskVectorMaxSize?: number;
  readonly encryption?: PdfLoadEncryption;
};

const DEFAULT_OPTIONS: Required<PdfParserOptions> = {
  pages: [],
  minPathComplexity: 0,
  includeText: true,
  includePaths: true,
  softMaskVectorMaxSize: 0,
  encryption: { mode: "reject" },
};











/** Parse a PDF using the native loader (no `pdf-lib`). */
export async function parsePdfNative(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  if (!Number.isFinite(opts.softMaskVectorMaxSize) || opts.softMaskVectorMaxSize < 0) {
    throw new Error(`softMaskVectorMaxSize must be >= 0 (got ${opts.softMaskVectorMaxSize})`);
  }

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
  const pagesToParse = resolvePagesToParse(opts.pages, pdfPages.length);

  const pages: PdfPage[] = [];
  for (const pageNum of pagesToParse) {
    const nativePage = pdfPages[pageNum - 1]!;
    const parsedPage = await parsePage(nativePage, pageNum, opts, embeddedFontMetrics);
    pages.push(parsedPage);
  }

  const metadata = pdfDoc.getMetadata();

  const embeddedFonts = buildEmbeddedFonts(embeddedFontsRaw);

  return { pages, metadata, embeddedFonts };
}

function resolvePagesToParse(requested: readonly number[], pageCount: number): readonly number[] {
  if (requested.length > 0) {
    return requested.filter((p) => p >= 1 && p <= pageCount);
  }
  return Array.from({ length: pageCount }, (_, i) => i + 1);
}

function buildEmbeddedFonts(
  embeddedFontsRaw: readonly { readonly fontFamily: string; readonly format: PdfEmbeddedFont["format"]; readonly data: Uint8Array; readonly mimeType: string }[],
): readonly PdfEmbeddedFont[] | undefined {
  if (embeddedFontsRaw.length === 0) {
    return undefined;
  }
  return embeddedFontsRaw.map((f) => ({
    fontFamily: f.fontFamily,
    format: f.format,
    data: f.data,
    mimeType: f.mimeType,
  }));
}

async function parsePage(
  page: NativePdfPage,
  pageNumber: number,
  opts: Required<PdfParserOptions>,
  embeddedFontMetrics: Map<string, { ascender: number; descender: number }>,
): Promise<PdfPage> {
  const { width, height } = page.getSize();

  const resources = page.getResourcesDict();
  const baseXObjects = resources ? resolveDict(page, dictGet(resources, "XObject")) : null;

  const inlineId = { value: 0 };
  const nextInlineId = (): number => {
    inlineId.value += 1;
    return inlineId.value;
  };

  const inlineXObjects = new Map<string, PdfStream>();
  const usedNames = new Set<string>(baseXObjects ? [...baseXObjects.map.keys()] : []);
  const processedStreams: string[] = [];

  for (const b of page.getDecodedContentStreams()) {
    const pre = preprocessInlineImages(b, { nextId: nextInlineId, existingNames: usedNames });
    processedStreams.push(pre.content);
    for (const [k, v] of pre.xObjects) {
      inlineXObjects.set(k, v);
      usedNames.add(k);
    }
  }

  const contentStream = processedStreams.length === 0 ? null : processedStreams.join("\n");

  if (!contentStream) {
    return { pageNumber, width, height, elements: [] };
  }

  const fontMappings = extractFontMappingsNative(page);
  mergeFontMetrics(fontMappings, embeddedFontMetrics);
  const tokens = tokenizeContentStream(contentStream);
  const extGState = extractExtGStateNative(page, {
    vectorSoftMaskMaxSize: opts.softMaskVectorMaxSize > 0 ? opts.softMaskVectorMaxSize : undefined,
  });
  const parsedElements = [...parseContentStream(tokens, fontMappings, { extGState })];

  const registerType3XObjectStream = (stream: PdfStream): string => {
    let name = "";
    do {
      name = `T3X${nextInlineId()}`;
    } while (usedNames.has(name));
    inlineXObjects.set(name, stream);
    usedNames.add(name);
    return name;
  };

  const parsedWithType3 = expandType3TextElementsNative({
    page,
    resources,
    parsedElements,
    fontMappings,
    pageExtGState: extGState,
    registerXObjectStream: registerType3XObjectStream,
  });

  const mergedXObjects = mergeXObjects(baseXObjects, inlineXObjects);

  const { elements: expandedElements, imageGroups } = expandFormXObjectsNative(
    page,
    parsedWithType3,
    fontMappings,
    extGState,
    embeddedFontMetrics,
    mergedXObjects,
    nextInlineId,
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
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  return asDict(resolve(page, obj));
}

function mergeXObjects(base: PdfDict | null, extra: ReadonlyMap<string, PdfStream>): PdfDict | null {
  if ((!base || base.map.size === 0) && extra.size === 0) {return null;}
  const merged = new Map<string, PdfObject>();
  if (base) {
    for (const [k, v] of base.map.entries()) {merged.set(k, v);}
  }
  for (const [k, v] of extra.entries()) {merged.set(k, v);}
  return { type: "dict", map: merged };
}

function parseMatrix6(page: NativePdfPage, obj: PdfObject | undefined): PdfMatrix | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr || arr.items.length !== 6) {return null;}
  const [i0, i1, i2, i3, i4, i5] = arr.items;
  const n0 = asNumber(resolve(page, i0));
  const n1 = asNumber(resolve(page, i1));
  const n2 = asNumber(resolve(page, i2));
  const n3 = asNumber(resolve(page, i3));
  const n4 = asNumber(resolve(page, i4));
  const n5 = asNumber(resolve(page, i5));
  if (n0 == null || !Number.isFinite(n0)) {return null;}
  if (n1 == null || !Number.isFinite(n1)) {return null;}
  if (n2 == null || !Number.isFinite(n2)) {return null;}
  if (n3 == null || !Number.isFinite(n3)) {return null;}
  if (n4 == null || !Number.isFinite(n4)) {return null;}
  if (n5 == null || !Number.isFinite(n5)) {return null;}
  return [n0, n1, n2, n3, n4, n5];
}

function parseBBox4(page: NativePdfPage, obj: PdfObject | undefined): PdfBBox | null {
  const resolved = resolve(page, obj);
  const arr = asArray(resolved);
  if (!arr || arr.items.length !== 4) {return null;}
  const [i0, i1, i2, i3] = arr.items;
  const n0 = asNumber(resolve(page, i0));
  const n1 = asNumber(resolve(page, i1));
  const n2 = asNumber(resolve(page, i2));
  const n3 = asNumber(resolve(page, i3));
  if (n0 == null || !Number.isFinite(n0)) {return null;}
  if (n1 == null || !Number.isFinite(n1)) {return null;}
  if (n2 == null || !Number.isFinite(n2)) {return null;}
  if (n3 == null || !Number.isFinite(n3)) {return null;}
  return [n0, n1, n2, n3];
}

function transformBBox(bbox: PdfBBox, ctm: PdfMatrix): PdfBBox {
  const [x1, y1, x2, y2] = bbox;
  const corners = [
    transformPoint({ x: x1, y: y1 }, ctm),
    transformPoint({ x: x2, y: y1 }, ctm),
    transformPoint({ x: x2, y: y2 }, ctm),
    transformPoint({ x: x1, y: y2 }, ctm),
  ];
  const bounds = { minX: corners[0]!.x, minY: corners[0]!.y, maxX: corners[0]!.x, maxY: corners[0]!.y };
  for (const p of corners) {
    bounds.minX = Math.min(bounds.minX, p.x);
    bounds.minY = Math.min(bounds.minY, p.y);
    bounds.maxX = Math.max(bounds.maxX, p.x);
    bounds.maxY = Math.max(bounds.maxY, p.y);
  }
  return [bounds.minX, bounds.minY, bounds.maxX, bounds.maxY];
}

function bboxIntersects(a: PdfBBox, b: PdfBBox): boolean {
  const [ax1, ay1, ax2, ay2] = a;
  const [bx1, by1, bx2, by2] = b;
  const aMinX = Math.min(ax1, ax2);
  const aMinY = Math.min(ay1, ay2);
  const aMaxX = Math.max(ax1, ax2);
  const aMaxY = Math.max(ay1, ay2);
  const bMinX = Math.min(bx1, bx2);
  const bMinY = Math.min(by1, by2);
  const bMaxX = Math.max(bx1, bx2);
  const bMaxY = Math.max(by1, by2);
  return aMaxX > bMinX && aMinX < bMaxX && aMaxY > bMinY && aMinY < bMaxY;
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
  xObjectsOverride: PdfDict | null,
  nextInlineId: () => number,
): Readonly<{ elements: ParsedElement[]; imageGroups: ImageGroupMap }> {
  const resources = page.getResourcesDict();
  const xObjects = xObjectsOverride ?? (resources ? resolveDict(page, dictGet(resources, "XObject")) : null);
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
    if (depth > 16) {return;}

    for (const elem of elements) {
      if (elem.type !== "image") {
        outElements.push(elem);
        continue;
      }

      const xObjDict = scope.xObjects;
      if (!xObjDict) {continue;}

      const cleanName = elem.name.startsWith("/") ? elem.name.slice(1) : elem.name;
      const refOrObj = dictGet(xObjDict, cleanName);
      const stackKey = refOrObj?.type === "ref" ? `${refOrObj.obj} ${refOrObj.gen}` : null;
      const resolved = resolve(page, refOrObj);
      const stream = asStream(resolved);
      if (!stream) {continue;}

      const subtype = asName(dictGet(stream.dict, "Subtype"))?.value ?? "";
      if (subtype === "Image") {
        addImageToGroup(imageGroups, xObjDict, elem);
        continue;
      }

      if (subtype !== "Form") {continue;}

      if (stackKey && callStack.has(stackKey)) {continue;}
      if (stackKey) {callStack.add(stackKey);}

      const formResources = resolveDict(page, dictGet(stream.dict, "Resources")) ?? scope.resources;
      const formXObjectsBase =
        (formResources ? resolveDict(page, dictGet(formResources, "XObject")) : null) ?? scope.xObjects;

      const scopedFonts = new Map(scope.fontMappings);
      const formFonts = formResources ? extractFontMappingsFromResourcesNative(page, formResources) : new Map();
      for (const [k, v] of formFonts) {scopedFonts.set(k, v);}
      mergeFontMetrics(scopedFonts, embeddedFontMetrics);
      for (const info of formFonts.values()) {
        if (!info.baseFont) {continue;}
        const key = normalizeBaseFontForMetricsLookup(info.baseFont);
        if (!fontMappings.has(key)) {fontMappings.set(key, info);}
      }
      mergeFontMetrics(fontMappings, embeddedFontMetrics);

      const localExt = formResources ? extractExtGStateFromResourcesNative(page, formResources) : new Map();
      const mergedExt = new Map(scope.extGState);
      for (const [k, v] of localExt) {mergedExt.set(k, v);}

      const matrix = parseMatrix6(page, dictGet(stream.dict, "Matrix")) ?? ([1, 0, 0, 1, 0, 0] as PdfMatrix);
      const bbox = parseBBox4(page, dictGet(stream.dict, "BBox"));

      const decoded = decodePdfStream(stream);
      const pre = preprocessInlineImages(decoded, {
        nextId: nextInlineId,
        existingNames: new Set<string>(formXObjectsBase ? [...formXObjectsBase.map.keys()] : []),
      });
      const content = pre.content;
      const formXObjects = mergeXObjects(formXObjectsBase, pre.xObjects);
      if (!content) {
        if (stackKey) {callStack.delete(stackKey);}
        continue;
      }

      const gfxStack = createGraphicsStateStack(elem.graphicsState);
      gfxStack.concatMatrix(matrix);
      if (bbox) {
        gfxStack.setClipBBox(transformBBox(bbox, gfxStack.get().ctm));
      }
      const gfxOps = createGfxOpsFromStack(gfxStack);
      const tokens = tokenizeContentStream(content);
      const parse = createParser(gfxOps, scopedFonts, { extGState: mergedExt });
      const inner = parse(tokens);

      expandInScope(
        inner,
        {
          resources: formResources,
          xObjects: formXObjects ?? scope.xObjects,
          fontMappings: scopedFonts,
          extGState: mergedExt,
        },
        callStack,
        depth + 1,
      );

      if (stackKey) {callStack.delete(stackKey);}
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
    if (!baseFont) {continue;}

    const normalizedName = normalizeBaseFontForMetricsLookup(baseFont);
    const embeddedMetrics = embeddedFontMetrics.get(normalizedName);
    if (!embeddedMetrics) {continue;}

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
        if (opts.includePaths || (opts.includeText && elem.source === "type3")) {
          const masked = rasterizeSoftMaskedFillPath(elem);
          if (masked) {
            elements.push(masked);
            break;
          }
          const pdfPath = convertPath(elem, opts.minPathComplexity);
          if (pdfPath) {elements.push(pdfPath);}
        }
        break;
      case "text":
        if (opts.includeText) {
          const masked = rasterizeSoftMaskedText(elem, fontMappings);
          if (masked) {
            elements.push(masked);
            break;
          }
          const pdfTexts = convertText(elem, fontMappings);
          elements.push(...pdfTexts);
        }
        break;
      case "image":
        break;
    }
  }
  elements.push(...extractedImages.map(applyGraphicsSoftMaskToPdfImage));
  return elements;
}

function convertPath(parsed: ParsedPath, minComplexity: number): PdfPath | null {
  if (parsed.paintOp === "none" || parsed.paintOp === "clip") {return null;}
  const built = buildPath(parsed);
  if (built.operations.length < minComplexity) {return null;}
  const clipBBox = parsed.graphicsState.clipBBox;
  if (clipBBox && !bboxIntersects(built.bounds, clipBBox)) {return null;}
  return builtPathToPdfPath(built);
}

function getFontInfo(fontName: string, fontMappings: FontMappings) {
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;
  const state = { fontInfo: fontMappings.get(cleanName) };
  if (!state.fontInfo) {
    const plusIndex = cleanName.indexOf("+");
    if (plusIndex > 0) {
      state.fontInfo = fontMappings.get(cleanName.slice(plusIndex + 1));
    }
  }
  if (!state.fontInfo) {
    for (const [key, value] of fontMappings.entries()) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        state.fontInfo = value;
        break;
      }
    }
  }
  return state.fontInfo;
}

function convertText(parsed: ParsedText, fontMappings: FontMappings): PdfText[] {
  const mode = parsed.graphicsState.textRenderingMode;
  if (mode === 3 || mode === 7) {
    return [];
  }

  const results: PdfText[] = [];
  const clipBBox = parsed.graphicsState.clipBBox;

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

    if (clipBBox) {
      const bbox: PdfBBox = [run.x, minY, run.x + width, minY + Math.max(textHeight, 1)];
      if (!bboxIntersects(bbox, clipBBox)) {
        continue;
      }
    }

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
