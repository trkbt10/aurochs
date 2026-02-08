/**
 * @file src/pdf/domain/font/font-extractor.native.ts
 */

import type { NativePdfPage, PdfArray, PdfDict, PdfObject, PdfStream } from "../../native";
import { decodePdfStream } from "../../native/stream/stream";
import { normalizeFontFamily } from "./font-name-map";
import { repairFontForWeb } from "./font-repair";
import { parseToUnicodeCMap } from "./cmap-parser";
import { extractTrueTypeMetrics, normalizeMetricsTo1000 } from "./truetype-parser";
import type { EmbeddedFont, EmbeddedFontMetrics, FontFormat } from "./embedded-font";

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}
function asArray(obj: PdfObject | undefined): PdfArray | null {
  return obj?.type === "array" ? obj : null;
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
  return asDict(resolve(page, obj));
}

function extractBaseFontRaw(page: NativePdfPage, fontDict: PdfDict): string | null {
  const base = resolve(page, dictGet(fontDict, "BaseFont"));
  if (base?.type === "name") {return `/${base.value}`;}
  if (base?.type === "string") {return base.text;}
  return null;
}

function detectFontFormat({
  fontFile,
  fontFile2,
  fontFile3,
  subtype,
}: {
  readonly fontFile: PdfObject | undefined;
  readonly fontFile2: PdfObject | undefined;
  readonly fontFile3: PdfObject | undefined;
  readonly subtype: string | undefined;
}): FontFormat {
  if (fontFile2) {return "truetype";}
  if (fontFile) {return "type1";}
  if (fontFile3) {
    if (subtype === "Type1C") {return "cff";}
    if (subtype === "CIDFontType0C") {return "cff";}
    if (subtype === "OpenType") {return "opentype";}
    return "opentype";
  }
  return "truetype";
}

function getMimeType(format: FontFormat): string {
  switch (format) {
    case "truetype":
      return "font/ttf";
    case "opentype":
      return "font/otf";
    case "cff":
      return "font/otf";
    case "type1":
      return "font/type1";
    default: {
      const exhaustive: never = format;
      return exhaustive;
    }
  }
}

function extractToUnicodeMap(page: NativePdfPage, fontDict: PdfDict): ReadonlyMap<number, string> | null {
  const toUnicodeObj = resolve(page, dictGet(fontDict, "ToUnicode"));
  const stream = asStream(toUnicodeObj);
  if (!stream) {return null;}
  const decoded = decodePdfStream(stream);
  const cmap = new TextDecoder("latin1").decode(decoded);
  const parsed = parseToUnicodeCMap(cmap);
  return parsed.mapping;
}

function getFontDescriptor(page: NativePdfPage, fontDict: PdfDict): PdfDict | null {
  const subtypeObj = resolve(page, dictGet(fontDict, "Subtype"));
  const subtype = subtypeObj?.type === "name" ? subtypeObj.value : null;

  if (subtype === "Type0") {
    const descendants = resolve(page, dictGet(fontDict, "DescendantFonts"));
    const arr = asArray(descendants);
    if (!arr || arr.items.length === 0) {return null;}
    const cidFont = asDict(resolve(page, arr.items[0]));
    if (!cidFont) {return null;}
    return resolveDict(page, dictGet(cidFont, "FontDescriptor"));
  }

  return resolveDict(page, dictGet(fontDict, "FontDescriptor"));
}

function extractEmbeddedFontStream(page: NativePdfPage, fontDescriptor: PdfDict): { stream: PdfStream; streamSubtype?: string; fontFile: PdfObject | undefined; fontFile2: PdfObject | undefined; fontFile3: PdfObject | undefined } | null {
  const fontFile3 = dictGet(fontDescriptor, "FontFile3");
  const fontFile2 = dictGet(fontDescriptor, "FontFile2");
  const fontFile = dictGet(fontDescriptor, "FontFile");

  const embeddedRef = fontFile3 ?? fontFile2 ?? fontFile;
  if (!embeddedRef) {return null;}

  const resolved = resolve(page, embeddedRef);
  const stream = asStream(resolved);
  if (!stream) {return null;}

  const subtypeObj = dictGet(stream.dict, "Subtype");
  const streamSubtype = subtypeObj?.type === "name" ? subtypeObj.value : undefined;
  return { stream, streamSubtype, fontFile, fontFile2, fontFile3 };
}

function normalizeEmbeddedFontData(args: {
  readonly format: FontFormat;
  readonly rawData: Uint8Array;
  readonly fontFamily: string;
  readonly toUnicode: ReadonlyMap<number, string> | null;
}): { data: Uint8Array; metrics: EmbeddedFontMetrics | undefined } {
  if (args.format !== "truetype") {
    return { data: args.rawData, metrics: undefined };
  }

  const data = repairFontForWeb(args.rawData, new Map(args.toUnicode ?? []), args.fontFamily);
  const rawMetrics = extractTrueTypeMetrics(data);
  const metrics = rawMetrics ? normalizeMetricsTo1000(rawMetrics) : undefined;
  return { data, metrics };
}











/** Extract embedded font programs from native PDF pages. */
export function extractEmbeddedFontsFromNativePages(pages: readonly NativePdfPage[]): EmbeddedFont[] {
  const fonts: EmbeddedFont[] = [];
  const seen = new Set<string>();

  for (const page of pages) {
    const resources = page.getResourcesDict();
    if (!resources) {continue;}

    const fontsObj = resolve(page, dictGet(resources, "Font"));
    const fontsDict = asDict(fontsObj);
    if (!fontsDict) {continue;}

    for (const [, fontRef] of fontsDict.map.entries()) {
      const fontDict = asDict(resolve(page, fontRef));
      if (!fontDict) {continue;}

      const baseFontRaw = extractBaseFontRaw(page, fontDict);
      if (!baseFontRaw) {continue;}
      if (seen.has(baseFontRaw)) {continue;}
      seen.add(baseFontRaw);

      const fontDescriptor = getFontDescriptor(page, fontDict);
      if (!fontDescriptor) {continue;}

      const embedded = extractEmbeddedFontStream(page, fontDescriptor);
      if (!embedded) {continue;}

      const rawData = decodePdfStream(embedded.stream);
      const format = detectFontFormat({ fontFile: embedded.fontFile, fontFile2: embedded.fontFile2, fontFile3: embedded.fontFile3, subtype: embedded.streamSubtype });
      const mimeType = getMimeType(format);

      const fontFamily = normalizeFontFamily(baseFontRaw);

      const toUnicode = extractToUnicodeMap(page, fontDict);
      const { data, metrics } = normalizeEmbeddedFontData({ format, rawData, fontFamily, toUnicode });

      fonts.push({
        baseFontName: baseFontRaw,
        fontFamily,
        format,
        data,
        mimeType,
        metrics,
      });
    }
  }

  return fonts;
}
