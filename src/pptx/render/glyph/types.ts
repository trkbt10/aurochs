/**
 * @file Glyph type definitions
 *
 * Types for character-level glyph extraction and caching.
 * These types are general-purpose and not tied to any specific renderer.
 */

// =============================================================================
// Contour Types
// =============================================================================

/**
 * A single contour path (closed loop of points)
 */
export type ContourPath = {
  readonly points: readonly { x: number; y: number }[];
  readonly isHole: boolean;
};

/**
 * Contour point
 */
export type ContourPoint = {
  readonly x: number;
  readonly y: number;
};

// =============================================================================
// Glyph Types
// =============================================================================

/**
 * Glyph metrics for positioning
 */
export type GlyphMetrics = {
  /** Advance width (distance to next character) */
  readonly advanceWidth: number;
  /** Left side bearing (space before glyph) */
  readonly leftBearing: number;
  /** Ascent from baseline */
  readonly ascent: number;
  /** Descent below baseline */
  readonly descent: number;
};

/**
 * Bounding box
 */
export type GlyphBounds = {
  readonly minX: number;
  readonly minY: number;
  readonly maxX: number;
  readonly maxY: number;
};

/**
 * Complete glyph contour data for a single character
 */
export type GlyphContour = {
  /** The character this glyph represents */
  readonly char: string;
  /** Contour paths for this glyph */
  readonly paths: readonly ContourPath[];
  /** Bounding box relative to origin */
  readonly bounds: GlyphBounds;
  /** Metrics for text layout */
  readonly metrics: GlyphMetrics;
};

/**
 * Style key for glyph lookup
 */
export type GlyphStyleKey = {
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
};

// =============================================================================
// Kerning Types
// =============================================================================

/**
 * Kerning pair adjustment
 */
export type KerningPair = {
  readonly first: string;
  readonly second: string;
  readonly adjustment: number; // Positive = more space, negative = less space
};

/**
 * Kerning table for a font
 */
export type KerningTable = {
  readonly pairs: ReadonlyMap<string, number>; // "AB" -> adjustment
};

// =============================================================================
// Layout Types
// =============================================================================

/**
 * A glyph with its position in the text layout
 */
export type PositionedGlyph = {
  readonly glyph: GlyphContour;
  readonly x: number;
  readonly y: number;
};

/**
 * Text layout configuration
 */
export type TextLayoutConfig = {
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly fontStyle: "normal" | "italic";
  /** Additional letter spacing (positive = more space) */
  readonly letterSpacing?: number;
  /** Enable kerning if kerning table exists */
  readonly enableKerning?: boolean;
  /** Enable optical kerning using measured glyph contours */
  readonly opticalKerning?: boolean;
};

/**
 * Result of text layout
 */
export type TextLayoutResult = {
  /** Positioned glyphs */
  readonly glyphs: readonly PositionedGlyph[];
  /** Total width of laid out text */
  readonly totalWidth: number;
  /** Maximum ascent */
  readonly ascent: number;
  /** Maximum descent */
  readonly descent: number;
  /** Combined contour paths (for geometry generation) */
  readonly combinedPaths: readonly ContourPath[];
};
