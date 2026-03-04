/**
 * @file src/pdf/parser/font-decoder.native.ts
 */

import type { NativePdfPage } from "../../native";
import type { PdfArray, PdfDict, PdfName, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import type { PdfMatrix } from "../../domain";
import { tokenizeContentStream } from "../../domain/content-stream";
import type { CMapParseResult, FontInfo, FontMappings, FontMetrics } from "../../domain/font";
import {
  DEFAULT_FONT_METRICS,
  detectCIDOrdering,
  decodeCIDFallback,
  getEncodingByName,
  applyEncodingDifferences,
  glyphNameToUnicode,
  isBoldFont,
  isItalicFont,
  parseToUnicodeCMap,
  type CIDOrdering,
  type CMapParserOptions,
} from "../../domain/font";
import { parseCffCidCharset } from "../../domain/font/cff/cff-cid-parser";
import {
  buildCidCodeToUnicodeFallbackMap,
  extractGlyphIdToUnicodeFromTrueTypeLikeFont,
  type CidToGidMapping,
} from "../../domain/font/decoding/cid-glyph-fallback";
import {
  hasExplicitIdentityRos,
  inferOrderingFromCidCoverage,
  isDenseLowRangeIdentityCidMap,
} from "./cid-ordering-heuristics";

export type NativeFontExtractionOptions = {
  readonly cmapOptions?: CMapParserOptions;
};

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
}
function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) {return undefined;}
  return page.lookup(obj);
}

function resolveDict(page: NativePdfPage, obj: PdfObject | undefined): PdfDict | null {
  const v = resolve(page, obj);
  return asDict(v);
}

function getResources(page: NativePdfPage): PdfDict | null {
  return page.getResourcesDict();
}

function getFontDict(page: NativePdfPage, resources: PdfDict): PdfDict | null {
  const font = resolve(page, dictGet(resources, "Font"));
  return asDict(font);
}

function parseToUnicodeFromStream(stream: PdfStream, cmapOptions?: CMapParserOptions) {
  const decoded = decodePdfStream(stream);
  const cmapData = new TextDecoder("latin1").decode(decoded);
  return parseToUnicodeCMap(cmapData, cmapOptions);
}

function resolveSuspectedToUnicodeCause(args: {
  readonly hasStructuralIssue: boolean;
  readonly hasHighCorruptionSignal: boolean;
}): "likely-source-tounicode-corrupted" | "needs-implementation-review" {
  if (!args.hasStructuralIssue && args.hasHighCorruptionSignal) {
    return "likely-source-tounicode-corrupted";
  }
  return "needs-implementation-review";
}

function formatSourceLengthHistogram(histogram: ReadonlyMap<number, number>): string {
  const entries = [...histogram.entries()].sort((a, b) => b[0] - a[0]);
  if (entries.length === 0) {
    return "none";
  }
  return entries.map(([length, count]) => `${length}:${count}`).join(",");
}

function maybeWarnSuspiciousToUnicode(
  fontName: string,
  baseFont: string | undefined,
  toUnicode: CMapParseResult | null,
): void {
  if (!toUnicode || toUnicode.byteMapping.size === 0) {
    return;
  }

  const diagnostics = toUnicode.diagnostics;
  const total = toUnicode.byteMapping.size;
  const replacementRatio = diagnostics.replacementCharMapCount / total;
  const privateUseRatio = diagnostics.privateUseCharMapCount / total;
  const hasStructuralIssue =
    diagnostics.invalidEntryCount > 0 ||
    diagnostics.truncatedRangeCount > 0 ||
    diagnostics.sourceLengthOutsideCodeSpaceCount > 0;
  const hasHighCorruptionSignal = replacementRatio >= 0.5 || privateUseRatio >= 0.5;
  const suspectedCause = resolveSuspectedToUnicodeCause({
    hasStructuralIssue,
    hasHighCorruptionSignal,
  });
  const isSuspicious =
    hasStructuralIssue || hasHighCorruptionSignal;
  if (!isSuspicious) {
    return;
  }

  const baseFontLabel = baseFont ?? "(unknown)";
  const sourceLengthHistogram = formatSourceLengthHistogram(diagnostics.sourceCodeLengthHistogram);
  console.warn(
    `[PDF ToUnicode] suspicious mapping for ${fontName} base=${baseFontLabel}: ` +
      `entries=${total}, invalid=${diagnostics.invalidEntryCount}, truncated=${diagnostics.truncatedRangeCount}, ` +
      `outsideCodespace=${diagnostics.sourceLengthOutsideCodeSpaceCount}, ` +
      `replacement=${diagnostics.replacementCharMapCount}, pua=${diagnostics.privateUseCharMapCount}, ` +
      `sourceLengthHistogram=${sourceLengthHistogram}, ` +
      `suspectedCause=${suspectedCause}`
  );
}

function isSeverelyCorruptedToUnicode(toUnicode: CMapParseResult | null): boolean {
  if (!toUnicode || toUnicode.byteMapping.size === 0) {
    return false;
  }
  const diagnostics = toUnicode.diagnostics;
  const total = toUnicode.byteMapping.size;
  const replacementRatio = diagnostics.replacementCharMapCount / total;
  const privateUseRatio = diagnostics.privateUseCharMapCount / total;
  return replacementRatio >= 0.5 || privateUseRatio >= 0.5;
}

function maybeWarnUnrecoverableIdentityCorruption(args: {
  readonly fontName: string;
  readonly baseFont: string | undefined;
  readonly ordering: CIDOrdering | null;
  readonly toUnicode: CMapParseResult | null;
  readonly cidCodeToUnicodeFallbackMap: ReadonlyMap<number, string> | undefined;
}): void {
  const {
    fontName,
    baseFont,
    ordering,
    toUnicode,
    cidCodeToUnicodeFallbackMap,
  } = args;
  if (ordering !== "Identity") {
    return;
  }
  if (!isSeverelyCorruptedToUnicode(toUnicode)) {
    return;
  }
  if (cidCodeToUnicodeFallbackMap && cidCodeToUnicodeFallbackMap.size > 0) {
    return;
  }

  const diagnostics = toUnicode?.diagnostics;
  const total = toUnicode?.byteMapping.size ?? 0;
  const replacement = diagnostics?.replacementCharMapCount ?? 0;
  const pua = diagnostics?.privateUseCharMapCount ?? 0;
  console.warn(
    `[PDF ToUnicode] unrecoverable Identity mapping for ${fontName} base=${baseFont ?? "(unknown)"}: ` +
      `entries=${total}, replacement=${replacement}, pua=${pua}. ` +
      "No reliable CID->Unicode fallback is available; extraction will keep replacement characters."
  );
}

function inferCodeByteWidth(
  page: NativePdfPage,
  fontDict: PdfDict,
  toUnicode: CMapParseResult | null,
): 1 | 2 {
  const fromToUnicode = toUnicode?.codeByteWidth;
  if (fromToUnicode === 1 || fromToUnicode === 2) {
    return fromToUnicode;
  }

  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") {
    return 1;
  }

  // Type0 (composite) fonts are typically multi-byte. For the common Identity-H/V CMaps,
  // character codes are 2 bytes (big-endian) and correspond to CIDs.
  const encodingObj = resolve(page, dictGet(fontDict, "Encoding"));
  if (encodingObj?.type === "name") {
    const encName = encodingObj.value;
    if (encName === "Identity-H" || encName === "Identity-V") {
      return 2;
    }
  }

  // Fallback: treat Type0 fonts as 2-byte. This enables CID-ordering fallback
  // decoding when ToUnicode is missing (common in some Japanese PDFs).
  return 2;
}

function inferWritingMode(page: NativePdfPage, fontDict: PdfDict): 0 | 1 {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") {
    return 0;
  }

  const encodingObj = resolve(page, dictGet(fontDict, "Encoding"));
  const encodingName = encodingObj?.type === "name" ? encodingObj.value : "";
  return encodingName.endsWith("-V") ? 1 : 0;
}

function findToUnicodeStream(page: NativePdfPage, fontDict: PdfDict): PdfStream | null {
  const direct = resolve(page, dictGet(fontDict, "ToUnicode"));
  const directStream = asStream(direct);
  if (directStream) {return directStream;}

  // Type0: ToUnicode may be on DescendantFonts[0]
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") {return null;}

  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) {return null;}
  const first = resolve(page, arr.items[0]);
  const cidDict = asDict(first);
  if (!cidDict) {return null;}
  const tu = resolve(page, dictGet(cidDict, "ToUnicode"));
  return asStream(tu);
}

function extractBaseFontName(page: NativePdfPage, fontDict: PdfDict): string | undefined {
  const base = resolve(page, dictGet(fontDict, "BaseFont"));
  if (base?.type === "name") {return `/${base.value}`;}
  if (base?.type === "string") {return base.text;}
  return undefined;
}

function normalizeBaseFontKey(baseFont: string): string {
  const clean = baseFont.startsWith("/") ? baseFont.slice(1) : baseFont;
  const plusIndex = clean.indexOf("+");
  return plusIndex > 0 ? clean.slice(plusIndex + 1) : clean;
}

function extractType0DescendantFontDict(page: NativePdfPage, fontDict: PdfDict): PdfDict | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") {return null;}

  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) {return null;}
  const first = resolve(page, arr.items[0]);
  return asDict(first);
}

function extractCIDOrderingFromFontDict(page: NativePdfPage, fontDict: PdfDict): CIDOrdering | null {
  const cidFont = extractType0DescendantFontDict(page, fontDict);
  if (!cidFont) {return null;}

  const cidSystemInfo = resolveDict(page, dictGet(cidFont, "CIDSystemInfo"));
  if (!cidSystemInfo) {return null;}

  const orderingObj = resolve(page, dictGet(cidSystemInfo, "Ordering"));
  const orderingStr = extractCIDOrderingString(orderingObj);
  if (!orderingStr) {return null;}
  return detectCIDOrdering(orderingStr);
}

function extractEmbeddedTrueTypeLikeFontData(page: NativePdfPage, fontDict: PdfDict): Uint8Array | null {
  const descriptor = extractFontDescriptor(page, fontDict);
  if (!descriptor) {
    return null;
  }

  const fontFile2 = asStream(resolve(page, dictGet(descriptor, "FontFile2")));
  if (fontFile2) {
    return decodePdfStream(fontFile2);
  }

  const fontFile3 = asStream(resolve(page, dictGet(descriptor, "FontFile3")));
  if (!fontFile3) {
    return null;
  }

  const streamSubtype = asName(dictGet(fontFile3.dict, "Subtype"))?.value ?? "";
  if (streamSubtype !== "OpenType") {
    return null;
  }
  return decodePdfStream(fontFile3);
}

function extractEmbeddedCidFontType0CData(page: NativePdfPage, fontDict: PdfDict): Uint8Array | null {
  const descriptor = extractFontDescriptor(page, fontDict);
  if (!descriptor) {
    return null;
  }

  const fontFile3 = asStream(resolve(page, dictGet(descriptor, "FontFile3")));
  if (!fontFile3) {
    return null;
  }

  const streamSubtype = asName(dictGet(fontFile3.dict, "Subtype"))?.value ?? "";
  if (streamSubtype !== "CIDFontType0C") {
    return null;
  }

  return decodePdfStream(fontFile3);
}

function extractCidToGidMapping(page: NativePdfPage, fontDict: PdfDict): CidToGidMapping | null {
  const cidFont = extractType0DescendantFontDict(page, fontDict);
  if (!cidFont) {
    return null;
  }

  const cidToGid = resolve(page, dictGet(cidFont, "CIDToGIDMap"));
  if (!cidToGid) {
    return { kind: "identity" };
  }
  if (cidToGid.type === "name" && cidToGid.value === "Identity") {
    return { kind: "identity" };
  }
  const stream = asStream(cidToGid);
  if (!stream) {
    return null;
  }
  return { kind: "table", bytes: decodePdfStream(stream) };
}

function buildCidFallbackMapFromCffCidCharset(args: {
  readonly cidToGid: CidToGidMapping;
  readonly gidToCid: ReadonlyMap<number, number>;
  readonly ordering: Exclude<CIDOrdering, "Identity">;
}): ReadonlyMap<number, string> {
  const {
    cidToGid,
    gidToCid,
    ordering,
  } = args;

  const fallback = new Map<number, string>();
  const decodeFromGid = (cidCode: number, gid: number): void => {
    if (gid <= 0) {
      return;
    }
    const cid = gidToCid.get(gid);
    if (cid === undefined || cid <= 0) {
      return;
    }
    const unicode = decodeCIDFallback(cid, ordering);
    if (!unicode) {
      return;
    }
    fallback.set(cidCode, unicode);
  };

  if (cidToGid.kind === "identity") {
    for (const [gid] of gidToCid.entries()) {
      if (!Number.isInteger(gid) || gid <= 0 || gid > 0xffff) {
        continue;
      }
      decodeFromGid(gid, gid);
    }
    return fallback;
  }

  const pairCount = Math.floor(cidToGid.bytes.length / 2);
  const view = new DataView(cidToGid.bytes.buffer, cidToGid.bytes.byteOffset, cidToGid.bytes.byteLength);
  for (let cidCode = 0; cidCode < pairCount; cidCode += 1) {
    const gid = view.getUint16(cidCode * 2, false);
    decodeFromGid(cidCode, gid);
  }
  return fallback;
}

type CffFallbackOrderingResolution = Readonly<{
  ordering: Exclude<CIDOrdering, "Identity">;
  source: "font-ordering" | "cff-ros" | "cid-coverage-heuristic";
  coverageScores?: ReadonlyMap<Exclude<CIDOrdering, "Identity">, number>;
}>;

function resolveCffFallbackOrdering(args: {
  readonly fontOrdering: CIDOrdering | undefined;
  readonly cffRosOrdering: string | undefined;
  readonly gidToCid: ReadonlyMap<number, number>;
  readonly allowIdentityHeuristic: boolean;
}): CffFallbackOrderingResolution | undefined {
  const {
    fontOrdering,
    cffRosOrdering,
    gidToCid,
    allowIdentityHeuristic,
  } = args;
  if (fontOrdering && fontOrdering !== "Identity") {
    return {
      ordering: fontOrdering,
      source: "font-ordering",
    };
  }

  if (cffRosOrdering) {
    const detected = detectCIDOrdering(cffRosOrdering);
    if (detected && detected !== "Identity") {
      return {
        ordering: detected,
        source: "cff-ros",
      };
    }
  }

  if (!allowIdentityHeuristic) {
    return undefined;
  }
  const inferred = inferOrderingFromCidCoverage(gidToCid);
  if (!inferred) {
    return undefined;
  }
  return {
    ordering: inferred.ordering,
    source: "cid-coverage-heuristic",
    coverageScores: inferred.coverageScores,
  };
}

function formatCoverageScores(scores: ReadonlyMap<Exclude<CIDOrdering, "Identity">, number> | undefined): string {
  if (!scores || scores.size === 0) {
    return "none";
  }
  return [...scores.entries()]
    .map(([ordering, score]) => `${ordering}:${score.toFixed(3)}`)
    .join(",");
}

function buildCidCodeToUnicodeFallbackFromFont(args: {
  readonly page: NativePdfPage;
  readonly fontDict: PdfDict;
  readonly ordering: CIDOrdering | undefined;
  readonly fontName: string;
  readonly baseFont: string | undefined;
  readonly allowIdentityHeuristic: boolean;
}): ReadonlyMap<number, string> | undefined {
  const {
    page,
    fontDict,
    ordering,
    fontName,
    baseFont,
    allowIdentityHeuristic,
  } = args;
  const cidToGid = extractCidToGidMapping(page, fontDict);
  if (!cidToGid) {
    return undefined;
  }

  const fontData = extractEmbeddedTrueTypeLikeFontData(page, fontDict);
  if (fontData) {
    const glyphIdToUnicode = extractGlyphIdToUnicodeFromTrueTypeLikeFont(fontData);
    if (glyphIdToUnicode.size > 0) {
      const fallback = buildCidCodeToUnicodeFallbackMap({
        cidToGid,
        glyphIdToUnicode,
      });
      if (fallback.size > 0) {
        return fallback;
      }
    }
  }

  const cffData = extractEmbeddedCidFontType0CData(page, fontDict);
  if (!cffData) {
    return undefined;
  }
  const parsedCff = parseCffCidCharset(cffData);
  if (!parsedCff || parsedCff.gidToCid.size === 0) {
    return undefined;
  }

  const hasIdentityRos = hasExplicitIdentityRos(parsedCff.ros?.ordering);
  const hasDenseLowRangeIdentityCidMap = isDenseLowRangeIdentityCidMap(parsedCff.gidToCid);
  const allowCoverageHeuristic = allowIdentityHeuristic && !hasIdentityRos && !hasDenseLowRangeIdentityCidMap;
  if (allowIdentityHeuristic && (hasIdentityRos || hasDenseLowRangeIdentityCidMap)) {
    const reason = hasIdentityRos ? "cff-ros-identity" : "dense-low-range-identity-cid-map";
    console.warn(
      `[PDF ToUnicode] skipping CID ordering heuristic for ${fontName} base=${baseFont ?? "(unknown)"} ` +
      `reason=${reason}`
    );
  }

  const orderingResolution = resolveCffFallbackOrdering({
    fontOrdering: ordering,
    cffRosOrdering: parsedCff.ros?.ordering,
    gidToCid: parsedCff.gidToCid,
    allowIdentityHeuristic: allowCoverageHeuristic,
  });
  if (!orderingResolution) {
    return undefined;
  }
  if (orderingResolution.source === "cff-ros" && (!ordering || ordering === "Identity")) {
    console.warn(
      `[PDF ToUnicode] using CFF ROS ordering ${orderingResolution.ordering} for ${fontName} base=${baseFont ?? "(unknown)"}`
    );
  }
  if (orderingResolution.source === "cid-coverage-heuristic") {
    console.warn(
      `[PDF ToUnicode] inferred CID ordering ${orderingResolution.ordering} for ${fontName} base=${baseFont ?? "(unknown)"} ` +
      `from CID coverage scores=${formatCoverageScores(orderingResolution.coverageScores)}`
    );
  }

  const cffFallback = buildCidFallbackMapFromCffCidCharset({
    cidToGid,
    gidToCid: parsedCff.gidToCid,
    ordering: orderingResolution.ordering,
  });
  if (cffFallback.size === 0) {
    return undefined;
  }
  return cffFallback;
}

function extractCIDOrderingString(orderingObj: PdfObject | undefined): string | null {
  if (orderingObj?.type === "string") {
    return orderingObj.text;
  }
  if (orderingObj?.type === "name") {
    return orderingObj.value;
  }
  return null;
}

function extractEncodingMap(page: NativePdfPage, fontDict: PdfDict): ReadonlyMap<number, string> | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype === "Type0") {return null;}

  const encodingObj = resolve(page, dictGet(fontDict, "Encoding"));
  if (!encodingObj) {return null;}

  if (encodingObj.type === "name") {
    return getEncodingByName(`/${encodingObj.value}`) ?? null;
  }

  const encDict = asDict(encodingObj);
  if (!encDict) {return null;}

  const baseEncObj = resolve(page, dictGet(encDict, "BaseEncoding"));
  const baseEnc =
    baseEncObj?.type === "name" ? (getEncodingByName(`/${baseEncObj.value}`) ?? null) : null;
  const working = new Map<number, string>(baseEnc ?? []);

  const diffsObj = resolve(page, dictGet(encDict, "Differences"));
  const diffsArr = asArray(diffsObj);
  if (!diffsArr) {
    return working.size > 0 ? working : null;
  }

  const diffs: (number | string)[] = [];
  for (const item of diffsArr.items) {
    if (item.type === "number") {
      diffs.push(Math.trunc(item.value));
    } else if (item.type === "name") {
      diffs.push(`/${item.value}`);
    }
  }

  const applied = applyEncodingDifferences(working, diffs);
  // Convert glyph names to unicode strings where possible.
  const unicodeMap = new Map<number, string>();
  for (const [code, glyph] of applied.entries()) {
    const uni = glyphNameToUnicode(glyph);
    if (uni) {unicodeMap.set(code, uni);}
  }
  return unicodeMap.size > 0 ? unicodeMap : null;
}

function extractFontDescriptor(page: NativePdfPage, fontDict: PdfDict): PdfDict | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype === "Type0") {
    const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
    const arr = asArray(descendants);
    if (!arr || arr.items.length === 0) {return null;}
    const first = resolve(page, arr.items[0]);
    const cidFont = asDict(first);
    if (!cidFont) {return null;}
    return resolveDict(page, dictGet(cidFont, "FontDescriptor"));
  }

  return resolveDict(page, dictGet(fontDict, "FontDescriptor"));
}

function computeBoldItalic(baseFont: string | undefined, descriptor: PdfDict | null): { isBold?: boolean; isItalic?: boolean } {
  const name = baseFont ?? "";
  const state = { isBold: isBoldFont(name), isItalic: isItalicFont(name) };

  if (descriptor) {
    const flags = asNumber(dictGet(descriptor, "Flags"));
    if (flags != null) {
      // bit 18 (0x40000) for ForceBold sometimes used; but commonly bit 6 (0x40) for Italic
      // We'll keep it minimal and consistent with previous heuristic.
      if ((flags & 0x40) !== 0) {state.isItalic = true;}
    }
    const weight = asNumber(dictGet(descriptor, "FontWeight"));
    if (weight != null && weight >= 700) {state.isBold = true;}
    const italicAngle = asNumber(dictGet(descriptor, "ItalicAngle"));
    if (italicAngle != null && italicAngle !== 0) {state.isItalic = true;}
  }

  return state;
}

function extractSimpleFontWidths(page: NativePdfPage, fontDict: PdfDict): Pick<FontMetrics, "widths" | "defaultWidth"> {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  function computeWidthScale(): number {
    if (subtype !== "Type3") {return 1;}
    const fontMatrix = extractType3FontMatrix(page, fontDict);
    if (!fontMatrix) {return 1;}
    const [a, b, c, d] = fontMatrix;
    if (b !== 0 || c !== 0 || a <= 0 || d <= 0) {return 1;}
    // Type3 widths are in glyph space units; convert to "per 1000 em" units used by our text layout.
    // For the common FontMatrix [0.001 0 0 0.001 0 0], this becomes a no-op scale of 1.
    return a * 1000;
  }
  const widthScale = computeWidthScale();

  const firstChar = asNumber(resolve(page, dictGet(fontDict, "FirstChar")));
  const widthsObj = resolve(page, dictGet(fontDict, "Widths"));
  if (firstChar == null || !widthsObj || widthsObj.type !== "array") {
    return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };
  }
  const widths = new Map<number, number>();
  for (let i = 0; i < widthsObj.items.length; i += 1) {
    const w = widthsObj.items[i];
    if (!w || w.type !== "number") {continue;}
    widths.set(Math.trunc(firstChar) + i, w.value * widthScale);
  }
  return { widths, defaultWidth: DEFAULT_FONT_METRICS.defaultWidth * widthScale };
}

function extractCidFontWidths(page: NativePdfPage, fontDict: PdfDict): Pick<FontMetrics, "widths" | "defaultWidth"> {
  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) {return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };}

  const cid = resolve(page, arr.items[0]);
  const cidDict = asDict(cid);
  if (!cidDict) {return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };}

  const defaultWidth = asNumber(resolve(page, dictGet(cidDict, "DW"))) ?? DEFAULT_FONT_METRICS.defaultWidth;
  const widths = new Map<number, number>();
  const wObj = resolve(page, dictGet(cidDict, "W"));
  const wArr = asArray(wObj);
  if (!wArr) {return { widths, defaultWidth };}

  // W array format: [cFirst [w1 w2 ...] cFirst2 cLast2 w ...]
  for (let i = 0; i < wArr.items.length; ) {
    const first = wArr.items[i];
    if (!first || first.type !== "number") {break;}
    const cFirst = Math.trunc(first.value);
    const second = wArr.items[i + 1];
    if (!second) {break;}
    if (second.type === "array") {
      for (let j = 0; j < second.items.length; j += 1) {
        const w = second.items[j];
        if (w?.type === "number") {widths.set(cFirst + j, w.value);}
      }
      i += 2;
      continue;
    }
    if (second.type === "number") {
      const cLast = Math.trunc(second.value);
      const w = wArr.items[i + 2];
      if (w?.type === "number") {
        for (let c = cFirst; c <= cLast; c += 1) {widths.set(c, w.value);}
      }
      i += 3;
      continue;
    }
    break;
  }

  return { widths, defaultWidth };
}

function extractCidVerticalDisplacements(
  page: NativePdfPage,
  fontDict: PdfDict,
): Readonly<{ displacements: ReadonlyMap<number, number>; defaultDisplacement: number }> | undefined {
  const cidDict = extractType0DescendantFontDict(page, fontDict);
  if (!cidDict) {return undefined;}
  const resolvedCidDict = cidDict;

  function resolveDefaultVerticalDisplacement(target: PdfDict): number {
    const dw2Obj = resolve(page, dictGet(target, "DW2"));
    const dw2Arr = asArray(dw2Obj);
    if (!dw2Arr || dw2Arr.items.length <= 1) {
      return -1000;
    }
    const value = asNumber(resolve(page, dw2Arr.items[1]));
    return value ?? -1000;
  }
  const defaultDisplacement = resolveDefaultVerticalDisplacement(resolvedCidDict);

  const displacements = new Map<number, number>();
  const w2Obj = resolve(page, dictGet(resolvedCidDict, "W2"));
  const w2Arr = asArray(w2Obj);
  if (!w2Arr) {
    return { displacements, defaultDisplacement };
  }

  for (let i = 0; i < w2Arr.items.length; ) {
    const first = resolve(page, w2Arr.items[i]);
    if (!first || first.type !== "number") {break;}
    const cFirst = Math.trunc(first.value);
    const second = resolve(page, w2Arr.items[i + 1]);
    if (!second) {break;}

    // Format 1: c [w1y v1x v1y w1y v1x v1y ...]
    if (second.type === "array") {
      for (let j = 0; j + 2 < second.items.length; j += 3) {
        const w1yObj = resolve(page, second.items[j]);
        if (w1yObj?.type === "number") {
          displacements.set(cFirst + Math.trunc(j / 3), w1yObj.value);
        }
      }
      i += 2;
      continue;
    }

    // Format 2: cFirst cLast w1y v1x v1y
    if (second.type === "number") {
      const cLast = Math.trunc(second.value);
      const w1yObj = resolve(page, w2Arr.items[i + 2]);
      const w1y = w1yObj?.type === "number" ? w1yObj.value : null;
      if (w1y != null) {
        for (let cid = cFirst; cid <= cLast; cid += 1) {
          displacements.set(cid, w1y);
        }
      }
      i += 5;
      continue;
    }

    break;
  }

  return { displacements, defaultDisplacement };
}

function extractFontMetrics(page: NativePdfPage, fontDict: PdfDict): FontMetrics {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  const descriptor = extractFontDescriptor(page, fontDict);

  const ascender = asNumber(resolve(page, dictGet(descriptor ?? fontDict, "Ascent"))) ?? DEFAULT_FONT_METRICS.ascender;
  const descender = asNumber(resolve(page, dictGet(descriptor ?? fontDict, "Descent"))) ?? DEFAULT_FONT_METRICS.descender;

  const { widths, defaultWidth } =
    subtype === "Type0" ? extractCidFontWidths(page, fontDict) : extractSimpleFontWidths(page, fontDict);

  // Some PDFs omit widths; keep defaults.
  return {
    widths,
    defaultWidth,
    ascender,
    descender,
  };
}

function extractType3FontMatrix(page: NativePdfPage, fontDict: PdfDict): PdfMatrix | null {
  const fmObj = resolve(page, dictGet(fontDict, "FontMatrix"));
  const fm = asArray(fmObj);
  if (!fm || fm.items.length !== 6) {return null;}

  const [i0, i1, i2, i3, i4, i5] = fm.items;
  const n0 = asNumber(resolve(page, i0));
  const n1 = asNumber(resolve(page, i1));
  const n2 = asNumber(resolve(page, i2));
  const n3 = asNumber(resolve(page, i3));
  const n4 = asNumber(resolve(page, i4));
  const n5 = asNumber(resolve(page, i5));
  if (n0 == null || n1 == null || n2 == null || n3 == null || n4 == null || n5 == null) {return null;}
  if (!Number.isFinite(n0) || !Number.isFinite(n1) || !Number.isFinite(n2) || !Number.isFinite(n3) || !Number.isFinite(n4) || !Number.isFinite(n5)) {
    return null;
  }
  return [n0, n1, n2, n3, n4, n5];
}

function computeType3WidthScale(fontMatrix: PdfMatrix): number {
  const [a, b, c, d] = fontMatrix;
  if (b !== 0 || c !== 0 || a <= 0 || d <= 0) {return 1;}
  return a * 1000;
}

function extractType3CodeToCharName(page: NativePdfPage, fontDict: PdfDict): ReadonlyMap<number, string> {
  const encodingObj = resolve(page, dictGet(fontDict, "Encoding"));
  const encDict = asDict(encodingObj);
  if (!encDict) {return new Map();}

  const diffsObj = resolve(page, dictGet(encDict, "Differences"));
  const diffsArr = asArray(diffsObj);
  if (!diffsArr) {return new Map();}

  type DiffsAccumulator = Readonly<{ currentCode: number; map: ReadonlyMap<number, string> }>;
  const result = diffsArr.items.reduce<DiffsAccumulator>(
    (acc, item) => {
      if (item.type === "number") {
        return { ...acc, currentCode: Math.trunc(item.value) };
      }
      if (item.type === "name") {
        const newMap = new Map(acc.map);
        newMap.set(acc.currentCode, item.value);
        return { currentCode: acc.currentCode + 1, map: newMap };
      }
      return acc;
    },
    { currentCode: 0, map: new Map() },
  );
  return result.map;
}

function extractType3CharProcs(page: NativePdfPage, fontDict: PdfDict): ReadonlyMap<string, Uint8Array> {
  const charProcsObj = resolve(page, dictGet(fontDict, "CharProcs"));
  const charProcs = asDict(charProcsObj);
  if (!charProcs) {return new Map();}

  const out = new Map<string, Uint8Array>();
  for (const [glyphName, refOrObj] of charProcs.map.entries()) {
    const resolved = resolve(page, refOrObj);
    const stream = asStream(resolved);
    if (!stream) {continue;}
    out.set(glyphName, decodePdfStream(stream));
  }
  return out;
}

function extractType3CharProcWidth(procBytes: Uint8Array): number | null {
  const content = new TextDecoder("latin1").decode(procBytes);
  const tokens = tokenizeContentStream(content);

  const operandStack: Array<number | string | readonly (number | string)[]> = [];

  const popNumberFromStack = (): number | null => {
    const v = operandStack.pop();
    if (typeof v !== "number") {return null;}
    if (!Number.isFinite(v)) {return null;}
    return v;
  };

  for (const token of tokens) {
    switch (token.type) {
      case "number":
        operandStack.push(token.value as number);
        break;
      case "string":
      case "name":
        operandStack.push(token.value as string);
        break;
      case "operator": {
        const op = token.value as string;
        if (op === "d0") {
          const wy = popNumberFromStack();
          const wx = popNumberFromStack();
          operandStack.length = 0;
          return wx != null && wy != null ? wx : null;
        }
        if (op === "d1") {
          const ury = popNumberFromStack();
          const urx = popNumberFromStack();
          const lly = popNumberFromStack();
          const llx = popNumberFromStack();
          const wy = popNumberFromStack();
          const wx = popNumberFromStack();
          operandStack.length = 0;
          return wx != null && wy != null && llx != null && lly != null && urx != null && ury != null ? wx : null;
        }
        operandStack.length = 0;
        break;
      }
      default:
        break;
    }
  }

  return null;
}

function applyType3CharProcWidths(info: FontInfo): FontInfo {
  const type3 = info.type3;
  if (!type3) {return info;}

  const widthScale = computeType3WidthScale(type3.fontMatrix);
  const mergedWidths = new Map(info.metrics.widths);

  for (const [code, glyphName] of type3.codeToCharName.entries()) {
    if (mergedWidths.has(code)) {continue;}
    const procBytes = type3.charProcs.get(glyphName);
    if (!procBytes) {continue;}
    const wx = extractType3CharProcWidth(procBytes);
    if (wx == null) {continue;}
    mergedWidths.set(code, wx * widthScale);
  }

  if (mergedWidths.size === info.metrics.widths.size) {return info;}
  return {
    ...info,
    metrics: {
      ...info.metrics,
      widths: mergedWidths,
    },
  };
}

function extractType3Info(page: NativePdfPage, fontDict: PdfDict): FontInfo["type3"] | undefined {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type3") {return undefined;}

  const fontMatrix = extractType3FontMatrix(page, fontDict);
  if (!fontMatrix) {return undefined;}

  const codeToCharName = extractType3CodeToCharName(page, fontDict);
  const charProcs = extractType3CharProcs(page, fontDict);

  return {
    fontMatrix,
    codeToCharName,
    charProcs,
  };
}











/** Extract font mappings (ToUnicode + metrics + style hints) from a native page. */
export function extractFontMappingsNative(page: NativePdfPage, options: NativeFontExtractionOptions = {}): FontMappings {
  const mappings: FontMappings = new Map();
  const resources = getResources(page);
  if (!resources) {return mappings;}

  return extractFontMappingsFromResourcesNative(page, resources, options);
}











/** Extract font mappings from a specific `/Resources` dictionary (native). */
export function extractFontMappingsFromResourcesNative(
  page: NativePdfPage,
  resources: PdfDict,
  options: NativeFontExtractionOptions = {},
): FontMappings {
  const mappings: FontMappings = new Map();
  const fonts = getFontDict(page, resources);
  if (!fonts) {return mappings;}

  for (const [fontName, refOrDict] of fonts.map.entries()) {
    const fontObj = resolve(page, refOrDict);
    const fontDict = asDict(fontObj);
    if (!fontDict) {continue;}

    const baseFont = extractBaseFontName(page, fontDict);
    const toUnicodeStream = findToUnicodeStream(page, fontDict);
    const toUnicode = toUnicodeStream ? parseToUnicodeFromStream(toUnicodeStream, options.cmapOptions) : null;
    maybeWarnSuspiciousToUnicode(fontName, baseFont, toUnicode);

    const metrics = extractFontMetrics(page, fontDict);
    const ordering = extractCIDOrderingFromFontDict(page, fontDict) ?? undefined;
    const allowIdentityHeuristic =
      !toUnicode || toUnicode.byteMapping.size === 0 || isSeverelyCorruptedToUnicode(toUnicode);
    const cidCodeToUnicodeFallbackMap = buildCidCodeToUnicodeFallbackFromFont({
      page,
      fontDict,
      ordering,
      fontName,
      baseFont,
      allowIdentityHeuristic,
    });
    maybeWarnUnrecoverableIdentityCorruption({
      fontName,
      baseFont,
      ordering: ordering ?? null,
      toUnicode,
      cidCodeToUnicodeFallbackMap,
    });
    const encodingMap = extractEncodingMap(page, fontDict) ?? undefined;

    const { isBold, isItalic } = computeBoldItalic(baseFont, extractFontDescriptor(page, fontDict));
    const codeByteWidth = inferCodeByteWidth(page, fontDict, toUnicode);
    const writingMode = inferWritingMode(page, fontDict);
    const verticalMetrics = writingMode === 1 ? extractCidVerticalDisplacements(page, fontDict) : undefined;

    const infoRaw: FontInfo = {
      mapping: toUnicode?.mapping ?? new Map(),
      writingMode,
      codeByteWidth,
      toUnicodeByteMapping: toUnicode?.byteMapping,
      toUnicodeSourceCodeByteLengths: toUnicode?.sourceCodeByteLengths,
      toUnicodeDiagnostics: toUnicode?.diagnostics,
      metrics,
      verticalDisplacements: verticalMetrics?.displacements,
      defaultVerticalDisplacement: verticalMetrics?.defaultDisplacement,
      type3: extractType3Info(page, fontDict),
      ordering,
      cidCodeToUnicodeFallbackMap,
      encodingMap,
      isBold,
      isItalic,
      baseFont,
    };

    const info = applyType3CharProcWidths(infoRaw);

    mappings.set(fontName, info);
    if (baseFont) {
      const key = normalizeBaseFontKey(baseFont);
      if (key && !mappings.has(key)) {mappings.set(key, info);}
    }
  }

  return mappings;
}
