/**
 * @file Font Provider — central font resolution layer
 *
 * The FontProvider is the single authority for resolving fonts across
 * rendering and writing pipelines. All font lookups (font-family for SVG,
 * BaseFont for PDF writing, metrics, encoding) flow through this layer.
 *
 * Resolution priority:
 *   1. PDF-embedded fonts (extracted from the source document)
 *   2. PDF Standard 14 fonts (guaranteed by ISO 32000-1:2008 Section 9.6.2.2)
 *   3. System fonts (registered by the application, e.g. from user upload)
 *
 * Round-trip guarantee: when text has not been edited, the original rawBytes
 * are preserved verbatim through the provider — no re-encoding occurs.
 */

import type { CIDOrdering } from "./types";
import type { EmbeddedFont, EmbeddedFontMetrics, FontFormat } from "./embedded-font";
import type { PdfEmbeddedFont, PdfFontToUnicode } from "../document/types";
import { fontToDataUrl, generateFontFaceCss } from "./font-css-generator";
import { normalizeFontFamily } from "./font-name-map";
import { isBoldFont, isItalicFont } from "./font-style";

// =============================================================================
// Types
// =============================================================================

/**
 * Origin of a resolved font.
 *
 * - "embedded": font binary extracted from the PDF being edited
 * - "standard14": one of the 14 fonts guaranteed by the PDF spec (no embedding required)
 * - "system": font registered by the application from an external source
 */
export type FontSource = "embedded" | "standard14" | "system";

/**
 * A font resolved by the FontProvider.
 *
 * This is the single representation used by both the renderer (cssFontFamily)
 * and the writer (pdfBaseFont, data, toUnicode, codeByteWidth).
 */
export type ResolvedFont = {
  readonly source: FontSource;
  /** CSS font-family value for SVG / HTML rendering. */
  readonly cssFontFamily: string;
  /** PDF /BaseFont name for writing. */
  readonly pdfBaseFont: string;
  /** Font binary format (undefined for standard14 fonts). */
  readonly format?: FontFormat;
  /** Raw font binary for embedding (undefined for standard14). */
  readonly data?: Uint8Array;
  /** Font metrics in 1/1000 em units. */
  readonly metrics?: EmbeddedFontMetrics;
  /** CID ordering for CJK fonts. */
  readonly ordering?: CIDOrdering;
  /** Bytes per character code: 1 for single-byte, 2 for CID fonts. */
  readonly codeByteWidth: 1 | 2;
  /** ToUnicode mapping for round-trip preservation and re-encoding. */
  readonly toUnicode?: PdfFontToUnicode;
  /** Whether the font is bold. */
  readonly isBold: boolean;
  /** Whether the font is italic. */
  readonly isItalic: boolean;
  /** MIME type for @font-face data URL. */
  readonly mimeType?: string;
};

/**
 * Strategy for resolving a fallback font when the primary font cannot
 * encode certain characters.
 *
 * The FontProvider calls this when `splitTextByEncodability()` produces
 * non-encodable runs. The strategy returns a ResolvedFont that can handle
 * the fallback characters, or undefined if no fallback is available.
 *
 * This is DI-injectable: callers can provide a custom strategy when creating
 * the FontProvider. The default strategy falls back to Helvetica (Standard 14).
 *
 * @see ISO 32000-1:2008 Section 9.4.3 — Multiple Tf operators within BT...ET
 *   are used to switch fonts for different character runs.
 */
export type FontFallbackStrategy = (
  /** Characters that the primary font cannot encode. */
  unencodableText: string,
  /** The primary font that failed to encode. */
  primaryFont: ResolvedFont,
  /** The FontProvider for looking up alternative fonts. */
  provider: FontProvider,
) => ResolvedFont | undefined;

/**
 * FontProvider — the single authority for font resolution.
 *
 * Created once per document session. Both rendering and writing pipelines
 * must resolve fonts exclusively through this interface.
 */
export type FontProvider = {
  /**
   * Resolve a font by its PDF resource name and/or BaseFont name.
   *
   * Always returns a result — for unknown fonts, returns a best-effort
   * resolution using the normalized font name as CSS font-family.
   * Use `isAvailable()` to check if a font is actually registered.
   *
   * @param fontName - PDF resource identifier (e.g. "F1")
   * @param baseFont - Real font name from /BaseFont entry (e.g. "ABCDEF+Helvetica")
   * @returns Resolved font (never undefined)
   */
  resolve(fontName: string, baseFont?: string): ResolvedFont;

  /**
   * Register embedded fonts extracted from the PDF.
   * Accepts both EmbeddedFont (from parser) and PdfEmbeddedFont (from document).
   * Typically called once after parsing.
   */
  registerEmbeddedFonts(fonts: readonly FontRegistrationInput[]): void;

  /**
   * Register a system/external font (e.g. from user file upload).
   */
  registerSystemFont(
    family: string,
    data: Uint8Array,
    format: FontFormat,
    mimeType: string,
  ): void;

  /**
   * Generate combined @font-face CSS for all registered embedded and system fonts.
   * This is the single source of truth for font CSS — replaces direct use of
   * generateFontFaceStyle().
   */
  getAllFontFaceCss(): string;

  /**
   * Check if a font family is available (embedded, standard14, or system).
   */
  isAvailable(fontFamily: string): boolean;

  /**
   * Resolve a fallback font for characters that the primary font cannot encode.
   *
   * Uses the injected FontFallbackStrategy. Returns undefined if no fallback
   * is available — the caller must handle this (e.g. skip the characters or
   * raise an error to the user).
   *
   * @param unencodableText - The characters that need a fallback font
   * @param primaryFont - The font that could not encode these characters
   */
  resolveFallback(unencodableText: string, primaryFont: ResolvedFont): ResolvedFont | undefined;

  /**
   * Get all registered embedded fonts.
   * Used by the writer to embed fonts in the output PDF.
   */
  getEmbeddedFonts(): readonly FontRegistrationInput[];
};

// =============================================================================
// PDF Standard 14 Fonts
// =============================================================================

/**
 * PDF Standard 14 font names.
 * ISO 32000-1:2008 Section 9.6.2.2.
 */
const PDF_STANDARD_14_NAMES: readonly string[] = [
  "Helvetica", "Helvetica-Bold", "Helvetica-Oblique", "Helvetica-BoldOblique",
  "Times-Roman", "Times-Bold", "Times-Italic", "Times-BoldItalic",
  "Courier", "Courier-Bold", "Courier-Oblique", "Courier-BoldOblique",
  "Symbol", "ZapfDingbats",
];

/**
 * PDF Standard 14 fonts → system CSS font-family + style mapping.
 * ISO 32000-1:2008 Section 9.6.2.2.
 *
 * CSS font-family is derived from {@link normalizeFontFamily} (SoT for name mapping).
 * Bold/italic flags are derived from {@link isBoldFont}/{@link isItalicFont} (SoT for style detection).
 */
const PDF_STANDARD_14: ReadonlyMap<string, { cssFontFamily: string; isBold: boolean; isItalic: boolean }> = new Map(
  PDF_STANDARD_14_NAMES.map((name) => [
    name,
    {
      cssFontFamily: normalizeFontFamily(name),
      isBold: isBoldFont(name),
      isItalic: isItalicFont(name),
    },
  ]),
);

// =============================================================================
// Internal helpers
// =============================================================================

/**
 * Strip leading "/" and subset prefix "ABCDEF+" from a PDF font name.
 * This is the canonical normalization — used internally by the provider.
 */
function normalizeForLookup(pdfFontName: string): string {
  const clean = pdfFontName.startsWith("/") ? pdfFontName.slice(1) : pdfFontName;
  const plusIndex = clean.indexOf("+");
  return plusIndex > 0 ? clean.slice(plusIndex + 1) : clean;
}

/**
 * Common input type for font registration.
 * Accepts both EmbeddedFont (from parser) and PdfEmbeddedFont (from document).
 */
export type FontRegistrationInput = {
  readonly fontFamily: string;
  readonly baseFontName?: string;
  readonly format: FontFormat | "opentype" | "truetype" | "type1" | "cff";
  readonly data: Uint8Array;
  readonly mimeType: string;
  readonly metrics?: EmbeddedFontMetrics;
  readonly toUnicode?: { readonly byteMapping: ReadonlyMap<string, string>; readonly sourceCodeByteLengths: readonly number[] };
  readonly ordering?: CIDOrdering;
  readonly codeByteWidth?: 1 | 2;
};

function fontInputToResolved(font: FontRegistrationInput): ResolvedFont {
  return {
    source: "embedded",
    cssFontFamily: font.fontFamily,
    pdfBaseFont: font.baseFontName ?? font.fontFamily,
    format: font.format as FontFormat,
    data: font.data,
    metrics: font.metrics,
    ordering: font.ordering,
    codeByteWidth: font.codeByteWidth ?? 1,
    toUnicode: font.toUnicode
      ? { byteMapping: font.toUnicode.byteMapping, sourceCodeByteLengths: font.toUnicode.sourceCodeByteLengths }
      : undefined,
    isBold: false,
    isItalic: false,
    mimeType: font.mimeType,
  };
}

// =============================================================================
// Factory
// =============================================================================

/**
 * Options for creating a FontProvider.
 */
export type CreateFontProviderOptions = {
  /** Initial embedded fonts to register. */
  readonly embeddedFonts?: readonly FontRegistrationInput[];
  /**
   * Strategy for resolving fallback fonts when encoding fails.
   * When omitted, defaults to `defaultFallbackStrategy` which uses
   * Helvetica (Standard 14) for WinAnsi-encodable characters.
   */
  readonly fallbackStrategy?: FontFallbackStrategy;
};

/**
 * Default fallback strategy: use Helvetica (Standard 14, WinAnsiEncoding).
 *
 * This can encode Latin characters but NOT CJK.
 * For CJK fallback, a custom strategy must be provided that registers
 * a system CJK font via `registerSystemFont()`.
 */
const defaultFallbackStrategy: FontFallbackStrategy = (
  _unencodableText,
  _primaryFont,
  provider,
) => {
  // Resolve Helvetica as a Standard 14 font
  return provider.resolve("Helvetica", "Helvetica");
};

/**
 * Create a FontProvider instance.
 *
 * Optionally accepts embedded fonts from PDF parsing to register immediately.
 */
export function createFontProvider(
  options: CreateFontProviderOptions = {},
): FontProvider {
  const initialEmbeddedFonts = options.embeddedFonts;
  const fallbackStrategy = options.fallbackStrategy ?? defaultFallbackStrategy;
  // Registry: normalized fontFamily → ResolvedFont
  const embeddedByFamily = new Map<string, ResolvedFont>();
  // Registry: original baseFontName → ResolvedFont (for exact matching)
  const embeddedByBaseFontName = new Map<string, ResolvedFont>();
  // Keep registration inputs for getEmbeddedFonts() (as EmbeddedFont-compatible)
  const registeredFonts: FontRegistrationInput[] = [];
  // System fonts: normalized family → ResolvedFont
  const systemByFamily = new Map<string, ResolvedFont>();

  function registerEmbeddedFonts(fonts: readonly FontRegistrationInput[]): void {
    for (const font of fonts) {
      const resolved = fontInputToResolved(font);
      registeredFonts.push(font);

      // Register by normalized fontFamily
      embeddedByFamily.set(font.fontFamily, resolved);

      // Register by baseFontName (both raw and normalized forms)
      if (font.baseFontName) {
        embeddedByBaseFontName.set(font.baseFontName, resolved);
        const normalized = normalizeForLookup(font.baseFontName);
        embeddedByBaseFontName.set(normalized, resolved);
      }
    }
  }

  // Register initial fonts if provided
  if (initialEmbeddedFonts) {
    registerEmbeddedFonts(initialEmbeddedFonts);
  }

  function resolve(fontName: string, baseFont?: string): ResolvedFont {
    const lookupName = baseFont ?? fontName;
    const normalized = normalizeForLookup(lookupName);

    // Priority 1: Embedded fonts
    // Try exact baseFontName match first
    const byExact = embeddedByBaseFontName.get(lookupName);
    if (byExact) return byExact;

    // Try normalized baseFontName match
    const byNormalized = embeddedByBaseFontName.get(normalized);
    if (byNormalized) return byNormalized;

    // Try fontFamily match
    const byFamily = embeddedByFamily.get(normalized);
    if (byFamily) return byFamily;

    // Also try matching fontName (resource ID like "F1") if baseFont was provided
    if (baseFont) {
      const byFontName = embeddedByBaseFontName.get(fontName);
      if (byFontName) return byFontName;
      const byFontNameNorm = embeddedByBaseFontName.get(normalizeForLookup(fontName));
      if (byFontNameNorm) return byFontNameNorm;
    }

    // Priority 2: Standard 14 fonts
    const std14 = PDF_STANDARD_14.get(normalized);
    if (std14) {
      return {
        source: "standard14",
        cssFontFamily: std14.cssFontFamily,
        pdfBaseFont: normalized,
        codeByteWidth: 1,
        isBold: std14.isBold,
        isItalic: std14.isItalic,
      };
    }

    // Priority 3: System fonts
    const system = systemByFamily.get(normalized);
    if (system) return system;

    // Priority 4: Best-effort fallback for unknown fonts.
    // Use the normalized name as-is for CSS font-family (the browser will
    // attempt system font matching) and as PDF BaseFont for writing.
    return {
      source: "system",
      cssFontFamily: normalized,
      pdfBaseFont: normalized,
      codeByteWidth: 1,
      isBold: false,
      isItalic: false,
    };
  }

  function registerSystemFont(
    family: string,
    data: Uint8Array,
    format: FontFormat,
    mimeType: string,
  ): void {
    const resolved: ResolvedFont = {
      source: "system",
      cssFontFamily: family,
      pdfBaseFont: family,
      format,
      data,
      codeByteWidth: 1,
      isBold: false,
      isItalic: false,
      mimeType,
    };
    systemByFamily.set(family, resolved);
  }

  function getAllFontFaceCss(): string {
    const rules: string[] = [];
    for (const font of registeredFonts) {
      // FontRegistrationInput is structurally compatible with EmbeddedFont
      // for the fields needed by generateFontFaceCss (fontFamily, data, mimeType, format)
      rules.push(generateFontFaceCss(font as EmbeddedFont));
    }
    // System fonts with data also need @font-face rules
    for (const resolved of systemByFamily.values()) {
      if (resolved.data && resolved.mimeType && resolved.format) {
        const dataUrl = fontToDataUrl({
          data: resolved.data,
          mimeType: resolved.mimeType,
          format: resolved.format,
          fontFamily: resolved.cssFontFamily,
          baseFontName: resolved.pdfBaseFont,
        });
        const formatHint = resolved.format === "truetype" ? "truetype" : "opentype";
        rules.push(
          `@font-face {\n  font-family: "${resolved.cssFontFamily}";\n  src: url("${dataUrl}") format("${formatHint}");\n  font-weight: normal;\n  font-style: normal;\n  font-display: block;\n}`,
        );
      }
    }
    return rules.join("\n\n");
  }

  function isAvailable(fontFamily: string): boolean {
    const normalized = normalizeForLookup(fontFamily);
    return (
      embeddedByFamily.has(normalized) ||
      embeddedByBaseFontName.has(normalized) ||
      PDF_STANDARD_14.has(normalized) ||
      systemByFamily.has(normalized)
    );
  }

  function getEmbeddedFonts(): readonly FontRegistrationInput[] {
    return registeredFonts;
  }

  // The provider object — needed for self-reference in resolveFallback
  const provider: FontProvider = {
    resolve,
    registerEmbeddedFonts,
    registerSystemFont,
    getAllFontFaceCss,
    isAvailable,
    resolveFallback(unencodableText: string, primaryFont: ResolvedFont): ResolvedFont | undefined {
      return fallbackStrategy(unencodableText, primaryFont, provider);
    },
    getEmbeddedFonts,
  };

  return provider;
}

// =============================================================================
// Document-level factory
// =============================================================================

/**
 * Create a FontProvider from a PdfDocument.
 *
 * This is the canonical way to obtain a FontProvider for rendering or writing.
 * It automatically registers the document's embedded fonts.
 */
export function createFontProviderForDocument(
  document: { readonly embeddedFonts?: readonly FontRegistrationInput[] },
): FontProvider {
  return createFontProvider({ embeddedFonts: document.embeddedFonts });
}
