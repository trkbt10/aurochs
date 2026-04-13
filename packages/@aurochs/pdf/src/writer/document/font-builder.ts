/**
 * @file PDF Font Builder
 *
 * Builds PDF font objects for the document.
 */

import type { PdfObject } from "../../native/core/types";
import type { PdfEmbeddedFont } from "../../domain/document";
import { DEFAULT_FONT_METRICS } from "../../domain/font/defaults";
import { serializePdfDict, serializeIndirectObject } from "../object-serializer";
import { serializePdfStream } from "../stream-encoder";
import type { PdfObjectTracker } from "./object-tracker";
import { generateToUnicodeStream } from "./tounicode-writer";

/** Map a font format to its PDF FontFile key and CID font subtype. */
function resolveFontFormatInfo(format: PdfEmbeddedFont["format"]): { fontFileKey: string; cidFontSubtype: string } {
  switch (format) {
    case "truetype":
      return { fontFileKey: "FontFile2", cidFontSubtype: "CIDFontType2" };
    case "opentype":
    case "cff":
      return { fontFileKey: "FontFile3", cidFontSubtype: "CIDFontType0" };
    case "type1":
      return { fontFileKey: "FontFile", cidFontSubtype: "CIDFontType0" };
    default:
      return { fontFileKey: "FontFile2", cidFontSubtype: "CIDFontType2" };
  }
}

/**
 * Check if a font should be built as a Type0 CID font.
 */
function isCIDFont(font: PdfEmbeddedFont): boolean {
  return font.codeByteWidth === 2 || font.ordering !== undefined;
}

/**
 * Normalize font name for matching.
 * Removes leading slash and optionally subset prefix.
 */
function normalizeFontName(name: string, removeSubsetPrefix: boolean): string {
  const withoutSlash = name.startsWith("/") ? name.slice(1) : name;
  if (!removeSubsetPrefix) {
    return withoutSlash;
  }
  const plusIndex = withoutSlash.indexOf("+");
  return plusIndex > 0 ? withoutSlash.slice(plusIndex + 1) : withoutSlash;
}

/**
 * Find the matching font name from usedFontNames for an embedded font.
 * Returns the original usedFontName that matches, or null if no match.
 */
function findMatchingUsedFontName(
  font: PdfEmbeddedFont,
  usedFontNames: ReadonlySet<string>
): string | null {
  // Direct match on fontFamily
  if (usedFontNames.has(font.fontFamily)) {
    return font.fontFamily;
  }

  // Check baseFontName without leading slash
  const baseFontClean = font.baseFontName?.replace(/^\//, "");
  if (baseFontClean && usedFontNames.has(baseFontClean)) {
    return baseFontClean;
  }

  // Check with leading slash
  if (font.baseFontName && usedFontNames.has(font.baseFontName)) {
    return font.baseFontName;
  }

  // Try to match normalized versions of usedFontNames
  for (const usedName of usedFontNames) {
    const normalizedUsed = normalizeFontName(usedName, true);
    if (normalizedUsed === font.fontFamily) {
      return usedName;
    }
    if (baseFontClean) {
      const normalizedBaseFont = normalizeFontName(baseFontClean, true);
      if (normalizedUsed === normalizedBaseFont) {
        return usedName;
      }
    }
  }

  return null;
}

/**
 * Build a simple Type1 font reference (standard 14 fonts).
 *
 * @param fontName - The font name (e.g., "Helvetica", "Times-Roman")
 * @param tracker - Object tracker for allocation
 * @returns The allocated object number
 */
export function buildType1Font(
  fontName: string,
  tracker: PdfObjectTracker
): number {
  const objNum = tracker.allocate();

  const fontDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Font" }],
    ["Subtype", { type: "name", value: "Type1" }],
    ["BaseFont", { type: "name", value: fontName }],
    ["Encoding", { type: "name", value: "WinAnsiEncoding" }],
  ]);

  const dictBytes = serializePdfDict(fontDict);
  tracker.set(objNum, serializeIndirectObject(objNum, 0, dictBytes));

  return objNum;
}

/**
 * Build an embedded font object.
 *
 * For simplicity, this creates a basic TrueType font embedding.
 * Full font embedding with subsetting is more complex and would require
 * additional tooling.
 *
 * @param font - The embedded font data
 * @param tracker - Object tracker for allocation
 * @returns The font dictionary object number
 */
export function buildEmbeddedFont(
  font: PdfEmbeddedFont,
  tracker: PdfObjectTracker
): number {
  // Allocate object numbers
  const fontObjNum = tracker.allocate();
  const fontDescriptorObjNum = tracker.allocate();
  const fontFileObjNum = tracker.allocate();

  // Determine font file key based on format
  const resolveFontFileKey = () => {
    if (font.format === "truetype") { return "FontFile2"; }
    if (font.format === "opentype" || font.format === "cff") { return "FontFile3"; }
    if (font.format === "type1") { return "FontFile"; }
    return "FontFile2";
  };
  const fontFileKey = resolveFontFileKey();

  // Build font file stream
  const fontFileDict = new Map<string, PdfObject>();
  if (font.format === "opentype" || font.format === "cff") {
    fontFileDict.set("Subtype", { type: "name", value: "OpenType" });
  }
  const fontFileStream = serializePdfStream({
    dict: fontFileDict,
    data: font.data,
    encoding: "FlateDecode",
  });
  tracker.set(fontFileObjNum, serializeIndirectObject(fontFileObjNum, 0, fontFileStream));

  // Build font descriptor
  const fontDescriptor = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "FontDescriptor" }],
    ["FontName", { type: "name", value: font.fontFamily.replace(/\s+/g, "") }],
    ["Flags", { type: "number", value: 32 }], // Non-symbolic
    ["FontBBox", {
      type: "array",
      items: [
        { type: "number", value: -100 },
        { type: "number", value: -200 },
        { type: "number", value: 1000 },
        { type: "number", value: 900 },
      ],
    }],
    ["ItalicAngle", { type: "number", value: 0 }],
    ["Ascent", { type: "number", value: 800 }],
    ["Descent", { type: "number", value: -200 }],
    ["CapHeight", { type: "number", value: 700 }],
    ["StemV", { type: "number", value: 80 }],
    [fontFileKey, { type: "ref", obj: fontFileObjNum, gen: 0 }],
  ]);
  const descriptorBytes = serializePdfDict(fontDescriptor);
  tracker.set(fontDescriptorObjNum, serializeIndirectObject(fontDescriptorObjNum, 0, descriptorBytes));

  // Build font dictionary
  const subtype = font.format === "truetype" ? "TrueType" : "Type1";
  const fontDict = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Font" }],
    ["Subtype", { type: "name", value: subtype }],
    ["BaseFont", { type: "name", value: font.fontFamily.replace(/\s+/g, "") }],
    ["FontDescriptor", { type: "ref", obj: fontDescriptorObjNum, gen: 0 }],
    ["Encoding", { type: "name", value: "WinAnsiEncoding" }],
    // FirstChar, LastChar, and Widths would be needed for proper rendering
    // For now, use defaults
    ["FirstChar", { type: "number", value: 32 }],
    ["LastChar", { type: "number", value: 255 }],
  ]);

  // Generate default widths (500 for all characters)
  const widths: PdfObject[] = [];
  for (let i = 32; i <= 255; i++) {
    widths.push({ type: "number", value: 500 });
  }
  fontDict.set("Widths", { type: "array", items: widths });

  const fontDictBytes = serializePdfDict(fontDict);
  tracker.set(fontObjNum, serializeIndirectObject(fontObjNum, 0, fontDictBytes));

  return fontObjNum;
}

/**
 * Build a Type0 CID font with Identity-H encoding.
 *
 * Structure:
 * - Type0 font dictionary (top-level)
 * - CIDFont dictionary (descendant)
 * - FontDescriptor
 * - CIDToGIDMap (Identity)
 * - ToUnicode CMap stream
 * - Embedded font file
 *
 * @param font - The embedded font data with CID information
 * @param tracker - Object tracker for allocation
 * @returns The Type0 font dictionary object number
 */
export function buildType0Font(
  font: PdfEmbeddedFont,
  tracker: PdfObjectTracker
): number {
  // Allocate object numbers
  const type0ObjNum = tracker.allocate();
  const cidFontObjNum = tracker.allocate();
  const fontDescriptorObjNum = tracker.allocate();
  const fontFileObjNum = tracker.allocate();

  // Get the proper font name (remove leading slash from baseFontName if present)
  const baseFontName = font.baseFontName?.replace(/^\//, "") ??
                       font.fontFamily.replace(/\s+/g, "");

  // Determine font file key and CID font subtype based on format
  const { fontFileKey, cidFontSubtype } = resolveFontFormatInfo(font.format);

  // Build font file stream
  const fontFileDict = new Map<string, PdfObject>();
  if (font.format === "opentype" || font.format === "cff") {
    fontFileDict.set("Subtype", { type: "name", value: "CIDFontType0C" });
  }
  const fontFileStream = serializePdfStream({
    dict: fontFileDict,
    data: font.data,
    encoding: "FlateDecode",
  });
  tracker.set(fontFileObjNum, serializeIndirectObject(fontFileObjNum, 0, fontFileStream));

  // Get metrics from font or use defaults
  const ascent = font.metrics?.ascender ?? DEFAULT_FONT_METRICS.ascender;
  const descent = font.metrics?.descender ?? DEFAULT_FONT_METRICS.descender;
  // PDF Reference Table 117: DW (default glyph width for CID fonts) defaults to 1000.
  // This is NOT the same as DEFAULT_FONT_METRICS.defaultWidth (500, a layout approximation).
  const defaultWidth = font.metrics?.defaultWidth ?? 1000;

  // Build font descriptor
  const fontDescriptor = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "FontDescriptor" }],
    ["FontName", { type: "name", value: baseFontName }],
    ["Flags", { type: "number", value: 4 }], // Symbolic (CID fonts are typically symbolic)
    ["FontBBox", {
      type: "array",
      items: [
        { type: "number", value: 0 },
        { type: "number", value: descent },
        { type: "number", value: 1000 },
        { type: "number", value: ascent },
      ],
    }],
    ["ItalicAngle", { type: "number", value: 0 }],
    ["Ascent", { type: "number", value: ascent }],
    ["Descent", { type: "number", value: descent }],
    ["CapHeight", { type: "number", value: Math.round(ascent * 0.9) }],
    ["StemV", { type: "number", value: 80 }],
    [fontFileKey, { type: "ref", obj: fontFileObjNum, gen: 0 }],
  ]);
  const descriptorBytes = serializePdfDict(fontDescriptor);
  tracker.set(fontDescriptorObjNum, serializeIndirectObject(fontDescriptorObjNum, 0, descriptorBytes));

  // Build CIDFont dictionary
  const cidFont = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Font" }],
    ["Subtype", { type: "name", value: cidFontSubtype }],
    ["BaseFont", { type: "name", value: baseFontName }],
    ["CIDSystemInfo", {
      type: "dict",
      map: new Map<string, PdfObject>([
        ["Registry", { type: "string", bytes: new TextEncoder().encode("Adobe"), text: "Adobe" }],
        ["Ordering", { type: "string", bytes: new TextEncoder().encode(font.ordering ?? "Identity"), text: font.ordering ?? "Identity" }],
        ["Supplement", { type: "number", value: 0 }],
      ]),
    }],
    ["FontDescriptor", { type: "ref", obj: fontDescriptorObjNum, gen: 0 }],
    ["DW", { type: "number", value: defaultWidth }],
  ]);

  // Add W array if we have width information
  if (font.metrics?.widths && font.metrics.widths.size > 0) {
    const wArray = buildWidthsArray(font.metrics.widths);
    if (wArray.length > 0) {
      cidFont.set("W", { type: "array", items: wArray });
    }
  }

  // CIDToGIDMap: Identity for TrueType CID fonts
  if (cidFontSubtype === "CIDFontType2") {
    cidFont.set("CIDToGIDMap", { type: "name", value: "Identity" });
  }

  const cidFontBytes = serializePdfDict(cidFont);
  tracker.set(cidFontObjNum, serializeIndirectObject(cidFontObjNum, 0, cidFontBytes));

  // Build ToUnicode CMap stream if available
  const toUnicodeObjNum = font.toUnicode ? tracker.allocate() : undefined;
  if (font.toUnicode && toUnicodeObjNum !== undefined) {
    const toUnicodeData = generateToUnicodeStream(font.toUnicode);
    const toUnicodeStream = serializePdfStream({
      dict: new Map(),
      data: toUnicodeData,
      encoding: "FlateDecode",
    });
    tracker.set(toUnicodeObjNum, serializeIndirectObject(toUnicodeObjNum, 0, toUnicodeStream));
  }

  // Build Type0 font dictionary
  const type0Font = new Map<string, PdfObject>([
    ["Type", { type: "name", value: "Font" }],
    ["Subtype", { type: "name", value: "Type0" }],
    ["BaseFont", { type: "name", value: baseFontName }],
    ["Encoding", { type: "name", value: "Identity-H" }],
    ["DescendantFonts", {
      type: "array",
      items: [{ type: "ref", obj: cidFontObjNum, gen: 0 }],
    }],
  ]);

  if (toUnicodeObjNum !== undefined) {
    type0Font.set("ToUnicode", { type: "ref", obj: toUnicodeObjNum, gen: 0 });
  }

  const type0FontBytes = serializePdfDict(type0Font);
  tracker.set(type0ObjNum, serializeIndirectObject(type0ObjNum, 0, type0FontBytes));

  return type0ObjNum;
}

/**
 * Build W (widths) array for CID fonts.
 *
 * Format: [c1 [w1 w2 ...] c2 [w3 w4 ...] ...]
 * where c1 is start CID and following array contains consecutive widths
 */
function buildWidthsArray(widths: ReadonlyMap<number, number>): PdfObject[] {
  if (widths.size === 0) {
    return [];
  }

  // Sort CIDs
  const sorted = [...widths.entries()].sort((a, b) => a[0] - b[0]);

  // Group consecutive CIDs into runs: each run is a starting index and length
  const groups = sorted.reduce<{ start: number; count: number }[]>((acc, [cid], idx) => {
    const prev = acc[acc.length - 1];
    if (prev && cid === sorted[prev.start]![0] + (idx - prev.start)) {
      // Extend current group
      return [...acc.slice(0, -1), { start: prev.start, count: prev.count + 1 }];
    }
    // Start new group
    return [...acc, { start: idx, count: 1 }];
  }, []);

  return groups.flatMap(({ start, count }) => {
    const startCid = sorted[start]![0];
    const widthArray: PdfObject[] = Array.from({ length: count }, (_, k) => ({
      type: "number" as const,
      value: sorted[start + k]![1],
    }));
    return [
      { type: "number" as const, value: startCid },
      { type: "array" as const, items: widthArray },
    ];
  });
}

/** Build the appropriate font object (Type0 for CID, embedded otherwise). */
function buildFontObject(font: PdfEmbeddedFont, tracker: PdfObjectTracker): number {
  if (isCIDFont(font)) { return buildType0Font(font, tracker); }
  return buildEmbeddedFont(font, tracker);
}

/**
 * Build fonts for a document.
 * Returns a map of font name to object number.
 *
 * @param embeddedFonts - Embedded fonts from PdfDocument
 * @param usedFontNames - Font names actually used in the document
 * @param tracker - Object tracker
 * @returns Map of font name to object number
 */
export function buildFonts(
  embeddedFonts: readonly PdfEmbeddedFont[] | undefined,
  usedFontNames: ReadonlySet<string>,
  tracker: PdfObjectTracker
): Map<string, number> {
  const fontMap = new Map<string, number>();

  // Build embedded fonts
  if (embeddedFonts) {
    for (const font of embeddedFonts) {
      const matchingName = findMatchingUsedFontName(font, usedFontNames);
      if (matchingName) {
        // Use Type0 for CID fonts (2-byte encoding or CID ordering)
        const objNum = buildFontObject(font, tracker);
        // Store both the original used name and fontFamily for lookup
        fontMap.set(matchingName, objNum);
        if (matchingName !== font.fontFamily) {
          fontMap.set(font.fontFamily, objNum);
        }
      }
    }
  }

  // For fonts not embedded, create standard Type1 references
  // Common standard 14 fonts
  const standardFonts = new Set([
    "Helvetica",
    "Helvetica-Bold",
    "Helvetica-Oblique",
    "Helvetica-BoldOblique",
    "Times-Roman",
    "Times-Bold",
    "Times-Italic",
    "Times-BoldItalic",
    "Courier",
    "Courier-Bold",
    "Courier-Oblique",
    "Courier-BoldOblique",
    "Symbol",
    "ZapfDingbats",
  ]);

  for (const fontName of usedFontNames) {
    if (!fontMap.has(fontName)) {
      // Check if it's a standard font
      const standardName = standardFonts.has(fontName) ? fontName : "Helvetica";
      const objNum = buildType1Font(standardName, tracker);
      fontMap.set(fontName, objNum);
    }
  }

  return fontMap;
}
