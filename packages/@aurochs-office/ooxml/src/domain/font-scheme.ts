/**
 * @file Font resolution context types for PPTX processing
 *
 * Types used by both parser and render layers for resolving
 * font references.
 *
 * Note: Color resolution types are in domain/color/context.ts
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1 (Font Scheme)
 */

// =============================================================================
// Font Resolution Types
// =============================================================================

/**
 * Font spec for major/minor fonts
 *
 * Specifies font typefaces for different script types.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (a:majorFont, a:minorFont)
 */
export type FontSpec = {
  /** Latin font typeface */
  readonly latin?: string;
  /** East Asian font typeface */
  readonly eastAsian?: string;
  /** Complex script font typeface */
  readonly complexScript?: string;
  /**
   * Script-specific font overrides (`<a:font script="..." typeface="..."/>`).
   *
   * Maps IETF script tags (e.g. "Jpan", "Hang", "Hans") to typeface names.
   * Used when `eastAsian` or `complexScript` is empty — the renderer should
   * look up the appropriate script tag here.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (a:majorFont / a:minorFont)
   */
  readonly supplementalFonts?: Readonly<Record<string, string>>;
};

/**
 * Font scheme from theme
 *
 * Contains the major and minor font definitions from the theme.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.18 (a:fontScheme)
 */
export type FontScheme = {
  /** Major fonts for headings/titles */
  readonly majorFont: FontSpec;
  /** Minor fonts for body text */
  readonly minorFont: FontSpec;
};

/**
 * Empty FontScheme compliant with ECMA-376.
 *
 * a:majorFont and a:minorFont are required children of a:fontScheme,
 * but a:latin, a:ea, a:cs within each are optional (§20.1.4.1.16-17).
 * Spec-compliant default when no font data is available (e.g., empty presentation).
 */
export const EMPTY_FONT_SCHEME: FontScheme = {
  majorFont: {},
  minorFont: {},
};

/**
 * Resolve a font typeface reference to an actual font name.
 *
 * Per ECMA-376 Part 1, Section 20.1.4.1.16-17:
 * Theme font references use the format:
 * - +mj-lt: Major font, Latin
 * - +mj-ea: Major font, East Asian
 * - +mj-cs: Major font, Complex Script
 * - +mn-lt: Minor font, Latin
 * - +mn-ea: Minor font, East Asian
 * - +mn-cs: Minor font, Complex Script
 *
 * @param typeface - Font typeface (may be a theme reference or actual font name)
 * @param fontScheme - Theme font scheme for resolution
 * @returns Resolved font name, or the original typeface if not a theme reference
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17
 */
export function resolveThemeFont(
  typeface: string | undefined,
  fontScheme: FontScheme | undefined,
): string | undefined {
  if (typeface === undefined) {
    return undefined;
  }

  // Not a theme reference
  if (!typeface.startsWith("+")) {
    return typeface;
  }

  // No font scheme available
  if (fontScheme === undefined) {
    return undefined;
  }

  // Resolve theme font references
  switch (typeface) {
    case "+mj-lt":
      return fontScheme.majorFont.latin;
    case "+mj-ea":
      return fontScheme.majorFont.eastAsian;
    case "+mj-cs":
      return fontScheme.majorFont.complexScript;
    case "+mn-lt":
      return fontScheme.minorFont.latin;
    case "+mn-ea":
      return fontScheme.minorFont.eastAsian;
    case "+mn-cs":
      return fontScheme.minorFont.complexScript;
    default:
      // Unknown theme reference
      return undefined;
  }
}

/**
 * Resolve a font from a FontSpec, with supplemental font fallback.
 *
 * The resolution order is:
 * 1. Primary field (latin, eastAsian, complexScript) — if non-empty
 * 2. Supplemental fonts — looked up by script tag (e.g. "Jpan")
 * 3. undefined — no suitable font found
 *
 * @param fontSpec - The font specification
 * @param category - Which primary field to try ("latin" | "eastAsian" | "complexScript")
 * @param scriptTag - Optional IETF script tag for supplemental lookup (e.g. "Jpan", "Hang")
 * @returns Resolved typeface name, or undefined
 */
export function resolveFontFromSpec(
  fontSpec: FontSpec,
  category: "latin" | "eastAsian" | "complexScript",
  scriptTag?: string,
): string | undefined {
  const primary = fontSpec[category];
  if (primary !== undefined && primary !== "") {
    return primary;
  }

  if (scriptTag !== undefined && fontSpec.supplementalFonts !== undefined) {
    const supplemental = fontSpec.supplementalFonts[scriptTag];
    if (supplemental !== undefined && supplemental !== "") {
      return supplemental;
    }
  }

  return undefined;
}
