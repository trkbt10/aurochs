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
import type { FontMapping, FontMetrics, FontInfo, FontMappings, CMapParseResult, CMapParserOptions } from "../domain/font";
import { DEFAULT_FONT_METRICS, parseToUnicodeCMap } from "../domain/font";

/**
 * Options for font extraction operations.
 */
export type FontExtractionOptions = {
  /**
   * Options for CMap parsing.
   * Controls how ToUnicode CMaps are processed.
   */
  readonly cmapOptions?: CMapParserOptions;
};

// Re-export for backwards compatibility
export type { FontMapping, FontMetrics, FontInfo, FontMappings } from "../domain/font";
export { DEFAULT_FONT_METRICS, decodeText } from "../domain/font";

// =============================================================================
// Font Extraction
// =============================================================================

import type { CIDOrdering } from "../domain/font";
import { detectCIDOrdering, getEncodingByName, applyEncodingDifferences, glyphNameToUnicode } from "../domain/font";

export type FontExtractionResult = {
  readonly toUnicode: CMapParseResult | null;
  readonly metrics: FontMetrics | null;
  readonly ordering: CIDOrdering | null;
  readonly encoding: ReadonlyMap<number, string> | null;
  /** Whether font is bold (from FontDescriptor flags or font name) */
  readonly isBold: boolean;
  /** Whether font is italic/oblique (from FontDescriptor flags or font name) */
  readonly isItalic: boolean;
  /**
   * The actual font name from BaseFont entry.
   * This is the real font name (e.g., "ABCDEF+Arial" or "Helvetica"),
   * not the resource identifier.
   */
  readonly baseFont: string | null;
  readonly errors: readonly string[];
};

export type ExtractFontInfoDeps<PdfPageT, ResourcesT> = Readonly<{
  readonly getPageResources: (pdfPage: PdfPageT) => ResourcesT;
  readonly extractToUnicode: (resources: ResourcesT, fontName: string) => CMapParseResult;
  readonly extractFontMetrics: (resources: ResourcesT, fontName: string) => FontMetrics;
}>;

export function extractFontInfo(pdfPage: PDFPage, fontName: string): FontExtractionResult {
  return extractFontInfoWithDeps(pdfPage, fontName, DEFAULT_EXTRACT_FONT_INFO_DEPS);
}

export function extractFontInfoWithDeps<PdfPageT, ResourcesT>(
  pdfPage: PdfPageT,
  fontName: string,
  deps: ExtractFontInfoDeps<PdfPageT, ResourcesT>
): FontExtractionResult {
  const errors: string[] = [];
  let toUnicode: CMapParseResult | null = null;
  let metrics: FontMetrics | null = null;

  let resources: ResourcesT;
  try {
    resources = deps.getPageResources(pdfPage);
  } catch (error) {
    errors.push(`Failed to get page resources: ${formatError(error)}`);
    return { toUnicode, metrics, ordering: null, encoding: null, isBold: false, isItalic: false, baseFont: null, errors };
  }

  try {
    toUnicode = deps.extractToUnicode(resources, fontName);
  } catch (error) {
    errors.push(`Failed to extract ToUnicode for ${fontName}: ${formatError(error)}`);
  }

  try {
    metrics = deps.extractFontMetrics(resources, fontName);
  } catch (error) {
    errors.push(`Failed to extract metrics for ${fontName}: ${formatError(error)}`);
  }

  // Note: CID ordering and encoding are not extracted via deps as they require PDFPage access
  // This function is primarily for testing; real extraction uses extractFontMappings
  return { toUnicode, metrics, ordering: null, encoding: null, isBold: false, isItalic: false, baseFont: null, errors };
}

export function logExtractionErrors(result: FontExtractionResult, fontName: string): void {
  if (result.errors.length === 0) {
    return;
  }

  const successParts: string[] = [];
  if (result.toUnicode) {
    successParts.push("ToUnicode");
  }
  if (result.metrics) {
    successParts.push("metrics");
  }

  // Only log if critical parts (ToUnicode or metrics) failed
  // CID ordering and encoding failures are expected for many fonts and not critical
  const hasCriticalFailure = !result.toUnicode || !result.metrics;

  if (successParts.length > 0 && hasCriticalFailure) {
    // Partial success with critical failure - worth logging
    console.warn(
      `[PDF Font] Partial extraction for "${fontName}": ` +
      `succeeded: [${successParts.join(", ")}], ` +
      `failed: ${result.errors.length} operation(s)`
    );
    return;
  }

  if (successParts.length === 0) {
    // Complete failure - always log
    console.warn(
      `[PDF Font] Complete extraction failure for "${fontName}": ` +
      result.errors.join("; ")
    );
  }
  // If ToUnicode and metrics both succeeded, don't log non-critical failures
}

/**
 * Extract ToUnicode mappings for all fonts on a page
 */
export function extractFontMappings(
  pdfPage: PDFPage,
  options: FontExtractionOptions = {}
): FontMappings {
  const mappings: FontMappings = new Map();

  let resources: PDFDict | null = null;
  try {
    resources = getPageResources(pdfPage);
  } catch (error) {
    console.warn(`[PDF Font] Failed to get page resources: ${formatError(error)}`);
    return mappings;
  }
  if (!resources) {
    return mappings;
  }

  let fonts: PDFDict | null = null;
  try {
    fonts = getFontDict(resources);
  } catch (error) {
    console.warn(`[PDF Font] Failed to get font dictionary: ${formatError(error)}`);
    return mappings;
  }
  if (!fonts) {
    return mappings;
  }

  const context = pdfPage.node.context;

  // Iterate through all fonts
  for (const [name, ref] of fonts.entries()) {
    const fontName = name instanceof PDFName ? name.asString() : String(name);
    const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

    let fontDict: unknown;
    try {
      fontDict = ref instanceof PDFRef ? context.lookup(ref) : ref;
      if (!(fontDict instanceof PDFDict)) {
        continue;
      }
    } catch (error) {
      console.warn(`[PDF Font] Failed to lookup font dictionary for "${cleanName}": ${formatError(error)}`);
      continue;
    }
    if (!(fontDict instanceof PDFDict)) {
      continue;
    }

    const extractionResult = extractFontInfoFromFontDict(fontDict, context, cleanName, options);
    logExtractionErrors(extractionResult, cleanName);

    // Store font info even if mapping is empty (metrics may still be useful)
    mappings.set(cleanName, fontExtractionResultToFontInfo(extractionResult));
  }

  return mappings;
}

/**
 * Get Resources dictionary from page
 */
function getPageResources(pdfPage: PDFPage): PDFDict | null {
  const resourcesRef = pdfPage.node.Resources();
  if (!resourcesRef) return null;

  const resources = pdfPage.node.context.lookup(resourcesRef);
  return resources instanceof PDFDict ? resources : null;
}

/**
 * Get Font dictionary from resources
 */
function getFontDict(resources: PDFDict): PDFDict | null {
  const fontRef = resources.get(PDFName.of("Font"));
  if (!fontRef) return null;

  const context = resources.context;
  const fonts = fontRef instanceof PDFRef ? context.lookup(fontRef) : fontRef;
  return fonts instanceof PDFDict ? fonts : null;
}

/**
 * Extract complete font information including ToUnicode mapping and metrics, with error capture.
 */
function extractFontInfoFromFontDict(
  fontDict: PDFDict,
  context: PDFDict["context"],
  fontName: string,
  options: FontExtractionOptions = {}
): FontExtractionResult {
  const errors: string[] = [];
  let toUnicode: CMapParseResult | null = null;
  let metrics: FontMetrics | null = null;
  let ordering: CIDOrdering | null = null;
  let encoding: ReadonlyMap<number, string> | null = null;

  try {
    toUnicode = extractToUnicodeMapping(fontDict, context, options.cmapOptions);
  } catch (error) {
    errors.push(`Failed to extract ToUnicode for ${fontName}: ${formatError(error)}`);
  }

  try {
    metrics = extractFontMetrics(fontDict, context);
  } catch (error) {
    errors.push(`Failed to extract metrics for ${fontName}: ${formatError(error)}`);
  }

  try {
    ordering = extractCIDOrdering(fontDict, context);
  } catch (error) {
    // CID ordering extraction failure is not critical, just log it
    errors.push(`Failed to extract CID ordering for ${fontName}: ${formatError(error)}`);
  }

  // Extract encoding for single-byte fonts when ToUnicode is not available
  try {
    encoding = extractFontEncoding(fontDict, context);
  } catch (error) {
    errors.push(`Failed to extract encoding for ${fontName}: ${formatError(error)}`);
  }

  // Extract bold/italic from font descriptor and name
  const { isBold, isItalic } = extractBoldItalic(fontDict, context);

  // Extract BaseFont (the actual font name)
  const baseFont = extractBaseFont(fontDict);

  return { toUnicode, metrics, ordering, encoding, isBold, isItalic, baseFont, errors };
}

/**
 * Extract BaseFont name from font dictionary.
 * Returns the actual font name, which may include subset prefix (e.g., "ABCDEF+Arial").
 */
function extractBaseFont(fontDict: PDFDict): string | null {
  const baseFontRef = fontDict.get(PDFName.of("BaseFont"));
  if (baseFontRef instanceof PDFName) {
    const name = baseFontRef.asString();
    // Remove leading slash if present
    return name.startsWith("/") ? name.slice(1) : name;
  }
  return null;
}

function fontExtractionResultToFontInfo(result: FontExtractionResult): FontInfo {
  const toUnicode = result.toUnicode ?? { mapping: new Map<number, string>(), codeByteWidth: 1 as const };

  return {
    mapping: toUnicode.mapping,
    codeByteWidth: toUnicode.codeByteWidth,
    metrics: result.metrics ?? DEFAULT_FONT_METRICS,
    ordering: result.ordering ?? undefined,
    encodingMap: result.encoding ?? undefined,
    isBold: result.isBold || undefined,
    isItalic: result.isItalic || undefined,
    baseFont: result.baseFont ?? undefined,
  };
}

/**
 * Extract ToUnicode mapping from a font dictionary
 */
function extractToUnicodeMapping(
  fontDict: PDFDict,
  context: PDFDict["context"],
  cmapOptions?: CMapParserOptions
): CMapParseResult {
  const emptyResult: CMapParseResult = {
    mapping: new Map<number, string>(),
    codeByteWidth: 1,
  };

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
            return extractToUnicodeMappingFromRef(descToUnicode, context, cmapOptions);
          }
        }
      }
    }
    return emptyResult;
  }

  return extractToUnicodeMappingFromRef(toUnicodeRef, context, cmapOptions);
}

/**
 * Extract font metrics from a font dictionary (PDF Reference 5.2)
 */
function extractFontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): FontMetrics {
  // Check font type
  const subtype = fontDict.get(PDFName.of("Subtype"));
  const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

  // For Type0 (composite) fonts, look in DescendantFonts
  if (subtypeStr === "/Type0") {
    return extractType0FontMetrics(fontDict, context);
  }

  // For simple fonts (Type1, TrueType, etc.)
  return extractSimpleFontMetrics(fontDict, context);
}

/**
 * Extract metrics from simple fonts (Type1, TrueType, etc.)
 * PDF Reference 5.5
 */
function extractSimpleFontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
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
 *
 * Per ISO 32000-1:2008 Section 9.7.4.3:
 * "The default value for DW is 1000 (corresponding to 1 unit in glyph space)."
 *
 * This is correct for CJK fonts where full-width characters are 1000 units.
 * For proportional Latin characters in CID fonts, the W array should specify
 * individual widths (typically ~500 for half-width).
 */
function extractType0FontMetrics(
  fontDict: PDFDict,
  context: PDFDict["context"]
): FontMetrics {
  const widths = new Map<number, number>();
  // ISO 32000-1 Section 9.7.4.3: Default DW is 1000 (full em width)
  // CJK full-width characters use 1000, half-width (ASCII) use ~500
  let defaultWidth = 1000;

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

  // NOTE: For CID fonts, width lookup uses CID values as keys.
  // The operator-parser.ts handles 2-byte CID font encoding by combining
  // highByte * 256 + lowByte to get the CID value for width lookup.
  // The W array should contain appropriate widths for each CID.
  // If not found, defaultWidth (DW) is used per PDF spec.

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
  context: PDFDict["context"]
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
  context: PDFDict["context"]
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
 * Extract bold/italic information from font
 *
 * Checks multiple sources:
 * 1. FontDescriptor Flags (Bit 7 = Italic, Bit 19 = ForceBold)
 * 2. Font name patterns (contains "Bold", "Italic", "Oblique")
 * 3. ItalicAngle in FontDescriptor (non-zero = italic)
 *
 * PDF Reference Table 5.20 - Font Descriptor Flags
 */
function extractBoldItalic(
  fontDict: PDFDict,
  context: PDFDict["context"]
): { isBold: boolean; isItalic: boolean } {
  let isBold = false;
  let isItalic = false;

  // Get the FontDescriptor, either from fontDict directly or from DescendantFonts for Type0
  const descriptor = getFontDescriptor(fontDict, context);

  if (descriptor) {
    // Check Flags
    const flagsRef = descriptor.get(PDFName.of("Flags"));
    const flags = getNumberValue(flagsRef);

    if (flags !== null) {
      // Bit 7 (value 64) = Italic
      isItalic = (flags & 64) !== 0;
      // Bit 19 (value 262144) = ForceBold
      isBold = (flags & 262144) !== 0;
    }

    // Check ItalicAngle (non-zero indicates italic)
    if (!isItalic) {
      const italicAngleRef = descriptor.get(PDFName.of("ItalicAngle"));
      const italicAngle = getNumberValue(italicAngleRef);
      if (italicAngle !== null && italicAngle !== 0) {
        isItalic = true;
      }
    }

    // Check font name in FontDescriptor for Bold/Italic patterns
    const fontNameRef = descriptor.get(PDFName.of("FontName"));
    if (fontNameRef instanceof PDFName) {
      const fontName = fontNameRef.asString().toLowerCase();
      if (!isBold && (fontName.includes("bold") || fontName.includes("-bd"))) {
        isBold = true;
      }
      if (!isItalic && (fontName.includes("italic") || fontName.includes("oblique") || fontName.includes("-it"))) {
        isItalic = true;
      }
    }
  }

  // Also check BaseFont name for Type0 fonts
  const baseFontRef = fontDict.get(PDFName.of("BaseFont"));
  if (baseFontRef instanceof PDFName) {
    const baseFont = baseFontRef.asString().toLowerCase();
    if (!isBold && (baseFont.includes("bold") || baseFont.includes("-bd"))) {
      isBold = true;
    }
    if (!isItalic && (baseFont.includes("italic") || baseFont.includes("oblique") || baseFont.includes("-it"))) {
      isItalic = true;
    }
  }

  return { isBold, isItalic };
}

/**
 * Get FontDescriptor from font dictionary.
 * For Type0 fonts, descends into DescendantFonts.
 */
function getFontDescriptor(
  fontDict: PDFDict,
  context: PDFDict["context"]
): PDFDict | null {
  // Check font type
  const subtype = fontDict.get(PDFName.of("Subtype"));
  const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

  // For Type0 (composite) fonts, look in DescendantFonts
  if (subtypeStr === "/Type0") {
    const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
    if (!descendantsRef) {
      return null;
    }

    const descendants = descendantsRef instanceof PDFRef
      ? context.lookup(descendantsRef)
      : descendantsRef;

    if (!(descendants instanceof PDFArray) || descendants.size() === 0) {
      return null;
    }

    const firstRef = descendants.get(0);
    const cidFont = firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

    if (!(cidFont instanceof PDFDict)) {
      return null;
    }

    const descriptorRef = cidFont.get(PDFName.of("FontDescriptor"));
    if (!descriptorRef) {
      return null;
    }

    const descriptor = descriptorRef instanceof PDFRef
      ? context.lookup(descriptorRef)
      : descriptorRef;

    return descriptor instanceof PDFDict ? descriptor : null;
  }

  // For simple fonts
  const descriptorRef = fontDict.get(PDFName.of("FontDescriptor"));
  if (!descriptorRef) {
    return null;
  }

  const descriptor = descriptorRef instanceof PDFRef
    ? context.lookup(descriptorRef)
    : descriptorRef;

  return descriptor instanceof PDFDict ? descriptor : null;
}

/**
 * Helper to extract number value from PDF object.
 * pdf-lib's PDFNumber has .numberValue as a property (not method).
 */
function getNumberValue(obj: unknown): number | null {
  if (typeof obj === "number") {
    return obj;
  }
  if (obj && typeof obj === "object") {
    const record = obj as Record<string, unknown>;
    // PDFNumber in pdf-lib has .numberValue as a property getter
    if ("numberValue" in record && typeof record.numberValue === "number") {
      return record.numberValue;
    }
  }
  return null;
}

/**
 * Extract CID ordering from font dictionary
 *
 * For Type0 fonts, the CIDSystemInfo dictionary contains the Ordering string
 * which identifies the character collection (Japan1, GB1, etc.).
 *
 * PDF Reference 5.6.1 - CIDSystemInfo Dictionary
 */
function extractCIDOrdering(
  fontDict: PDFDict,
  context: PDFDict["context"]
): CIDOrdering | null {
  // Check font type - only Type0 fonts have CID ordering
  const subtype = fontDict.get(PDFName.of("Subtype"));
  const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

  if (subtypeStr !== "/Type0") {
    return null;
  }

  // Get DescendantFonts
  const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
  if (!descendantsRef) {
    return null;
  }

  const descendants = descendantsRef instanceof PDFRef
    ? context.lookup(descendantsRef)
    : descendantsRef;

  if (!(descendants instanceof PDFArray) || descendants.size() === 0) {
    return null;
  }

  const firstRef = descendants.get(0);
  const cidFont = firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;

  if (!(cidFont instanceof PDFDict)) {
    return null;
  }

  // Get CIDSystemInfo from the CID font
  const cidSystemInfoRef = cidFont.get(PDFName.of("CIDSystemInfo"));
  if (!cidSystemInfoRef) {
    return null;
  }

  const cidSystemInfo = cidSystemInfoRef instanceof PDFRef
    ? context.lookup(cidSystemInfoRef)
    : cidSystemInfoRef;

  if (!(cidSystemInfo instanceof PDFDict)) {
    return null;
  }

  // Extract Ordering string
  const orderingRef = cidSystemInfo.get(PDFName.of("Ordering"));
  if (!orderingRef) {
    return null;
  }

  // Handle PDFString or PDFName
  let orderingStr: string;
  if (typeof orderingRef === "object" && "asString" in orderingRef) {
    orderingStr = (orderingRef as { asString(): string }).asString();
  } else if (typeof orderingRef === "string") {
    orderingStr = orderingRef;
  } else {
    return null;
  }

  return detectCIDOrdering(orderingStr);
}

/**
 * Extract font encoding from font dictionary.
 *
 * PDF fonts can specify encoding in several ways:
 * 1. Predefined encoding name: /WinAnsiEncoding, /MacRomanEncoding, /StandardEncoding
 * 2. Encoding dictionary with BaseEncoding and optional Differences array
 *
 * ISO 32000-1, Section 9.6.5 - Character Encoding
 */
function extractFontEncoding(
  fontDict: PDFDict,
  context: PDFDict["context"]
): ReadonlyMap<number, string> | null {
  // Check font type - Type0 (CID) fonts don't use simple encodings
  const subtype = fontDict.get(PDFName.of("Subtype"));
  const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "";

  if (subtypeStr === "/Type0") {
    return null;
  }

  // Get Encoding entry
  const encodingRef = fontDict.get(PDFName.of("Encoding"));
  if (!encodingRef) {
    return null;
  }

  // Handle predefined encoding name (e.g., /WinAnsiEncoding)
  if (encodingRef instanceof PDFName) {
    const encodingName = encodingRef.asString();
    return getEncodingByName(encodingName) ?? null;
  }

  // Handle encoding dictionary
  const encodingDict = encodingRef instanceof PDFRef
    ? context.lookup(encodingRef)
    : encodingRef;

  if (!(encodingDict instanceof PDFDict)) {
    return null;
  }

  // Get base encoding
  let baseEncoding: Map<number, string> | null = null;
  const baseEncodingRef = encodingDict.get(PDFName.of("BaseEncoding"));

  if (baseEncodingRef instanceof PDFName) {
    const base = getEncodingByName(baseEncodingRef.asString());
    if (base) {
      baseEncoding = new Map(base);
    }
  }

  // If no base encoding, start with an empty map
  // (will be populated by Differences)
  if (!baseEncoding) {
    baseEncoding = new Map();
  }

  // Apply Differences array
  const differencesRef = encodingDict.get(PDFName.of("Differences"));
  if (differencesRef) {
    const differencesArr = differencesRef instanceof PDFRef
      ? context.lookup(differencesRef)
      : differencesRef;

    if (differencesArr instanceof PDFArray) {
      const differences = parseDifferencesArray(differencesArr);
      return applyEncodingDifferences(baseEncoding, differences);
    }
  }

  return baseEncoding.size > 0 ? baseEncoding : null;
}

/**
 * Parse a PDF Differences array into a list of entries.
 *
 * The Differences array format: [code name1 name2 ... code name ...]
 * Where code is an integer and names are PDF names representing glyph names.
 */
function parseDifferencesArray(arr: PDFArray): (number | string)[] {
  const result: (number | string)[] = [];

  for (let i = 0; i < arr.size(); i++) {
    const item = arr.get(i);

    if (typeof item === "number") {
      result.push(item);
    } else if (item && typeof item === "object" && "numberValue" in item) {
      // PDFNumber in pdf-lib has .numberValue as a property getter, not a method
      const numVal = (item as { numberValue: number }).numberValue;
      if (typeof numVal === "number") {
        result.push(numVal);
      }
    } else if (item instanceof PDFName) {
      result.push(item.asString());
    }
  }

  return result;
}

/**
 * Helper to extract number from PDFObject
 *
 * pdf-lib's PDFNumber has `numberValue` as a property getter, not a method.
 */
function getNumber(obj: unknown): number | null {
  if (typeof obj === "number") {
    return obj;
  }
  if (obj && typeof obj === "object" && "numberValue" in obj) {
    const numVal = (obj as { numberValue: number }).numberValue;
    if (typeof numVal === "number") {
      return numVal;
    }
  }
  return null;
}

/**
 * Extract mapping from ToUnicode reference
 */
function extractToUnicodeMappingFromRef(
  toUnicodeRef: unknown,
  context: PDFDict["context"],
  cmapOptions?: CMapParserOptions
): CMapParseResult {
  const emptyResult: CMapParseResult = { mapping: new Map(), codeByteWidth: 1 };

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

  // Parse the CMap with options
  const result = parseToUnicodeCMap(cmapData, cmapOptions);

  return result;
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

const DEFAULT_EXTRACT_FONT_INFO_DEPS: ExtractFontInfoDeps<PDFPage, PDFDict> = {
  getPageResources: (pdfPage) => {
    const resources = getPageResources(pdfPage);
    if (!resources) {
      throw new Error("Page resources not found");
    }
    return resources;
  },
  extractToUnicode: (resources, fontName) => {
    const fonts = getFontDict(resources);
    if (!fonts) {
      throw new Error("Font dictionary not found");
    }

    const fontDict = getFontDictEntryByName(fonts, fontName);
    if (!fontDict) {
      throw new Error(`Font "${fontName}" not found`);
    }

    return extractToUnicodeMapping(fontDict, resources.context);
  },
  extractFontMetrics: (resources, fontName) => {
    const fonts = getFontDict(resources);
    if (!fonts) {
      throw new Error("Font dictionary not found");
    }

    const fontDict = getFontDictEntryByName(fonts, fontName);
    if (!fontDict) {
      throw new Error(`Font "${fontName}" not found`);
    }

    return extractFontMetrics(fontDict, resources.context);
  },
};

function getFontDictEntryByName(fonts: PDFDict, fontName: string): PDFDict | null {
  const target = normalizeFontNameForResources(fontName);

  for (const [name, ref] of fonts.entries()) {
    const keyName = name instanceof PDFName ? name.asString() : String(name);
    const cleanKeyName = normalizeFontNameForResources(keyName);
    if (cleanKeyName !== target) {
      continue;
    }

    const fontDict = ref instanceof PDFRef ? fonts.context.lookup(ref) : ref;
    return fontDict instanceof PDFDict ? fontDict : null;
  }

  return null;
}

function normalizeFontNameForResources(fontName: string): string {
  return fontName.startsWith("/") ? fontName.slice(1) : fontName;
}
