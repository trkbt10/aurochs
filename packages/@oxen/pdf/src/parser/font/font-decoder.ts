/**
 * @file PDF Font Decoder (native)
 *
 * This module keeps the public surface area used by tests/diagnostics while
 * delegating actual PDF object traversal to the native loader.
 */

import type { NativePdfPage } from "../../native";
import type { CMapParseResult, CMapParserOptions, CIDOrdering, FontMappings, FontMetrics } from "../../domain/font";
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











/** Extract font info using injected resource/extraction functions. */
export function extractFontInfoWithDeps<PdfPageT, ResourcesT>(
  pdfPage: PdfPageT,
  fontName: string,
  deps: ExtractFontInfoDeps<PdfPageT, ResourcesT>,
): FontExtractionResult {
  if (!pdfPage) {throw new Error("pdfPage is required");}
  if (typeof fontName !== "string" || fontName.length === 0) {throw new Error("fontName is required");}
  if (!deps) {throw new Error("deps is required");}

  const errors: string[] = [];
  const state: {
    toUnicode: CMapParseResult | null;
    metrics: FontMetrics | null;
    ordering: CIDOrdering | null;
    encoding: ReadonlyMap<number, string> | null;
    isBold: boolean;
    isItalic: boolean;
    baseFont: string | null;
  } = {
    toUnicode: null,
    metrics: null,
    ordering: null,
    encoding: null,
    isBold: false,
    isItalic: false,
    baseFont: null,
  };

  const safelyExtract = <T,>(fn: () => T, errorMessage: (error: unknown) => string): T | null => {
    try {
      return fn();
    } catch (e) {
      errors.push(errorMessage(e));
      return null;
    }
  };

  const resources = safelyExtract(
    () => deps.getPageResources(pdfPage),
    (e) => `Failed to get page resources: ${e instanceof Error ? e.message : String(e)}`,
  );
  if (resources === null) {
    return { ...state, errors };
  }

  state.toUnicode = safelyExtract(
    () => deps.extractToUnicode(resources, fontName),
    (e) => `Failed to extract ToUnicode for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
  );

  state.metrics = safelyExtract(
    () => deps.extractFontMetrics(resources, fontName),
    (e) => `Failed to extract metrics for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
  );

  const extractCIDOrdering = deps.extractCIDOrdering;
  if (extractCIDOrdering) {
    state.ordering = safelyExtract(
      () => extractCIDOrdering(resources, fontName),
      (e) => `Failed to extract CIDOrdering for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const extractEncoding = deps.extractEncoding;
  if (extractEncoding) {
    state.encoding = safelyExtract(
      () => extractEncoding(resources, fontName),
      (e) => `Failed to extract Encoding for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const styleState: { value: { isBold: boolean; isItalic: boolean } | null } = { value: null };
  const extractBoldItalic = deps.extractBoldItalic;
  if (extractBoldItalic) {
    styleState.value = safelyExtract(
      () => extractBoldItalic(resources, fontName),
      (e) => `Failed to extract bold/italic for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  const style = styleState.value;
  if (style) {
    state.isBold = style.isBold;
    state.isItalic = style.isItalic;
  }

  const extractBaseFont = deps.extractBaseFont;
  if (extractBaseFont) {
    state.baseFont = safelyExtract(
      () => extractBaseFont(resources, fontName),
      (e) => `Failed to extract BaseFont for ${fontName}: ${e instanceof Error ? e.message : String(e)}`,
    );
  }

  return { ...state, errors };
}











/** Log extraction errors (best-effort) for debugging font issues. */
export function logExtractionErrors(result: FontExtractionResult, fontName: string): void {
  if (!result) {throw new Error("result is required");}
  if (typeof fontName !== "string" || fontName.length === 0) {throw new Error("fontName is required");}
  if (!result.errors || result.errors.length === 0) {return;}

  const succeeded: string[] = [];
  if (result.toUnicode) {succeeded.push("ToUnicode");}
  if (result.metrics) {succeeded.push("metrics");}

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
  if (!page) {throw new Error("page is required");}
  return extractFontMappingsNative(page, options);
}

/**
 * Extract detailed info for one font on a page.
 *
 * This is currently used by analysis/diagnostic specs.
 */
export function extractFontInfo(page: NativePdfPage, fontName: string, options: FontExtractionOptions = {}): FontExtractionResult {
  if (!page) {throw new Error("page is required");}
  if (typeof fontName !== "string" || fontName.length === 0) {throw new Error("fontName is required");}

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
