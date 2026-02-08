/**
 * @file Embedded font types for PPTX processing
 *
 * @see ECMA-376 Part 1, Section 19.2.1.9 - Embedded Fonts
 */

// =============================================================================
// Embedded Font Types
// =============================================================================

/**
 * Embedded font reference.
 * @see ECMA-376 Part 1, Section 19.2.1.9 (embeddedFont)
 */
export type EmbeddedFontReference = {
  readonly rId: string;
};

/**
 * Embedded font typeface details.
 * @see ECMA-376 Part 1, Section 19.2.1.13 (font)
 */
export type EmbeddedFontTypeface = {
  readonly typeface?: string;
  readonly panose?: string;
  readonly pitchFamily?: string;
  readonly charset?: string;
};

/**
 * Embedded font entry.
 * @see ECMA-376 Part 1, Section 19.2.1.9 (embeddedFont)
 */
export type EmbeddedFont = {
  readonly font?: EmbeddedFontTypeface;
  readonly regular?: EmbeddedFontReference;
  readonly bold?: EmbeddedFontReference;
  readonly italic?: EmbeddedFontReference;
  readonly boldItalic?: EmbeddedFontReference;
};
