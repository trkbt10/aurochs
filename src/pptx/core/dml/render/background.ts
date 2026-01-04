/**
 * @file Background fill rendering
 *
 * Background element parsing and CSS/SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "../../../../xml";
import { isXmlElement, getChild } from "../../../../xml";
import type { BackgroundFill, ImageFillMode } from "./types";
import type { FillType } from "../parser/types";
import type { FillElements, BlipFillElement } from "../../../ooxml";
import type { SlideRenderContext } from "../../../reader/slide/accessor";
import { getFillType, getGradientFill, getPicFillFromContext, formatFillResult } from "../parser/fill";
import { getSolidFill } from "../parser/color";

// =============================================================================
// Background Parse Types (moved from parser/background.ts)
// =============================================================================

/**
 * Background element result from p:bg
 */
export type BackgroundElement = {
  bgPr?: XmlElement;
  bgRef?: XmlElement;
}

/**
 * Result of finding background properties.
 */
export type BackgroundParseResult = {
  fill: FillElements;
  /**
   * Placeholder color resolved from p:bgRef child element.
   * This is the hex color (without #) to substitute for phClr in theme styles.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
   */
  phClr?: string;
  /**
   * Whether the fill came from a theme style (via bgRef).
   * When true, blipFill rIds should be resolved from theme resources.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  fromTheme?: boolean;
}

// =============================================================================
// XmlElement to OoxmlElement Conversion (moved from parser/background.ts)
// =============================================================================

/**
 * Convert XmlElement to OoxmlElement-like object for fill type detection.
 * This allows existing fill processing code to work with XmlElement data.
 */
export function xmlElementToFillElements(element: XmlElement): FillElements {
  const result: Record<string, unknown> = {};

  for (const child of element.children) {
    if (isXmlElement(child)) {
      // Convert child element recursively
      result[child.name] = xmlElementToBlipFill(child);
    }
  }

  return result as FillElements;
}

/**
 * Convert XmlElement to BlipFillElement-like object.
 *
 * Handles multiple child elements with the same name by collecting them into arrays.
 * This is critical for gradient stops (a:gs) where PPTX can have multiple stops.
 */
export function xmlElementToBlipFill(element: XmlElement): BlipFillElement {
  const result: Record<string, unknown> = {
    attrs: element.attrs,
  };

  for (const child of element.children) {
    if (isXmlElement(child)) {
      const converted = xmlElementToBlipFill(child);
      const existing = result[child.name];

      if (existing === undefined) {
        // First occurrence - store as single value
        result[child.name] = converted;
      } else if (Array.isArray(existing)) {
        // Already an array - push to it
        existing.push(converted);
      } else {
        // Second occurrence - convert to array
        result[child.name] = [existing, converted];
      }
    }
  }

  return result as BlipFillElement;
}

// =============================================================================
// Background Element Extraction (moved from parser/background.ts)
// =============================================================================

/**
 * Get background element (p:bg) from an XmlElement
 */
export function getBackgroundElement(element: XmlElement | undefined): BackgroundElement | undefined {
  if (element === undefined) {
    return undefined;
  }

  const cSld = getChild(element, "p:cSld");
  if (cSld === undefined) {return undefined;}

  const bg = getChild(cSld, "p:bg");
  if (bg === undefined) {return undefined;}

  const bgPr = getChild(bg, "p:bgPr");
  const bgRef = getChild(bg, "p:bgRef");

  if (bgPr === undefined && bgRef === undefined) {
    return undefined;
  }

  return { bgPr, bgRef };
}

/**
 * Get background properties from an XmlElement using the standard path
 */
export function getBgPrFromElement(element: XmlElement | undefined): FillElements | undefined {
  const bgElement = getBackgroundElement(element);
  if (bgElement?.bgPr === undefined) {
    return undefined;
  }
  return xmlElementToFillElements(bgElement.bgPr);
}

/**
 * Get background reference element from an XmlElement
 */
export function getBgRefFromElement(element: XmlElement | undefined): XmlElement | undefined {
  const bgElement = getBackgroundElement(element);
  return bgElement?.bgRef;
}

/**
 * Resolve p:bgRef to fill elements from theme.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef):
 * - idx 1-999: use a:fillStyleLst[idx-1]
 * - idx 1001+: use a:bgFillStyleLst[idx-1001]
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
export function resolveBgRefToFillElements(
  bgRef: XmlElement,
  ctx: SlideRenderContext,
): FillElements | undefined {
  const idxAttr = bgRef.attrs?.idx;
  if (idxAttr === undefined) {
    return undefined;
  }

  const idx = parseInt(idxAttr, 10);
  if (Number.isNaN(idx) || idx < 1) {
    return undefined;
  }

  const formatScheme = ctx.presentation.theme.formatScheme;

  let fillStyle: XmlElement | undefined;

  if (idx >= 1001) {
    // Background fill style list (idx 1001+)
    const bgStyleIndex = idx - 1001;
    fillStyle = formatScheme.bgFillStyles[bgStyleIndex];
  } else {
    // Regular fill style list (idx 1-999)
    const styleIndex = idx - 1;
    fillStyle = formatScheme.fillStyles[styleIndex];
  }

  if (fillStyle === undefined) {
    return undefined;
  }

  // The fill style is the fill element itself (a:solidFill, a:gradFill, a:blipFill, etc.)
  // Wrap it in a FillElements-like structure using the element name as key
  const fillElements: Record<string, unknown> = {
    [fillStyle.name]: xmlElementToBlipFill(fillStyle),
  };

  return fillElements as FillElements;
}

/**
 * Extract placeholder color from p:bgRef element.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */
export function extractPhClrFromBgRef(bgRef: XmlElement, ctx: SlideRenderContext): string | undefined {
  return getSolidFill(bgRef, undefined, ctx.toColorContext());
}

/**
 * Find background from content hierarchy, including p:bgRef resolution.
 * Priority: slide > slideLayout > slideMaster
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 */
export function parseBackgroundProperties(ctx: SlideRenderContext): BackgroundParseResult | undefined {
  // Try slide first
  const slideBgPr = getBgPrFromElement(ctx.slide.content);
  if (slideBgPr !== undefined) {
    return { fill: slideBgPr };
  }
  const slideBgRef = getBgRefFromElement(ctx.slide.content);
  if (slideBgRef !== undefined) {
    const resolved = resolveBgRefToFillElements(slideBgRef, ctx);
    if (resolved !== undefined) {
      const phClr = extractPhClrFromBgRef(slideBgRef, ctx);
      return { fill: resolved, phClr, fromTheme: true };
    }
  }

  // Try layout
  const layoutBgPr = getBgPrFromElement(ctx.layout.content);
  if (layoutBgPr !== undefined) {
    return { fill: layoutBgPr };
  }
  const layoutBgRef = getBgRefFromElement(ctx.layout.content);
  if (layoutBgRef !== undefined) {
    const resolved = resolveBgRefToFillElements(layoutBgRef, ctx);
    if (resolved !== undefined) {
      const phClr = extractPhClrFromBgRef(layoutBgRef, ctx);
      return { fill: resolved, phClr, fromTheme: true };
    }
  }

  // Try master
  const masterBgPr = getBgPrFromElement(ctx.master.content);
  if (masterBgPr !== undefined) {
    return { fill: masterBgPr };
  }
  const masterBgRef = getBgRefFromElement(ctx.master.content);
  if (masterBgRef !== undefined) {
    const resolved = resolveBgRefToFillElements(masterBgRef, ctx);
    if (resolved !== undefined) {
      const phClr = extractPhClrFromBgRef(masterBgRef, ctx);
      return { fill: resolved, phClr, fromTheme: true };
    }
  }

  return undefined;
}

/**
 * Get background reference element from content hierarchy.
 */
export function findBackgroundRef(ctx: SlideRenderContext): XmlElement | undefined {
  const slideBgRef = getBgRefFromElement(ctx.slide.content);
  if (slideBgRef !== undefined) {
    return slideBgRef;
  }

  const layoutBgRef = getBgRefFromElement(ctx.layout.content);
  if (layoutBgRef !== undefined) {
    return layoutBgRef;
  }

  return getBgRefFromElement(ctx.master.content);
}

/**
 * Check if slide has its own background (not inherited)
 */
export function hasOwnBackground(ctx: SlideRenderContext): boolean {
  const slideContent = ctx.slide.content;

  const cSld = getChild(slideContent, "p:cSld");
  if (cSld === undefined) {return false;}

  const bg = getChild(cSld, "p:bg");
  if (bg === undefined) {return false;}

  const bgPr = getChild(bg, "p:bgPr");
  const bgRef = getChild(bg, "p:bgRef");

  return bgPr !== undefined || bgRef !== undefined;
}

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
  /** Extract fill data from bgPr and return CSS string */
  extractAndFormat: (bgPr: FillElements, ctx: SlideRenderContext, phClr?: string, fromTheme?: boolean) => string;
  /** Extract fill data and return structured BackgroundFill */
  extractData: (bgPr: FillElements, ctx: SlideRenderContext, phClr?: string, fromTheme?: boolean) => BackgroundFill | null;
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
function generateGradientCSS(gradResult: ReturnType<typeof getGradientFill>): string {
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
 * Solid fill handler for backgrounds
 */
const SOLID_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:solidFill",
  type: "SOLID_FILL",
  extractAndFormat: (bgPr, ctx, phClr) => {
    const solidFill = bgPr["a:solidFill"];
    const colorHex = getSolidFill(solidFill, phClr, ctx.toColorContext());
    if (colorHex === undefined) {
      return "";
    }
    return formatFillResult("SOLID_FILL", colorHex, false) as string;
  },
  extractData: (bgPr, ctx, phClr) => {
    const solidFill = bgPr["a:solidFill"];
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
 * Gradient fill handler for backgrounds
 */
const GRADIENT_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:gradFill",
  type: "GRADIENT_FILL",
  extractAndFormat: (bgPr, ctx, phClr) => {
    const gradFill = bgPr["a:gradFill"];
    if (gradFill === undefined) {
      return "";
    }
    const gradResult = getGradientFill(gradFill, ctx.toColorContext(), phClr);
    const gradient = generateGradientCSS(gradResult);
    return `background: ${gradient};`;
  },
  extractData: (bgPr, ctx, phClr) => {
    const gradFill = bgPr["a:gradFill"];
    if (gradFill === undefined) {
      return null;
    }
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
 * Try to get picture fill using resource context.
 *
 * When `fromTheme` is true, uses theme resources to resolve r:embed references.
 * This is necessary for blipFill elements from bgFillStyleLst.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
function tryGetPicFill(
  blipFill: BlipFillElement,
  ctx: SlideRenderContext,
  fromTheme?: boolean,
): string | undefined {
  const resourceContext = fromTheme === true
    ? ctx.toThemeResourceContext()
    : ctx.toResourceContext();
  return getPicFillFromContext(blipFill, resourceContext);
}

/**
 * Detect image fill mode from blipFill element
 * - a:stretch → "stretch" (fill without preserving aspect ratio)
 * - a:tile → "tile" (tile the image)
 * - default → "cover" (scale to cover)
 */
function detectImageFillMode(blipFill: BlipFillElement): ImageFillMode {
  // Check for stretch mode
  if (blipFill["a:stretch"] !== undefined) {
    return "stretch";
  }
  // Check for tile mode
  if (blipFill["a:tile"] !== undefined) {
    return "tile";
  }
  // Default to cover
  return "cover";
}

/**
 * Picture fill handler for backgrounds.
 *
 * When `fromTheme` is true, resolves blipFill r:embed from theme resources
 * instead of slide/layout/master resources.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
const PIC_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:blipFill",
  type: "PIC_FILL",
  extractAndFormat: (bgPr, ctx, _phClr, fromTheme) => {
    const blipFill = bgPr["a:blipFill"];
    if (blipFill === undefined) {
      return "";
    }
    const imgPath = tryGetPicFill(blipFill, ctx, fromTheme);
    if (imgPath === undefined) {
      return "";
    }
    const fillMode = detectImageFillMode(blipFill);
    // Use appropriate CSS background-size based on fill mode
    const bgSize = fillMode === "stretch" ? "100% 100%" : "cover";
    return `background-image: url(${imgPath}); background-size: ${bgSize};`;
  },
  extractData: (bgPr, ctx, _phClr, fromTheme) => {
    const blipFill = bgPr["a:blipFill"];
    if (blipFill === undefined) {
      return null;
    }
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
