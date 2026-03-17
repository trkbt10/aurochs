/**
 * @file src/pdf/parser/pdf-parser.native.ts
 */

import type { PdfDocument, PdfEmbeddedFont, PdfImage } from "../../domain";
import type { EmbeddedFont } from "../../domain/font/embedded-font";
import { tokenizeContentStream } from "../../domain/content-stream";
import { type FontMappings } from "../../domain/font";
import { createGraphicsStateStack, transformPoint, type PdfBBox, type PdfMatrix } from "../../domain";
import type { NativePdfPage, PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import {
  parseContentStream,
  createParser,
  createGfxOpsFromStack,
  type ParsedElement,
  type ParsedImage,
} from "../operator";
import { extractFontMappingsFromResourcesNative, extractFontMappingsNative } from "../font/font-decoder.native";
import { extractImagesNative } from "../image/image-extractor.native";
import { loadNativePdfDocumentForParser } from "./native-load";
import { extractEmbeddedFontsFromNativePages } from "../../domain/font/font-extractor.native";
import type { PdfLoadEncryption } from "./pdf-load-error";
import {
  extractExtGStateFromResourcesNative,
  extractExtGStateNative,
  type ExtGStateParams,
} from "../graphics-state/ext-gstate.native";
import { extractShadingFromResourcesNative, extractShadingNative } from "../shading/shading.native";
import { extractPatternsFromResourcesNative, extractPatternsNative } from "../pattern/pattern.native";
import { preprocessInlineImages } from "../image/inline-image.native";
import { expandType3TextElementsNative } from "../type3/type3-expand.native";
import { rasterizeFormBBoxClipToMask } from "../clip/form-bbox-clip-mask.native";
import type { PdfShading } from "../shading/shading.types";
import type { PdfPattern } from "../pattern/pattern.types";
import type { JpxDecodeFn } from "../jpeg2000/jpx-decoder";
import { extractColorSpacesFromResourcesNative, type ParsedNamedColorSpace } from "../color/color-space.native";
import { buildPdfFromBuilderContext } from "@aurochs-builder/pdf";

function extractExtGStateFromResourcesNativeOrEmpty(
  page: NativePdfPage,
  resources: PdfDict | null,
  options: Readonly<{ readonly vectorSoftMaskMaxSize?: number; readonly shadingMaxSize: number; readonly jpxDecode?: JpxDecodeFn }>,
): ReadonlyMap<string, ExtGStateParams> {
  if (!resources) {
    return new Map();
  }
  return extractExtGStateFromResourcesNative(page, resources, options);
}

export type PdfParseOptions = {
  readonly pages?: readonly number[];
  /**
   * Optional decoder for `/JPXDecode` (JPEG2000) image streams.
   *
   * When a PDF contains `/JPXDecode` and this is not provided, the parser throws.
   */
  readonly jpxDecode?: JpxDecodeFn;
  /**
   * Enables rasterization for per-pixel `/SMask` groups that contain only vector
   * paths (no images). This sets the maximum `{width,height}` of the generated
   * mask grid.
   *
   * Set to `0` (default) to keep this feature disabled.
   */
  readonly softMaskVectorMaxSize?: number;
  /**
   * Enables rasterization for `sh` (shading fill) operators. This sets the
   * maximum `{width,height}` of the generated shading raster.
   *
   * Set to `0` (default) to keep this feature disabled.
   */
  readonly shadingMaxSize?: number;
  /**
   * Enables per-pixel clip mask generation for `W`/`W*` clipping paths.
   *
   * The value is the maximum of `{width,height}` for the generated clip mask grid.
   * Set to `0` (default) to keep bbox-only clipping.
   */
  readonly clipPathMaxSize?: number;
  readonly encryption?: PdfLoadEncryption;
};

export type PdfBuildOptions = {
  readonly minPathComplexity?: number;
  readonly includeText?: boolean;
  readonly includePaths?: boolean;
};

export type PdfParserOptions = PdfParseOptions & PdfBuildOptions;

export type PdfParsedPage = Readonly<{
  readonly pageNumber: number;
  readonly width: number;
  readonly height: number;
  readonly parsedElements: readonly ParsedElement[];
  readonly extractedImages: readonly PdfImage[];
  readonly fontMappings: FontMappings;
}>;

export type PdfParsedDocument = Readonly<{
  readonly pages: readonly PdfParsedPage[];
  readonly metadata: PdfDocument["metadata"];
  readonly embeddedFonts: readonly PdfEmbeddedFont[] | undefined;
}>;

export type PdfBuildContext = Readonly<{
  readonly parsedDocument: PdfParsedDocument;
  readonly buildOptions: Required<PdfBuildOptions>;
}>;

const DEFAULT_JPX_DECODE: JpxDecodeFn = () => {
  throw new Error("/JPXDecode requires options.jpxDecode");
};

const DEFAULT_PARSE_OPTIONS: Required<PdfParseOptions> = {
  pages: [],
  jpxDecode: DEFAULT_JPX_DECODE,
  softMaskVectorMaxSize: 0,
  shadingMaxSize: 0,
  clipPathMaxSize: 0,
  encryption: { mode: "reject" },
};

const DEFAULT_BUILD_OPTIONS: Required<PdfBuildOptions> = {
  minPathComplexity: 0,
  includeText: true,
  includePaths: true,
};

type ResolvedPdfPipelineOptions = Readonly<{
  readonly parseOptions: Required<PdfParseOptions>;
  readonly buildOptions: Required<PdfBuildOptions>;
}>;

function resolvePdfPipelineOptions(options: PdfParserOptions = {}): ResolvedPdfPipelineOptions {
  const parseOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
  const buildOptions = { ...DEFAULT_BUILD_OPTIONS, ...options };

  if (!Number.isFinite(parseOptions.softMaskVectorMaxSize) || parseOptions.softMaskVectorMaxSize < 0) {
    throw new Error(`softMaskVectorMaxSize must be >= 0 (got ${parseOptions.softMaskVectorMaxSize})`);
  }
  if (!Number.isFinite(parseOptions.shadingMaxSize) || parseOptions.shadingMaxSize < 0) {
    throw new Error(`shadingMaxSize must be >= 0 (got ${parseOptions.shadingMaxSize})`);
  }
  if (!Number.isFinite(parseOptions.clipPathMaxSize) || parseOptions.clipPathMaxSize < 0) {
    throw new Error(`clipPathMaxSize must be >= 0 (got ${parseOptions.clipPathMaxSize})`);
  }

  return { parseOptions, buildOptions };
}











/** Parse a PDF using the native loader (no `pdf-lib`). */
export async function parsePdfNative(
  data: Uint8Array | ArrayBuffer,
  options: PdfParserOptions = {},
): Promise<PdfDocument> {
  const { parseOptions, buildOptions } = resolvePdfPipelineOptions(options);
  const parsedSource = await parsePdfSourceNative(data, parseOptions);
  const context = createPdfBuildContext(parsedSource, buildOptions);
  return buildPdfFromBuilderContext({ context });
}

/** Parser stage: parse bytes into low-level per-page parse artifacts. */
export async function parsePdfSourceNative(
  data: Uint8Array | ArrayBuffer,
  options: PdfParseOptions = {},
): Promise<PdfParsedDocument> {
  const parseOptions = { ...DEFAULT_PARSE_OPTIONS, ...options };
  if (!Number.isFinite(parseOptions.softMaskVectorMaxSize) || parseOptions.softMaskVectorMaxSize < 0) {
    throw new Error(`softMaskVectorMaxSize must be >= 0 (got ${parseOptions.softMaskVectorMaxSize})`);
  }
  if (!Number.isFinite(parseOptions.shadingMaxSize) || parseOptions.shadingMaxSize < 0) {
    throw new Error(`shadingMaxSize must be >= 0 (got ${parseOptions.shadingMaxSize})`);
  }
  if (!Number.isFinite(parseOptions.clipPathMaxSize) || parseOptions.clipPathMaxSize < 0) {
    throw new Error(`clipPathMaxSize must be >= 0 (got ${parseOptions.clipPathMaxSize})`);
  }

  const pdfDoc = await loadNativePdfDocumentForParser(data, {
    purpose: "parse",
    encryption: parseOptions.encryption,
    updateMetadata: false,
  });

  // Extract embedded fonts first to get accurate metrics (best-effort).
  function tryExtractEmbeddedFonts() {
    try {
      return extractEmbeddedFontsFromNativePages(pdfDoc.getPages());
    } catch (error) {
      console.warn("Failed to extract embedded fonts:", error);
      return [];
    }
  }
  const embeddedFontsRaw = tryExtractEmbeddedFonts();

  const embeddedFontMetrics = new Map<string, { ascender: number; descender: number }>();
  for (const font of embeddedFontsRaw) {
    if (font.metrics) {
      embeddedFontMetrics.set(font.fontFamily, font.metrics);
    }
  }

  const pdfPages = pdfDoc.getPages();
  const pagesToParse = resolvePagesToParse(parseOptions.pages, pdfPages.length);

  const pages: PdfParsedPage[] = [];
  for (const pageNum of pagesToParse) {
    const nativePage = pdfPages[pageNum - 1]!;
    const parsedPage = await parsePageSource({ page: nativePage, pageNumber: pageNum, parseOptions, embeddedFontMetrics });
    pages.push(parsedPage);
  }

  const metadata = pdfDoc.getMetadata();

  const embeddedFonts = buildEmbeddedFonts(embeddedFontsRaw);

  return { pages, metadata, embeddedFonts };
}

/** Context stage: combine parser output with explicit builder options. */
export function createPdfBuildContext(
  parsedDocument: PdfParsedDocument,
  options: PdfBuildOptions = {},
): PdfBuildContext {
  if (!parsedDocument) {
    throw new Error("parsedDocument is required");
  }
  const buildOptions = { ...DEFAULT_BUILD_OPTIONS, ...options };
  return {
    parsedDocument,
    buildOptions,
  };
}

function resolvePagesToParse(requested: readonly number[], pageCount: number): readonly number[] {
  if (requested.length > 0) {
    return requested.filter((p) => p >= 1 && p <= pageCount);
  }
  return Array.from({ length: pageCount }, (_, i) => i + 1);
}

/** Convert embedded font toUnicode data. */
function buildToUnicode(toUnicode: EmbeddedFont["toUnicode"]): PdfEmbeddedFont["toUnicode"] {
  if (!toUnicode) { return undefined; }
  return { byteMapping: toUnicode.byteMapping, sourceCodeByteLengths: toUnicode.sourceCodeByteLengths };
}

/** Convert embedded font metrics data. */
function buildMetrics(metrics: EmbeddedFont["metrics"]): PdfEmbeddedFont["metrics"] {
  if (!metrics) { return undefined; }
  return {
    ascender: metrics.ascender,
    descender: metrics.descender,
    widths: metrics.widths ?? new Map(),
    defaultWidth: metrics.defaultWidth ?? 500,
  };
}

function buildEmbeddedFonts(
  embeddedFontsRaw: readonly EmbeddedFont[],
): readonly PdfEmbeddedFont[] | undefined {
  if (embeddedFontsRaw.length === 0) {
    return undefined;
  }
  return embeddedFontsRaw.map((f) => ({
    fontFamily: f.fontFamily,
    format: f.format,
    data: f.data,
    mimeType: f.mimeType,
    baseFontName: f.baseFontName,
    toUnicode: buildToUnicode(f.toUnicode),
    metrics: buildMetrics(f.metrics),
    ordering: f.ordering,
    codeByteWidth: f.codeByteWidth,
  }));
}

type ParsePageOptions = {
  readonly page: NativePdfPage;
  readonly pageNumber: number;
  readonly parseOptions: Required<PdfParseOptions>;
  readonly embeddedFontMetrics: Map<string, { ascender: number; descender: number }>;
};

async function parsePageSource({ page, pageNumber, parseOptions, embeddedFontMetrics }: ParsePageOptions): Promise<PdfParsedPage> {
  const { width, height } = page.getSize();
  const pageBBox: PdfBBox = [0, 0, width, height];

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
    return {
      pageNumber,
      width,
      height,
      parsedElements: [],
      extractedImages: [],
      fontMappings: new Map(),
    };
  }

  const fontMappings = extractFontMappingsNative(page);
  mergeFontMetrics(fontMappings, embeddedFontMetrics);
  const tokens = tokenizeContentStream(contentStream);
  const extGState = extractExtGStateNative(page, {
    vectorSoftMaskMaxSize: parseOptions.softMaskVectorMaxSize > 0 ? parseOptions.softMaskVectorMaxSize : undefined,
    shadingMaxSize: parseOptions.shadingMaxSize > 0 ? parseOptions.shadingMaxSize : 0,
    jpxDecode: parseOptions.jpxDecode,
  });
  const shadings = extractShadingNative(page);
  const patterns = extractPatternsNative(page);
  const colorSpaces = extractColorSpacesFromResourcesNative(page, resources);
  const parsedElements = [
    ...parseContentStream(tokens, fontMappings, {
      extGState,
      shadings,
      patterns,
      colorSpaces,
      shadingMaxSize: parseOptions.shadingMaxSize,
      clipPathMaxSize: parseOptions.clipPathMaxSize,
      pageBBox,
    }),
  ];

  const registerType3XObjectStream = (stream: PdfStream): string => {
    const generateUniqueName = (): string => {
      const candidate = `T3X${nextInlineId()}`;
      return usedNames.has(candidate) ? generateUniqueName() : candidate;
    };
    const name = generateUniqueName();
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
    shadingMaxSize: parseOptions.shadingMaxSize,
    clipPathMaxSize: parseOptions.clipPathMaxSize,
    pageBBox,
    registerXObjectStream: registerType3XObjectStream,
  });

  const mergedXObjects = mergeXObjects(baseXObjects, inlineXObjects);

	  const { elements: expandedElements, imageGroups } = expandFormXObjectsNative({
	    page,
	    parsedElements: parsedWithType3,
	    fontMappings,
	    extGState,
	    shadings,
	    patterns,
	    colorSpaces,
	    shadingMaxSize: parseOptions.shadingMaxSize,
	    clipPathMaxSize: parseOptions.clipPathMaxSize,
	    softMaskVectorMaxSize: parseOptions.softMaskVectorMaxSize,
	    jpxDecode: parseOptions.jpxDecode,
	    pageBBox,
	    embeddedFontMetrics,
	    xObjectsOverride: mergedXObjects,
	    nextInlineId,
	  });

  const images: PdfImage[] = [];
  for (const [xObjects, group] of imageGroups) {
    const extracted = await extractImagesNative({
      pdfPage: page,
      parsedImages: group,
      options: { pageHeight: height, jpxDecode: parseOptions.jpxDecode },
      xObjectsOverride: xObjects,
    });
    images.push(...extracted);
  }

  return {
    pageNumber,
    width,
    height,
    parsedElements: expandedElements,
    extractedImages: images,
    fontMappings,
  };
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

type ImageGroupMap = Map<PdfDict, ParsedImage[]>;

function addImageToGroup(groups: ImageGroupMap, xObjects: PdfDict, img: ParsedImage): void {
  const prev = groups.get(xObjects);
  if (prev) {
    prev.push(img);
    return;
  }
  groups.set(xObjects, [img]);
}

type ExpandFormXObjectsNativeOptions = {
  readonly page: NativePdfPage;
  readonly parsedElements: readonly ParsedElement[];
  readonly fontMappings: FontMappings;
  readonly extGState: ReadonlyMap<string, ExtGStateParams>;
  readonly shadings: ReadonlyMap<string, PdfShading>;
  readonly patterns: ReadonlyMap<string, PdfPattern>;
  readonly colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace>;
  readonly shadingMaxSize: number;
  readonly clipPathMaxSize: number;
  readonly softMaskVectorMaxSize: number;
  readonly jpxDecode: JpxDecodeFn;
  readonly pageBBox: PdfBBox;
  readonly embeddedFontMetrics: Map<string, { ascender: number; descender: number }>;
  readonly xObjectsOverride: PdfDict | null;
  readonly nextInlineId: () => number;
};

function expandFormXObjectsNative({
  page,
  parsedElements,
  fontMappings,
  extGState,
  shadings,
  patterns,
  colorSpaces,
  shadingMaxSize,
  clipPathMaxSize,
  softMaskVectorMaxSize,
  jpxDecode,
  pageBBox,
  embeddedFontMetrics,
  xObjectsOverride,
  nextInlineId,
}: ExpandFormXObjectsNativeOptions): Readonly<{ elements: ParsedElement[]; imageGroups: ImageGroupMap }> {
  const resources = page.getResourcesDict();
  const xObjects = xObjectsOverride ?? (resources ? resolveDict(page, dictGet(resources, "XObject")) : null);
  const outElements: ParsedElement[] = [];
  const imageGroups: ImageGroupMap = new Map();

  const mergeShadings = (base: ReadonlyMap<string, PdfShading>, local: ReadonlyMap<string, PdfShading>): ReadonlyMap<string, PdfShading> => {
    if (base.size === 0 && local.size === 0) {return new Map();}
    const merged = new Map<string, PdfShading>(base);
    for (const [k, v] of local) {merged.set(k, v);}
    return merged;
  };

  const mergePatterns = (base: ReadonlyMap<string, PdfPattern>, local: ReadonlyMap<string, PdfPattern>): ReadonlyMap<string, PdfPattern> => {
    if (base.size === 0 && local.size === 0) {return new Map();}
    const merged = new Map<string, PdfPattern>(base);
    for (const [k, v] of local) {merged.set(k, v);}
    return merged;
  };

  const mergeColorSpaces = (
    base: ReadonlyMap<string, ParsedNamedColorSpace>,
    local: ReadonlyMap<string, ParsedNamedColorSpace>,
  ): ReadonlyMap<string, ParsedNamedColorSpace> => {
    if (base.size === 0 && local.size === 0) {return new Map();}
    const merged = new Map(base);
    for (const [k, v] of local) {merged.set(k, v);}
    return merged;
  };

  type ExpandInScopeOptions = Readonly<{
    readonly elements: readonly ParsedElement[];
    readonly scope: Readonly<{
      readonly resources: PdfDict | null;
      readonly xObjects: PdfDict | null;
      readonly fontMappings: FontMappings;
      readonly extGState: ReadonlyMap<string, ExtGStateParams>;
      readonly shadings: ReadonlyMap<string, PdfShading>;
      readonly patterns: ReadonlyMap<string, PdfPattern>;
      readonly colorSpaces: ReadonlyMap<string, ParsedNamedColorSpace>;
    }>;
    readonly callStack: Set<string>;
    readonly depth: number;
  }>;

  const expandInScope = ({ elements, scope, callStack, depth }: ExpandInScopeOptions): void => {
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

      const vectorSoftMaskMaxSize = softMaskVectorMaxSize > 0 ? softMaskVectorMaxSize : undefined;
      const localShadingMaxSize = shadingMaxSize > 0 ? shadingMaxSize : 0;
      const localExt = extractExtGStateFromResourcesNativeOrEmpty(page, formResources, {
        vectorSoftMaskMaxSize,
        shadingMaxSize: localShadingMaxSize,
        jpxDecode,
      });
      const mergedExt = new Map(scope.extGState);
      for (const [k, v] of localExt) {mergedExt.set(k, v);}

      const localShadings = formResources ? extractShadingFromResourcesNative(page, formResources) : new Map();
      const mergedShadings = mergeShadings(scope.shadings, localShadings);

      const localPatterns = formResources ? extractPatternsFromResourcesNative(page, formResources) : new Map();
      const mergedPatterns = mergePatterns(scope.patterns, localPatterns);
      const localColorSpaces = extractColorSpacesFromResourcesNative(page, formResources);
      const mergedColorSpaces = mergeColorSpaces(scope.colorSpaces, localColorSpaces);

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
        if (clipPathMaxSize > 0) {
          const mask = rasterizeFormBBoxClipToMask(gfxStack.get(), bbox, { clipPathMaxSize });
          if (mask) {
            gfxStack.setClipMask(mask);
          }
        }
      }
      const gfxOps = createGfxOpsFromStack(gfxStack);
      const tokens = tokenizeContentStream(content);
      const parse = createParser(gfxOps, scopedFonts, {
        extGState: mergedExt,
        shadings: mergedShadings,
        patterns: mergedPatterns,
        colorSpaces: mergedColorSpaces,
        shadingMaxSize,
        clipPathMaxSize,
        pageBBox,
      });
      const inner = parse(tokens);

      expandInScope({
        elements: inner,
        scope: {
          resources: formResources,
          xObjects: formXObjects ?? scope.xObjects,
          fontMappings: scopedFonts,
          extGState: mergedExt,
          shadings: mergedShadings,
          patterns: mergedPatterns,
          colorSpaces: mergedColorSpaces,
        },
        callStack,
        depth: depth + 1,
      });

      if (stackKey) {callStack.delete(stackKey);}
    }
  };

  expandInScope({
    elements: parsedElements,
    scope: { resources, xObjects: xObjects ?? null, fontMappings, extGState, shadings, patterns, colorSpaces },
    callStack: new Set(),
    depth: 0,
  });

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
