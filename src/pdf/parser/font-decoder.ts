/**
 * @file PDF Font Decoder (native)
 *
 * This module keeps the public surface area used by tests/diagnostics while
 * delegating actual PDF object traversal to the native loader.
 */

import type { NativePdfPage } from "../native";
import type {
  CMapParseResult,
  CMapParserOptions,
  CIDOrdering,
  FontInfo,
  FontMapping,
  FontMappings,
  FontMetrics,
} from "../domain/font";
import {
  DEFAULT_FONT_METRICS,
  decodeText,
  detectCIDOrdering,
  getEncodingByName,
  applyEncodingDifferences,
  glyphNameToUnicode,
} from "../domain/font";
import { extractFontMappingsNative } from "./font-decoder.native";

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

// Re-export for backwards compatibility with existing unit tests.
export type { FontMapping, FontMetrics, FontInfo, FontMappings } from "../domain/font";
export { DEFAULT_FONT_METRICS, decodeText } from "../domain/font";

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
  readonly extractCIDOrdering?: (resources: ResourcesT, fontName: string) => CIDOrdering | null;
  readonly extractEncoding?: (resources: ResourcesT, fontName: string) => ReadonlyMap<number, string> | null;
  readonly extractBoldItalic?: (resources: ResourcesT, fontName: string) => { isBold: boolean; isItalic: boolean };
  readonly extractBaseFont?: (resources: ResourcesT, fontName: string) => string | null;
}>;

export function extractFontInfoWithDeps<PdfPageT, ResourcesT>(
  pdfPage: PdfPageT,
  fontName: string,
  deps: ExtractFontInfoDeps<PdfPageT, ResourcesT>,
): FontExtractionResult {
  if (!pdfPage) throw new Error("pdfPage is required");
  if (typeof fontName !== "string" || fontName.length === 0) throw new Error("fontName is required");
  if (!deps) throw new Error("deps is required");

  const errors: string[] = [];
  let toUnicode: CMapParseResult | null = null;
  let metrics: FontMetrics | null = null;
  let ordering: CIDOrdering | null = null;
  let encoding: ReadonlyMap<number, string> | null = null;
  let isBold = false;
  let isItalic = false;
  let baseFont: string | null = null;

  let resources: ResourcesT;
  try {
    resources = deps.getPageResources(pdfPage);
  } catch (e) {
    errors.push(`Failed to get page resources: ${e instanceof Error ? e.message : String(e)}`);
    return { toUnicode, metrics, ordering, encoding, isBold, isItalic, baseFont, errors };
  }

  try {
    toUnicode = deps.extractToUnicode(resources, fontName);
  } catch (e) {
    errors.push(`Failed to extract ToUnicode for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    metrics = deps.extractFontMetrics(resources, fontName);
  } catch (e) {
    errors.push(`Failed to extract metrics for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    ordering = deps.extractCIDOrdering?.(resources, fontName) ?? null;
  } catch (e) {
    errors.push(`Failed to extract CIDOrdering for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    encoding = deps.extractEncoding?.(resources, fontName) ?? null;
  } catch (e) {
    errors.push(`Failed to extract Encoding for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const style = deps.extractBoldItalic?.(resources, fontName);
    if (style) {
      isBold = style.isBold;
      isItalic = style.isItalic;
    }
  } catch (e) {
    errors.push(`Failed to extract bold/italic for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    baseFont = deps.extractBaseFont?.(resources, fontName) ?? null;
  } catch (e) {
    errors.push(`Failed to extract BaseFont for ${fontName}: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { toUnicode, metrics, ordering, encoding, isBold, isItalic, baseFont, errors };
}

export function logExtractionErrors(result: FontExtractionResult, fontName: string): void {
  if (!result) throw new Error("result is required");
  if (typeof fontName !== "string" || fontName.length === 0) throw new Error("fontName is required");
  if (!result.errors || result.errors.length === 0) return;

  const succeeded: string[] = [];
  if (result.toUnicode) succeeded.push("ToUnicode");
  if (result.metrics) succeeded.push("metrics");

  if (succeeded.length === 0) {
    console.warn(`[PDF Font] Complete extraction failure for "${fontName}": ${result.errors.join("; ")}`);
    return;
  }

  console.warn(
    `[PDF Font] Partial extraction for "${fontName}": ` +
      `succeeded: [${succeeded.join(", ")}], failed: ${result.errors.length} operation(s)`,
  );
}

/**
 * Extract all font mappings for a page.
 */
export function extractFontMappings(page: NativePdfPage, options: FontExtractionOptions = {}): FontMappings {
  if (!page) throw new Error("page is required");
  return extractFontMappingsNative(page, options);
}

/**
 * Extract detailed info for one font on a page.
 *
 * This is currently used by analysis/diagnostic specs.
 */
export function extractFontInfo(page: NativePdfPage, fontName: string, options: FontExtractionOptions = {}): FontExtractionResult {
  if (!page) throw new Error("page is required");
  if (typeof fontName !== "string" || fontName.length === 0) throw new Error("fontName is required");

  const mappings = extractFontMappingsNative(page, options);
  const info = mappings.get(fontName);
  if (!info) {
    return {
      toUnicode: null,
      metrics: null,
      ordering: null,
      encoding: null,
      isBold: false,
      isItalic: false,
      baseFont: null,
      errors: [`Font not found in page resources: ${fontName}`],
    };
  }

  const toUnicode: CMapParseResult = {
    mapping: info.mapping,
    codeByteWidth: info.codeByteWidth,
  };

  return {
    toUnicode,
    metrics: info.metrics,
    ordering: info.ordering ?? null,
    encoding: info.encodingMap ?? null,
    isBold: info.isBold ?? false,
    isItalic: info.isItalic ?? false,
    baseFont: info.baseFont ?? null,
    errors: [],
  };
}

// Keep a small surface for encoding-related utilities used in older docs/specs.
export { detectCIDOrdering, getEncodingByName, applyEncodingDifferences, glyphNameToUnicode };
