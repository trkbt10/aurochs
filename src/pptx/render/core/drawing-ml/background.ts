/**
 * @file Background fill rendering
 *
 * CSS/SVG rendering for background fills.
 * Uses parser/drawing-ml for XML parsing.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "../../../../xml";
import { getChild } from "../../../../xml";
import type { BackgroundFill, FillType, GradientFill } from "../../../domain/drawing-ml";
import type { SlideRenderContext } from "../slide-context";

// Import parsing functions from parser layer
import {
  parseBackgroundProperties,
  findBackgroundRef,
  getFillType,
  getGradientFill,
  getPicFillFromContext,
  formatFillResult,
  detectImageFillMode,
  getSolidFill,
} from "../../../parser/drawing-ml";

// =============================================================================
// Types
// =============================================================================

/**
 * Background fill handler for a specific fill type.
 * Each handler extracts fill data and formats it for CSS output.
 */
type BackgroundFillHandler = {
  /** XML element key (e.g., "a:solidFill") */
  readonly xmlKey: string;
  /** Fill type identifier */
  readonly type: FillType;
  /** Extract fill data from fill element and return CSS string */
  extractAndFormat: (fill: XmlElement, ctx: SlideRenderContext, phClr?: string, fromTheme?: boolean) => string;
  /** Extract fill data and return structured BackgroundFill */
  extractData: (fill: XmlElement, ctx: SlideRenderContext, phClr?: string, fromTheme?: boolean) => BackgroundFill | null;
};

// =============================================================================
// Gradient CSS Generation
// =============================================================================

/**
 * Generate CSS gradient string from gradient result.
 *
 * Per ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill):
 * - Linear gradient: a:lin element with ang attribute
 * - Path gradient: a:path element with path attribute (circle, rect, shape)
 *
 * @see ECMA-376 Part 1, Section 20.1.8.33 (a:gradFill)
 * @see ECMA-376 Part 1, Section 20.1.8.46 (a:path)
 */
function generateGradientCSS(gradResult: GradientFill): string {
  // Sort colors by position - PPTX may have them in arbitrary order
  const sortedColors = [...gradResult.color].sort((a, b) => {
    const posA = parseInt(a.pos, 10);
    const posB = parseInt(b.pos, 10);
    return posA - posB;
  });

  // Create CSS gradient stops with positions
  const stopsWithPos = sortedColors.map((c) => {
    const pos = parseInt(c.pos, 10) / 1000; // Convert from 1/100000 to percentage
    return `#${c.color} ${pos}%`;
  }).join(", ");

  // Handle path gradient (radial/circle)
  if (gradResult.type === "path") {
    // Per ECMA-376, a:path with path="circle" creates a radial gradient
    // fillToRect defines the center and size of the gradient
    const fillToRect = gradResult.fillToRect;
    if (fillToRect !== undefined) {
      // Convert fillToRect from 1/100000 to percentage
      // Center position: (l + r) / 2, (t + b) / 2 (in percentage)
      const centerX = (fillToRect.l + fillToRect.r) / 2000;
      const centerY = (fillToRect.t + fillToRect.b) / 2000;
      return `radial-gradient(circle at ${centerX}% ${centerY}%, ${stopsWithPos})`;
    }
    // Default radial gradient centered
    return `radial-gradient(circle at 50% 50%, ${stopsWithPos})`;
  }

  // Linear gradient
  return `linear-gradient(${gradResult.rot}deg, ${stopsWithPos})`;
}

// =============================================================================
// Fill Handlers
// =============================================================================

/**
 * Solid fill handler for backgrounds.
 * The fill element is expected to be either:
 * - p:bgPr containing a:solidFill child
 * - a:solidFill element directly (from theme style)
 */
const SOLID_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:solidFill",
  type: "SOLID_FILL",
  extractAndFormat: (fill, ctx, phClr) => {
    // Try to get a:solidFill child first (for p:bgPr case)
    const solidFill = getChild(fill, "a:solidFill") ?? fill;
    const colorHex = getSolidFill(solidFill, phClr, ctx.toColorContext());
    if (colorHex === undefined) {
      return "";
    }
    return formatFillResult("SOLID_FILL", colorHex, false) as string;
  },
  extractData: (fill, ctx, phClr) => {
    const solidFill = getChild(fill, "a:solidFill") ?? fill;
    const colorHex = getSolidFill(solidFill, phClr, ctx.toColorContext());
    if (colorHex === undefined) {
      return null;
    }
    return {
      css: formatFillResult("SOLID_FILL", colorHex, false) as string,
      isSolid: true,
      color: `#${colorHex}`,
    };
  },
};

/**
 * Gradient fill handler for backgrounds.
 * The fill element is expected to be either:
 * - p:bgPr containing a:gradFill child
 * - a:gradFill element directly (from theme style)
 */
const GRADIENT_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:gradFill",
  type: "GRADIENT_FILL",
  extractAndFormat: (fill, ctx, phClr) => {
    // Try to get a:gradFill child first (for p:bgPr case)
    const gradFill = getChild(fill, "a:gradFill") ?? fill;
    const gradResult = getGradientFill(gradFill, ctx.toColorContext(), phClr);
    const gradient = generateGradientCSS(gradResult);
    return `background: ${gradient};`;
  },
  extractData: (fill, ctx, phClr) => {
    const gradFill = getChild(fill, "a:gradFill") ?? fill;
    const gradResult = getGradientFill(gradFill, ctx.toColorContext(), phClr);
    const gradient = generateGradientCSS(gradResult);

    // Sort colors by position for structured data
    const sortedColors = [...gradResult.color].sort((a, b) => {
      const posA = parseInt(a.pos, 10);
      const posB = parseInt(b.pos, 10);
      return posA - posB;
    });

    // Create structured gradient data for SVG rendering
    const gradientData = {
      angle: gradResult.rot,
      type: gradResult.type,
      pathShadeType: gradResult.type === "path" ? gradResult.pathShadeType : undefined,
      fillToRect: gradResult.type === "path" ? gradResult.fillToRect : undefined,
      stops: sortedColors.map((c) => ({
        position: parseInt(c.pos, 10) / 1000, // Convert to percentage
        color: c.color,
      })),
    };

    return {
      css: `background: ${gradient};`,
      isSolid: false,
      gradient,
      gradientData,
    };
  },
};

/**
 * Get resource context for blipFill resolution.
 * Theme fills use theme resources, others use slide resources.
 */
function getBlipResourceContext(ctx: SlideRenderContext, fromTheme?: boolean) {
  if (fromTheme === true) {
    return ctx.toThemeResourceContext();
  }
  return ctx.toResourceContext();
}

/**
 * Try to get picture fill using resource context.
 *
 * When `fromTheme` is true, uses theme resources to resolve r:embed references.
 * This is necessary for blipFill elements from bgFillStyleLst.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
function tryGetPicFill(
  blipFill: unknown,
  ctx: SlideRenderContext,
  fromTheme?: boolean,
): string | undefined {
  const resourceContext = getBlipResourceContext(ctx, fromTheme);
  return getPicFillFromContext(blipFill, resourceContext);
}

/**
 * Picture fill handler for backgrounds.
 *
 * When `fromTheme` is true, resolves blipFill r:embed from theme resources
 * instead of slide/layout/master resources.
 *
 * The fill element is expected to be either:
 * - p:bgPr containing a:blipFill child
 * - a:blipFill element directly (from theme style)
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
const PIC_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:blipFill",
  type: "PIC_FILL",
  extractAndFormat: (fill, ctx, _phClr, fromTheme) => {
    // Try to get a:blipFill child first (for p:bgPr case)
    const blipFill = getChild(fill, "a:blipFill") ?? fill;
    const imgPath = tryGetPicFill(blipFill, ctx, fromTheme);
    if (imgPath === undefined) {
      return "";
    }
    const fillMode = detectImageFillMode(blipFill);
    // Use appropriate CSS background-size based on fill mode
    const bgSize = fillMode === "stretch" ? "100% 100%" : "cover";
    return `background-image: url(${imgPath}); background-size: ${bgSize};`;
  },
  extractData: (fill, ctx, _phClr, fromTheme) => {
    const blipFill = getChild(fill, "a:blipFill") ?? fill;
    const imgPath = tryGetPicFill(blipFill, ctx, fromTheme);
    if (imgPath === undefined) {
      return null;
    }
    const fillMode = detectImageFillMode(blipFill);
    const bgSize = fillMode === "stretch" ? "100% 100%" : "cover";
    return {
      css: `background-image: url(${imgPath}); background-size: ${bgSize};`,
      isSolid: false,
      image: imgPath,
      imageFillMode: fillMode,
    };
  },
};

/** Background fill handlers indexed by fill type */
const BG_FILL_HANDLERS: Record<string, BackgroundFillHandler> = {
  SOLID_FILL: SOLID_FILL_BG_HANDLER,
  GRADIENT_FILL: GRADIENT_FILL_BG_HANDLER,
  PIC_FILL: PIC_FILL_BG_HANDLER,
};

// =============================================================================
// Public API
// =============================================================================

/** Default background fill result */
const DEFAULT_BACKGROUND_FILL: BackgroundFill = {
  css: "",
  isSolid: true,
};

/**
 * Get background CSS from background reference (theme fallback)
 * Used when p:bgRef doesn't resolve to a theme style.
 */
function getBackgroundRefCSS(ctx: SlideRenderContext): string {
  const bgRef = findBackgroundRef(ctx);
  if (bgRef === undefined) {
    return "";
  }

  const colorHex = getSolidFill(bgRef, undefined, ctx.toColorContext());
  if (colorHex === undefined) {
    return "";
  }
  return formatFillResult("SOLID_FILL", colorHex, false) as string;
}

/**
 * Get slide background fill CSS
 * @param ctx - Slide render context
 * @returns Background CSS string
 */
export function getSlideBackgroundFill(ctx: SlideRenderContext): string {
  const bgResult = parseBackgroundProperties(ctx);

  if (bgResult !== undefined) {
    // Pass bgPr directly to getFillType since it contains the fill elements (a:blipFill, a:solidFill, etc.)
    const bgFillType = getFillType(bgResult.fill);
    const handler = BG_FILL_HANDLERS[bgFillType];
    const result = handler?.extractAndFormat(bgResult.fill, ctx, bgResult.phClr, bgResult.fromTheme) ?? "";
    if (result !== "") {
      return result;
    }
  }

  return getBackgroundRefCSS(ctx);
}

/**
 * Get background fill as structured data
 * @param ctx - Slide render context
 * @returns Background fill object
 */
export function getBackgroundFillData(ctx: SlideRenderContext): BackgroundFill {
  const bgResult = parseBackgroundProperties(ctx);

  if (bgResult === undefined) {
    return DEFAULT_BACKGROUND_FILL;
  }

  // Pass bgPr directly to getFillType since it contains the fill elements
  const bgFillType = getFillType(bgResult.fill);
  const handler = BG_FILL_HANDLERS[bgFillType];
  const result = handler?.extractData(bgResult.fill, ctx, bgResult.phClr, bgResult.fromTheme);

  return result ?? DEFAULT_BACKGROUND_FILL;
}
