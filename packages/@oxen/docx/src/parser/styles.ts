/**
 * @file DOCX Styles Parser
 *
 * Parses styles.xml from WordprocessingML documents.
 *
 * @see ECMA-376 Part 1, Section 17.7 (Styles)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "@oxen/xml";
import type {
  DocxStyles,
  DocxStyle,
  DocxStyleType,
  DocxDocDefaults,
  DocxLatentStyles,
  DocxLatentStyleException,
  DocxTableStylePr,
  DocxTableStyleType,
} from "../domain/styles";
import type { DocxStyleId } from "../domain/types";
import { parseRunProperties } from "./run";
import { parseParagraphProperties } from "./paragraph";
import { parseStyleId, parseInt32, parseBoolean, getChildVal } from "./primitive";

// =============================================================================
// Helper Functions for Style Property Parsing
// =============================================================================

function parseNameProperty(element: XmlElement, childName: string): { val: string } | undefined {
  const child = getChild(element, childName);
  if (!child) {return undefined;}
  return { val: getChildVal(element, childName) ?? "" };
}

function parseStyleIdProperty(element: XmlElement, childName: string): { val: DocxStyleId } | undefined {
  const styleId = parseStyleId(getChildVal(element, childName));
  if (!styleId) {return undefined;}
  return { val: styleId };
}

function parseUiPriorityProperty(element: XmlElement): { val: number } | undefined {
  const value = parseInt32(getChildVal(element, "uiPriority"));
  if (value === undefined) {return undefined;}
  return { val: value };
}

// =============================================================================
// Style Type Parsing
// =============================================================================

function parseStyleType(value: string | undefined): DocxStyleType | undefined {
  switch (value) {
    case "paragraph":
    case "character":
    case "table":
    case "numbering":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Table Style Conditional Parsing
// =============================================================================

function parseTableStyleType(value: string | undefined): DocxTableStyleType | undefined {
  switch (value) {
    case "wholeTable":
    case "firstRow":
    case "lastRow":
    case "firstCol":
    case "lastCol":
    case "band1Vert":
    case "band2Vert":
    case "band1Horz":
    case "band2Horz":
    case "neCell":
    case "nwCell":
    case "seCell":
    case "swCell":
      return value;
    default:
      return undefined;
  }
}

function parseTableStylePr(element: XmlElement): DocxTableStylePr | undefined {
  const type = parseTableStyleType(getAttr(element, "type"));
  if (!type) {return undefined;}

  return {
    type,
    rPr: parseRunProperties(getChild(element, "rPr")),
    pPr: parseParagraphProperties(getChild(element, "pPr")),
    tcPr: undefined, // Table cell properties would need table parser import
  };
}

// =============================================================================
// Style Parsing
// =============================================================================

/**
 * Parse a single style element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.17 (style)
 */
function parseStyle(element: XmlElement): DocxStyle | undefined {
  const type = parseStyleType(getAttr(element, "type"));
  const styleId = parseStyleId(getAttr(element, "styleId"));

  if (!type || !styleId) {return undefined;}

  const tblStylePr: DocxTableStylePr[] = [];
  for (const tsp of getChildren(element, "tblStylePr")) {
    const parsed = parseTableStylePr(tsp);
    if (parsed) {
      tblStylePr.push(parsed);
    }
  }

  return {
    type,
    styleId,
    name: parseNameProperty(element, "name"),
    aliases: parseNameProperty(element, "aliases"),
    basedOn: parseStyleIdProperty(element, "basedOn"),
    next: parseStyleIdProperty(element, "next"),
    link: parseStyleIdProperty(element, "link"),
    uiPriority: parseUiPriorityProperty(element),
    default: parseBoolean(getAttr(element, "default")),
    customStyle: parseBoolean(getAttr(element, "customStyle")),
    semiHidden: getChild(element, "semiHidden") !== undefined,
    unhideWhenUsed: getChild(element, "unhideWhenUsed") !== undefined,
    qFormat: getChild(element, "qFormat") !== undefined,
    locked: getChild(element, "locked") !== undefined,
    personal: getChild(element, "personal") !== undefined,
    personalReply: getChild(element, "personalReply") !== undefined,
    personalCompose: getChild(element, "personalCompose") !== undefined,
    rPr: parseRunProperties(getChild(element, "rPr")),
    pPr: parseParagraphProperties(getChild(element, "pPr")),
    tblPr: undefined, // Would need table parser import
    trPr: undefined, // Would need table parser import
    tcPr: undefined, // Would need table parser import
    tblStylePr: tblStylePr.length > 0 ? tblStylePr : undefined,
  };
}

// =============================================================================
// Document Defaults Parsing
// =============================================================================

/**
 * Parse document defaults element.
 *
 * @see ECMA-376 Part 1, Section 17.7.5.1 (docDefaults)
 */
function parseDocDefaults(element: XmlElement | undefined): DocxDocDefaults | undefined {
  if (!element) {return undefined;}

  return {
    rPrDefault: parseRPrDefault(getChild(element, "rPrDefault")),
    pPrDefault: parsePPrDefault(getChild(element, "pPrDefault")),
  };
}

function parseRPrDefault(element: XmlElement | undefined): { rPr: ReturnType<typeof parseRunProperties> } | undefined {
  if (!element) {return undefined;}
  return { rPr: parseRunProperties(getChild(element, "rPr")) };
}

function parsePPrDefault(element: XmlElement | undefined): { pPr: ReturnType<typeof parseParagraphProperties> } | undefined {
  if (!element) {return undefined;}
  return { pPr: parseParagraphProperties(getChild(element, "pPr")) };
}

// =============================================================================
// Latent Styles Parsing
// =============================================================================

/**
 * Parse latent style exception element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.8 (lsdException)
 */
function parseLatentStyleException(element: XmlElement): DocxLatentStyleException | undefined {
  const name = getAttr(element, "name");
  if (!name) {return undefined;}

  return {
    name,
    locked: parseBoolean(getAttr(element, "locked")),
    uiPriority: parseInt32(getAttr(element, "uiPriority")),
    semiHidden: parseBoolean(getAttr(element, "semiHidden")),
    unhideWhenUsed: parseBoolean(getAttr(element, "unhideWhenUsed")),
    qFormat: parseBoolean(getAttr(element, "qFormat")),
  };
}

/**
 * Parse latent styles element.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.7 (latentStyles)
 */
function parseLatentStyles(element: XmlElement | undefined): DocxLatentStyles | undefined {
  if (!element) {return undefined;}

  const lsdException: DocxLatentStyleException[] = [];
  for (const exc of getChildren(element, "lsdException")) {
    const parsed = parseLatentStyleException(exc);
    if (parsed) {
      lsdException.push(parsed);
    }
  }

  return {
    defLockedState: parseBoolean(getAttr(element, "defLockedState")),
    defUIPriority: parseInt32(getAttr(element, "defUIPriority")),
    defSemiHidden: parseBoolean(getAttr(element, "defSemiHidden")),
    defUnhideWhenUsed: parseBoolean(getAttr(element, "defUnhideWhenUsed")),
    defQFormat: parseBoolean(getAttr(element, "defQFormat")),
    count: parseInt32(getAttr(element, "count")),
    lsdException: lsdException.length > 0 ? lsdException : undefined,
  };
}

// =============================================================================
// Styles Part Parsing
// =============================================================================

/**
 * Parse styles.xml document.
 *
 * @see ECMA-376 Part 1, Section 17.7.4.18 (styles)
 */
export function parseStyles(element: XmlElement): DocxStyles {
  const styles: DocxStyle[] = [];

  for (const style of getChildren(element, "style")) {
    const parsed = parseStyle(style);
    if (parsed) {
      styles.push(parsed);
    }
  }

  return {
    docDefaults: parseDocDefaults(getChild(element, "docDefaults")),
    latentStyles: parseLatentStyles(getChild(element, "latentStyles")),
    style: styles,
  };
}
