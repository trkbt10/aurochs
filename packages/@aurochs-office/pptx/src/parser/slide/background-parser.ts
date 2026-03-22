/**
 * @file Background element parsing
 *
 * Extracts background elements from slide/layout/master XML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "@aurochs/xml";
import { getChild } from "@aurochs/xml";
import type { BackgroundFill } from "../../domain/slide/background";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { ColorSpec } from "@aurochs-office/drawing-ml/domain/color";

// =============================================================================
// Parse Intermediate Types (parser-internal, not domain types)
// =============================================================================

/**
 * Background element result from p:bg
 *
 * Represents the parsed background element containing either
 * background properties (bgPr) or background reference (bgRef).
 */
export type BackgroundElement = {
  /** Background properties element (p:bgPr) */
  readonly bgPr?: XmlElement;
  /** Background reference element (p:bgRef) */
  readonly bgRef?: XmlElement;
};

/**
 * Result of parsing background properties
 *
 * Contains the fill element and optional placeholder color
 * for theme-based backgrounds.
 */
export type BackgroundParseResult = {
  /**
   * Fill element (XmlElement containing a:solidFill, a:gradFill, a:blipFill, etc.)
   */
  readonly fill: XmlElement;
  /**
   * Placeholder color resolved from p:bgRef child element.
   * This is the hex color (without #) to substitute for phClr in theme styles.
   *
   * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
   */
  readonly phClr?: string;
  /**
   * Whether the fill came from a theme style (via bgRef).
   * When true, blipFill rIds should be resolved from theme resources.
   *
   * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
   */
  readonly fromTheme?: boolean;
};
import type { FillType, GradientFill } from "../graphics/fill-resolver";
import type { SlideContext } from "./context";
import { getSolidFill } from "../graphics/color-resolver";
import {
  getGradientFill,
  getFillType,
  formatFillResult,
  getPicFillFromContext,
  detectImageFillMode,
} from "../graphics/fill-resolver";

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
  if (cSld === undefined) {
    return undefined;
  }

  const bg = getChild(cSld, "p:bg");
  if (bg === undefined) {
    return undefined;
  }

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
export function resolveBgRefToFill(bgRef: XmlElement, ctx: SlideContext): BaseFill | undefined {
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
/**
 * Result of background resolution — either inline XML (bgPr) or domain fill (bgRef).
 */
type BackgroundResolution =
  | { readonly kind: "xml"; readonly result: BackgroundParseResult }
  | { readonly kind: "domain"; readonly fill: BaseFill; readonly phClr?: string };

function resolveBackground(ctx: SlideContext): BackgroundResolution | undefined {
  // Try slide first
  const slideBgPr = getBgPrFromElement(ctx.slide.content);
  if (slideBgPr !== undefined) {
    return { kind: "xml", result: { fill: slideBgPr } };
  }
  const slideBgRef = getBgRefFromElement(ctx.slide.content);
  if (slideBgRef !== undefined) {
    const resolved = resolveBgRefToFill(slideBgRef, ctx);
    if (resolved !== undefined) {
      const phClr = extractPhClrFromBgRef(slideBgRef, ctx);
      return { kind: "domain", fill: resolved, phClr };
    }
  }

  // Try layout
  const layoutBgPr = getBgPrFromElement(ctx.layout.content);
  if (layoutBgPr !== undefined) {
    return { kind: "xml", result: { fill: layoutBgPr } };
  }
  const layoutBgRef = getBgRefFromElement(ctx.layout.content);
  if (layoutBgRef !== undefined) {
    const resolved = resolveBgRefToFill(layoutBgRef, ctx);
    if (resolved !== undefined) {
      const phClr = extractPhClrFromBgRef(layoutBgRef, ctx);
      return { kind: "domain", fill: resolved, phClr };
    }
  }

  // Master background is resolved via parseSlideMaster (SoT) and stored as Background domain type.
  // Return undefined here; master fallback is handled by getBackgroundFillData using ctx.master.background.
  return undefined;
}






/** Parse background properties from slide context, returning XML-based result if available */
export function parseBackgroundProperties(ctx: SlideContext): BackgroundParseResult | undefined {
  const resolution = resolveBackground(ctx);
  if (!resolution) { return undefined; }
  if (resolution.kind === "xml") { return resolution.result; }
  // bgRef resolution no longer returns BackgroundParseResult — handled in getBackgroundFillData
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

  // Master background is resolved via domain type, not raw XML
  return undefined;
}

/**
 * Check if slide has its own background (not inherited)
 */
export function hasOwnBackground(ctx: SlideContext): boolean {
  const slideContent = ctx.slide.content;

  const cSld = getChild(slideContent, "p:cSld");
  if (cSld === undefined) {
    return false;
  }

  const bg = getChild(cSld, "p:bg");
  if (bg === undefined) {
    return false;
  }

  const bgPr = getChild(bg, "p:bgPr");
  const bgRef = getChild(bg, "p:bgRef");

  return bgPr !== undefined || bgRef !== undefined;
}

// =============================================================================
// Background Fill Data Resolution
// =============================================================================

/**
 * Extract data parameters for background fill handlers.
 */
type ExtractDataParams = {
  readonly fill: XmlElement;
  readonly ctx: SlideContext;
  readonly phClr?: string;
  readonly fromTheme?: boolean;
};

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
  extractData: (params: ExtractDataParams) => BackgroundFill | null;
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
  const stopsWithPos = sortedColors
    .map((c) => {
      const pos = parseInt(c.pos, 10) / 1000; // Convert from 1/100000 to percentage
      return `#${c.color} ${pos}%`;
    })
    .join(", ");

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
  extractData: ({ fill, ctx, phClr }) => {
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
  extractData: ({ fill, ctx, phClr }) => {
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
function tryGetPicFill(blipFill: unknown, ctx: SlideContext, fromTheme?: boolean): string | undefined {
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
  extractData: ({ fill, ctx, fromTheme }) => {
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

/** Convert a fill-to-rect to LTRB numeric object */
function convertFillToRect(rect: { left: number; top: number; right: number; bottom: number } | undefined): { l: number; t: number; r: number; b: number } | undefined {
  if (!rect) {
    return undefined;
  }
  return {
    l: rect.left as number,
    t: rect.top as number,
    r: rect.right as number,
    b: rect.bottom as number,
  };
}

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
/**
 * Convert Background domain type to BackgroundFill for rendering.
 * Used as master background fallback when slide/layout have no explicit background.
 *
 * Resolves Color spec to hex using the slide's color context.
 */
function backgroundToFill(bg: { fill: BaseFill }, ctx: SlideContext, phClr?: string): BackgroundFill | undefined {
  const fill = bg.fill;
  switch (fill.type) {
    case "solidFill": {
      const hex = resolveColorSpec(fill.color.spec, ctx, phClr);
      if (hex) { return { css: `background-color: #${hex};`, isSolid: true, color: `#${hex}` }; }
      return undefined;
    }
    case "gradientFill": {
      const resolvedColors = fill.stops.map((stop) => {
        const hex = resolveColorSpec(stop.color.spec, ctx, phClr);
        return { pos: String(stop.position), color: hex ?? "000000" };
      });
      const angle = fill.linear?.angle ?? 0;
      const gradType = fill.path ? "path" as const : "linear" as const;
      const gradResult: GradientFill = {
        color: resolvedColors,
        rot: angle as number,
        type: gradType,
        pathShadeType: fill.path?.path,
        fillToRect: convertFillToRect(fill.path?.fillToRect),
      };
      const gradientCSS = generateGradientCSS(gradResult);
      const sortedColors = [...resolvedColors].sort((a, b) => parseInt(a.pos, 10) - parseInt(b.pos, 10));
      const gradientData = {
        angle: gradResult.rot,
        type: gradType,
        pathShadeType: gradType === "path" ? gradResult.pathShadeType : undefined,
        fillToRect: gradType === "path" ? gradResult.fillToRect : undefined,
        stops: sortedColors.map((c) => ({ position: parseInt(c.pos, 10) / 1000, color: c.color })),
      };
      return { css: `background: ${gradientCSS};`, isSolid: false, gradient: gradientCSS, gradientData };
    }
    case "noFill":
      return { css: "", isSolid: true };
    default:
      return undefined;
  }
}

/** Resolve a color spec to a hex string */
function resolveColorSpec(spec: ColorSpec, ctx: SlideContext, phClr?: string): string | undefined {
  if (spec.type === "scheme" && spec.value === "phClr" && phClr) {
    return phClr;
  }
  if (spec.type === "srgb") {
    return spec.value;
  }
  if (spec.type === "scheme") {
    const colorCtx = ctx.toColorContext();
    const mapped = colorCtx.colorMap[spec.value] ?? spec.value;
    return colorCtx.colorScheme[mapped];
  }
  return undefined;
}






/** Resolve background fill data from slide/layout/master hierarchy */
export function getBackgroundFillData(ctx: SlideContext): BackgroundFill {
  const resolution = resolveBackground(ctx);

  if (resolution) {
    if (resolution.kind === "domain") {
      // bgRef path: fill is already a domain type (BaseFill from FormatScheme)
      const domainResult = baseFillToBackgroundFill(resolution.fill, ctx, resolution.phClr);
      if (domainResult) { return domainResult; }
    } else {
      // bgPr path: fill is raw XML, use existing handlers
      const bgResult = resolution.result;
      const bgFillType = getFillType(bgResult.fill);
      const handler = BG_FILL_HANDLERS[bgFillType];
      const result = handler?.extractData({
        fill: bgResult.fill,
        ctx,
        phClr: bgResult.phClr,
        fromTheme: bgResult.fromTheme,
      });
      if (result) { return result; }
    }
  }

  // Fallback: master background from SlideMaster domain type (SoT)
  if (ctx.master.background) {
    const masterResult = backgroundToFill(ctx.master.background, ctx);
    if (masterResult) { return masterResult; }
  }

  return DEFAULT_BACKGROUND_FILL;
}

/**
 * Convert a BaseFill domain type to BackgroundFill for rendering.
 * Used for bgRef resolution where the fill comes from FormatScheme (pre-parsed).
 */
function baseFillToBackgroundFill(fill: BaseFill, ctx: SlideContext, phClr?: string): BackgroundFill | undefined {
  return backgroundToFill({ fill }, ctx, phClr);
}
