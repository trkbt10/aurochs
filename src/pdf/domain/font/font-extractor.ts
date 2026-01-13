/**
 * @file Embedded font extractor
 *
 * Extracts embedded font programs from PDF documents.
 *
 * PDF fonts can be embedded in three formats (ISO 32000-1 Section 9.9):
 * - FontFile: Type 1 font program (PostScript)
 * - FontFile2: TrueType font program
 * - FontFile3: CFF (Compact Font Format) or OpenType with CFF outlines
 *
 * The extracted font data can be used to create @font-face declarations
 * for accurate rendering in web contexts.
 *
 * For fonts without a cmap table (common in PDF subsetted fonts), we build
 * one from the ToUnicode mapping. This is essential for web rendering as
 * browsers require cmap for Unicode → glyph mapping.
 */
import type { PDFDocument } from "pdf-lib";
import {
  PDFDict,
  PDFName,
  PDFRef,
  PDFStream,
  PDFRawStream,
  PDFArray,
  decodePDFRawStream,
} from "pdf-lib";
import { normalizeFontFamily } from "./font-name-map";
import { repairFontForWeb } from "./font-repair";
import { parseToUnicodeCMap } from "./cmap-parser";
import { extractTrueTypeMetrics, normalizeMetricsTo1000 } from "./truetype-parser";
import type { FontMapping } from "./types";

/**
 * Font format detected from PDF
 */
export type FontFormat = "type1" | "truetype" | "opentype" | "cff";

/**
 * Font metrics in 1/1000 em units (PDF standard).
 */
export type EmbeddedFontMetrics = {
  /** Ascender height (positive value) */
  readonly ascender: number;
  /** Descender depth (negative value) */
  readonly descender: number;
};

/**
 * Embedded font data extracted from PDF
 */
export type EmbeddedFont = {
  /** Original BaseFont name from PDF (e.g., "/ZRDQJE+Hiragino-Sans") */
  readonly baseFontName: string;
  /** Font family name without subset prefix (e.g., "Hiragino Sans") */
  readonly fontFamily: string;
  /** Font format */
  readonly format: FontFormat;
  /** Raw font data (can be used to create @font-face) */
  readonly data: Uint8Array;
  /** MIME type for the font format */
  readonly mimeType: string;
  /** Font metrics from font file (hhea table), normalized to 1000 units */
  readonly metrics?: EmbeddedFontMetrics;
};

/**
 * Extract embedded fonts from a PDF document.
 *
 * Iterates through all pages and extracts font programs from FontDescriptors.
 * Handles both simple fonts and composite (Type0/CID) fonts.
 *
 * @param pdfDoc - Loaded PDF document
 * @returns Array of embedded fonts
 */
export function extractEmbeddedFonts(pdfDoc: PDFDocument): EmbeddedFont[] {
  const fonts: EmbeddedFont[] = [];
  const seenFonts = new Set<string>();

  const pages = pdfDoc.getPages();
  for (const page of pages) {
    const pageNode = page.node;
    const resources = pageNode.get(PDFName.of("Resources"));
    if (!resources) continue;

    const resourcesDict = resources instanceof PDFRef
      ? pdfDoc.context.lookup(resources) as PDFDict
      : resources as PDFDict;

    const fontsRef = resourcesDict.get(PDFName.of("Font"));
    if (!fontsRef) continue;

    const fontsDict = fontsRef instanceof PDFRef
      ? pdfDoc.context.lookup(fontsRef) as PDFDict
      : fontsRef as PDFDict;

    for (const [, fontRef] of fontsDict.entries()) {
      const fontDict = fontRef instanceof PDFRef
        ? pdfDoc.context.lookup(fontRef) as PDFDict
        : fontRef as PDFDict;

      const baseFontRaw = fontDict.get(PDFName.of("BaseFont"))?.toString();
      if (!baseFontRaw) continue;

      // Skip if already processed (fonts may be shared across pages)
      if (seenFonts.has(baseFontRaw)) continue;
      seenFonts.add(baseFontRaw);

      const extracted = extractFontFromDict(pdfDoc, fontDict, baseFontRaw);
      if (extracted) {
        fonts.push(extracted);
      }
    }
  }

  return fonts;
}

/**
 * Extract font data from a font dictionary.
 */
function extractFontFromDict(
  pdfDoc: PDFDocument,
  fontDict: PDFDict,
  baseFontRaw: string
): EmbeddedFont | null {
  const subtype = fontDict.get(PDFName.of("Subtype"))?.toString();

  // Get FontDescriptor (different path for Type0 vs simple fonts)
  let fontDescriptor: PDFDict | null = null;

  if (subtype === "/Type0") {
    // Composite font - get FontDescriptor from DescendantFonts
    const descendantFonts = fontDict.get(PDFName.of("DescendantFonts"));
    if (descendantFonts) {
      const dfArray = descendantFonts instanceof PDFRef
        ? pdfDoc.context.lookup(descendantFonts) as PDFArray
        : descendantFonts as PDFArray;

      const cidFontRef = dfArray.get(0);
      const cidFontDict = cidFontRef instanceof PDFRef
        ? pdfDoc.context.lookup(cidFontRef) as PDFDict
        : cidFontRef as PDFDict;

      const fdRef = cidFontDict.get(PDFName.of("FontDescriptor"));
      if (fdRef) {
        fontDescriptor = fdRef instanceof PDFRef
          ? pdfDoc.context.lookup(fdRef) as PDFDict
          : fdRef as PDFDict;
      }
    }
  } else {
    // Simple font
    const fdRef = fontDict.get(PDFName.of("FontDescriptor"));
    if (fdRef) {
      fontDescriptor = fdRef instanceof PDFRef
        ? pdfDoc.context.lookup(fdRef) as PDFDict
        : fdRef as PDFDict;
    }
  }

  if (!fontDescriptor) {
    return null;
  }

  // Check for embedded font streams
  const fontFile3 = fontDescriptor.get(PDFName.of("FontFile3"));
  const fontFile2 = fontDescriptor.get(PDFName.of("FontFile2"));
  const fontFile = fontDescriptor.get(PDFName.of("FontFile"));

  const embeddedRef = fontFile3 || fontFile2 || fontFile;
  if (!embeddedRef) {
    return null;
  }

  try {
    const stream = embeddedRef instanceof PDFRef
      ? pdfDoc.context.lookup(embeddedRef)
      : embeddedRef;

    if (!stream) {
      return null;
    }

    // Decode the stream (handles FlateDecode and other filters)
    let data: Uint8Array;
    let streamSubtype: string | undefined;

    if (stream instanceof PDFRawStream) {
      // PDFRawStream needs to be decoded to decompress
      const decoded = decodePDFRawStream(stream);
      data = decoded.decode();
      streamSubtype = stream.dict.get(PDFName.of("Subtype"))?.toString();
    } else if (stream instanceof PDFStream) {
      // Try getContents for PDFStream, but check if it's compressed
      const rawData = stream.getContents();
      // Check if data starts with zlib header (78 xx)
      if (rawData[0] === 0x78) {
        // Data is still compressed, need to use the raw stream
        console.warn(`Font stream is compressed but not PDFRawStream, trying alternate decode`);
        data = rawData;
      } else {
        data = rawData;
      }
      streamSubtype = stream.dict.get(PDFName.of("Subtype"))?.toString();
    } else {
      return null;
    }

    // Determine font format
    const format = detectFontFormat(fontFile, fontFile2, fontFile3, streamSubtype);
    const mimeType = getMimeType(format);

    // Extract font family name
    const fontFamily = extractFontFamily(baseFontRaw, fontDescriptor);

    // For TrueType fonts, build missing tables required for web rendering
    let metrics: EmbeddedFontMetrics | undefined;
    if (format === "truetype") {
      const toUnicode = extractToUnicodeFromFontDict(pdfDoc, fontDict);
      data = repairFontForWeb(data, toUnicode, fontFamily);

      // Extract metrics from repaired font (hhea table)
      const rawMetrics = extractTrueTypeMetrics(data);
      if (rawMetrics) {
        metrics = normalizeMetricsTo1000(rawMetrics);
      }
    }

    return {
      baseFontName: baseFontRaw,
      fontFamily,
      format,
      data,
      mimeType,
      metrics,
    };
  } catch (e) {
    console.warn(`Failed to extract font ${baseFontRaw}:`, e);
    return null;
  }
}

/**
 * Extract ToUnicode mapping from a font dictionary.
 *
 * For Type0 fonts, ToUnicode may be on the font dict or DescendantFonts.
 * Returns a Map<charCode, unicodeString> for building cmap table.
 */
function extractToUnicodeFromFontDict(
  pdfDoc: PDFDocument,
  fontDict: PDFDict
): FontMapping {
  const emptyMapping: FontMapping = new Map();

  // Try ToUnicode from font dict
  let toUnicodeRef = fontDict.get(PDFName.of("ToUnicode"));

  // For Type0 fonts, check DescendantFonts if not found
  if (!toUnicodeRef) {
    const subtype = fontDict.get(PDFName.of("Subtype"))?.toString();
    if (subtype === "/Type0") {
      const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
      if (descendantsRef) {
        const descendants = descendantsRef instanceof PDFRef
          ? pdfDoc.context.lookup(descendantsRef) as PDFArray
          : descendantsRef as PDFArray;

        if (descendants.size() > 0) {
          const firstRef = descendants.get(0);
          const cidFontDict = firstRef instanceof PDFRef
            ? pdfDoc.context.lookup(firstRef) as PDFDict
            : firstRef as PDFDict;

          toUnicodeRef = cidFontDict.get(PDFName.of("ToUnicode"));
        }
      }
    }
  }

  if (!toUnicodeRef) {
    return emptyMapping;
  }

  // Get the ToUnicode stream
  const toUnicodeStream = toUnicodeRef instanceof PDFRef
    ? pdfDoc.context.lookup(toUnicodeRef)
    : toUnicodeRef;

  if (!(toUnicodeStream instanceof PDFRawStream)) {
    return emptyMapping;
  }

  try {
    // Decode and parse the CMap
    const decoded = decodePDFRawStream(toUnicodeStream);
    const cmapData = new TextDecoder("latin1").decode(decoded.decode());
    const result = parseToUnicodeCMap(cmapData);
    return result.mapping;
  } catch (e) {
    console.warn("Failed to parse ToUnicode CMap:", e);
    return emptyMapping;
  }
}

/**
 * Detect font format from PDF font file entries.
 */
function detectFontFormat(
  fontFile: unknown,
  fontFile2: unknown,
  fontFile3: unknown,
  streamSubtype: string | undefined
): FontFormat {
  if (fontFile3) {
    // FontFile3 can be CFF, OpenType, or CIDFontType0C
    if (streamSubtype === "/OpenType") {
      return "opentype";
    }
    if (streamSubtype === "/CIDFontType0C" || streamSubtype === "/Type1C") {
      return "cff";
    }
    // Default to OpenType for FontFile3
    return "opentype";
  }

  if (fontFile2) {
    return "truetype";
  }

  if (fontFile) {
    return "type1";
  }

  return "cff";
}

/**
 * Get MIME type for font format.
 */
function getMimeType(format: FontFormat): string {
  switch (format) {
    case "opentype":
      return "font/otf";
    case "truetype":
      return "font/ttf";
    case "type1":
      return "application/x-font-type1";
    case "cff":
      return "font/otf";
    default:
      return "application/octet-stream";
  }
}

/**
 * Extract font family name from BaseFont.
 *
 * IMPORTANT: Always use BaseFont name (not FontDescriptor's FontFamily).
 * This ensures consistency between:
 * - @font-face declarations (use this name)
 * - Text elements (use normalized fontName which comes from BaseFont)
 *
 * FontDescriptor's FontFamily may differ from BaseFont (e.g., "Hiragino Sans"
 * vs "Hiragino-Sans"), causing @font-face and text not to match.
 *
 * @see normalizeFontFamily in font-name-map.ts
 */
function extractFontFamily(baseFontRaw: string, _fontDescriptor: PDFDict): string {
  // Always use BaseFont name for consistency with text elements
  return normalizeFontFamily(baseFontRaw);
}
