/**
 * @file Font repair for web compatibility
 *
 * Repairs PDF-embedded fonts by adding missing tables required for web rendering.
 * Browsers (via OTS - OpenType Sanitizer) require certain tables that PDF fonts often lack.
 *
 * Required tables for web fonts:
 * - cmap: character to glyph mapping
 * - OS/2: Windows metrics
 * - name: font naming
 * - post: PostScript info
 */

import type { FontMapping } from "./types";
import {
  parseTrueTypeTableDirectory,
  calculateTableChecksum,
} from "./truetype-parser";
import {
  buildCmapTable,
  buildOS2Table,
  buildNameTable,
  buildPostTable,
} from "./truetype-table-builders";

/**
 * Check if a TrueType/OpenType font has a cmap table.
 */
export function hasCmapTable(fontData: Uint8Array): boolean {
  const tables = parseTrueTypeTableDirectory(fontData);
  return tables.some((t) => t.tag === "cmap");
}

/**
 * Repair a TrueType font for web compatibility.
 *
 * Adds missing tables required by browsers:
 * - cmap: Built from ToUnicode mapping
 * - OS/2: Built with minimal required fields
 * - name: Built with font name
 * - post: Built with minimal required fields
 *
 * @param fontData - Original TrueType font data
 * @param toUnicode - ToUnicode mapping (character code → Unicode string)
 * @param fontName - Font name for name table
 * @returns Repaired font data with all required tables
 */
export function repairFontForWeb(
  fontData: Uint8Array,
  toUnicode: FontMapping,
  fontName?: string
): Uint8Array {
  let tables = parseTrueTypeTableDirectory(fontData);
  const existingTags = new Set(tables.map((t) => t.tag));

  let result = fontData;

  // Build Unicode → GlyphID mapping from ToUnicode
  const unicodeToGlyph = new Map<number, number>();
  for (const [charCode, unicodeStr] of toUnicode) {
    const codePoint = unicodeStr.codePointAt(0);
    if (codePoint !== undefined && codePoint > 0) {
      unicodeToGlyph.set(codePoint, charCode);
    }
  }

  // Add cmap if missing
  if (!existingTags.has("cmap") && unicodeToGlyph.size > 0) {
    const cmapData = buildCmapTable(unicodeToGlyph);
    result = injectTable(result, "cmap", cmapData);
  }

  // Add OS/2 if missing
  tables = parseTrueTypeTableDirectory(result);
  if (!tables.some((t) => t.tag === "OS/2")) {
    const os2Data = buildOS2Table(result);
    result = injectTable(result, "OS/2", os2Data);
  }

  // Add name if missing
  tables = parseTrueTypeTableDirectory(result);
  if (!tables.some((t) => t.tag === "name")) {
    const nameData = buildNameTable(fontName ?? "EmbeddedFont");
    result = injectTable(result, "name", nameData);
  }

  // Add post if missing
  tables = parseTrueTypeTableDirectory(result);
  if (!tables.some((t) => t.tag === "post")) {
    const postData = buildPostTable();
    result = injectTable(result, "post", postData);
  }

  return result;
}

// Backwards compatibility alias
export const injectCmapTable = repairFontForWeb;

/**
 * Entry for table injection with source data.
 */
type NewTableEntry = {
  tag: string;
  checksum: number;
  length: number;
  newOffset: number;
  sourceData: Uint8Array;
};

/**
 * Inject a new table into a TrueType font.
 */
function injectTable(
  fontData: Uint8Array,
  newTag: string,
  newTableData: Uint8Array
): Uint8Array {
  const existingTables = parseTrueTypeTableDirectory(fontData);
  const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);

  const magic = view.getUint32(0, false);
  const newNumTables = existingTables.length + 1;

  const headerSize = 12;
  const tableDirectorySize = newNumTables * 16;
  const newTableDirectoryEnd = headerSize + tableDirectorySize;

  // Build list of all tables with their source data
  const allTables: NewTableEntry[] = [];

  for (const t of existingTables) {
    const sourceData = fontData.slice(t.offset, t.offset + t.length);
    allTables.push({
      tag: t.tag,
      checksum: t.checksum,
      length: t.length,
      newOffset: 0,
      sourceData,
    });
  }

  allTables.push({
    tag: newTag,
    checksum: calculateTableChecksum(newTableData),
    length: newTableData.length,
    newOffset: 0,
    sourceData: newTableData,
  });

  // Sort by tag (OpenType requires alphabetical order)
  allTables.sort((a, b) => {
    for (let i = 0; i < 4; i++) {
      const diff = a.tag.charCodeAt(i) - b.tag.charCodeAt(i);
      if (diff !== 0) {return diff;}
    }
    return 0;
  });

  // Assign new offsets
  let currentOffset = newTableDirectoryEnd;
  for (const t of allTables) {
    t.newOffset = currentOffset;
    currentOffset += (t.length + 3) & ~3;
  }

  const newTotalSize = currentOffset;
  const newFontData = new Uint8Array(newTotalSize);
  const newView = new DataView(newFontData.buffer);

  // Write header
  newView.setUint32(0, magic, false);
  newView.setUint16(4, newNumTables, false);

  const searchRange = Math.pow(2, Math.floor(Math.log2(newNumTables))) * 16;
  const entrySelector = Math.floor(Math.log2(newNumTables));
  const rangeShift = newNumTables * 16 - searchRange;

  newView.setUint16(6, searchRange, false);
  newView.setUint16(8, entrySelector, false);
  newView.setUint16(10, rangeShift, false);

  // Write table directory
  let dirOffset = 12;
  for (const t of allTables) {
    for (let i = 0; i < 4; i++) {
      newFontData[dirOffset + i] = t.tag.charCodeAt(i);
    }
    newView.setUint32(dirOffset + 4, t.checksum, false);
    newView.setUint32(dirOffset + 8, t.newOffset, false);
    newView.setUint32(dirOffset + 12, t.length, false);
    dirOffset += 16;
  }

  // Copy table data
  for (const t of allTables) {
    newFontData.set(t.sourceData, t.newOffset);
  }

  return newFontData;
}
