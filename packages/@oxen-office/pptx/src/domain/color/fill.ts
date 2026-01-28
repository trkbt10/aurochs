/**
 * @file Fill resolution utilities
 *
 * Format-agnostic fill processing logic.
 * Transforms domain Fill/Line objects to resolved representations.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { Color } from "@oxen-office/ooxml/domain/color";
import type { PatternType } from "@oxen-office/ooxml/domain/fill";
import type { Fill, Line, BlipFill } from "./types";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { ResourceResolverFn } from "../resource-resolver";
import { hexToRgb } from "@oxen/color";

// =============================================================================
// Color Utilities
// =============================================================================

/**
 * Resolved color with optional alpha
 */
export type ResolvedColor = {
  /** Hex color (6 characters, no #) */
  readonly hex: string;
  /** Alpha value 0-1 */
  readonly alpha: number;
};

/**
 * Resolve a domain Color to hex + alpha
 */
export function resolveColorWithAlpha(
  color: Color,
  colorContext?: ColorContext
): ResolvedColor | undefined {
  const hex = resolveColor(color, colorContext);
  if (!hex) {
    return undefined;
  }

  const alpha = color.transform?.alpha !== undefined ? color.transform.alpha / 100 : 1;

  return { hex, alpha };
}


/**
 * Format color as CSS rgba string
 */
export function formatRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  if (alpha >= 1) {
    return `#${hex}`;
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// =============================================================================
// Fill Resolution
// =============================================================================

/**
 * Resolved solid fill
 */
export type ResolvedSolidFill = {
  readonly type: "solid";
  readonly color: ResolvedColor;
};

/**
 * Resolved gradient stop
 */
export type ResolvedGradientStop = {
  readonly color: ResolvedColor;
  readonly position: number;
};

/**
 * Resolved gradient fill
 */
export type ResolvedGradientFill = {
  readonly type: "gradient";
  readonly stops: readonly ResolvedGradientStop[];
  readonly angle: number;
  readonly isRadial: boolean;
  readonly radialCenter?: { cx: number; cy: number };
};

/**
 * Resolved image fill
 */
export type ResolvedImageFill = {
  readonly type: "image";
  /** Data URL or file path */
  readonly src: string;
  /** How to fill: stretch or tile */
  readonly mode: "stretch" | "tile";
};

/**
 * Resolved pattern fill
 * @see ECMA-376 Part 1, Section 20.1.10.50 (ST_PresetPatternVal)
 */
export type ResolvedPatternFill = {
  readonly type: "pattern";
  /** Pattern preset type */
  readonly preset: PatternType;
  /** Foreground color (hex, no #) */
  readonly fgColor: string;
  /** Foreground alpha (0-1) */
  readonly fgAlpha: number;
  /** Background color (hex, no #) */
  readonly bgColor: string;
  /** Background alpha (0-1) */
  readonly bgAlpha: number;
};

/**
 * Resolved fill (none, solid, gradient, image, pattern, or unresolved)
 */
export type ResolvedFill =
  | { readonly type: "none" }
  | ResolvedSolidFill
  | ResolvedGradientFill
  | ResolvedImageFill
  | ResolvedPatternFill
  | { readonly type: "unresolved"; readonly originalType: Fill["type"] };

/**
 * Resolve a blipFill to an image fill using the provided resource resolver.
 *
 * This function handles the resolution of blipFill (image fill) which can be:
 * 1. Already a data URL (pre-resolved during parsing)
 * 2. A relationship ID that needs to be resolved via resourceResolver
 *
 * @param fill - BlipFill to resolve
 * @param resourceResolver - Function to resolve relationship ID to data URL
 * @returns ResolvedImageFill or undefined if resolution fails
 */
export function resolveBlipFill(
  fill: BlipFill,
  resourceResolver?: ResourceResolverFn,
): ResolvedImageFill | undefined {
  // If resourceId is already a data URL, use it directly
  if (fill.resourceId.startsWith("data:")) {
    return {
      type: "image",
      src: fill.resourceId,
      mode: fill.tile ? "tile" : "stretch",
    };
  }

  // Try to resolve using the provided resolver
  if (resourceResolver !== undefined) {
    const resolvedSrc = resourceResolver(fill.resourceId);
    if (resolvedSrc !== undefined) {
      return {
        type: "image",
        src: resolvedSrc,
        mode: fill.tile ? "tile" : "stretch",
      };
    }
  }

  // Cannot resolve
  return undefined;
}

/**
 * Resolve a domain Fill to format-agnostic representation
 *
 * @param fill - Fill to resolve
 * @param colorContext - Color context for theme/scheme color resolution
 * @param resourceResolver - Optional resource resolver for blipFill resolution
 */
export function resolveFill(
  fill: Fill,
  colorContext?: ColorContext,
  resourceResolver?: ResourceResolverFn,
): ResolvedFill {
  switch (fill.type) {
    case "noFill":
      return { type: "none" };

    case "solidFill": {
      const color = resolveColorWithAlpha(fill.color, colorContext);
      if (!color) {
        return { type: "none" };
      }
      return { type: "solid", color };
    }

    case "gradientFill": {
      const stops: ResolvedGradientStop[] = [];
      for (const stop of fill.stops) {
        const color = resolveColorWithAlpha(stop.color, colorContext);
        if (color) {
          stops.push({ color, position: stop.position });
        }
      }

      if (stops.length === 0) {
        return { type: "none" };
      }

      const isRadial = fill.path !== undefined;
      const radialCenter = resolveRadialCenter(fill);

      return {
        type: "gradient",
        stops,
        angle: fill.linear?.angle ?? 0,
        isRadial,
        radialCenter,
      };
    }

    case "blipFill": {
      const resolved = resolveBlipFill(fill, resourceResolver);
      if (resolved !== undefined) {
        return resolved;
      }
      // Cannot resolve - return unresolved
      return { type: "unresolved", originalType: fill.type };
    }

    case "patternFill": {
      const fgResolved = resolveColorWithAlpha(fill.foregroundColor, colorContext);
      const bgResolved = resolveColorWithAlpha(fill.backgroundColor, colorContext);
      if (!fgResolved || !bgResolved) {
        return { type: "unresolved", originalType: fill.type };
      }
      return {
        type: "pattern",
        preset: fill.preset,
        fgColor: fgResolved.hex,
        fgAlpha: fgResolved.alpha,
        bgColor: bgResolved.hex,
        bgAlpha: bgResolved.alpha,
      };
    }

    case "groupFill":
      return { type: "unresolved", originalType: fill.type };
  }
}

function resolveRadialCenter(
  fill: { readonly path?: { readonly fillToRect?: { left: number; right: number; top: number; bottom: number } } }
): { cx: number; cy: number } | undefined {
  if (!fill.path?.fillToRect) {
    return undefined;
  }
  const rect = fill.path.fillToRect;
  return {
    cx: ((rect.left as number) + (100 - (rect.right as number))) / 2,
    cy: ((rect.top as number) + (100 - (rect.bottom as number))) / 2,
  };
}

// =============================================================================
// Line Resolution
// =============================================================================

/**
 * Preset dash pattern styles
 */
export type PresetDashStyle =
  | "solid"
  | "dot"
  | "dash"
  | "lgDash"
  | "dashDot"
  | "lgDashDot"
  | "lgDashDotDot"
  | "sysDot"
  | "sysDash"
  | "sysDashDot"
  | "sysDashDotDot";

/**
 * Dash style (preset name or "custom")
 */
export type DashStyle = PresetDashStyle | "custom" | string;

/**
 * Resolved line style
 */
export type ResolvedLine = {
  readonly fill: ResolvedFill;
  readonly width: number;
  readonly cap: "flat" | "round" | "square";
  readonly join: "miter" | "round" | "bevel";
  readonly dash: DashStyle;
  readonly customDash?: readonly { dashLength: number; spaceLength: number }[];
};

/**
 * Resolve a domain Line to format-agnostic representation
 */
export function resolveLine(line: Line, colorContext?: ColorContext): ResolvedLine {
  const fill = resolveFill(line.fill, colorContext);
  const isCustomDash = typeof line.dash !== "string";
  const dashStyle: DashStyle = isCustomDash ? "custom" : line.dash;
  const customDash = isCustomDash ? line.dash.dashes : undefined;

  return {
    fill,
    width: line.width as number,
    cap: line.cap,
    join: line.join,
    dash: dashStyle,
    customDash,
  };
}

/**
 * Get dash array pattern for a given dash style and stroke width
 */
export function getDashArrayPattern(
  style: DashStyle,
  strokeWidth: number,
  customDash?: readonly { dashLength: number; spaceLength: number }[]
): number[] | undefined {
  if (style === "solid") {
    return undefined;
  }

  if (style === "custom" && customDash) {
    const pattern: number[] = [];
    for (const d of customDash) {
      pattern.push((d.dashLength * strokeWidth) / 100, (d.spaceLength * strokeWidth) / 100);
    }
    return pattern;
  }

  // Preset dash patterns (relative to stroke width)
  const patterns: Record<DashStyle, number[] | undefined> = {
    solid: undefined,
    dot: [1, 1],
    dash: [3, 1],
    lgDash: [4, 1],
    dashDot: [3, 1, 1, 1],
    lgDashDot: [4, 1, 1, 1],
    lgDashDotDot: [4, 1, 1, 1, 1, 1],
    sysDot: [1, 1],
    sysDash: [3, 1],
    sysDashDot: [3, 1, 1, 1],
    sysDashDotDot: [3, 1, 1, 1, 1, 1],
    custom: undefined,
  };

  const pattern = patterns[style];
  if (!pattern) {
    return undefined;
  }

  // Scale by stroke width
  return pattern.map((n) => n * strokeWidth);
}
