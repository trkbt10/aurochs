/**
 * @file Text fill types and resolution
 *
 * Converts domain Fill objects to resolved text fill configurations for SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { Fill, Color } from "../../../domain/color";
import type { ColorContext } from "../../../domain/resolution";
import { resolveColor } from "./color";

// =============================================================================
// Text Fill Types
// =============================================================================

/**
 * Gradient stop for text fill.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.36 (a:gs)
 */
export type TextGradientStop = {
  /** Position in gradient (0-100) */
  readonly position: number;
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * Gradient fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 */
export type TextGradientFillConfig = {
  readonly type: "gradient";
  /** Gradient stops */
  readonly stops: readonly TextGradientStop[];
  /** Rotation angle in degrees (0-360, clockwise from horizontal) */
  readonly angle: number;
  /** Whether this is a radial gradient */
  readonly isRadial: boolean;
  /** Radial center (percentage 0-100) */
  readonly radialCenter?: { readonly cx: number; readonly cy: number };
};

/**
 * Solid fill configuration for text.
 */
export type TextSolidFillConfig = {
  readonly type: "solid";
  /** Color as hex (with #) */
  readonly color: string;
  /** Alpha value (0-1) */
  readonly alpha: number;
};

/**
 * No fill configuration for text (transparent text).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.44 (a:noFill)
 */
export type TextNoFillConfig = {
  readonly type: "noFill";
};

/**
 * Pattern fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.47 (a:pattFill)
 */
export type TextPatternFillConfig = {
  readonly type: "pattern";
  /** Pattern preset name (e.g., "horz", "vert", "smGrid", etc.) */
  readonly preset: string;
  /** Foreground color as hex (with #) */
  readonly fgColor: string;
  /** Background color as hex (with #) */
  readonly bgColor: string;
  /** Foreground alpha (0-1) */
  readonly fgAlpha: number;
  /** Background alpha (0-1) */
  readonly bgAlpha: number;
};

/**
 * Image fill configuration for text.
 *
 * @see ECMA-376 Part 1, Section 20.1.8.14 (a:blipFill)
 */
export type TextImageFillConfig = {
  readonly type: "image";
  /** Image URL (data URL or external URL) */
  readonly imageUrl: string;
  /** Stretch mode: tile or stretch */
  readonly mode: "tile" | "stretch";
  /** Tile scale (for tile mode) */
  readonly tileScale?: { readonly x: number; readonly y: number };
};

/**
 * Text fill configuration (solid, gradient, pattern, image, or noFill).
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export type TextFillConfig =
  | TextSolidFillConfig
  | TextGradientFillConfig
  | TextPatternFillConfig
  | TextImageFillConfig
  | TextNoFillConfig;

// =============================================================================
// Resolution Functions
// =============================================================================

/**
 * Resource resolver function for converting resource IDs to URLs.
 */
export type ResourceResolver = (resourceId: string) => string | undefined;

/**
 * Resolve alpha value from color transform.
 */
function resolveAlpha(transform: Color["transform"] | undefined): number {
  if (transform?.alpha !== undefined) {
    return transform.alpha / 100;
  }
  return 1;
}

/**
 * Resolve a Color to a hex string with # prefix.
 */
function resolveColorToHex(
  color: Color | undefined,
  colorContext: ColorContext,
): string | undefined {
  if (color === undefined) {
    return undefined;
  }
  const resolved = resolveColor(color, colorContext);
  return resolved !== undefined ? `#${resolved}` : undefined;
}

/**
 * Resolve radial center from gradient fill.
 */
function resolveRadialCenter(
  fill: Fill,
  isRadial: boolean,
): { cx: number; cy: number } | undefined {
  if (!isRadial || fill.type !== "gradientFill" || !fill.path?.fillToRect) {
    return undefined;
  }

  const rect = fill.path.fillToRect;
  return {
    cx: ((rect.left as number) + (100 - (rect.right as number))) / 2,
    cy: ((rect.top as number) + (100 - (rect.bottom as number))) / 2,
  };
}

/**
 * Convert Fill domain object to TextFillConfig for SVG rendering.
 *
 * @param fill - Fill domain object
 * @param colorContext - Color resolution context
 * @param resourceResolver - Optional function to resolve resource IDs to URLs
 * @returns Resolved text fill configuration
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
export function resolveTextFill(
  fill: Fill | undefined,
  colorContext: ColorContext,
  resourceResolver?: ResourceResolver,
): TextFillConfig | undefined {
  if (fill === undefined) {
    return undefined;
  }

  switch (fill.type) {
    case "solidFill": {
      const hex = resolveColorToHex(fill.color, colorContext);
      if (hex === undefined) {
        return undefined;
      }
      const alpha = resolveAlpha(fill.color.transform);
      return {
        type: "solid",
        color: hex,
        alpha,
      };
    }

    case "gradientFill": {
      if (fill.stops.length === 0) {
        return undefined;
      }

      const stops = fill.stops
        .map((stop) => {
          const hex = resolveColorToHex(stop.color, colorContext);
          if (hex === undefined) {
            return undefined;
          }
          const alpha = resolveAlpha(stop.color.transform);
          return {
            position: stop.position,
            color: hex,
            alpha,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (stops.length === 0) {
        return undefined;
      }

      const isRadial = fill.path !== undefined;
      const radialCenter = resolveRadialCenter(fill, isRadial);

      return {
        type: "gradient",
        stops,
        angle: fill.linear?.angle !== undefined ? (fill.linear.angle as number) : 0,
        isRadial,
        radialCenter,
      };
    }

    case "noFill":
      return { type: "noFill" };

    case "patternFill": {
      const fgHex = resolveColorToHex(fill.foregroundColor, colorContext);
      const bgHex = resolveColorToHex(fill.backgroundColor, colorContext);
      if (fgHex === undefined || bgHex === undefined) {
        return undefined;
      }
      const fgAlpha = resolveAlpha(fill.foregroundColor.transform);
      const bgAlpha = resolveAlpha(fill.backgroundColor.transform);

      return {
        type: "pattern",
        preset: fill.preset,
        fgColor: fgHex,
        bgColor: bgHex,
        fgAlpha,
        bgAlpha,
      };
    }

    case "blipFill": {
      if (fill.resourceId === undefined || resourceResolver === undefined) {
        return undefined;
      }
      const imageUrl = resourceResolver(fill.resourceId);
      if (imageUrl === undefined) {
        return undefined;
      }

      const mode = fill.tile !== undefined ? "tile" : "stretch";
      const tileScale =
        fill.tile !== undefined
          ? { x: (fill.tile.sx as number) / 100000, y: (fill.tile.sy as number) / 100000 }
          : undefined;

      return {
        type: "image",
        imageUrl,
        mode,
        tileScale,
      };
    }

    case "groupFill":
      return undefined;
  }
}
