/**
 * @file PPTX-specific color type definitions
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 - Color Types
 */

// =============================================================================
// Fill Types
// =============================================================================

/** Fill color result - can be string or gradient info */
export type GradientFill = {
  color: Array<{ pos: string; color: string }>;
  rot: number;
  /** Gradient type: 'linear' (default) or 'path' (radial/shape) */
  type?: "linear" | "path";
  /** Path gradient shade type (for type='path') */
  pathShadeType?: "circle" | "rect" | "shape";
  /** Fill-to-rect for path gradients (in 1/100000 units) */
  fillToRect?: { l: number; t: number; r: number; b: number };
};

export type FillResult = string | GradientFill | null;

/** Fill type enumeration */
export type FillType =
  | "SOLID_FILL"
  | "GRADIENT_FILL"
  | "PIC_FILL"
  | "PATTERN_FILL"
  | "GROUP_FILL"
  | "NO_FILL"
  | "";
