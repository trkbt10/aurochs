/**
 * @file Text bevel SVG filter
 *
 * Creates SVG filter to simulate beveled text edges.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.9 (a:sp3d - bevelT, bevelB)
 */

import type { ReactNode } from "react";

// =============================================================================
// Types
// =============================================================================

/**
 * Bevel configuration from Shape3d
 */
export type BevelConfig = {
  readonly width: number;
  readonly height: number;
  readonly preset: string;
};

/**
 * Offset values for highlight and shadow
 */
type BevelOffset = {
  readonly x: number;
  readonly y: number;
};

/**
 * Combined highlight and shadow offsets
 */
type BevelOffsets = {
  readonly highlightOffset: BevelOffset;
  readonly shadowOffset: BevelOffset;
};

// =============================================================================
// Light Direction Handlers
// =============================================================================

/**
 * Light direction to bevel offset mapping.
 *
 * Uses handler pattern (Rule 1.1) for O(1) lookup.
 *
 * @see ECMA-376 Part 1, Section 20.1.5.6 (a:lightRig - dir)
 */
const LIGHT_DIRECTION_HANDLERS: Record<string, BevelOffsets> = {
  tl: {
    highlightOffset: { x: -1, y: -1 },
    shadowOffset: { x: 1, y: 1 },
  },
  t: {
    highlightOffset: { x: 0, y: -1 },
    shadowOffset: { x: 0, y: 1 },
  },
  tr: {
    highlightOffset: { x: 1, y: -1 },
    shadowOffset: { x: -1, y: 1 },
  },
  l: {
    highlightOffset: { x: -1, y: 0 },
    shadowOffset: { x: 1, y: 0 },
  },
  r: {
    highlightOffset: { x: 1, y: 0 },
    shadowOffset: { x: -1, y: 0 },
  },
  bl: {
    highlightOffset: { x: -1, y: 1 },
    shadowOffset: { x: 1, y: -1 },
  },
  b: {
    highlightOffset: { x: 0, y: 1 },
    shadowOffset: { x: 0, y: -1 },
  },
  br: {
    highlightOffset: { x: 1, y: 1 },
    shadowOffset: { x: -1, y: -1 },
  },
};

/**
 * Default light direction (top-left)
 */
const DEFAULT_LIGHT_DIRECTION = "tl";

/**
 * Get bevel highlight and shadow offsets based on light direction.
 *
 * @param direction - Light rig direction (tl, t, tr, l, r, bl, b, br)
 * @returns Highlight and shadow offset values
 */
export function getBevelOffsets(direction: string): BevelOffsets {
  return LIGHT_DIRECTION_HANDLERS[direction] ?? LIGHT_DIRECTION_HANDLERS[DEFAULT_LIGHT_DIRECTION];
}

// =============================================================================
// Filter Constants
// =============================================================================

/**
 * Highlight effect opacity
 */
const HIGHLIGHT_OPACITY = 0.3;

/**
 * Shadow effect opacity
 */
const SHADOW_OPACITY = 0.25;

/**
 * Filter bounds padding for bevel effect
 */
const FILTER_BOUNDS = {
  x: "-20%",
  y: "-20%",
  width: "140%",
  height: "140%",
};

// =============================================================================
// Bevel Filter Creation
// =============================================================================

/**
 * Calculate blur amount from bevel dimensions.
 *
 * @param bevel - Bevel configuration
 * @returns Blur standard deviation
 */
function calculateBlurAmount(bevel: BevelConfig): number {
  return Math.min(bevel.width, bevel.height) / 3;
}

/**
 * Create SVG filter for text bevel effect.
 *
 * Uses Gaussian blur and compositing to simulate bevel edges
 * with highlight (light edge) and shadow (dark edge).
 *
 * @param bevel - Bevel configuration
 * @param lightDirection - Light rig direction
 * @param id - Unique filter ID
 * @returns SVG filter element for use in <defs>
 */
export function createTextBevelFilterDef(
  bevel: BevelConfig,
  lightDirection: string,
  id: string,
): ReactNode {
  const blurAmount = calculateBlurAmount(bevel);
  const { highlightOffset, shadowOffset } = getBevelOffsets(lightDirection);

  return (
    <filter
      id={id}
      x={FILTER_BOUNDS.x}
      y={FILTER_BOUNDS.y}
      width={FILTER_BOUNDS.width}
      height={FILTER_BOUNDS.height}
    >
      {/* Create blurred alpha for edge detection */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={blurAmount / 2} result="blurAlpha" />

      {/* Create highlight (light edge) */}
      <feOffset dx={highlightOffset.x} dy={highlightOffset.y} in="blurAlpha" result="highlightOffset" />
      <feFlood floodColor="white" floodOpacity={HIGHLIGHT_OPACITY} result="highlightColor" />
      <feComposite in="highlightColor" in2="highlightOffset" operator="in" result="highlight" />

      {/* Create shadow (dark edge) */}
      <feOffset dx={shadowOffset.x} dy={shadowOffset.y} in="blurAlpha" result="shadowOffset" />
      <feFlood floodColor="black" floodOpacity={SHADOW_OPACITY} result="shadowColor" />
      <feComposite in="shadowColor" in2="shadowOffset" operator="in" result="shadow" />

      {/* Merge all layers */}
      <feMerge>
        <feMergeNode in="shadow" />
        <feMergeNode in="highlight" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
}
