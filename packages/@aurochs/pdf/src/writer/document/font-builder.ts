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
      if (usedFontNames.has(font.fontFamily)) {
        const objNum = buildEmbeddedFont(font, tracker);
        fontMap.set(font.fontFamily, objNum);
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
