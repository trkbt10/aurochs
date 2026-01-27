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
