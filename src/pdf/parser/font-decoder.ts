/**
 * @file PDF Font Decoder
 *
 * Handles ToUnicode CMap parsing for proper text decoding.
 * PDF fonts often use custom encodings that need to be decoded
 * through the ToUnicode CMap to get readable Unicode text.
 */

import {
  PDFPage,
  PDFDict,
  PDFName,
  PDFRef,
  PDFRawStream,
  PDFArray,
  decodePDFRawStream,
} from "pdf-lib";

// =============================================================================
// Types
// =============================================================================

/**
 * Font mapping: character code → Unicode string
 */
export type FontMapping = Map<number, string>;

/**
 * Font metrics for accurate text positioning (PDF Reference 5.2)
 */
export type FontMetrics = {
  /** Glyph widths: character code → width in 1/1000 em units */
  readonly widths: Map<number, number>;
  /** Default glyph width when not found in widths (1/1000 em units) */
  readonly defaultWidth: number;
  /** Ascender height (1/1000 em units from baseline) */
  readonly ascender: number;
  /** Descender depth (1/1000 em units from baseline, typically negative) */
  readonly descender: number;
};

/**
 * Default font metrics when no font information is available
 *
 * PDF Reference 5.2.3, 5.7.1:
 * Font metrics are expressed in units of 1/1000 of the em-square.
 * The em-square is traditionally 1000 units for most fonts.
 *
 * Default values are based on common Latin font metrics:
 * - PDF standard 14 fonts (Helvetica, Times, Courier) have:
 *   - Helvetica: ascender ~718, descender ~-207
 *   - Times-Roman: ascender ~683, descender ~-217
 *   - Courier: ascender ~629, descender ~-157
 *
 * - We use slightly larger defaults (800/-200) to accommodate:
 *   - Fonts with taller ascenders (many display fonts)
 *   - CJK fonts which often extend higher
 *   - Conservative estimates that avoid clipping
 *
 * Total glyph height = ascender - descender = 800 - (-200) = 1000 units
 * This matches the standard em-square size.
 */
export const DEFAULT_FONT_METRICS: FontMetrics = {
  widths: new Map(),
  defaultWidth: 500, // PDF Reference 5.2.3: Common approximation (half em-width)
  ascender: 800,     // Conservative estimate for cap-height + ascender space
  descender: -200,   // Conservative estimate for descender depth
};

/**
 * Font info including mapping, byte width, and metrics
 */
export type FontInfo = {
  readonly mapping: FontMapping;
  /** Number of bytes per character code (1 or 2) */
  readonly codeByteWidth: 1 | 2;
  /** Font metrics for glyph widths and vertical metrics */
  readonly metrics: FontMetrics;
};

/**
 * Collection of font info keyed by font name
 */
export type FontMappings = Map<string, FontInfo>;

// =============================================================================
// Font Extraction
// =============================================================================

/**
 * Extract ToUnicode mappings for all fonts on a page
 */
export function extractFontMappings(pdfPage: PDFPage): FontMappings {
  const mappings: FontMappings = new Map();

  try {
    const resources = getPageResources(pdfPage);
    if (!resources) return mappings;

    const fonts = getFontDict(resources);
    if (!fonts) return mappings;

    const context = pdfPage.node.context;

    // Iterate through all fonts
    for (const [name, ref] of fonts.entries()) {
      const fontName = name instanceof PDFName ? name.asString() : String(name);
      const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

      const fontDict = ref instanceof PDFRef ? context.lookup(ref) : ref;
      if (!(fontDict instanceof PDFDict)) continue;

      const fontInfo = extractFontInfo(fontDict, context);
      // Store font info even if mapping is empty (metrics may still be useful)
      mappings.set(cleanName, fontInfo);
    }
  } catch (error) {
    console.warn("Failed to extract font mappings:", error);
  }

  return mappings;
}

/**
 * Get Resources dictionary from page
 */
function getPageResources(pdfPage: PDFPage): PDFDict | null {
  try {
    const resourcesRef = pdfPage.node.Resources();
    if (!resourcesRef) return null;

    const resources = pdfPage.node.context.lookup(resourcesRef);
    return resources instanceof PDFDict ? resources : null;
  } catch {
    return null;
  }
}

/**
 * Get Font dictionary from resources
 */
function getFontDict(resources: PDFDict): PDFDict | null {
  try {
    const fontRef = resources.get(PDFName.of("Font"));
    if (!fontRef) return null;

    const context = resources.context;
    const fonts = fontRef instanceof PDFRef ? context.lookup(fontRef) : fontRef;
    return fonts instanceof PDFDict ? fonts : null;
  } catch {
    return null;
  }
}

/**
 * Extract complete font information including ToUnicode mapping and metrics
 */
function extractFontInfo(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): FontInfo {
  // Extract ToUnicode mapping
  const { mapping, codeByteWidth } = extractToUnicodeMapping(fontDict, context);

  // Extract font metrics
  const metrics = extractFontMetrics(fontDict, context);

  return { mapping, codeByteWidth, metrics };
}

/**
 * Extract ToUnicode mapping from a font dictionary
 */
function extractToUnicodeMapping(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): { mapping: FontMapping; codeByteWidth: 1 | 2 } {
  const emptyResult = { mapping: new Map<number, string>(), codeByteWidth: 1 as const };

  try {
    // Check for ToUnicode stream
    const toUnicodeRef = fontDict.get(PDFName.of("ToUnicode"));
    if (!toUnicodeRef) {
      // Try looking in DescendantFonts for Type0 fonts
      const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
      if (descendantsRef) {
        const descendants =
          descendantsRef instanceof PDFRef
            ? context.lookup(descendantsRef)
            : descendantsRef;

        if (descendants instanceof PDFArray && descendants.size() > 0) {
          const firstRef = descendants.get(0);
          const firstDescendant =
            firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

          if (firstDescendant instanceof PDFDict) {
            const descToUnicode = firstDescendant.get(PDFName.of("ToUnicode"));
            if (descToUnicode) {
              return extractToUnicodeMappingFromRef(descToUnicode, context);
            }
          }
        }
      }
      return emptyResult;
    }

    return extractToUnicodeMappingFromRef(toUnicodeRef, context);
  } catch (error) {
    console.warn("Failed to extract ToUnicode mapping:", error);
  }

  return emptyResult;
}

/**
 * Extract font metrics from a font dictionary (PDF Reference 5.2)
 */
function extractFontMetrics(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): FontMetrics {
  try {
    // Check font type
    const subtype = fontDict.get(PDFName.of("Subtype"));
    const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

    // For Type0 (composite) fonts, look in DescendantFonts
    if (subtypeStr === "/Type0") {
      return extractType0FontMetrics(fontDict, context);
    }

    // For simple fonts (Type1, TrueType, etc.)
    return extractSimpleFontMetrics(fontDict, context);
  } catch (error) {
    console.warn("Failed to extract font metrics:", error);
  }

  return DEFAULT_FONT_METRICS;
}

/**
 * Extract metrics from simple fonts (Type1, TrueType, etc.)
 * PDF Reference 5.5
 */
function extractSimpleFontMetrics(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): FontMetrics {
  const widths = new Map<number, number>();

  // Get FirstChar and LastChar
  const firstCharRef = fontDict.get(PDFName.of("FirstChar"));
  const lastCharRef = fontDict.get(PDFName.of("LastChar"));
  const widthsRef = fontDict.get(PDFName.of("Widths"));

  const firstChar = getNumber(firstCharRef) ?? 0;
  const lastChar = getNumber(lastCharRef) ?? 255;

  // Parse Widths array
  if (widthsRef) {
    const widthsArr = widthsRef instanceof PDFRef
      ? context.lookup(widthsRef)
      : widthsRef;

    if (widthsArr instanceof PDFArray) {
      for (let i = 0; i < widthsArr.size(); i++) {
        const width = getNumber(widthsArr.get(i));
        if (width !== null) {
          widths.set(firstChar + i, width);
        }
      }
    }
  }

  // Get ascender/descender from FontDescriptor
  const { ascender, descender } = extractFontDescriptorMetrics(fontDict, context);

  // Calculate default width (average of widths or 500)
  const defaultWidth = widths.size > 0
    ? Math.round([...widths.values()].reduce((a, b) => a + b, 0) / widths.size)
    : 500;

  return { widths, defaultWidth, ascender, descender };
}

/**
 * Extract metrics from Type0 (composite/CID) fonts
 * PDF Reference 5.6
 */
function extractType0FontMetrics(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): FontMetrics {
  const widths = new Map<number, number>();
  let defaultWidth = 1000; // CID font default

  // Get DescendantFonts
  const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
  if (!descendantsRef) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  const descendants = descendantsRef instanceof PDFRef
    ? context.lookup(descendantsRef)
    : descendantsRef;

  if (!(descendants instanceof PDFArray) || descendants.size() === 0) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  const firstRef = descendants.get(0);
  const cidFont = firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

  if (!(cidFont instanceof PDFDict)) {
    return { widths, defaultWidth, ascender: 800, descender: -200 };
  }

  // Get DW (default width)
  const dwRef = cidFont.get(PDFName.of("DW"));
  if (dwRef) {
    const dw = getNumber(dwRef);
    if (dw !== null) {
      defaultWidth = dw;
    }
  }

  // Parse W array (width array for CID fonts)
  const wRef = cidFont.get(PDFName.of("W"));
  if (wRef) {
    const wArr = wRef instanceof PDFRef ? context.lookup(wRef) : wRef;
    if (wArr instanceof PDFArray) {
      parseCIDWidthArray(wArr, widths, context);
    }
  }

  // Get ascender/descender from CIDFont's FontDescriptor
  const { ascender, descender } = extractFontDescriptorMetrics(cidFont, context);

  return { widths, defaultWidth, ascender, descender };
}

/**
 * Parse CID font W (width) array
 * Format: [ c [w1 w2 ...] ] or [ c1 c2 w ]
 * PDF Reference 5.6.3
 */
function parseCIDWidthArray(
  wArr: PDFArray,
  widths: Map<number, number>,
  context: PDFPage["node"]["context"]
): void {
  let i = 0;

  while (i < wArr.size()) {
    const first = getNumber(wArr.get(i));
    if (first === null) {
      i++;
      continue;
    }

    const second = wArr.get(i + 1);

    if (second instanceof PDFArray) {
      // Format: c [w1 w2 w3 ...]
      // CID c has width w1, c+1 has w2, etc.
      for (let j = 0; j < second.size(); j++) {
        const w = getNumber(second.get(j));
        if (w !== null) {
          widths.set(first + j, w);
        }
      }
      i += 2;
    } else {
      // Format: c1 c2 w
      // All CIDs from c1 to c2 have width w
      const last = getNumber(second);
      const w = getNumber(wArr.get(i + 2));

      if (last !== null && w !== null) {
        for (let cid = first; cid <= last; cid++) {
          widths.set(cid, w);
        }
      }
      i += 3;
    }
  }
}

/**
 * Extract ascender/descender from FontDescriptor
 * PDF Reference 5.7
 */
function extractFontDescriptorMetrics(
  fontDict: PDFDict,
  context: PDFPage["node"]["context"]
): { ascender: number; descender: number } {
  const defaults = { ascender: 800, descender: -200 };

  const descriptorRef = fontDict.get(PDFName.of("FontDescriptor"));
  if (!descriptorRef) {
    return defaults;
  }

  const descriptor = descriptorRef instanceof PDFRef
    ? context.lookup(descriptorRef)
    : descriptorRef;

  if (!(descriptor instanceof PDFDict)) {
    return defaults;
  }

  const ascentRef = descriptor.get(PDFName.of("Ascent"));
  const descentRef = descriptor.get(PDFName.of("Descent"));

  const ascender = getNumber(ascentRef) ?? defaults.ascender;
  const descender = getNumber(descentRef) ?? defaults.descender;

  return { ascender, descender };
}

/**
 * Helper to extract number from PDFObject
 */
function getNumber(obj: unknown): number | null {
  if (typeof obj === "number") {
    return obj;
  }
  if (obj && typeof obj === "object" && "numberValue" in obj) {
    return (obj as { numberValue(): number }).numberValue();
  }
  return null;
}

/**
 * Parse result containing mapping and detected byte width
 */
type ParseResult = {
  mapping: FontMapping;
  codeByteWidth: 1 | 2;
};

/**
 * Extract mapping from ToUnicode reference
 */
function extractToUnicodeMappingFromRef(
  toUnicodeRef: unknown,
  context: PDFPage["node"]["context"]
): ParseResult {
  const emptyResult: ParseResult = { mapping: new Map(), codeByteWidth: 1 };

  const toUnicodeStream =
    toUnicodeRef instanceof PDFRef
      ? context.lookup(toUnicodeRef)
      : toUnicodeRef;

  if (!(toUnicodeStream instanceof PDFRawStream)) {
    return emptyResult;
  }

  // Decode the stream
  const decoded = decodePDFRawStream(toUnicodeStream);
  const cmapData = new TextDecoder("latin1").decode(decoded.decode());

  // Parse the CMap
  const result = parseToUnicodeCMap(cmapData);

  return result;
}

// =============================================================================
// CMap Parsing
// =============================================================================

/**
 * Parse ToUnicode CMap data and detect byte width
 */
function parseToUnicodeCMap(data: string): ParseResult {
  const mapping: FontMapping = new Map();
  let maxSourceHexLength = 0;

  // Parse beginbfchar sections (single character mappings)
  const bfcharLength = parseBfChar(data, mapping);
  maxSourceHexLength = Math.max(maxSourceHexLength, bfcharLength);

  // Parse beginbfrange sections (range mappings)
  const bfrangeLength = parseBfRange(data, mapping);
  maxSourceHexLength = Math.max(maxSourceHexLength, bfrangeLength);

  // Determine byte width from source hex length
  // 2 hex digits = 1 byte, 4 hex digits = 2 bytes
  const codeByteWidth: 1 | 2 = maxSourceHexLength > 2 ? 2 : 1;

  return { mapping, codeByteWidth };
}

/**
 * Parse beginbfchar sections
 * Format: <source> <destination>
 * Returns the maximum source hex length found
 */
function parseBfChar(data: string, mapping: FontMapping): number {
  const sectionRegex = /beginbfchar\s*\n?([\s\S]*?)endbfchar/gi;
  let sectionMatch;
  let maxSourceLength = 0;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = sectionMatch[1];
    if (!content) continue;

    // Match each <source> <destination> pair
    const entryRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let entryMatch;

    while ((entryMatch = entryRegex.exec(content)) !== null) {
      const sourceHex = entryMatch[1];
      const destHex = entryMatch[2];
      if (!sourceHex || !destHex) continue;

      maxSourceLength = Math.max(maxSourceLength, sourceHex.length);

      const source = parseInt(sourceHex, 16);
      const unicode = hexToString(destHex);

      if (unicode) {
        mapping.set(source, unicode);
      }
    }
  }

  return maxSourceLength;
}

/**
 * Parse beginbfrange sections
 * Format: <start> <end> <destStart> or <start> <end> [<dest1> <dest2> ...]
 * Returns the maximum source hex length found
 */
function parseBfRange(data: string, mapping: FontMapping): number {
  const sectionRegex = /beginbfrange\s*\n?([\s\S]*?)endbfrange/gi;
  let sectionMatch;
  let maxSourceLength = 0;

  while ((sectionMatch = sectionRegex.exec(data)) !== null) {
    const content = sectionMatch[1];
    if (!content) continue;

    // Match range entries: <start> <end> <destStart>
    const simpleRangeRegex =
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
    let simpleMatch;

    while ((simpleMatch = simpleRangeRegex.exec(content)) !== null) {
      const startHex = simpleMatch[1];
      const endHex = simpleMatch[2];
      const destHex = simpleMatch[3];
      if (!startHex || !endHex || !destHex) continue;

      maxSourceLength = Math.max(maxSourceLength, startHex.length, endHex.length);

      const start = parseInt(startHex, 16);
      const end = parseInt(endHex, 16);
      const destStart = parseInt(destHex, 16);

      // Limit range to prevent memory issues
      const maxRange = 256;
      const rangeSize = Math.min(end - start + 1, maxRange);

      for (let i = 0; i < rangeSize; i++) {
        const source = start + i;
        const unicode = String.fromCodePoint(destStart + i);
        mapping.set(source, unicode);
      }
    }

    // Match array range entries: <start> <end> [<dest1> <dest2> ...]
    const arrayRangeRegex =
      /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*\[([\s\S]*?)\]/g;
    let arrayMatch;

    while ((arrayMatch = arrayRangeRegex.exec(content)) !== null) {
      const startHex = arrayMatch[1];
      const endHex = arrayMatch[2];
      const arrayContent = arrayMatch[3];
      if (!startHex || !endHex || !arrayContent) continue;

      maxSourceLength = Math.max(maxSourceLength, startHex.length, endHex.length);

      const start = parseInt(startHex, 16);
      const end = parseInt(endHex, 16);

      // Parse array elements
      const destRegex = /<([0-9a-fA-F]+)>/g;
      const dests: string[] = [];
      let destMatch;

      while ((destMatch = destRegex.exec(arrayContent)) !== null) {
        const hex = destMatch[1];
        if (hex) {
          const unicode = hexToString(hex);
          if (unicode) dests.push(unicode);
        }
      }

      // Apply mappings
      const rangeSize = Math.min(end - start + 1, dests.length);
      for (let i = 0; i < rangeSize; i++) {
        const unicode = dests[i];
        if (unicode) {
          mapping.set(start + i, unicode);
        }
      }
    }
  }

  return maxSourceLength;
}

/**
 * Convert hex string to Unicode string
 * Handles both 2-byte (BMP) and 4-byte (surrogate) encodings
 */
function hexToString(hex: string): string | null {
  if (hex.length === 0 || hex.length % 2 !== 0) return null;

  try {
    // For 4-digit hex (2 bytes), it's a single BMP character
    if (hex.length <= 4) {
      const code = parseInt(hex, 16);
      return String.fromCodePoint(code);
    }

    // For longer hex, treat as UTF-16BE
    let result = "";
    for (let i = 0; i < hex.length; i += 4) {
      const chunk = hex.slice(i, i + 4);
      const code = parseInt(chunk, 16);
      result += String.fromCodePoint(code);
    }
    return result;
  } catch {
    return null;
  }
}

// =============================================================================
// Text Decoding
// =============================================================================

/**
 * Decode text using font mapping
 */
export function decodeText(
  rawText: string,
  fontName: string,
  mappings: FontMappings
): string {
  // Clean font name (remove leading slash and subset prefix)
  const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

  // Try exact match first
  let fontInfo = mappings.get(cleanName);

  // Try without subset prefix (e.g., "XGIAKD+Arial" → "Arial")
  if (!fontInfo) {
    const plusIndex = cleanName.indexOf("+");
    if (plusIndex > 0) {
      const baseName = cleanName.slice(plusIndex + 1);
      fontInfo = mappings.get(baseName);
    }
  }

  // Try matching by prefix
  if (!fontInfo) {
    for (const [key, value] of mappings.entries()) {
      if (cleanName.includes(key) || key.includes(cleanName)) {
        fontInfo = value;
        break;
      }
    }
  }

  if (!fontInfo || fontInfo.mapping.size === 0) {
    return rawText;
  }

  const { mapping, codeByteWidth } = fontInfo;

  // Decode characters
  let decoded = "";

  if (codeByteWidth === 2) {
    // For CID fonts with 2-byte codes, read pairs of bytes as big-endian 16-bit values
    for (let i = 0; i < rawText.length; i += 2) {
      const highByte = rawText.charCodeAt(i);
      const lowByte = i + 1 < rawText.length ? rawText.charCodeAt(i + 1) : 0;
      const code = (highByte << 8) | lowByte;

      const mapped = mapping.get(code);
      if (mapped) {
        decoded += mapped;
      } else {
        // No mapping found for this 2-byte code
        // Try to preserve the original if it's a printable character
        if (code >= 32 && code < 127) {
          decoded += String.fromCharCode(code);
        }
      }
    }
  } else {
    // For single-byte fonts
    for (let i = 0; i < rawText.length; i++) {
      const code = rawText.charCodeAt(i);
      const mapped = mapping.get(code);
      if (mapped) {
        decoded += mapped;
      } else {
        decoded += rawText[i];
      }
    }
  }

  return decoded;
}

