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
 * ECMA-376 reflection uses startPosition/endPosition to define the gradient range:
 * - startPosition (stPos): where the fade gradient begins (default 0%)
 * - endPosition (endPos): where the fade gradient ends (default 100%)
 * - The opacity fades from startOpacity at startPosition to endOpacity at endPosition
 *
 * @see ECMA-376 Part 1, Section 20.1.8.50 (reflection)
 */
export type TextReflectionConfig = {
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** Start opacity (0-100) @see ECMA-376 stA attribute */
  readonly startOpacity: number;
  /** Start position (0-100) where fade begins @see ECMA-376 stPos attribute */
  readonly startPosition: number;
  /** End opacity (0-100) @see ECMA-376 endA attribute */
  readonly endOpacity: number;
  /** End position (0-100) where fade ends @see ECMA-376 endPos attribute */
  readonly endPosition: number;
  /** Distance from source in pixels */
  readonly distance: number;
  /** Direction angle in degrees */
  readonly direction: number;
  /** Fade direction angle in degrees (default 90°) @see ECMA-376 fadeDir attribute */
  readonly fadeDirection: number;
  /** Horizontal scale percentage */
  readonly scaleX: number;
  /** Vertical scale percentage */
  readonly scaleY: number;
  /** Horizontal skew angle in degrees @see ECMA-376 kx attribute */
  readonly skewX?: number;
  /** Vertical skew angle in degrees @see ECMA-376 ky attribute */
  readonly skewY?: number;
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
