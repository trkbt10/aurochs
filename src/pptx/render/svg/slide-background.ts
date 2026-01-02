/**
 * @file SVG slide background rendering
 *
 * Renders slide backgrounds to SVG including:
 * - Solid fills
 * - Gradient fills (linear and radial)
 * - Image fills (blipFill)
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */

import type { Background, SlideSize } from "../../domain";
import type { RenderContext, ResolvedBackgroundFill } from "../context";
import type { SvgDefsCollector } from "./slide-utils";
import { renderFillToSvgDef, renderFillToSvgStyle } from "./fill";

// =============================================================================
// Resolved Background Rendering
// =============================================================================

/**
 * Render pre-resolved background to SVG.
 * Used when background has been resolved through inheritance chain.
 *
 * @param resolved - Pre-resolved background fill
 * @param slideSize - Slide dimensions
 * @param defsCollector - SVG defs collector for gradients
 */
export function renderResolvedBackgroundSvg(
  resolved: ResolvedBackgroundFill,
  slideSize: SlideSize,
  defsCollector: SvgDefsCollector,
): string {
  const { width, height } = slideSize;

  switch (resolved.type) {
    case "solid":
      return `<rect width="${width}" height="${height}" fill="${resolved.color}"/>`;

    case "gradient": {
      const gradId = defsCollector.getNextId("bg-grad");
      const stops = resolved.stops
        .map((s) => `<stop offset="${s.position}%" stop-color="${s.color}"/>`)
        .join("\n");

      if (resolved.isRadial === true) {
        // Radial gradient - use radialGradient SVG element
        // Per ECMA-376 Part 1, Section 20.1.8.46 (a:path):
        // path="circle" creates a circular radial gradient
        const cx = resolved.radialCenter?.cx ?? 50;
        const cy = resolved.radialCenter?.cy ?? 50;
        defsCollector.addDef(
          `<radialGradient id="${gradId}" cx="${cx}%" cy="${cy}%" r="70.7%" fx="${cx}%" fy="${cy}%">\n${stops}\n</radialGradient>`,
        );
      } else {
        // Linear gradient - calculate direction from angle
        const x1 = 50 - 50 * Math.cos((resolved.angle * Math.PI) / 180);
        const y1 = 50 - 50 * Math.sin((resolved.angle * Math.PI) / 180);
        const x2 = 50 + 50 * Math.cos((resolved.angle * Math.PI) / 180);
        const y2 = 50 + 50 * Math.sin((resolved.angle * Math.PI) / 180);
        defsCollector.addDef(
          `<linearGradient id="${gradId}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">\n${stops}\n</linearGradient>`,
        );
      }

      return `<rect width="${width}" height="${height}" fill="url(#${gradId})"/>`;
    }

    case "image": {
      // ECMA-376 Part 1, Section 20.1.8.56 (a:stretch):
      // When stretch mode is specified, the image fills the entire container
      // without preserving aspect ratio. This maps to SVG preserveAspectRatio="none".
      // For tile mode, we use xMidYMid slice as a fallback (proper tiling would need pattern).
      const aspectRatio = resolved.mode === "stretch" ? "none" : "xMidYMid slice";
      return `<image href="${resolved.dataUrl}" width="${width}" height="${height}" preserveAspectRatio="${aspectRatio}"/>`;
    }
  }
}

// =============================================================================
// Direct Background Rendering
// =============================================================================

/**
 * Render slide background to SVG from Background domain object.
 *
 * @param background - Background definition (may be undefined)
 * @param slideSize - Slide dimensions
 * @param ctx - Render context for color resolution
 * @param defsCollector - SVG defs collector for gradients
 */
export function renderBackgroundSvg(
  background: Background | undefined,
  slideSize: SlideSize,
  ctx: RenderContext,
  defsCollector: SvgDefsCollector,
): string {
  const { width, height } = slideSize;

  if (background === undefined || background.fill === undefined) {
    // Default white background
    return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
  }

  const fill = background.fill;

  // Handle different fill types
  switch (fill.type) {
    case "noFill":
      return `<rect width="${width}" height="${height}" fill="transparent"/>`;

    case "solidFill": {
      const fillStyle = renderFillToSvgStyle(fill, ctx.colorContext);
      return `<rect width="${width}" height="${height}" fill="${fillStyle}"/>`;
    }

    case "gradientFill": {
      const gradId = defsCollector.getNextId("bg-grad");
      const gradDef = renderFillToSvgDef(fill, gradId, ctx.colorContext);
      if (gradDef !== undefined) {
        defsCollector.addDef(gradDef);
        return `<rect width="${width}" height="${height}" fill="url(#${gradId})"/>`;
      }
      // Fallback to first stop color
      if (fill.stops.length > 0) {
        const fallbackStyle = renderFillToSvgStyle(
          { type: "solidFill", color: fill.stops[0].color },
          ctx.colorContext,
        );
        return `<rect width="${width}" height="${height}" fill="${fallbackStyle}"/>`;
      }
      return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
    }

    case "blipFill": {
      const imagePath = ctx.resources.resolve(fill.resourceId);
      if (imagePath !== undefined) {
        // ECMA-376 Part 1, Section 20.1.8.56 (a:stretch):
        // When stretch is specified, use preserveAspectRatio="none"
        const aspectRatio = fill.stretch !== undefined ? "none" : "xMidYMid slice";
        return `<image href="${imagePath}" width="${width}" height="${height}" preserveAspectRatio="${aspectRatio}"/>`;
      }
      return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
    }

    case "patternFill":
    case "groupFill":
    default:
      // Fallback for unsupported fill types
      ctx.warnings.add({
        type: "unsupported",
        message: `Unsupported background fill type: ${fill.type}`,
      });
      return `<rect width="${width}" height="${height}" fill="#ffffff"/>`;
  }
}
