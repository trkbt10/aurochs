/**
 * @file Background element parsing
 *
 * Extracts background elements from slide/layout/master XML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild } from "@oxen/xml";
import type { BackgroundElement, BackgroundParseResult, BackgroundFill } from "../../domain/drawing-ml/background";
import type { FillType, GradientFill } from "./fill";
import type { SlideContext } from "../slide/context";
import { getSolidFill } from "./color";
import { getGradientFill, getFillType, formatFillResult, getPicFillFromContext, detectImageFillMode } from "./fill";

// =============================================================================
// Background Element Extraction
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
 * Get background properties from an XmlElement using the standard path.
 * Returns the p:bgPr element directly as XmlElement.
 */
export function getBgPrFromElement(element: XmlElement | undefined): XmlElement | undefined {
  const bgElement = getBackgroundElement(element);
  return bgElement?.bgPr;
}

/**
 * Get background reference element from an XmlElement
 */
export function getBgRefFromElement(element: XmlElement | undefined): XmlElement | undefined {
  const bgElement = getBackgroundElement(element);
  return bgElement?.bgRef;
}

/**
 * Resolve p:bgRef to fill element from theme.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef):
 * - idx 1-999: use a:fillStyleLst[idx-1]
 * - idx 1001+: use a:bgFillStyleLst[idx-1001]
 *
 * Returns the fill element directly as XmlElement.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
export function resolveBgRefToXmlElement(
  bgRef: XmlElement,
  ctx: SlideContext,
): XmlElement | undefined {
  const idxAttr = bgRef.attrs?.idx;
  if (idxAttr === undefined) {
    return undefined;
  }

  const idx = parseInt(idxAttr, 10);
  if (Number.isNaN(idx) || idx < 1) {
    return undefined;
  }

  const formatScheme = ctx.presentation.theme.formatScheme;

  if (idx >= 1001) {
    // Background fill style list (idx 1001+)
    const bgStyleIndex = idx - 1001;
    return formatScheme.bgFillStyles[bgStyleIndex];
  }

  // Regular fill style list (idx 1-999)
  const styleIndex = idx - 1;
  return formatScheme.fillStyles[styleIndex];
}

/**
 * Extract placeholder color from p:bgRef element.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */
export function extractPhClrFromBgRef(bgRef: XmlElement, ctx: SlideContext): string | undefined {
  return getSolidFill(bgRef, undefined, ctx.toColorContext());
}

/**
 * Find background from content hierarchy, including p:bgRef resolution.
 * Priority: slide > slideLayout > slideMaster
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 */
export function parseBackgroundProperties(ctx: SlideContext): BackgroundParseResult | undefined {
  // Try slide first
  const slideBgPr = getBgPrFromElement(ctx.slide.content);
  if (slideBgPr !== undefined) {
    return { fill: slideBgPr };
  }
  const slideBgRef = getBgRefFromElement(ctx.slide.content);
  if (slideBgRef !== undefined) {
    const resolved = resolveBgRefToXmlElement(slideBgRef, ctx);
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
    const resolved = resolveBgRefToXmlElement(layoutBgRef, ctx);
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
    const resolved = resolveBgRefToXmlElement(masterBgRef, ctx);
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
export function findBackgroundRef(ctx: SlideContext): XmlElement | undefined {
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
export function hasOwnBackground(ctx: SlideContext): boolean {
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
// Background Fill Data Resolution
// =============================================================================

/**
 * Background fill handler for a specific fill type.
 * Each handler extracts fill data and returns structured BackgroundFill.
 */
type BackgroundFillHandler = {
  /** XML element key (e.g., "a:solidFill") */
  readonly xmlKey: string;
  /** Fill type identifier */
  readonly type: FillType;
  /** Extract fill data and return structured BackgroundFill */
  extractData: (fill: XmlElement, ctx: SlideContext, phClr?: string, fromTheme?: boolean) => BackgroundFill | null;
};

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

/**
 * Solid fill handler for backgrounds.
 */
const SOLID_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:solidFill",
  type: "SOLID_FILL",
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
 */
const GRADIENT_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:gradFill",
  type: "GRADIENT_FILL",
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
function getBlipResourceContext(ctx: SlideContext, fromTheme?: boolean) {
  if (fromTheme === true) {
    return ctx.toThemeResourceContext();
  }
  return ctx.toResourceContext();
}

/**
 * Try to get picture fill using resource context.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
function tryGetPicFill(
  blipFill: unknown,
  ctx: SlideContext,
  fromTheme?: boolean,
): string | undefined {
  const resourceContext = getBlipResourceContext(ctx, fromTheme);
  return getPicFillFromContext(blipFill, resourceContext);
}

/**
 * Picture fill handler for backgrounds.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */
const PIC_FILL_BG_HANDLER: BackgroundFillHandler = {
  xmlKey: "a:blipFill",
  type: "PIC_FILL",
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

/** Default background fill result */
const DEFAULT_BACKGROUND_FILL: BackgroundFill = {
  css: "",
  isSolid: true,
};

/**
 * Get background fill as structured data
 *
 * Resolves background from slide/layout/master hierarchy and returns
 * structured BackgroundFill data for rendering.
 *
 * @param ctx - Slide render context
 * @returns Background fill object
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 */
export function getBackgroundFillData(ctx: SlideContext): BackgroundFill {
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
