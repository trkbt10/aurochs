/**
 * @file Text fill type definitions
 *
 * Resolved text fill configurations for rendering.
 * These types represent the output of fill resolution - ready for SVG/CSS rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

// =============================================================================
// Text Fill Types
// =============================================================================

/**
 * Gradient stop for text fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.36 (a:gs)
 */
export type TextGradientStop = {
  /** Position in gradient (0-100) */
  readonly position: number;
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * Gradient fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type TextGradientFillConfig = {
  readonly type: "gradient";
  /** Gradient stops */
  readonly stops: readonly TextGradientStop[];
  /** Rotation angle in degrees (0-360, clockwise from horizontal) */
  readonly angle: number;
  /** Whether this is a radial gradient */
  readonly isRadial: boolean;
  /** Radial center (percentage 0-100) */
  readonly radialCenter?: { readonly cx: number; readonly cy: number };
};

/**
 * Solid fill configuration for text.
 */
export type TextSolidFillConfig = {
  readonly type: "solid";
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * No fill configuration for text (transparent text).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.44 (a:noFill)
 */
export type TextNoFillConfig = {
  readonly type: "noFill";
};

/**
 * Pattern fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (a:pattFill)
 */
export type TextPatternFillConfig = {
  readonly type: "pattern";
  /** Pattern preset name (e.g., "horz", "vert", "smGrid", etc.) */
  readonly preset: string;
  /** Foreground color as hex (with #) */
  readonly fgColor: string;
  /** Background color as hex (with #) */
  readonly bgColor: string;
  /** Foreground alpha (0-1) */
  readonly fgAlpha: number;
  /** Background alpha (0-1) */
  readonly bgAlpha: number;
};

/**
 * Image fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (a:blipFill)
 */
export type TextImageFillConfig = {
  readonly type: "image";
  /** Image URL (data URL or external URL) */
  readonly imageUrl: string;
  /** Stretch mode: tile or stretch */
  readonly mode: "tile" | "stretch";
  /** Tile scale (for tile mode) */
  readonly tileScale?: { readonly x: number; readonly y: number };
};

/**
 * Text fill configuration (solid, gradient, pattern, image, or noFill).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type TextFillConfig =
  | TextSolidFillConfig
  | TextGradientFillConfig
  | TextPatternFillConfig
  | TextImageFillConfig
  | TextNoFillConfig;
