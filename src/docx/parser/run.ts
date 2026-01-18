/**
 * @file DOCX Run Parser
 *
 * Parses run elements and run properties from WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 17.3.2 (Run Properties)
 * @see ECMA-376 Part 1, Section 17.3.3 (Run Content)
 */

import { getAttr, getChild, getTextContent, isXmlElement, type XmlElement } from "../../xml";
import type {
  DocxRunProperties,
  DocxRunFonts,
  DocxThemeFont,
  DocxColor,
  DocxThemeColor,
  DocxShading,
  DocxShadingPattern,
  DocxRunBorder,
  DocxUnderline,
  DocxHighlightColor,
  DocxVerticalAlignRun,
  DocxEastAsianLayout,
  DocxRun,
  DocxRunContent,
  DocxText,
  DocxTab,
  DocxBreak,
  DocxSymbol,
  DocxDrawingContent,
} from "../domain/run";
import { parseDrawing } from "./drawing";
import type { WordBorderStyle } from "../../ooxml/domain/border";
import type { UnderlineStyle, TextEmphasisMark } from "../../ooxml/domain/text";
import {
  parseToggleChild,
  getChildVal,
  getChildIntVal,
  parseHalfPoints,
  parseTwips,
  parseStyleId,
  parseEighthPoints,
  parseInt32,
  parseBoolean,
} from "./primitive";
import type { DocxParseContext } from "./context";

// =============================================================================
// Font Parsing
// =============================================================================

/**
 * Parse run fonts element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.26 (rFonts)
 */
export function parseRunFonts(element: XmlElement | undefined): DocxRunFonts | undefined {
  if (!element) {return undefined;}

  const fonts: DocxRunFonts = {
    ascii: getAttr(element, "ascii") ?? undefined,
    hAnsi: getAttr(element, "hAnsi") ?? undefined,
    eastAsia: getAttr(element, "eastAsia") ?? undefined,
    cs: getAttr(element, "cs") ?? undefined,
    asciiTheme: parseThemeFont(getAttr(element, "asciiTheme")),
    hAnsiTheme: parseThemeFont(getAttr(element, "hAnsiTheme")),
    eastAsiaTheme: parseThemeFont(getAttr(element, "eastAsiaTheme")),
    csTheme: parseThemeFont(getAttr(element, "csTheme")),
  };

  // Return undefined if all properties are undefined
  if (
    fonts.ascii === undefined &&
    fonts.hAnsi === undefined &&
    fonts.eastAsia === undefined &&
    fonts.cs === undefined &&
    fonts.asciiTheme === undefined &&
    fonts.hAnsiTheme === undefined &&
    fonts.eastAsiaTheme === undefined &&
    fonts.csTheme === undefined
  ) {
    return undefined;
  }

  return fonts;
}

function parseThemeFont(value: string | undefined): DocxThemeFont | undefined {
  switch (value) {
    case "majorAscii":
    case "majorHAnsi":
    case "majorEastAsia":
    case "majorBidi":
    case "minorAscii":
    case "minorHAnsi":
    case "minorEastAsia":
    case "minorBidi":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Color Parsing
// =============================================================================

/**
 * Parse color element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.6 (color)
 */
export function parseColor(element: XmlElement | undefined): DocxColor | undefined {
  if (!element) {return undefined;}

  const val = getAttr(element, "val");
  const themeColor = parseThemeColor(getAttr(element, "themeColor"));
  const themeTint = parseInt32(getAttr(element, "themeTint"));
  const themeShade = parseInt32(getAttr(element, "themeShade"));

  if (val === undefined && themeColor === undefined) {
    return undefined;
  }

  return {
    val: val === "auto" ? undefined : val,
    themeColor,
    themeTint,
    themeShade,
  };
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

// =============================================================================
// Shading Parsing
// =============================================================================

/**
 * Parse shading element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.32 (shd)
 */
export function parseShading(element: XmlElement | undefined): DocxShading | undefined {
  if (!element) {return undefined;}

  const val = parseShadingPattern(getAttr(element, "val"));
  const color = getAttr(element, "color") ?? undefined;
  const fill = getAttr(element, "fill") ?? undefined;
  const themeColor = parseThemeColor(getAttr(element, "themeColor"));
  const themeFill = parseThemeColor(getAttr(element, "themeFill"));

  if (val === undefined && color === undefined && fill === undefined) {
    return undefined;
  }

  return { val, color, fill, themeColor, themeFill };
}

function parseShadingPattern(value: string | undefined): DocxShadingPattern | undefined {
  switch (value) {
    case "nil":
    case "clear":
    case "solid":
    case "horzStripe":
    case "vertStripe":
    case "reverseDiagStripe":
    case "diagStripe":
    case "horzCross":
    case "diagCross":
    case "thinHorzStripe":
    case "thinVertStripe":
    case "thinReverseDiagStripe":
    case "thinDiagStripe":
    case "thinHorzCross":
    case "thinDiagCross":
    case "pct5":
    case "pct10":
    case "pct12":
    case "pct15":
    case "pct20":
    case "pct25":
    case "pct30":
    case "pct35":
    case "pct37":
    case "pct40":
    case "pct45":
    case "pct50":
    case "pct55":
    case "pct60":
    case "pct62":
    case "pct65":
    case "pct70":
    case "pct75":
    case "pct80":
    case "pct85":
    case "pct87":
    case "pct90":
    case "pct95":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Border Parsing
// =============================================================================

/**
 * Parse run border element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.4 (bdr)
 */
export function parseRunBorder(element: XmlElement | undefined): DocxRunBorder | undefined {
  if (!element) {return undefined;}

  const val = parseBorderStyle(getAttr(element, "val"));
  if (!val) {return undefined;}

  return {
    val,
    sz: parseEighthPoints(getAttr(element, "sz")),
    space: parseInt32(getAttr(element, "space")),
    color: getAttr(element, "color") ?? undefined,
    themeColor: parseThemeColor(getAttr(element, "themeColor")),
    frame: parseBoolean(getAttr(element, "frame")),
    shadow: parseBoolean(getAttr(element, "shadow")),
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

// =============================================================================
// Underline Parsing
// =============================================================================

/**
 * Parse underline element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.40 (u)
 */
export function parseUnderline(element: XmlElement | undefined): DocxUnderline | undefined {
  if (!element) {return undefined;}

  const val = parseUnderlineStyle(getAttr(element, "val"));
  if (!val) {return undefined;}

  return {
    val,
    color: getAttr(element, "color") ?? undefined,
    themeColor: parseThemeColor(getAttr(element, "themeColor")),
  };
}

function parseUnderlineStyle(value: string | undefined): UnderlineStyle | undefined {
  switch (value) {
    case "none":
    case "single":
    case "words":
    case "double":
    case "thick":
    case "dotted":
    case "dottedHeavy":
    case "dash":
    case "dashedHeavy":
    case "dashLong":
    case "dashLongHeavy":
    case "dotDash":
    case "dashDotHeavy":
    case "dotDotDash":
    case "dashDotDotHeavy":
    case "wave":
    case "wavyHeavy":
    case "wavyDouble":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Other Property Parsing
// =============================================================================

function parseHighlightColor(value: string | undefined): DocxHighlightColor | undefined {
  switch (value) {
    case "black":
    case "blue":
    case "cyan":
    case "green":
    case "magenta":
    case "red":
    case "yellow":
    case "white":
    case "darkBlue":
    case "darkCyan":
    case "darkGreen":
    case "darkMagenta":
    case "darkRed":
    case "darkYellow":
    case "darkGray":
    case "lightGray":
    case "none":
      return value;
    default:
      return undefined;
  }
}

function parseVerticalAlignRun(value: string | undefined): DocxVerticalAlignRun | undefined {
  switch (value) {
    case "baseline":
    case "superscript":
    case "subscript":
      return value;
    default:
      return undefined;
  }
}

function parseEmphasisMark(value: string | undefined): TextEmphasisMark | undefined {
  switch (value) {
    case "none":
    case "dot":
    case "comma":
    case "circle":
    case "underDot":
      return value;
    default:
      return undefined;
  }
}

/**
 * Parse east asian layout element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.9 (eastAsianLayout)
 */
function parseEastAsianLayout(element: XmlElement | undefined): DocxEastAsianLayout | undefined {
  if (!element) {return undefined;}

  return {
    combine: parseBoolean(getAttr(element, "combine")),
    combineBrackets: parseCombineBrackets(getAttr(element, "combineBrackets")),
    vert: parseBoolean(getAttr(element, "vert")),
    vertCompress: parseBoolean(getAttr(element, "vertCompress")),
  };
}

function parseCombineBrackets(value: string | undefined): "none" | "round" | "square" | "angle" | "curly" | undefined {
  switch (value) {
    case "none":
    case "round":
    case "square":
    case "angle":
    case "curly":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Run Properties Parsing
// =============================================================================

/**
 * Parse run properties element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.27 (rPr)
 */
export function parseRunProperties(
  element: XmlElement | undefined,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- context reserved for future style inheritance
  _context?: DocxParseContext,
): DocxRunProperties | undefined {
  if (!element) {return undefined;}

  const props: DocxRunProperties = {
    // Style reference
    rStyle: parseStyleId(getChildVal(element, "rStyle")),

    // Font properties
    rFonts: parseRunFonts(getChild(element, "rFonts")),
    sz: parseHalfPoints(getChildVal(element, "sz")),
    szCs: parseHalfPoints(getChildVal(element, "szCs")),

    // Basic formatting
    b: parseToggleChild(element, "b"),
    bCs: parseToggleChild(element, "bCs"),
    i: parseToggleChild(element, "i"),
    iCs: parseToggleChild(element, "iCs"),
    caps: parseToggleChild(element, "caps"),
    smallCaps: parseToggleChild(element, "smallCaps"),
    strike: parseToggleChild(element, "strike"),
    dstrike: parseToggleChild(element, "dstrike"),
    outline: parseToggleChild(element, "outline"),
    shadow: parseToggleChild(element, "shadow"),
    emboss: parseToggleChild(element, "emboss"),
    imprint: parseToggleChild(element, "imprint"),
    vanish: parseToggleChild(element, "vanish"),
    webHidden: parseToggleChild(element, "webHidden"),

    // Color and shading
    color: parseColor(getChild(element, "color")),
    highlight: parseHighlightColor(getChildVal(element, "highlight")),
    shd: parseShading(getChild(element, "shd")),

    // Underline
    u: parseUnderline(getChild(element, "u")),

    // Spacing and position
    spacing: parseTwips(getChildVal(element, "spacing")),
    w: getChildIntVal(element, "w"),
    kern: parseHalfPoints(getChildVal(element, "kern")),
    position: parseHalfPoints(getChildVal(element, "position")),

    // Vertical alignment
    vertAlign: parseVerticalAlignRun(getChildVal(element, "vertAlign")),

    // Border
    bdr: parseRunBorder(getChild(element, "bdr")),

    // East Asian
    em: parseEmphasisMark(getChildVal(element, "em")),
    eastAsianLayout: parseEastAsianLayout(getChild(element, "eastAsianLayout")),

    // Complex script
    rtl: parseToggleChild(element, "rtl"),
    cs: parseToggleChild(element, "cs"),
  };

  return props;
}

// =============================================================================
// Run Content Parsing
// =============================================================================

/**
 * Parse text element.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.31 (t)
 */
function parseText(element: XmlElement): DocxText {
  const space = getAttr(element, "xml:space");
  return {
    type: "text",
    value: getTextContent(element) ?? "",
    space: space === "preserve" ? "preserve" : "default",
  };
}

/**
 * Parse tab element.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.29 (tab)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- element param for API consistency
function parseTab(_element: XmlElement): DocxTab {
  return { type: "tab" };
}

function parseBreakType(value: string | undefined): "page" | "column" | "textWrapping" | undefined {
  if (value === "page" || value === "column" || value === "textWrapping") {return value;}
  return undefined;
}

function parseBreakClear(value: string | undefined): "none" | "left" | "right" | "all" | undefined {
  if (value === "none" || value === "left" || value === "right" || value === "all") {return value;}
  return undefined;
}

/**
 * Parse break element.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.1 (br)
 */
function parseBreak(element: XmlElement): DocxBreak {
  return {
    type: "break",
    breakType: parseBreakType(getAttr(element, "type")),
    clear: parseBreakClear(getAttr(element, "clear")),
  };
}

/**
 * Parse symbol element.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.28 (sym)
 */
function parseSymbol(element: XmlElement): DocxSymbol {
  return {
    type: "symbol",
    font: getAttr(element, "font") ?? "",
    char: getAttr(element, "char") ?? "",
  };
}

/**
 * Parse drawing element.
 *
 * @see ECMA-376 Part 1, Section 17.3.3.9 (drawing)
 */
function parseDrawingContent(element: XmlElement): DocxDrawingContent | undefined {
  const drawing = parseDrawing(element);
  if (drawing === undefined) {
    return undefined;
  }
  return {
    type: "drawing",
    drawing,
  };
}

/**
 * Parse run content elements.
 */
function parseRunContent(element: XmlElement): DocxRunContent | undefined {
  const localName = element.name.split(":").pop() ?? element.name;

  switch (localName) {
    case "t":
      return parseText(element);
    case "tab":
      return parseTab(element);
    case "br":
      return parseBreak(element);
    case "sym":
      return parseSymbol(element);
    case "drawing":
      return parseDrawingContent(element);
    default:
      return undefined;
  }
}

// =============================================================================
// Run Parsing
// =============================================================================

/**
 * Parse run element.
 *
 * @see ECMA-376 Part 1, Section 17.3.2.25 (r)
 */
export function parseRun(element: XmlElement, context?: DocxParseContext): DocxRun {
  const properties = parseRunProperties(getChild(element, "rPr"), context);

  const content: DocxRunContent[] = [];
  for (const node of element.children) {
    if (!isXmlElement(node)) {continue;}
    const parsed = parseRunContent(node);
    if (parsed) {
      content.push(parsed);
    }
  }

  return {
    type: "run",
    properties,
    content,
  };
}
