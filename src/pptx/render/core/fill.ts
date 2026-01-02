/**
 * @file Fill utilities (shared)
 *
 * Format-agnostic fill processing logic.
 */

import type { Color, Fill, Line } from "../../domain";
import { resolveColor } from "../../core/dml/render/color";
import type { ColorContext } from "../../domain/resolution";

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
 * Convert hex to RGB values
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return { r, g, b };
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
 * Resolved fill (none, solid, gradient, image, or unresolved)
 */
export type ResolvedFill =
  | { readonly type: "none" }
  | ResolvedSolidFill
  | ResolvedGradientFill
  | ResolvedImageFill
  | { readonly type: "unresolved"; readonly originalType: Fill["type"] };

/**
 * Resolve a domain Fill to format-agnostic representation
 */
export function resolveFill(fill: Fill, colorContext?: ColorContext): ResolvedFill {
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
      // If resourceId is a data URL, we can render it as an image fill
      if (fill.resourceId.startsWith("data:")) {
        return {
          type: "image",
          src: fill.resourceId,
          mode: fill.tile ? "tile" : "stretch",
        };
      }
      // Otherwise it's unresolved (resourceId is still a relationship ID)
      return { type: "unresolved", originalType: fill.type };
    }

    case "patternFill":
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
