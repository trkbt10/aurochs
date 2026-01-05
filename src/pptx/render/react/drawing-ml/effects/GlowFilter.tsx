/**
 * @file Glow filter SVG definition
 *
 * Creates SVG filter for glow effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 */

import { memo, type ReactNode } from "react";
import type { GlowEffect } from "../../../../domain/effects";
import type { ColorContext } from "../../../../domain/resolution";
import { resolveColor } from "../../../core/drawing-ml";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for GlowFilterDef component
 */
export type GlowFilterDefProps = {
  /** Unique ID for the filter */
  readonly id: string;
  /** Glow effect data */
  readonly glow: GlowEffect;
  /** Color context for resolving scheme colors */
  readonly colorContext: ColorContext;
};

/**
 * Resolved glow properties for SVG rendering
 */
export type ResolvedGlowProps = {
  /** Glow radius in pixels */
  readonly radius: number;
  /** Glow color (hex with #) */
  readonly color: string;
  /** Glow opacity (0-1) */
  readonly opacity: number;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Resolve glow effect to SVG-ready properties
 */
export function resolveGlowProps(
  glow: GlowEffect,
  colorContext: ColorContext,
): ResolvedGlowProps | null {
  // Resolve glow color
  const hex = resolveColor(glow.color, colorContext);
  if (hex === undefined) {
    return null;
  }

  // Extract alpha from color transform
  const alpha = extractAlpha(glow.color);

  return {
    radius: glow.radius as number,
    color: `#${hex}`,
    opacity: alpha,
  };
}

/**
 * Extract alpha value from color
 */
function extractAlpha(color: GlowEffect["color"]): number {
  if (color.transform?.alpha === undefined) {
    return 1;
  }
  return (color.transform.alpha as number) / 100;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SVG filter definition for glow effects.
 *
 * Creates a glow by blurring and colorizing the source alpha,
 * then merging it behind the source graphic.
 *
 * @example
 * ```tsx
 * <defs>
 *   <GlowFilterDef id="glow-1" glow={glowEffect} colorContext={ctx} />
 * </defs>
 * <rect filter="url(#glow-1)" />
 * ```
 */
export const GlowFilterDef = memo(function GlowFilterDef({
  id,
  glow,
  colorContext,
}: GlowFilterDefProps): ReactNode | null {
  const props = resolveGlowProps(glow, colorContext);

  if (props === null) {
    return null;
  }

  return (
    <filter
      id={id}
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >
      {/* Blur the source alpha to create glow shape */}
      <feGaussianBlur in="SourceAlpha" stdDeviation={props.radius / 2} result="blur" />
      {/* Colorize the blurred alpha */}
      <feFlood floodColor={props.color} floodOpacity={props.opacity} result="color" />
      <feComposite in="color" in2="blur" operator="in" result="glow" />
      {/* Merge glow behind the source */}
      <feMerge>
        <feMergeNode in="glow" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>
  );
});
