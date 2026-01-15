import type { NativePdfPage } from "../native";
import type { PdfArray, PdfDict, PdfName, PdfObject, PdfRef, PdfStream, PdfString } from "../native";
import { decodePdfStream } from "../native/stream";
import type { FontInfo, FontMappings, FontMetrics } from "../domain/font";
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
} from "../domain/font";

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
function asString(obj: PdfObject | undefined): PdfString | null {
  return obj?.type === "string" ? obj : null;
}
function asNumber(obj: PdfObject | undefined): number | null {
  return obj?.type === "number" ? obj.value : null;
}
function asRef(obj: PdfObject | undefined): PdfRef | null {
  return obj?.type === "ref" ? obj : null;
}
function asStream(obj: PdfObject | undefined): PdfStream | null {
  return obj?.type === "stream" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

function resolve(page: NativePdfPage, obj: PdfObject | undefined): PdfObject | undefined {
  if (!obj) return undefined;
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

function findToUnicodeStream(page: NativePdfPage, fontDict: PdfDict): PdfStream | null {
  const direct = resolve(page, dictGet(fontDict, "ToUnicode"));
  const directStream = asStream(direct);
  if (directStream) return directStream;

  // Type0: ToUnicode may be on DescendantFonts[0]
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") return null;

  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) return null;
  const first = resolve(page, arr.items[0]);
  const cidDict = asDict(first);
  if (!cidDict) return null;
  const tu = resolve(page, dictGet(cidDict, "ToUnicode"));
  return asStream(tu);
}

function extractBaseFontName(page: NativePdfPage, fontDict: PdfDict): string | undefined {
  const base = resolve(page, dictGet(fontDict, "BaseFont"));
  if (base?.type === "name") return `/${base.value}`;
  if (base?.type === "string") return base.text;
  return undefined;
}

function extractCIDOrderingFromFontDict(page: NativePdfPage, fontDict: PdfDict): CIDOrdering | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype !== "Type0") return null;

  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) return null;
  const first = resolve(page, arr.items[0]);
  const cidFont = asDict(first);
  if (!cidFont) return null;

  const cidSystemInfo = resolveDict(page, dictGet(cidFont, "CIDSystemInfo"));
  if (!cidSystemInfo) return null;

  const orderingObj = resolve(page, dictGet(cidSystemInfo, "Ordering"));
  const orderingStr =
    orderingObj?.type === "string"
      ? orderingObj.text
      : orderingObj?.type === "name"
        ? orderingObj.value
        : null;
  if (!orderingStr) return null;
  return detectCIDOrdering(orderingStr);
}

function extractEncodingMap(page: NativePdfPage, fontDict: PdfDict): ReadonlyMap<number, string> | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype === "Type0") return null;

  const encodingObj = resolve(page, dictGet(fontDict, "Encoding"));
  if (!encodingObj) return null;

  if (encodingObj.type === "name") {
    return getEncodingByName(`/${encodingObj.value}`) ?? null;
  }

  const encDict = asDict(encodingObj);
  if (!encDict) return null;

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
    if (uni) unicodeMap.set(code, uni);
  }
  return unicodeMap.size > 0 ? unicodeMap : null;
}

function extractFontDescriptor(page: NativePdfPage, fontDict: PdfDict): PdfDict | null {
  const subtype = asName(dictGet(fontDict, "Subtype"))?.value ?? "";
  if (subtype === "Type0") {
    const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
    const arr = asArray(descendants);
    if (!arr || arr.items.length === 0) return null;
    const first = resolve(page, arr.items[0]);
    const cidFont = asDict(first);
    if (!cidFont) return null;
    return resolveDict(page, dictGet(cidFont, "FontDescriptor"));
  }

  return resolveDict(page, dictGet(fontDict, "FontDescriptor"));
}

function computeBoldItalic(baseFont: string | undefined, descriptor: PdfDict | null): { isBold?: boolean; isItalic?: boolean } {
  const name = baseFont ?? "";
  let isBold = isBoldFont(name);
  let isItalic = isItalicFont(name);

  if (descriptor) {
    const flags = asNumber(dictGet(descriptor, "Flags"));
    if (flags != null) {
      // bit 18 (0x40000) for ForceBold sometimes used; but commonly bit 6 (0x40) for Italic
      // We'll keep it minimal and consistent with previous heuristic.
      if ((flags & 0x40) !== 0) isItalic = true;
    }
    const weight = asNumber(dictGet(descriptor, "FontWeight"));
    if (weight != null && weight >= 700) isBold = true;
    const italicAngle = asNumber(dictGet(descriptor, "ItalicAngle"));
    if (italicAngle != null && italicAngle !== 0) isItalic = true;
  }

  return { isBold, isItalic };
}

function extractSimpleFontWidths(page: NativePdfPage, fontDict: PdfDict): Pick<FontMetrics, "widths" | "defaultWidth"> {
  const firstChar = asNumber(resolve(page, dictGet(fontDict, "FirstChar")));
  const widthsObj = resolve(page, dictGet(fontDict, "Widths"));
  if (firstChar == null || !widthsObj || widthsObj.type !== "array") {
    return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };
  }
  const widths = new Map<number, number>();
  for (let i = 0; i < widthsObj.items.length; i += 1) {
    const w = widthsObj.items[i];
    if (!w || w.type !== "number") continue;
    widths.set(Math.trunc(firstChar) + i, w.value);
  }
  return { widths, defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };
}

function extractCidFontWidths(page: NativePdfPage, fontDict: PdfDict): Pick<FontMetrics, "widths" | "defaultWidth"> {
  const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
  const arr = asArray(descendants);
  if (!arr || arr.items.length === 0) return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };

  const cid = resolve(page, arr.items[0]);
  const cidDict = asDict(cid);
  if (!cidDict) return { widths: new Map(), defaultWidth: DEFAULT_FONT_METRICS.defaultWidth };

  const defaultWidth = asNumber(resolve(page, dictGet(cidDict, "DW"))) ?? DEFAULT_FONT_METRICS.defaultWidth;
  const widths = new Map<number, number>();
  const wObj = resolve(page, dictGet(cidDict, "W"));
  const wArr = asArray(wObj);
  if (!wArr) return { widths, defaultWidth };

  // W array format: [cFirst [w1 w2 ...] cFirst2 cLast2 w ...]
  let i = 0;
  while (i < wArr.items.length) {
    const first = wArr.items[i];
    if (!first || first.type !== "number") break;
    const cFirst = Math.trunc(first.value);
    const second = wArr.items[i + 1];
    if (!second) break;
    if (second.type === "array") {
      for (let j = 0; j < second.items.length; j += 1) {
        const w = second.items[j];
        if (w?.type === "number") widths.set(cFirst + j, w.value);
      }
      i += 2;
      continue;
    }
    if (second.type === "number") {
      const cLast = Math.trunc(second.value);
      const w = wArr.items[i + 2];
      if (w?.type === "number") {
        for (let c = cFirst; c <= cLast; c += 1) widths.set(c, w.value);
      }
      i += 3;
      continue;
    }
    break;
  }

  return { widths, defaultWidth };
}

function extractFontMetrics(page: NativePdfPage, fontDict: PdfDict, baseFont: string | undefined): FontMetrics {
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

export function extractFontMappingsNative(page: NativePdfPage, options: NativeFontExtractionOptions = {}): FontMappings {
  const mappings: FontMappings = new Map();
  const resources = getResources(page);
  if (!resources) return mappings;

  const fonts = getFontDict(page, resources);
  if (!fonts) return mappings;

  for (const [fontName, refOrDict] of fonts.map.entries()) {
    const fontObj = resolve(page, refOrDict);
    const fontDict = asDict(fontObj);
    if (!fontDict) continue;

    const baseFont = extractBaseFontName(page, fontDict);
    const toUnicodeStream = findToUnicodeStream(page, fontDict);
    const toUnicode = toUnicodeStream ? parseToUnicodeFromStream(toUnicodeStream, options.cmapOptions) : null;

    const metrics = extractFontMetrics(page, fontDict, baseFont);
    const ordering = extractCIDOrderingFromFontDict(page, fontDict) ?? undefined;
    const encodingMap = extractEncodingMap(page, fontDict) ?? undefined;

    const { isBold, isItalic } = computeBoldItalic(baseFont, extractFontDescriptor(page, fontDict));

    const info: FontInfo = {
      mapping: toUnicode?.mapping ?? new Map(),
      codeByteWidth: (toUnicode?.codeByteWidth ?? 1) as 1 | 2,
      metrics,
      ordering,
      encodingMap,
      isBold,
      isItalic,
      baseFont,
    };

    mappings.set(fontName, info);
  }

  return mappings;
}

