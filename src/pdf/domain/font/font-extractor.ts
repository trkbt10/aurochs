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

/**
 * Font format detected from PDF
 */
export type FontFormat = "type1" | "truetype" | "opentype" | "cff";

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

    return {
      baseFontName: baseFontRaw,
      fontFamily,
      format,
      data,
      mimeType,
    };
  } catch (e) {
    console.warn(`Failed to extract font ${baseFontRaw}:`, e);
    return null;
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
 * Extract font family name from BaseFont and FontDescriptor.
 *
 * Uses normalizeFontFamily() for consistent font name normalization
 * across @font-face declarations and text elements.
 *
 * @see normalizeFontFamily in font-name-map.ts
 */
function extractFontFamily(baseFontRaw: string, fontDescriptor: PDFDict): string {
  // Try to get FontFamily from FontDescriptor first
  const fontFamilyRaw = fontDescriptor.get(PDFName.of("FontFamily"));
  if (fontFamilyRaw) {
    const familyStr = fontFamilyRaw.toString();
    // Remove parentheses and leading/trailing whitespace
    const cleaned = familyStr.replace(/^\(|\)$/g, "").trim();
    if (cleaned.length > 0) {
      return cleaned;
    }
  }

  // Use shared normalization logic for BaseFont name
  return normalizeFontFamily(baseFontRaw);
}
