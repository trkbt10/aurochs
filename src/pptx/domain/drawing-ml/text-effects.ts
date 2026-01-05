/**
 * @file Text effects type definitions
 *
 * Resolved text effects configurations for rendering.
 * These types represent the output of effects resolution - ready for SVG filter rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */

// =============================================================================
// Text Effects Types
// =============================================================================

/**
 * Resolved shadow effect for text rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */
export type TextShadowConfig = {
  /** Shadow type: outer or inner */
  readonly type: "outer" | "inner";
  /** Shadow color as hex (with #) */
  readonly color: string;
  /** Shadow opacity (0-1) */
  readonly opacity: number;
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** X offset in pixels */
  readonly dx: number;
  /** Y offset in pixels */
  readonly dy: number;
};

/**
 * Resolved glow effect for text rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */
export type TextGlowConfig = {
  /** Glow color as hex (with #) */
  readonly color: string;
  /** Glow opacity (0-1) */
  readonly opacity: number;
  /** Glow radius in pixels */
  readonly radius: number;
};

/**
 * Resolved soft edge effect for text rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */
export type TextSoftEdgeConfig = {
  /** Soft edge radius in pixels */
  readonly radius: number;
};

/**
 * Resolved reflection effect for text rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type TextReflectionConfig = {
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** Start opacity (0-100) */
  readonly startOpacity: number;
  /** End opacity (0-100) */
  readonly endOpacity: number;
  /** Distance from source in pixels */
  readonly distance: number;
  /** Direction angle in degrees */
  readonly direction: number;
  /** Fade direction angle in degrees */
  readonly fadeDirection: number;
  /** Horizontal scale percentage */
  readonly scaleX: number;
  /** Vertical scale percentage */
  readonly scaleY: number;
};

/**
 * Combined text effects configuration.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Effects)
 */
export type TextEffectsConfig = {
  /** Shadow effect */
  readonly shadow?: TextShadowConfig;
  /** Glow effect */
  readonly glow?: TextGlowConfig;
  /** Soft edge effect */
  readonly softEdge?: TextSoftEdgeConfig;
  /** Reflection effect */
  readonly reflection?: TextReflectionConfig;
};
