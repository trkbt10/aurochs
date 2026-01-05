/**
 * @file DrawingML fill type definitions
 *
 * Types for fill parsing and rendering in DrawingML.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 - Fill Types
 */

// =============================================================================
// Fill Types
// =============================================================================

/**
 * Gradient fill data
 *
 * Represents a parsed gradient fill with multiple color stops.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type GradientFill = {
  /** Color stops with position (in 1/100000 units) and hex color */
  readonly color: ReadonlyArray<{ readonly pos: string; readonly color: string }>;
  /** Rotation angle in degrees */
  readonly rot: number;
  /** Gradient type: 'linear' (default) or 'path' (radial/shape) */
  readonly type?: "linear" | "path";
  /**
   * Path gradient shade type (for type='path')
   * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
   */
  readonly pathShadeType?: "circle" | "rect" | "shape";
  /**
   * Fill-to-rect for path gradients (in 1/100000 units)
   * @see ECMA-376 Part 1, Section 20.1.8.30 (a:fillToRect)
   */
  readonly fillToRect?: {
    readonly l: number;
    readonly t: number;
    readonly r: number;
    readonly b: number;
  };
};

/**
 * Fill result from parsing
 *
 * Can be:
 * - string: CSS color value (e.g., "#FF0000")
 * - GradientFill: Gradient data
 * - null: No fill / transparent
 */
export type FillResult = string | GradientFill | null;

/**
 * Fill type enumeration
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Types)
 */
export type FillType =
  | "SOLID_FILL"
  | "GRADIENT_FILL"
  | "PIC_FILL"
  | "PATTERN_FILL"
  | "GROUP_FILL"
  | "NO_FILL"
  | "";
