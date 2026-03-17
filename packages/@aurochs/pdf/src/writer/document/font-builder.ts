/**
 * @file PDF Font Builder
 *
 * Builds PDF font objects for the document.
 */

import type { PdfObject } from "../../native/core/types";
import type { PdfEmbeddedFont } from "../../domain/document";
import { serializePdfDict, serializeIndirectObject } from "../object-serializer";
import { serializePdfStream } from "../stream-encoder";
import type { PdfObjectTracker } from "./object-tracker";
import { generateToUnicodeStream } from "./tounicode-writer";

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
  // eslint-disable-next-line no-restricted-syntax -- conditionally reassigned
  let clean = name.startsWith("/") ? name.slice(1) : name;
  if (removeSubsetPrefix) {
    const plusIndex = clean.indexOf("+");
    if (plusIndex > 0) {
      clean = clean.slice(plusIndex + 1);
    }
  }
  return clean;
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
  // eslint-disable-next-line no-restricted-syntax -- assigned in switch
  let fontFileKey: string;
  switch (font.format) {
    case "truetype":
      fontFileKey = "FontFile2"; // TrueType
      break;
    case "opentype":
    case "cff":
      fontFileKey = "FontFile3"; // CFF/OpenType
      break;
    case "type1":
      fontFileKey = "FontFile"; // Type 1
      break;
    default:
      fontFileKey = "FontFile2";
  }

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

  // Determine font file key based on format
  // eslint-disable-next-line no-restricted-syntax -- assigned in switch
  let fontFileKey: string;
  // eslint-disable-next-line no-restricted-syntax -- assigned in switch
  let cidFontSubtype: string;
  switch (font.format) {
    case "truetype":
      fontFileKey = "FontFile2";
      cidFontSubtype = "CIDFontType2";
      break;
    case "opentype":
    case "cff":
      fontFileKey = "FontFile3";
      cidFontSubtype = "CIDFontType0";
      break;
    case "type1":
      fontFileKey = "FontFile";
      cidFontSubtype = "CIDFontType0";
      break;
    default:
      fontFileKey = "FontFile2";
      cidFontSubtype = "CIDFontType2";
  }

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
  const ascent = font.metrics?.ascender ?? 800;
  const descent = font.metrics?.descender ?? -200;
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
  // eslint-disable-next-line no-restricted-syntax -- conditionally assigned
  let toUnicodeObjNum: number | undefined;
  if (font.toUnicode) {
    toUnicodeObjNum = tracker.allocate();
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

  const result: PdfObject[] = [];
  // eslint-disable-next-line no-restricted-syntax -- loop counter
  let i = 0;

  while (i < sorted.length) {
    const startCid = sorted[i]![0];
    const widthArray: PdfObject[] = [];

    // Find consecutive CIDs
    // eslint-disable-next-line no-restricted-syntax -- updated in search loop
    let j = i;
    while (j < sorted.length && sorted[j]![0] === startCid + (j - i)) {
      widthArray.push({ type: "number", value: sorted[j]![1] });
      j++;
    }

    result.push({ type: "number", value: startCid });
    result.push({ type: "array", items: widthArray });

    i = j;
  }

  return result;
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
