/**
 * @file Resolved background fill types
 *
 * Format-agnostic types for resolved background fills.
 * Used by PPTX, DOCX, XLSX renderers after resource resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path) for radial/path gradients
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Gradient stop with resolved color.
 */
export type ResolvedBackgroundGradientStop = {
  /** Position in percentage (0-100) */
  readonly position: number;
  /** Resolved hex color (e.g., "#ffffff") */
  readonly color: string;
};

/**
 * Radial gradient center position.
 */
export type RadialCenter = {
  /** Center X position in percentage (0-100) */
  readonly cx: number;
  /** Center Y position in percentage (0-100) */
  readonly cy: number;
};

/**
 * Solid background fill.
 */
export type SolidBackgroundFill = {
  readonly type: "solid";
  /** Resolved hex color (e.g., "#ffffff") */
  readonly color: string;
};

/**
 * Gradient background fill (linear or radial).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientBackgroundFill = {
  readonly type: "gradient";
  /** Gradient angle in degrees (0-360) for linear gradients */
  readonly angle: number;
  /** Gradient color stops */
  readonly stops: readonly ResolvedBackgroundGradientStop[];
  /**
   * True if this is a radial (path) gradient.
   *
   * Per ECMA-376 Part 1, Section 20.1.8.46 (a:path):
   * - path="circle" creates a circular radial gradient
   * - path="rect" creates a rectangular gradient
   * - path="shape" follows the shape boundary
   */
  readonly isRadial?: boolean;
  /**
   * Center position for radial gradients.
   * Derived from a:fillToRect element.
   * Default is center (50%, 50%) when not specified.
   */
  readonly radialCenter?: RadialCenter;
};

/**
 * Image background fill.
 */
export type ImageBackgroundFill = {
  readonly type: "image";
  /** Data URL of the image */
  readonly dataUrl: string;
  /** Image fill mode */
  readonly mode: "stretch" | "tile";
};

/**
 * Resolved background fill (format-agnostic).
 *
 * This type represents a fully resolved background after:
 * - Color scheme resolution (scheme colors → hex)
 * - Resource resolution (resourceId → data URL)
 * - Inheritance resolution (master/layout → slide)
 *
 * Used by PPTX, DOCX, XLSX renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type ResolvedBackgroundFill = SolidBackgroundFill | GradientBackgroundFill | ImageBackgroundFill;
