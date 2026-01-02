/**
 * @file DrawingML render output types
 *
 * These types represent the output of rendering ECMA-376 elements.
 * They contain resolved values (hex colors, percentages) rather than
 * the raw ECMA-376 structures.
 *
 * Note: These are transitional types used by the legacy renderer.
 * The render layer uses ResolvedBackgroundFill instead.
 */

/**
 * Image fill mode for backgrounds
 * - "stretch" - stretch to fill without preserving aspect ratio
 * - "tile" - tile the image
 * - "cover" - scale to cover while preserving aspect ratio (default)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.* (a:stretch, a:tile)
 */
export type ImageFillMode = "stretch" | "tile" | "cover";

/**
 * Gradient stop with resolved position and color
 *
 * Note: This is the render output format, not the domain format.
 * Domain format uses branded Percent and Color types.
 */
export type GradientStop = {
  /** Position in percentage (0-100) */
  position: number;
  /** Color in hex format (e.g., "4F81BD") */
  color: string;
};

/**
 * Gradient data for backgrounds (render output format)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientData = {
  /** Rotation angle in degrees */
  angle: number;
  /** Gradient type: "linear" or "path" (radial) */
  type?: "linear" | "path";
  /**
   * Path shade type for radial gradients
   * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
   */
  pathShadeType?: "circle" | "rect" | "shape";
  /**
   * Fill-to-rect for radial gradients (defines center and extent)
   * Values are in 1/100000 percentages
   * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
   */
  fillToRect?: { l: number; t: number; r: number; b: number };
  /** Gradient stops with positions */
  stops: GradientStop[];
};

/**
 * Background fill result (legacy render output)
 *
 * Note: This type mixes CSS output (css, gradient) with structured data
 * (gradientData). This is a transitional type. The render layer uses
 * ResolvedBackgroundFill which properly separates concerns.
 */
export type BackgroundFill = {
  css: string;
  isSolid: boolean;
  color?: string;
  gradient?: string;
  /** Structured gradient data with positions */
  gradientData?: GradientData;
  image?: string;
  imageFillMode?: ImageFillMode;
};
