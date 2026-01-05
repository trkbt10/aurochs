/**
 * @file Shadow filter SVG definition
 *
 * Creates SVG filter for shadow effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */

import { memo, type ReactNode } from "react";
import type { ShadowEffect } from "../../../../domain/effects";
import type { ColorContext } from "../../../../domain/resolution";
import { resolveColor } from "../../../core/drawing-ml";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for ShadowFilterDef component
 */
export type ShadowFilterDefProps = {
  /** Unique ID for the filter */
  readonly id: string;
  /** Shadow effect data */
  readonly shadow: ShadowEffect;
  /** Color context for resolving scheme colors */
  readonly colorContext: ColorContext;
};

/**
 * Resolved shadow properties for SVG rendering
 */
export type ResolvedShadowProps = {
  /** Blur radius in pixels */
  readonly blurRadius: number;
  /** X offset in pixels */
  readonly dx: number;
  /** Y offset in pixels */
  readonly dy: number;
  /** Shadow color (hex with #) */
  readonly color: string;
  /** Shadow opacity (0-1) */
  readonly opacity: number;
  /** Whether this is an inner shadow */
  readonly isInner: boolean;
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Convert OOXML direction (60000ths of a degree) to dx/dy offsets.
 *
 * OOXML direction:
 * - 0 = shadow to the right (positive X)
 * - 5400000 = shadow below (positive Y) = 90 degrees
 * - Direction is measured clockwise from the positive X axis
 *
 * @param direction - Direction in degrees (branded type)
 * @param distance - Distance in pixels (branded type)
 */
export function directionToOffset(
  direction: number,
  distance: number,
): { dx: number; dy: number } {
  // Convert degrees to radians
  const radians = (direction * Math.PI) / 180;

  // Calculate offsets
  // Note: SVG Y axis is inverted (positive = down)
  const dx = Math.cos(radians) * distance;
  const dy = Math.sin(radians) * distance;

  return { dx, dy };
}

/**
 * Resolve shadow effect to SVG-ready properties
 */
export function resolveShadowProps(
  shadow: ShadowEffect,
  colorContext: ColorContext,
): ResolvedShadowProps | null {
  // Resolve shadow color
  const hex = resolveColor(shadow.color, colorContext);
  if (hex === undefined) {
    return null;
  }

  // Extract alpha from color transform
  const alpha = extractAlpha(shadow.color);

  // Convert direction and distance to dx/dy
  const { dx, dy } = directionToOffset(shadow.direction as number, shadow.distance as number);

  return {
    blurRadius: shadow.blurRadius as number,
    dx,
    dy,
    color: `#${hex}`,
    opacity: alpha,
    isInner: shadow.type === "inner",
  };
}

/**
 * Extract alpha value from color
 */
function extractAlpha(color: ShadowEffect["color"]): number {
  if (color.transform?.alpha === undefined) {
    return 1;
  }
  return (color.transform.alpha as number) / 100;
}

// =============================================================================
// Component
// =============================================================================

/**
 * SVG filter definition for shadow effects.
 *
 * For outer shadows, uses feDropShadow.
 * For inner shadows, uses a combination of filters to create inset effect.
 *
 * @example
 * ```tsx
 * <defs>
 *   <ShadowFilterDef id="shadow-1" shadow={shadowEffect} colorContext={ctx} />
 * </defs>
 * <rect filter="url(#shadow-1)" />
 * ```
 */
export const ShadowFilterDef = memo(function ShadowFilterDef({
  id,
  shadow,
  colorContext,
}: ShadowFilterDefProps): ReactNode | null {
  const props = resolveShadowProps(shadow, colorContext);

  if (props === null) {
    return null;
  }

  // Outer shadow - use feDropShadow
  if (!props.isInner) {
    return (
      <filter
        id={id}
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
      >
        <feDropShadow
          dx={props.dx}
          dy={props.dy}
          stdDeviation={props.blurRadius / 2}
          floodColor={props.color}
          floodOpacity={props.opacity}
        />
      </filter>
    );
  }

  // Inner shadow - more complex filter
  return (
    <filter
      id={id}
      x="-50%"
      y="-50%"
      width="200%"
      height="200%"
    >
      {/* Invert the alpha channel */}
      <feComponentTransfer in="SourceAlpha" result="invert">
        <feFuncA type="table" tableValues="1 0" />
      </feComponentTransfer>
      {/* Blur the inverted alpha */}
      <feGaussianBlur in="invert" stdDeviation={props.blurRadius / 2} result="blur" />
      {/* Offset the blur */}
      <feOffset in="blur" dx={props.dx} dy={props.dy} result="offset" />
      {/* Colorize the shadow */}
      <feFlood floodColor={props.color} floodOpacity={props.opacity} result="color" />
      <feComposite in="color" in2="offset" operator="in" result="shadow" />
      {/* Clip to original shape */}
      <feComposite in="shadow" in2="SourceAlpha" operator="in" result="clipped" />
      {/* Merge with source */}
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="clipped" />
      </feMerge>
    </filter>
  );
});
