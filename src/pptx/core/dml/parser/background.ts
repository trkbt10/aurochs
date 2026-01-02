/**
 * @file Background element parsing
 *
 * Extracts background fill information from OOXML elements.
 * Follows the parser → domain → render architecture.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */

import type { XmlElement } from "../../../../xml";
import { isXmlElement, getChild } from "../../../../xml";
import type { FillElements, BlipFillElement } from "../../../ooxml";
import type { SlideRenderContext } from "../../../reader/slide/accessor";
import { getSolidFill } from "./color";

// =============================================================================
// Types
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
// XmlElement to OoxmlElement Conversion
// =============================================================================

/**
 * Check if a value is an XmlElement (has type="element")
 */
function isXmlElementNode(value: unknown): value is XmlElement {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value !== "object") {
    return false;
  }
  if (!("type" in value)) {
    return false;
  }
  return (value as { type: unknown }).type === "element";
}

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
 *
 * @example
 * XML:
 * ```xml
 * <a:gsLst>
 *   <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
 *   <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
 * </a:gsLst>
 * ```
 * Result:
 * ```typescript
 * { attrs: {}, "a:gs": [{ attrs: { pos: "0" }, ... }, { attrs: { pos: "100000" }, ... }] }
 * ```
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
 * The child element (a:schemeClr, a:srgbClr, etc.) provides the color
 * to substitute for phClr (placeholder color) in the style.
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
  // This matches the expected structure where FillElements has keys like "a:gradFill"
  const fillElements: Record<string, unknown> = {
    [fillStyle.name]: xmlElementToBlipFill(fillStyle),
  };

  return fillElements as FillElements;
}

/**
 * Extract placeholder color from p:bgRef element.
 *
 * Per ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef):
 * The child element (a:schemeClr, a:srgbClr, etc.) specifies the color
 * to use when phClr appears in the referenced style.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
 */
export function extractPhClrFromBgRef(bgRef: XmlElement, ctx: SlideRenderContext): string | undefined {
  // Get color from bgRef's child elements (a:schemeClr, a:srgbClr, etc.)
  return getSolidFill(bgRef, undefined, ctx.toColorContext());
}

/**
 * Find background from content hierarchy, including p:bgRef resolution.
 * Priority: slide > slideLayout > slideMaster
 *
 * Per ECMA-376 Part 1, Section 19.3.1.2 (p:bg):
 * Background can be specified via either:
 * - p:bgPr: Direct fill properties
 * - p:bgRef: Reference to theme style
 *
 * @see ECMA-376 Part 1, Section 19.3.1.2 (p:bg)
 * @see ECMA-376 Part 1, Section 19.3.1.4 (p:bgRef)
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
 * Used for extracting placeholder color from p:bgRef.
 */
export function findBackgroundRef(ctx: SlideRenderContext): XmlElement | undefined {
  // Try slide first
  const slideBgRef = getBgRefFromElement(ctx.slide.content);
  if (slideBgRef !== undefined) {
    return slideBgRef;
  }

  // Try layout
  const layoutBgRef = getBgRefFromElement(ctx.layout.content);
  if (layoutBgRef !== undefined) {
    return layoutBgRef;
  }

  // Try master
  return getBgRefFromElement(ctx.master.content);
}

/**
 * Check if slide has its own background (not inherited)
 * @param ctx - Slide render context
 * @returns True if slide has its own background
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
