/**
 * @file Shadow filter SVG definition
 *
 * Creates SVG filter for shadow effects.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 */

import { memo, type ReactNode } from "react";
import type { ShadowEffect } from "@oxen-office/pptx/domain/effects";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";

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
 * Shadow alignment values
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_RectAlignment)
 */
export type ShadowAlignment = "tl" | "t" | "tr" | "l" | "ctr" | "r" | "bl" | "b" | "br";

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
  /** Horizontal scale (default 100%) @see ECMA-376 sx attribute */
  readonly scaleX: number;
  /** Vertical scale (default 100%) @see ECMA-376 sy attribute */
  readonly scaleY: number;
  /** Horizontal skew in degrees @see ECMA-376 kx attribute */
  readonly skewX: number;
  /** Vertical skew in degrees @see ECMA-376 ky attribute */
  readonly skewY: number;
  /** Shadow alignment (default "b") @see ECMA-376 algn attribute */
  readonly alignment: ShadowAlignment;
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
 * Get alignment offset multipliers for shadow positioning.
 *
 * ECMA-376 alignment affects where the shadow is anchored when scale is applied.
 * When scale != 100%, the alignment determines the anchor point:
 * - "ctr" = center anchor (no offset adjustment)
 * - "tl" = top-left anchor (shadow expands down-right)
 * - "br" = bottom-right anchor (shadow expands up-left)
 * etc.
 *
 * Returns multipliers (-1, 0, or 1) for X and Y axes.
 *
 * @see ECMA-376 Part 1, Section 20.1.10.3 (ST_RectAlignment)
 */
function getAlignmentMultipliers(alignment: ShadowAlignment): { mx: number; my: number } {
  const alignmentMap: Record<ShadowAlignment, { mx: number; my: number }> = {
    tl: { mx: 1, my: 1 },    // top-left: expand right and down
    t: { mx: 0, my: 1 },     // top: expand down
    tr: { mx: -1, my: 1 },   // top-right: expand left and down
    l: { mx: 1, my: 0 },     // left: expand right
    ctr: { mx: 0, my: 0 },   // center: no offset adjustment
    r: { mx: -1, my: 0 },    // right: expand left
    bl: { mx: 1, my: -1 },   // bottom-left: expand right and up
    b: { mx: 0, my: -1 },    // bottom: expand up
    br: { mx: -1, my: -1 },  // bottom-right: expand left and up
  };
  return alignmentMap[alignment];
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

  // Parse alignment - default is "b" (bottom) for outerShdw per ECMA-376
  const alignmentStr = shadow.alignment ?? "b";
  const validAlignments = ["tl", "t", "tr", "l", "ctr", "r", "bl", "b", "br"] as const;
  const alignment = validAlignments.includes(alignmentStr as ShadowAlignment)
    ? (alignmentStr as ShadowAlignment)
    : "b";

  return {
    blurRadius: shadow.blurRadius as number,
    dx,
    dy,
    color: `#${hex}`,
    opacity: alpha,
    isInner: shadow.type === "inner",
    // ECMA-376 scale/skew attributes (defaults: 100%, 0°)
    scaleX: (shadow.scaleX as number | undefined) ?? 100,
    scaleY: (shadow.scaleY as number | undefined) ?? 100,
    skewX: (shadow.skewX as number | undefined) ?? 0,
    skewY: (shadow.skewY as number | undefined) ?? 0,
    alignment,
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
 * For outer shadows without skew/scale, uses simple feDropShadow.
 * For outer shadows with skew/scale, uses a complex filter chain.
 * For inner shadows, uses a combination of filters to create inset effect.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
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

  // Outer shadow - use feDropShadow with scale/skew/alignment adjustments
  // ECMA-376 kx/ky (skew) and sx/sy (scale) affect shadow shape.
  // SVG filters can't directly apply skew transforms to the shadow shape,
  // so we approximate by applying scale to offset and blur values.
  if (!props.isInner) {
    // Apply scale factors to offset values (approximation of ECMA-376 sx/sy)
    const scaleX = props.scaleX / 100;
    const scaleY = props.scaleY / 100;
    const scaledDx = props.dx * scaleX;
    const scaledDy = props.dy * scaleY;

    // Apply skew to offset (approximation - adds shear effect to shadow position)
    // kx affects horizontal position based on vertical offset
    // ky affects vertical position based on horizontal offset
    const tanKx = Math.tan((props.skewX * Math.PI) / 180);
    const tanKy = Math.tan((props.skewY * Math.PI) / 180);
    const skewedDx = scaledDx + scaledDy * tanKx;
    const skewedDy = scaledDy + scaledDx * tanKy;

    // Scale blur radius based on average scale factor
    const avgScale = (scaleX + scaleY) / 2;
    const scaledBlur = (props.blurRadius / 2) * avgScale;

    // Apply alignment adjustment
    // When scale != 100%, alignment affects where the shadow is anchored.
    // The blur radius is used as a proxy for the shadow's visual extent.
    const { mx, my } = getAlignmentMultipliers(props.alignment);
    const scaleOffsetX = (scaleX - 1) * props.blurRadius * mx;
    const scaleOffsetY = (scaleY - 1) * props.blurRadius * my;
    const alignedDx = skewedDx + scaleOffsetX;
    const alignedDy = skewedDy + scaleOffsetY;

    return (
      <filter
        id={id}
        x="-100%"
        y="-100%"
        width="300%"
        height="300%"
      >
        <feDropShadow
          dx={alignedDx}
          dy={alignedDy}
          stdDeviation={scaledBlur}
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
