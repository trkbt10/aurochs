/**
 * @file DrawingML background type definitions
 *
 * Render output types for background resolution in DrawingML.
 * Parse intermediate types (BackgroundElement, BackgroundParseResult) are
 * defined in parser/slide/background-parser.ts where they are consumed.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

// =============================================================================
// Render Output Types
// =============================================================================

/**
 * Image fill mode for backgrounds
 *
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
 * Used in render output format with resolved values.
 */
export type GradientStop = {
  /** Position in percentage (0-100) */
  readonly position: number;
  /** Color in hex format (e.g., "4F81BD") */
  readonly color: string;
};

/**
 * Gradient data for backgrounds (render output format)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientData = {
  /** Rotation angle in degrees */
  readonly angle: number;
  /** Gradient type: "linear" or "path" (radial) */
  readonly type?: "linear" | "path";
  /**
   * Path shade type for radial gradients
   * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
   */
  readonly pathShadeType?: "circle" | "rect" | "shape";
  /**
   * Fill-to-rect for radial gradients (defines center and extent)
   * Values are in 1/100000 percentages
   * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
   */
  readonly fillToRect?: {
    readonly l: number;
    readonly t: number;
    readonly r: number;
    readonly b: number;
  };
  /** Gradient stops with positions */
  readonly stops: readonly GradientStop[];
};

/**
 * Background fill result (render output)
 *
 * Contains both CSS output and structured data for rendering.
 */
export type BackgroundFill = {
  /** CSS string for background styling */
  readonly css: string;
  /** Whether this is a solid color fill */
  readonly isSolid: boolean;
  /** Solid color in hex format with # prefix (e.g., "#4F81BD") */
  readonly color?: string;
  /** CSS gradient string (e.g., "linear-gradient(...)") */
  readonly gradient?: string;
  /** Structured gradient data for SVG/canvas rendering */
  readonly gradientData?: GradientData;
  /** Image URL or data URI */
  readonly image?: string;
  /** Image fill mode */
  readonly imageFillMode?: ImageFillMode;
};
