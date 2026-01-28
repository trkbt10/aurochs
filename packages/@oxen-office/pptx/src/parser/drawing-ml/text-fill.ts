/**
 * @file Text fill resolution
 *
 * Converts domain Fill objects to resolved text fill configurations for rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { Color } from "@oxen-office/ooxml/domain/color";
import type { Fill } from "../../domain/color/types";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { TextFillConfig } from "../../domain/drawing-ml/text-fill";
import type { ResourceResolverFn } from "../../domain";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";

// =============================================================================
// Resource Resolver Type (re-exported from domain)
// =============================================================================

/**
 * Resource resolver function for converting resource IDs to URLs.
 * Re-exported from domain for backward compatibility.
 */
export type ResourceResolver = ResourceResolverFn;

// =============================================================================
// Resolution Functions
// =============================================================================

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
 * Convert Fill domain object to TextFillConfig for rendering.
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
