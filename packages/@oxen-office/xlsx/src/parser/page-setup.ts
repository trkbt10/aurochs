/**
 * @file Page Setup Parser
 *
 * Parses page setup, margins, and header/footer elements from worksheet XML.
 *
 * @see ECMA-376 Part 4, Section 18.3.1.63 (pageMargins)
 * @see ECMA-376 Part 4, Section 18.3.1.64 (pageSetup)
 * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
 */

import type { XmlElement } from "@oxen/xml";
import { getAttr, getChild, getTextContent } from "@oxen/xml";
import { parseBooleanAttr, parseFloatAttr, parseIntAttr } from "./primitive";
import type {
  XlsxPageSetup,
  XlsxPageMargins,
  XlsxHeaderFooter,
  XlsxPrintOptions,
} from "../domain/page-setup";

// =============================================================================
// Page Setup Parsing
// =============================================================================

/**
 * Parse page setup element.
 *
 * @param pageSetupElement - The <pageSetup> element
 * @returns Parsed page setup or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.64 (pageSetup)
 */
export function parsePageSetup(pageSetupElement: XmlElement | undefined): XlsxPageSetup | undefined {
  if (!pageSetupElement) {
    return undefined;
  }

  const paperSize = parseIntAttr(getAttr(pageSetupElement, "paperSize"));
  const orientation = getAttr(pageSetupElement, "orientation") as XlsxPageSetup["orientation"];
  const scale = parseIntAttr(getAttr(pageSetupElement, "scale"));
  const fitToWidth = parseIntAttr(getAttr(pageSetupElement, "fitToWidth"));
  const fitToHeight = parseIntAttr(getAttr(pageSetupElement, "fitToHeight"));
  const firstPageNumber = parseIntAttr(getAttr(pageSetupElement, "firstPageNumber"));
  const useFirstPageNumber = parseBooleanAttr(getAttr(pageSetupElement, "useFirstPageNumber"));
  const blackAndWhite = parseBooleanAttr(getAttr(pageSetupElement, "blackAndWhite"));
  const draft = parseBooleanAttr(getAttr(pageSetupElement, "draft"));
  const cellComments = getAttr(pageSetupElement, "cellComments") as XlsxPageSetup["cellComments"];
  const pageOrder = getAttr(pageSetupElement, "pageOrder") as XlsxPageSetup["pageOrder"];
  const horizontalDpi = parseIntAttr(getAttr(pageSetupElement, "horizontalDpi"));
  const verticalDpi = parseIntAttr(getAttr(pageSetupElement, "verticalDpi"));
  const copies = parseIntAttr(getAttr(pageSetupElement, "copies"));

  return {
    ...(paperSize !== undefined && { paperSize }),
    ...(orientation && { orientation }),
    ...(scale !== undefined && { scale }),
    ...(fitToWidth !== undefined && { fitToWidth }),
    ...(fitToHeight !== undefined && { fitToHeight }),
    ...(firstPageNumber !== undefined && { firstPageNumber }),
    ...(useFirstPageNumber !== undefined && { useFirstPageNumber }),
    ...(blackAndWhite !== undefined && { blackAndWhite }),
    ...(draft !== undefined && { draft }),
    ...(cellComments && { cellComments }),
    ...(pageOrder && { pageOrder }),
    ...(horizontalDpi !== undefined && { horizontalDpi }),
    ...(verticalDpi !== undefined && { verticalDpi }),
    ...(copies !== undefined && { copies }),
  };
}

// =============================================================================
// Page Margins Parsing
// =============================================================================

/**
 * Parse page margins element.
 *
 * @param pageMarginsElement - The <pageMargins> element
 * @returns Parsed page margins or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.63 (pageMargins)
 */
export function parsePageMargins(pageMarginsElement: XmlElement | undefined): XlsxPageMargins | undefined {
  if (!pageMarginsElement) {
    return undefined;
  }

  const left = parseFloatAttr(getAttr(pageMarginsElement, "left"));
  const right = parseFloatAttr(getAttr(pageMarginsElement, "right"));
  const top = parseFloatAttr(getAttr(pageMarginsElement, "top"));
  const bottom = parseFloatAttr(getAttr(pageMarginsElement, "bottom"));
  const header = parseFloatAttr(getAttr(pageMarginsElement, "header"));
  const footer = parseFloatAttr(getAttr(pageMarginsElement, "footer"));

  return {
    ...(left !== undefined && { left }),
    ...(right !== undefined && { right }),
    ...(top !== undefined && { top }),
    ...(bottom !== undefined && { bottom }),
    ...(header !== undefined && { header }),
    ...(footer !== undefined && { footer }),
  };
}

// =============================================================================
// Header/Footer Parsing
// =============================================================================

/**
 * Parse header/footer element.
 *
 * @param headerFooterElement - The <headerFooter> element
 * @returns Parsed header/footer or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.46 (headerFooter)
 */
export function parseHeaderFooter(headerFooterElement: XmlElement | undefined): XlsxHeaderFooter | undefined {
  if (!headerFooterElement) {
    return undefined;
  }

  const differentOddEven = parseBooleanAttr(getAttr(headerFooterElement, "differentOddEven"));
  const differentFirst = parseBooleanAttr(getAttr(headerFooterElement, "differentFirst"));
  const scaleWithDoc = parseBooleanAttr(getAttr(headerFooterElement, "scaleWithDoc"));
  const alignWithMargins = parseBooleanAttr(getAttr(headerFooterElement, "alignWithMargins"));

  const oddHeaderEl = getChild(headerFooterElement, "oddHeader");
  const oddFooterEl = getChild(headerFooterElement, "oddFooter");
  const evenHeaderEl = getChild(headerFooterElement, "evenHeader");
  const evenFooterEl = getChild(headerFooterElement, "evenFooter");
  const firstHeaderEl = getChild(headerFooterElement, "firstHeader");
  const firstFooterEl = getChild(headerFooterElement, "firstFooter");

  const oddHeader = oddHeaderEl ? getTextContent(oddHeaderEl) : undefined;
  const oddFooter = oddFooterEl ? getTextContent(oddFooterEl) : undefined;
  const evenHeader = evenHeaderEl ? getTextContent(evenHeaderEl) : undefined;
  const evenFooter = evenFooterEl ? getTextContent(evenFooterEl) : undefined;
  const firstHeader = firstHeaderEl ? getTextContent(firstHeaderEl) : undefined;
  const firstFooter = firstFooterEl ? getTextContent(firstFooterEl) : undefined;

  return {
    ...(oddHeader && { oddHeader }),
    ...(oddFooter && { oddFooter }),
    ...(evenHeader && { evenHeader }),
    ...(evenFooter && { evenFooter }),
    ...(firstHeader && { firstHeader }),
    ...(firstFooter && { firstFooter }),
    ...(differentOddEven !== undefined && { differentOddEven }),
    ...(differentFirst !== undefined && { differentFirst }),
    ...(scaleWithDoc !== undefined && { scaleWithDoc }),
    ...(alignWithMargins !== undefined && { alignWithMargins }),
  };
}

// =============================================================================
// Print Options Parsing
// =============================================================================

/**
 * Parse print options element.
 *
 * @param printOptionsElement - The <printOptions> element
 * @returns Parsed print options or undefined
 *
 * @see ECMA-376 Part 4, Section 18.3.1.70 (printOptions)
 */
export function parsePrintOptions(printOptionsElement: XmlElement | undefined): XlsxPrintOptions | undefined {
  if (!printOptionsElement) {
    return undefined;
  }

  const gridLines = parseBooleanAttr(getAttr(printOptionsElement, "gridLines"));
  const headings = parseBooleanAttr(getAttr(printOptionsElement, "headings"));
  const gridLinesSet = parseBooleanAttr(getAttr(printOptionsElement, "gridLinesSet"));
  const horizontalCentered = parseBooleanAttr(getAttr(printOptionsElement, "horizontalCentered"));
  const verticalCentered = parseBooleanAttr(getAttr(printOptionsElement, "verticalCentered"));

  return {
    ...(gridLines !== undefined && { gridLines }),
    ...(headings !== undefined && { headings }),
    ...(gridLinesSet !== undefined && { gridLinesSet }),
    ...(horizontalCentered !== undefined && { horizontalCentered }),
    ...(verticalCentered !== undefined && { verticalCentered }),
  };
}
