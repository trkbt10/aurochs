/**
 * @file Resolved fill types for rendering
 *
 * Format-agnostic types for resolved fills after color/resource resolution.
 * Used by PPTX, DOCX, XLSX renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

// =============================================================================
// Resolved Color
// =============================================================================

/**
 * Resolved color with hex and alpha.
 */
export type ResolvedColor = {
  /** Hex color without # prefix (e.g., "ffffff") */
  readonly hex: string;
  /** Alpha transparency (0-1) */
  readonly alpha: number;
};

// =============================================================================
// Resolved Fill Types
// =============================================================================

/**
 * No fill or unresolved fill.
 */
export type ResolvedNoFill = {
  readonly type: "none" | "unresolved";
};

/**
 * Resolved solid fill.
 */
export type ResolvedSolidFill = {
  readonly type: "solid";
  readonly color: ResolvedColor;
};

/**
 * Resolved gradient stop.
 */
export type ResolvedGradientStop = {
  /** Position in percentage (0-100) */
  readonly position: number;
  /** Resolved color */
  readonly color: ResolvedColor;
};

/**
 * Resolved gradient fill.
 */
export type ResolvedGradientFill = {
  readonly type: "gradient";
  /** Gradient angle in degrees */
  readonly angle: number;
  /** Gradient stops */
  readonly stops: readonly ResolvedGradientStop[];
  /** True if radial gradient */
  readonly isRadial?: boolean;
  /** Radial center (percentage 0-100) */
  readonly radialCenter?: {
    readonly cx: number;
    readonly cy: number;
  };
};

/**
 * Resolved image fill.
 */
export type ResolvedImageFill = {
  readonly type: "image";
  /** Image source URL or data URL */
  readonly src: string;
  /** Image fill mode */
  readonly mode?: "stretch" | "tile";
};

/**
 * Resolved pattern fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export type ResolvedPatternFill = {
  readonly type: "pattern";
  /** Pattern preset name */
  readonly preset: string;
  /** Foreground color (hex with # prefix) */
  readonly fgColor: string;
  /** Background color (hex with # prefix) */
  readonly bgColor: string;
};

/**
 * Union of all resolved fill types.
 */
export type ResolvedFill =
  | ResolvedNoFill
  | ResolvedSolidFill
  | ResolvedGradientFill
  | ResolvedImageFill
  | ResolvedPatternFill;

// =============================================================================
// Resolved Line Types
// =============================================================================

/**
 * Resolved line (stroke) properties.
 */
export type ResolvedLine = {
  /** Resolved fill for the line */
  readonly fill: ResolvedFill;
  /** Line width in pixels */
  readonly width: number;
  /** Line cap style */
  readonly cap?: "flat" | "round" | "square";
  /** Line join style */
  readonly join?: "bevel" | "miter" | "round";
  /** Dash preset name or custom dash */
  readonly dash?: string;
  /** Custom dash pattern [dash, space, dash, space, ...] */
  readonly customDash?: readonly number[];
};
