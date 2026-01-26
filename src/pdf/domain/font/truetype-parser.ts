/**
 * @file TrueType/OpenType font parser
 *
 * Parses TrueType table directory and provides utilities for font inspection.
 *
 * @see OpenType spec: https://docs.microsoft.com/en-us/typography/opentype/spec/
 */

/**
 * Table directory entry from TrueType font.
 */
export type TableEntry = {
  tag: string;
  checksum: number;
  offset: number;
  length: number;
};

/**
 * Parse TrueType table directory.
 *
 * @param fontData - Raw TrueType font data
 * @returns Array of table entries, or empty array if not a valid TrueType font
 */
export function parseTrueTypeTableDirectory(fontData: Uint8Array): TableEntry[] {
  if (fontData.length < 12) {
    return [];
  }

  const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);

  // Check magic (TrueType or OpenType)
  const magic = view.getUint32(0, false);
  if (magic !== 0x00010000 && magic !== 0x4F54544F && magic !== 0x74727565) {
    // Not TrueType (0x00010000), OpenType (OTTO), or Apple TrueType ('true')
    return [];
  }

  const numTables = view.getUint16(4, false);
  const tables: TableEntry[] = [];

  for (let i = 0; i < numTables; i++) {
    const offset = 12 + i * 16;
    if (offset + 16 > fontData.length) {break;}

    const tag = String.fromCharCode(
      fontData[offset],
      fontData[offset + 1],
      fontData[offset + 2],
      fontData[offset + 3]
    );
    const checksum = view.getUint32(offset + 4, false);
    const tableOffset = view.getUint32(offset + 8, false);
    const length = view.getUint32(offset + 12, false);

    tables.push({ tag, checksum, offset: tableOffset, length });
  }

  return tables;
}

/**
 * Check if font data has a specific table.
 */
export function hasTable(fontData: Uint8Array, tag: string): boolean {
  const tables = parseTrueTypeTableDirectory(fontData);
  return tables.some((t) => t.tag === tag);
}

/**
 * Get list of table tags present in the font.
 */
export function getTableTags(fontData: Uint8Array): string[] {
  const tables = parseTrueTypeTableDirectory(fontData);
  return tables.map((t) => t.tag);
}

/**
 * Calculate OpenType table checksum.
 */
export function calculateTableChecksum(data: Uint8Array): number {
  const sumState = { value: 0 };
  const paddedLength = (data.length + 3) & ~3;
  const padded = new Uint8Array(paddedLength);
  padded.set(data);
  const view = new DataView(padded.buffer);

  for (let i = 0; i < paddedLength; i += 4) {
    sumState.value = (sumState.value + view.getUint32(i, false)) >>> 0;
  }

  return sumState.value;
}

/**
 * Font metrics extracted from TrueType font.
 *
 * Values are in font design units (typically 1000 or 2048 per em).
 */
export type TrueTypeFontMetrics = {
  /** Units per em from head table */
  readonly unitsPerEm: number;
  /** Ascender from hhea table */
  readonly ascender: number;
  /** Descender from hhea table (negative value) */
  readonly descender: number;
  /** Line gap from hhea table */
  readonly lineGap: number;
};

/**
 * Extract font metrics from TrueType font data.
 *
 * Reads metrics from:
 * - head table: unitsPerEm
 * - hhea table: ascender, descender, lineGap
 *
 * @param fontData - Raw TrueType font data
 * @returns Font metrics, or null if tables are missing/invalid
 */
export function extractTrueTypeMetrics(fontData: Uint8Array): TrueTypeFontMetrics | null {
  const tables = parseTrueTypeTableDirectory(fontData);
  if (tables.length === 0) {
    return null;
  }

  const view = new DataView(fontData.buffer, fontData.byteOffset, fontData.byteLength);

  // Find head table for unitsPerEm
  const headTable = tables.find((t) => t.tag === "head");
  if (!headTable || headTable.offset + 18 > fontData.length) {
    return null;
  }

  // head table layout:
  // offset 0: version (fixed 32-bit)
  // offset 4: fontRevision (fixed 32-bit)
  // offset 8: checkSumAdjustment (uint32)
  // offset 12: magicNumber (uint32)
  // offset 16: flags (uint16)
  // offset 18: unitsPerEm (uint16)
  const unitsPerEm = view.getUint16(headTable.offset + 18, false);
  if (unitsPerEm === 0) {
    return null;
  }

  // Find hhea table for ascender/descender
  const hheaTable = tables.find((t) => t.tag === "hhea");
  if (!hheaTable || hheaTable.offset + 10 > fontData.length) {
    return null;
  }

  // hhea table layout:
  // offset 0: version (fixed 32-bit)
  // offset 4: ascender (int16)
  // offset 6: descender (int16)
  // offset 8: lineGap (int16)
  const ascender = view.getInt16(hheaTable.offset + 4, false);
  const descender = view.getInt16(hheaTable.offset + 6, false);
  const lineGap = view.getInt16(hheaTable.offset + 8, false);

  return {
    unitsPerEm,
    ascender,
    descender,
    lineGap,
  };
}

/**
 * Convert TrueType metrics to normalized 1000 units.
 *
 * PDF uses 1/1000 em units for font metrics.
 * This function normalizes TrueType metrics to that scale.
 *
 * @param metrics - Raw TrueType metrics
 * @returns Metrics normalized to 1000 units per em
 */
export function normalizeMetricsTo1000(
  metrics: TrueTypeFontMetrics
): { ascender: number; descender: number } {
  const scale = 1000 / metrics.unitsPerEm;
  return {
    ascender: Math.round(metrics.ascender * scale),
    descender: Math.round(metrics.descender * scale),
  };
}
