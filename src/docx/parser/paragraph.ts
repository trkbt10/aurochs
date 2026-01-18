/**
 * @file DOCX Paragraph Parser
 *
 * Parses paragraph elements and paragraph properties from WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 17.3.1 (Paragraph Properties)
 */

import { getAttr, getChild, getChildren, isXmlElement, type XmlElement } from "../../xml";
import type {
  DocxParagraph,
  DocxParagraphProperties,
  DocxParagraphSpacing,
  DocxParagraphIndent,
  DocxParagraphBorders,
  DocxParagraphBorderEdge,
  DocxTabStops,
  DocxTabStop,
  DocxNumberingProperties,
  DocxFrameProperties,
  DocxOutlineLevel,
  DocxParagraphContent,
  DocxHyperlink,
  DocxBookmarkStart,
  DocxBookmarkEnd,
} from "../domain/paragraph";
import type { ParagraphAlignment, TabStopAlignment, TabStopLeader } from "../../ooxml/domain/text";
import type { WordBorderStyle } from "../../ooxml/domain/border";
import type { DocxThemeColor } from "../domain/run";
import {
  parseToggleChild,
  getChildVal,
  parseTwips,
  parseStyleId,
  parseNumId,
  parseIlvl,
  parseRelId,
  parseEighthPoints,
  parseInt32,
  parseBoolean,
} from "./primitive";
import { parseRun, parseShading, parseRunProperties } from "./run";
import { parseSectionProperties } from "./section";
import type { DocxParseContext } from "./context";

// =============================================================================
// Spacing Parsing
// =============================================================================

/**
 * Parse paragraph spacing element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.33 (spacing)
 */
function parseSpacing(element: XmlElement | undefined): DocxParagraphSpacing | undefined {
  if (!element) {return undefined;}

  return {
    before: parseTwips(getAttr(element, "before")),
    beforeAutospacing: parseBoolean(getAttr(element, "beforeAutospacing")),
    after: parseTwips(getAttr(element, "after")),
    afterAutospacing: parseBoolean(getAttr(element, "afterAutospacing")),
    line: parseInt32(getAttr(element, "line")),
    lineRule: parseLineRule(getAttr(element, "lineRule")),
    beforeLines: parseInt32(getAttr(element, "beforeLines")),
    afterLines: parseInt32(getAttr(element, "afterLines")),
  };
}

function parseLineRule(value: string | undefined): "auto" | "exact" | "atLeast" | undefined {
  switch (value) {
    case "auto":
    case "exact":
    case "atLeast":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Indentation Parsing
// =============================================================================

/**
 * Parse paragraph indentation element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.12 (ind)
 */
function parseIndent(element: XmlElement | undefined): DocxParagraphIndent | undefined {
  if (!element) {return undefined;}

  return {
    left: parseTwips(getAttr(element, "left")),
    leftChars: parseInt32(getAttr(element, "leftChars")),
    right: parseTwips(getAttr(element, "right")),
    rightChars: parseInt32(getAttr(element, "rightChars")),
    firstLine: parseTwips(getAttr(element, "firstLine")),
    firstLineChars: parseInt32(getAttr(element, "firstLineChars")),
    hanging: parseTwips(getAttr(element, "hanging")),
    hangingChars: parseInt32(getAttr(element, "hangingChars")),
    start: parseTwips(getAttr(element, "start")),
    startChars: parseInt32(getAttr(element, "startChars")),
    end: parseTwips(getAttr(element, "end")),
    endChars: parseInt32(getAttr(element, "endChars")),
  };
}

// =============================================================================
// Border Parsing
// =============================================================================

/**
 * Parse paragraph border edge.
 */
function parseParagraphBorderEdge(element: XmlElement | undefined): DocxParagraphBorderEdge | undefined {
  if (!element) {return undefined;}

  const val = parseBorderStyle(getAttr(element, "val"));
  if (!val) {return undefined;}

  return {
    val,
    sz: parseEighthPoints(getAttr(element, "sz")),
    space: parseInt32(getAttr(element, "space")),
    color: getAttr(element, "color") ?? undefined,
    themeColor: parseThemeColor(getAttr(element, "themeColor")),
    shadow: parseBoolean(getAttr(element, "shadow")),
    frame: parseBoolean(getAttr(element, "frame")),
  };
}

function parseBorderStyle(value: string | undefined): WordBorderStyle | undefined {
  switch (value) {
    case "nil":
    case "none":
    case "single":
    case "thick":
    case "double":
    case "dotted":
    case "dashed":
    case "dotDash":
    case "dotDotDash":
    case "triple":
    case "thinThickSmallGap":
    case "thickThinSmallGap":
    case "thinThickThinSmallGap":
    case "thinThickMediumGap":
    case "thickThinMediumGap":
    case "thinThickThinMediumGap":
    case "thinThickLargeGap":
    case "thickThinLargeGap":
    case "thinThickThinLargeGap":
    case "wave":
    case "doubleWave":
    case "dashSmallGap":
    case "dashDotStroked":
    case "threeDEmboss":
    case "threeDEngrave":
    case "outset":
    case "inset":
      return value;
    default:
      return undefined;
  }
}

function parseThemeColor(value: string | undefined): DocxThemeColor | undefined {
  switch (value) {
    case "dark1":
    case "light1":
    case "dark2":
    case "light2":
    case "accent1":
    case "accent2":
    case "accent3":
    case "accent4":
    case "accent5":
    case "accent6":
    case "hyperlink":
    case "followedHyperlink":
    case "background1":
    case "background2":
    case "text1":
    case "text2":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse paragraph borders element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.7 (pBdr)
 */
function parseParagraphBorders(element: XmlElement | undefined): DocxParagraphBorders | undefined {
  if (!element) {return undefined;}

  return {
    top: parseParagraphBorderEdge(getChild(element, "top")),
    left: parseParagraphBorderEdge(getChild(element, "left")),
    bottom: parseParagraphBorderEdge(getChild(element, "bottom")),
    right: parseParagraphBorderEdge(getChild(element, "right")),
    between: parseParagraphBorderEdge(getChild(element, "between")),
    bar: parseParagraphBorderEdge(getChild(element, "bar")),
  };
}

// =============================================================================
// Tab Stops Parsing
// =============================================================================

/**
 * Parse tab stop element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.37 (tab)
 */
function parseTabStop(element: XmlElement): DocxTabStop | undefined {
  const val = parseTabAlignment(getAttr(element, "val"));
  const pos = parseTwips(getAttr(element, "pos"));

  if (!val || pos === undefined) {return undefined;}

  return {
    val,
    pos,
    leader: parseTabLeader(getAttr(element, "leader")),
  };
}

function parseTabAlignment(value: string | undefined): TabStopAlignment | undefined {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "decimal":
    case "bar":
    case "clear":
    case "num":
    case "start":
    case "end":
      return value;
    default:
      return undefined;
  }
}

function parseTabLeader(value: string | undefined): TabStopLeader | undefined {
  switch (value) {
    case "none":
    case "dot":
    case "hyphen":
    case "underscore":
    case "heavy":
    case "middleDot":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse tabs element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.38 (tabs)
 */
function parseTabStops(element: XmlElement | undefined): DocxTabStops | undefined {
  if (!element) {return undefined;}

  const tabs: DocxTabStop[] = [];
  for (const child of getChildren(element, "tab")) {
    const tab = parseTabStop(child);
    if (tab) {
      tabs.push(tab);
    }
  }

  if (tabs.length === 0) {return undefined;}

  return { tabs };
}

// =============================================================================
// Numbering Properties Parsing
// =============================================================================

/**
 * Parse numbering properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.19 (numPr)
 */
function parseNumberingProperties(element: XmlElement | undefined): DocxNumberingProperties | undefined {
  if (!element) {return undefined;}

  return {
    numId: parseNumId(getChildVal(element, "numId")),
    ilvl: parseIlvl(getChildVal(element, "ilvl")),
  };
}

// =============================================================================
// Frame Properties Parsing
// =============================================================================

/**
 * Parse frame properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.11 (framePr)
 */
function parseFrameProperties(element: XmlElement | undefined): DocxFrameProperties | undefined {
  if (!element) {return undefined;}

  return {
    w: parseTwips(getAttr(element, "w")),
    h: parseTwips(getAttr(element, "h")),
    hRule: parseHeightRule(getAttr(element, "hRule")),
    hAnchor: parseAnchor(getAttr(element, "hAnchor")),
    vAnchor: parseAnchor(getAttr(element, "vAnchor")),
    x: parseTwips(getAttr(element, "x")),
    xAlign: parseHAlign(getAttr(element, "xAlign")),
    y: parseTwips(getAttr(element, "y")),
    yAlign: parseVAlign(getAttr(element, "yAlign")),
    hSpace: parseTwips(getAttr(element, "hSpace")),
    vSpace: parseTwips(getAttr(element, "vSpace")),
    wrap: parseWrap(getAttr(element, "wrap")),
    dropCap: parseDropCap(getAttr(element, "dropCap")),
    lines: parseInt32(getAttr(element, "lines")),
    anchorLock: parseBoolean(getAttr(element, "anchorLock")),
  };
}

function parseHeightRule(value: string | undefined): "auto" | "atLeast" | "exact" | undefined {
  switch (value) {
    case "auto":
    case "atLeast":
    case "exact":
      return value;
    default:
      return undefined;
  }
}

function parseAnchor(value: string | undefined): "page" | "margin" | "text" | undefined {
  switch (value) {
    case "page":
    case "margin":
    case "text":
      return value;
    default:
      return undefined;
  }
}

function parseHAlign(value: string | undefined): "left" | "center" | "right" | "inside" | "outside" | undefined {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "inside":
    case "outside":
      return value;
    default:
      return undefined;
  }
}

function parseVAlign(value: string | undefined): "top" | "center" | "bottom" | "inside" | "outside" | "inline" | undefined {
  switch (value) {
    case "top":
    case "center":
    case "bottom":
    case "inside":
    case "outside":
    case "inline":
      return value;
    default:
      return undefined;
  }
}

function parseWrap(value: string | undefined): "around" | "auto" | "none" | "notBeside" | "through" | "tight" | undefined {
  switch (value) {
    case "around":
    case "auto":
    case "none":
    case "notBeside":
    case "through":
    case "tight":
      return value;
    default:
      return undefined;
  }
}

function parseDropCap(value: string | undefined): "none" | "drop" | "margin" | undefined {
  switch (value) {
    case "none":
    case "drop":
    case "margin":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Paragraph Alignment Parsing
// =============================================================================

function parseParagraphAlignment(value: string | undefined): ParagraphAlignment | undefined {
  switch (value) {
    case "left":
    case "center":
    case "right":
    case "both":
    case "justify":
    case "distribute":
    case "start":
    case "end":
    case "numTab":
    case "highKashida":
    case "mediumKashida":
    case "lowKashida":
    case "thaiDistribute":
      return value;
    default:
      return undefined;
  }
}

function parseTextDirection(value: string | undefined): "lrTb" | "tbRl" | "btLr" | "lrTbV" | "tbRlV" | "tbLrV" | undefined {
  switch (value) {
    case "lrTb":
    case "tbRl":
    case "btLr":
    case "lrTbV":
    case "tbRlV":
    case "tbLrV":
      return value;
    default:
      return undefined;
  }
}

function parseTextAlignment(value: string | undefined): "auto" | "baseline" | "bottom" | "center" | "top" | undefined {
  switch (value) {
    case "auto":
    case "baseline":
    case "bottom":
    case "center":
    case "top":
      return value;
    default:
      return undefined;
  }
}

function parseOutlineLevel(value: string | undefined): DocxOutlineLevel | undefined {
  const num = parseInt32(value);
  if (num === undefined || num < 0 || num > 9) {return undefined;}
  return num as DocxOutlineLevel;
}

// =============================================================================
// Paragraph Properties Parsing
// =============================================================================

/**
 * Parse paragraph properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.26 (pPr)
 */
export function parseParagraphProperties(
  element: XmlElement | undefined,
  context?: DocxParseContext,
): DocxParagraphProperties | undefined {
  if (!element) {return undefined;}

  return {
    // Style reference
    pStyle: parseStyleId(getChildVal(element, "pStyle")),

    // Alignment
    jc: parseParagraphAlignment(getChildVal(element, "jc")),
    textDirection: parseTextDirection(getChildVal(element, "textDirection")),

    // Spacing and indentation
    spacing: parseSpacing(getChild(element, "spacing")),
    ind: parseIndent(getChild(element, "ind")),

    // Borders and shading
    pBdr: parseParagraphBorders(getChild(element, "pBdr")),
    shd: parseShading(getChild(element, "shd")),

    // Tab stops
    tabs: parseTabStops(getChild(element, "tabs")),

    // Numbering
    numPr: parseNumberingProperties(getChild(element, "numPr")),

    // Page/column break control
    keepNext: parseToggleChild(element, "keepNext"),
    keepLines: parseToggleChild(element, "keepLines"),
    pageBreakBefore: parseToggleChild(element, "pageBreakBefore"),
    widowControl: parseToggleChild(element, "widowControl"),
    suppressLineNumbers: parseToggleChild(element, "suppressLineNumbers"),
    suppressAutoHyphens: parseToggleChild(element, "suppressAutoHyphens"),

    // Frame properties
    framePr: parseFrameProperties(getChild(element, "framePr")),

    // Outline level
    outlineLvl: parseOutlineLevel(getChildVal(element, "outlineLvl")),

    // East Asian text handling
    kinsoku: parseToggleChild(element, "kinsoku"),
    wordWrap: parseToggleChild(element, "wordWrap"),
    overflowPunct: parseToggleChild(element, "overflowPunct"),
    topLinePunct: parseToggleChild(element, "topLinePunct"),
    autoSpaceDE: parseToggleChild(element, "autoSpaceDE"),
    autoSpaceDN: parseToggleChild(element, "autoSpaceDN"),

    // Bidirectional
    bidi: parseToggleChild(element, "bidi"),

    // Text alignment
    textAlignment: parseTextAlignment(getChildVal(element, "textAlignment")),

    // Contextual spacing
    contextualSpacing: parseToggleChild(element, "contextualSpacing"),

    // Mirror indents
    mirrorIndents: parseToggleChild(element, "mirrorIndents"),

    // Default run properties
    rPr: parseRunProperties(getChild(element, "rPr"), context),

    // Section properties (for last paragraph in section)
    sectPr: parseSectionProperties(getChild(element, "sectPr")),
  };
}

// =============================================================================
// Paragraph Content Parsing
// =============================================================================

/**
 * Parse hyperlink element.
 *
 * @see ECMA-376 Part 1, Section 17.16.22 (hyperlink)
 */
function parseHyperlink(element: XmlElement, context?: DocxParseContext): DocxHyperlink {
  const content = [];
  for (const child of getChildren(element, "r")) {
    content.push(parseRun(child, context));
  }

  return {
    type: "hyperlink",
    rId: parseRelId(getAttr(element, "r:id")),
    anchor: getAttr(element, "anchor") ?? undefined,
    tooltip: getAttr(element, "tooltip") ?? undefined,
    tgtFrame: getAttr(element, "tgtFrame") ?? undefined,
    history: parseBoolean(getAttr(element, "history")),
    content,
  };
}

/**
 * Parse bookmark start element.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.2 (bookmarkStart)
 */
function parseBookmarkStart(element: XmlElement): DocxBookmarkStart | undefined {
  const id = parseInt32(getAttr(element, "id"));
  const name = getAttr(element, "name");

  if (id === undefined || name === undefined) {return undefined;}

  return {
    type: "bookmarkStart",
    id,
    name,
  };
}

/**
 * Parse bookmark end element.
 *
 * @see ECMA-376 Part 1, Section 17.13.6.1 (bookmarkEnd)
 */
function parseBookmarkEnd(element: XmlElement): DocxBookmarkEnd | undefined {
  const id = parseInt32(getAttr(element, "id"));

  if (id === undefined) {return undefined;}

  return {
    type: "bookmarkEnd",
    id,
  };
}

/**
 * Parse paragraph content element.
 */
function parseParagraphContent(element: XmlElement, context?: DocxParseContext): DocxParagraphContent | undefined {
  const localName = element.name.split(":").pop() ?? element.name;

  switch (localName) {
    case "r":
      return parseRun(element, context);
    case "hyperlink":
      return parseHyperlink(element, context);
    case "bookmarkStart":
      return parseBookmarkStart(element);
    case "bookmarkEnd":
      return parseBookmarkEnd(element);
    default:
      return undefined;
  }
}

// =============================================================================
// Paragraph Parsing
// =============================================================================

/**
 * Parse paragraph element.
 *
 * @see ECMA-376 Part 1, Section 17.3.1.22 (p)
 */
export function parseParagraph(element: XmlElement, context?: DocxParseContext): DocxParagraph {
  const properties = parseParagraphProperties(getChild(element, "pPr"), context);

  const content: DocxParagraphContent[] = [];
  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const parsed = parseParagraphContent(node, context);
    if (parsed) {
      content.push(parsed);
    }
  }

  return {
    type: "paragraph",
    properties,
    content,
  };
}
