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
  getEncodingByName,
  applyEncodingDifferences,
  glyphNameToUnicode,
  isBoldFont,
  isItalicFont,
  parseToUnicodeCMap,
  type CIDOrdering,
  type CMapParserOptions,
} from "../../domain/font";

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

function extractCIDOrderingFromFontDict(page: NativePdfPage, fontDict: PdfDict): CIDOrdering | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") {return null;}

  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) {return null;}
  const first = resolve(page, arr.items[0]);
  const cidFont = asDict(first);
  if (!cidFont) {return null;}

  const cidSystemInfo = resolveDict(page, dictGet(cidFont, "CIDSystemInfo"));
  if (!cidSystemInfo) {return null;}

  const orderingObj = resolve(page, dictGet(cidSystemInfo, "Ordering"));
  const orderingStr = extractCIDOrderingString(orderingObj);
  if (!orderingStr) {return null;}
  return detectCIDOrdering(orderingStr);
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
  const widthScale = (() => {
    if (subtype !== "Type3") {return 1;}
    const fontMatrix = extractType3FontMatrix(page, fontDict);
    if (!fontMatrix) {return 1;}
    const [a, b, c, d] = fontMatrix;
    if (b !== 0 || c !== 0 || a <= 0 || d <= 0) {return 1;}
    // Type3 widths are in glyph space units; convert to "per 1000 em" units used by our text layout.
    // For the common FontMatrix [0.001 0 0 0.001 0 0], this becomes a no-op scale of 1.
    return a * 1000;
  })();

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

  const map = new Map<number, string>();
  let currentCode = 0;
  for (const item of diffsArr.items) {
    if (item.type === "number") {
      currentCode = Math.trunc(item.value);
      continue;
    }
    if (item.type === "name") {
      map.set(currentCode, item.value);
      currentCode += 1;
    }
  }
  return map;
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

    const metrics = extractFontMetrics(page, fontDict);
    const ordering = extractCIDOrderingFromFontDict(page, fontDict) ?? undefined;
    const encodingMap = extractEncodingMap(page, fontDict) ?? undefined;

    const { isBold, isItalic } = computeBoldItalic(baseFont, extractFontDescriptor(page, fontDict));
    const codeByteWidth = inferCodeByteWidth(page, fontDict, toUnicode);

    const infoRaw: FontInfo = {
      mapping: toUnicode?.mapping ?? new Map(),
      codeByteWidth,
      metrics,
      type3: extractType3Info(page, fontDict),
      ordering,
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
