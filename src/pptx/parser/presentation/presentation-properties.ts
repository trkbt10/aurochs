/**
 * @file Presentation properties parser for ECMA-376 p:presentationPr element
 *
 * Parses the presentation properties (presProps.xml) and show settings.
 *
 * @see ECMA-376 Part 1, Section 19.2.1.27 (presentationPr)
 */

import type { XmlElement } from "../../../xml/index";
import { getChild, getChildren, isXmlElement } from "../../../xml/index";
import type {
  BrowseShowProperties,
  KioskShowProperties,
  PresentationProperties,
  PrintColorMode,
  PrintWhat,
  PrintProperties,
  ShowProperties,
  SlideShowRange,
} from "../../domain/slide";
import type { Color } from "../../domain/color";
import { parseColor, parseColorFromParent } from "../graphics/color-parser";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a boolean attribute when present.
 *
 * Per ECMA-376, boolean values can be "true", "false", "1", or "0".
 *
 * @param value - The attribute value
 * @returns Parsed boolean or undefined when attribute missing
 */
function parseOptionalBooleanAttr(value: string | undefined): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  return value === "1" || value === "true";
}

function parsePrintColorMode(value: string | undefined): PrintColorMode | undefined {
  if (value === "bw" || value === "gray" || value === "clr") {
    return value;
  }
  return undefined;
}

function parsePrintWhat(value: string | undefined): PrintWhat | undefined {
  if (
    value === "slides" ||
    value === "handouts1" ||
    value === "handouts2" ||
    value === "handouts3" ||
    value === "handouts4" ||
    value === "handouts6" ||
    value === "handouts9" ||
    value === "notes" ||
    value === "outline"
  ) {
    return value;
  }
  return undefined;
}

/**
 * Parse an integer attribute when present.
 *
 * @param value - The attribute value
 * @returns Parsed integer or undefined when attribute missing/invalid
 */
function parseOptionalIntAttr(value: string | undefined): number | undefined {
  if (value === undefined) {
    return undefined;
  }
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? undefined : parsed;
}

// =============================================================================
// p:clrMru Parser - Section 19.2.1.4
// =============================================================================

/**
 * Parse p:clrMru (color MRU) element.
 *
 * @param element - The p:clrMru element
 * @returns Array of parsed colors
 *
 * @see ECMA-376 Part 1, Section 19.2.1.4
 */
export function parseClrMru(element: XmlElement): Color[] {
  const colors: Color[] = [];
  for (const child of element.children) {
    if (!isXmlElement(child)) {continue;}
    const color = parseColor(child);
    if (color) {colors.push(color);}
  }
  return colors;
}

// =============================================================================
// p:showPr Parser - Section 19.2.1.30
// =============================================================================

/**
 * Parse p:browse (browse show mode) element.
 */
function parseBrowseShow(element: XmlElement): BrowseShowProperties {
  return {
    showScrollbar: parseOptionalBooleanAttr(element.attrs["showScrollbar"]),
  };
}

/**
 * Parse p:kiosk (kiosk show mode) element.
 */
function parseKioskShow(element: XmlElement): KioskShowProperties {
  return {
    restart: parseOptionalIntAttr(element.attrs["restart"]),
  };
}

/**
 * Parse p:sldLst (slide list) element.
 */
function parseSlideList(element: XmlElement): SlideShowRange | undefined {
  const slides = getChildren(element, "p:sld")
    .map((slide) => slide.attrs["r:id"] ?? "")
    .filter((id) => id.length > 0);
  if (slides.length === 0) {return undefined;}
  return { type: "list", slideIds: slides };
}

/**
 * Parse p:sldRg (slide range) element.
 */
function parseSlideRange(element: XmlElement): SlideShowRange | undefined {
  const start = parseOptionalIntAttr(element.attrs["st"]);
  const end = parseOptionalIntAttr(element.attrs["end"]);
  if (start === undefined || end === undefined) {return undefined;}
  return { type: "range", start, end };
}

/**
 * Parse p:showPr (presentation-wide show properties) element.
 *
 * @param element - The p:showPr element
 * @returns Parsed show properties
 *
 * @see ECMA-376 Part 1, Section 19.2.1.30
 */
export function parseShowProperties(element: XmlElement): ShowProperties {
  const browseEl = getChild(element, "p:browse");
  const kioskEl = getChild(element, "p:kiosk");
  const presentEl = getChild(element, "p:present");
  const sldAllEl = getChild(element, "p:sldAll");
  const sldRgEl = getChild(element, "p:sldRg");
  const sldLstEl = getChild(element, "p:sldLst");

  const slideRange = resolveSlideRange(sldAllEl, sldRgEl, sldLstEl);

  return {
    browse: browseEl ? parseBrowseShow(browseEl) : undefined,
    kiosk: kioskEl ? parseKioskShow(kioskEl) : undefined,
    present: presentEl ? {} : undefined,
    slideRange,
    penColor: parseColorFromParent(getChild(element, "p:penClr")),
    showNarration: parseOptionalBooleanAttr(element.attrs["showNarration"]),
    useTimings: parseOptionalBooleanAttr(element.attrs["useTimings"]),
  };
}

function resolveSlideRange(
  sldAllEl: XmlElement | undefined,
  sldRgEl: XmlElement | undefined,
  sldLstEl: XmlElement | undefined,
): SlideShowRange | undefined {
  if (sldAllEl !== undefined) {
    return { type: "all" as const };
  }
  if (sldRgEl !== undefined) {
    return parseSlideRange(sldRgEl);
  }
  if (sldLstEl !== undefined) {
    return parseSlideList(sldLstEl);
  }
  return undefined;
}

// =============================================================================
// p:presentationPr Parser - Section 19.2.1.27
// =============================================================================

/**
 * Parse p:presentationPr (presentation properties) element.
 *
 * @param element - The p:presentationPr element
 * @returns Parsed presentation properties
 *
 * @see ECMA-376 Part 1, Section 19.2.1.27
 */
export function parsePresentationProperties(element: XmlElement): PresentationProperties {
  const showPrEl = getChild(element, "p:showPr");
  const clrMruEl = getChild(element, "p:clrMru");
  const prnPrEl = getChild(element, "p:prnPr");

  return {
    showProperties: showPrEl ? parseShowProperties(showPrEl) : undefined,
    recentColors: clrMruEl ? parseClrMru(clrMruEl) : undefined,
    printProperties: prnPrEl ? parsePrintProperties(prnPrEl) : undefined,
  };
}

// =============================================================================
// p:prnPr Parser - Section 19.2.1.28
// =============================================================================

/**
 * Parse p:prnPr (printing properties) element.
 *
 * @param element - The p:prnPr element
 * @returns Parsed printing properties
 *
 * @see ECMA-376 Part 1, Section 19.2.1.28
 */
export function parsePrintProperties(element: XmlElement): PrintProperties {
  return {
    colorMode: parsePrintColorMode(element.attrs["clrMode"]),
    frameSlides: parseOptionalBooleanAttr(element.attrs["frameSlides"]),
    hiddenSlides: parseOptionalBooleanAttr(element.attrs["hiddenSlides"]),
    printWhat: parsePrintWhat(element.attrs["prnWhat"]),
    scaleToFitPaper: parseOptionalBooleanAttr(element.attrs["scaleToFitPaper"]),
  };
}
