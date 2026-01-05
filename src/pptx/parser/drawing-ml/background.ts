/**
 * @file Background element parsing
 *
 * Extracts background elements from slide/layout/master XML.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "../../../xml";
import { getChild } from "../../../xml";
import type { BackgroundElement, BackgroundParseResult } from "../../domain/drawing-ml";
import type { SlideRenderContext } from "../../render/core/slide-context";
import { getSolidFill } from "./color";

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
  ctx: SlideRenderContext,
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
