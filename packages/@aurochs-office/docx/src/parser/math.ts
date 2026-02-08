/**
 * @file Office Math (OMML) Parser
 *
 * Parses Office Math Markup Language elements from WordprocessingML.
 *
 * @see ECMA-376 Part 1, Section 22.1 (Office Open XML Math)
 */

import { getAttr, getChild, getChildren, isXmlElement, getTextContent, type XmlElement } from "@aurochs/xml";
import type {
  DocxMathContent,
  DocxMathElement,
  DocxMathRun,
  DocxMathRunProperties,
  DocxMathStyle,
  DocxMathScript,
  DocxMathFraction,
  DocxMathFractionType,
  DocxMathRadical,
  DocxMathNary,
  DocxMathLimitLocation,
  DocxMathSuperscript,
  DocxMathSubscript,
  DocxMathSubSup,
  DocxMathPreSubSup,
  DocxMathDelimiter,
  DocxMathMatrix,
  DocxMathMatrixRow,
  DocxMathLimitLower,
  DocxMathLimitUpper,
  DocxMathAccent,
  DocxMathBar,
  DocxMathBarPosition,
  DocxMathBox,
  DocxMathBorderBox,
  DocxMathFunction,
  DocxMathEquationArray,
  DocxMathGroupChar,
  DocxMathPhantom,
  DocxOfficeMath,
  DocxOfficeMathPara,
  DocxMathJustification,
} from "../domain/math";
import { parseBoolean, parseInt32 } from "./primitive";
import { parseRunProperties } from "./run";
import type { DocxParseContext } from "./context";

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get the local name of an element (without namespace prefix).
 */
function localName(element: XmlElement): string {
  return element.name.split(":").pop() ?? element.name;
}

/**
 * Get attribute value, handling namespaced attributes.
 */
function getValAttr(element: XmlElement | undefined): string | undefined {
  if (!element) {
    return undefined;
  }
  return getAttr(element, "m:val") ?? getAttr(element, "val");
}

// =============================================================================
// Property Parsers
// =============================================================================

function parseMathStyle(value: string | undefined): DocxMathStyle | undefined {
  switch (value) {
    case "p":
    case "b":
    case "i":
    case "bi":
      return value;
    default:
      return undefined;
  }
}

function parseMathScript(value: string | undefined): DocxMathScript | undefined {
  switch (value) {
    case "roman":
    case "script":
    case "fraktur":
    case "double-struck":
    case "sans-serif":
    case "monospace":
      return value;
    default:
      return undefined;
  }
}

function parseMathRunProperties(element: XmlElement | undefined): DocxMathRunProperties | undefined {
  if (!element) {
    return undefined;
  }

  const styEl = getChild(element, "sty");
  const scrEl = getChild(element, "scr");
  const norEl = getChild(element, "nor");
  const brkEl = getChild(element, "brk");
  const alnEl = getChild(element, "aln");
  const litEl = getChild(element, "lit");

  return {
    sty: parseMathStyle(getValAttr(styEl)),
    scr: parseMathScript(getValAttr(scrEl)),
    nor: norEl ? (parseBoolean(getValAttr(norEl)) ?? true) : undefined,
    brk: brkEl ? parseInt32(getAttr(brkEl, "alnAt")) : undefined,
    aln: alnEl ? (parseBoolean(getValAttr(alnEl)) ?? true) : undefined,
    lit: litEl ? (parseBoolean(getValAttr(litEl)) ?? true) : undefined,
  };
}

function parseFractionType(value: string | undefined): DocxMathFractionType | undefined {
  switch (value) {
    case "bar":
    case "skw":
    case "lin":
    case "noBar":
      return value;
    default:
      return undefined;
  }
}

function parseLimitLocation(value: string | undefined): DocxMathLimitLocation | undefined {
  switch (value) {
    case "subSup":
    case "undOvr":
      return value;
    default:
      return undefined;
  }
}

function parseBarPosition(value: string | undefined): DocxMathBarPosition | undefined {
  switch (value) {
    case "top":
    case "bot":
      return value;
    default:
      return undefined;
  }
}

function parseMathJustification(value: string | undefined): DocxMathJustification | undefined {
  switch (value) {
    case "left":
    case "right":
    case "center":
    case "centerGroup":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Content Parsers
// =============================================================================

/**
 * Parse math content from an element's children.
 */
function parseMathContentChildren(element: XmlElement, context?: DocxParseContext): readonly DocxMathContent[] {
  const content: DocxMathContent[] = [];
  for (const child of element.children) {
    if (!isXmlElement(child)) {
      continue;
    }
    const parsed = parseMathElement(child, context);
    if (parsed) {
      content.push(parsed);
    }
  }
  return content;
}

/**
 * Parse an argument element (e, num, den, sup, sub, deg, lim, fName).
 */
function parseArgument(parent: XmlElement, name: string, context?: DocxParseContext): readonly DocxMathContent[] {
  const argEl = getChild(parent, name);
  if (!argEl) {
    return [];
  }
  return parseMathContentChildren(argEl, context);
}

// =============================================================================
// Element Parsers
// =============================================================================

/**
 * Parse math run (m:r).
 */
function parseMathRun(element: XmlElement, context?: DocxParseContext): DocxMathRun {
  const rPrEl = getChild(element, "rPr");
  const tEl = getChild(element, "t");

  return {
    type: "mathRun",
    properties: parseMathRunProperties(rPrEl),
    rPr: parseRunProperties(rPrEl ? getChild(rPrEl, "rPr") : undefined, context),
    text: tEl ? getTextContent(tEl) : "",
  };
}

/**
 * Parse fraction (m:f).
 */
function parseFraction(element: XmlElement, context?: DocxParseContext): DocxMathFraction {
  const fPrEl = getChild(element, "fPr");
  const typeEl = fPrEl ? getChild(fPrEl, "type") : undefined;

  return {
    type: "mathFraction",
    fracType: parseFractionType(getValAttr(typeEl)),
    numerator: parseArgument(element, "num", context),
    denominator: parseArgument(element, "den", context),
  };
}

/**
 * Parse radical (m:rad).
 */
function parseRadical(element: XmlElement, context?: DocxParseContext): DocxMathRadical {
  const radPrEl = getChild(element, "radPr");
  const degHideEl = radPrEl ? getChild(radPrEl, "degHide") : undefined;

  return {
    type: "mathRadical",
    hideDeg: degHideEl ? (parseBoolean(getValAttr(degHideEl)) ?? true) : undefined,
    degree: parseArgument(element, "deg", context),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse n-ary operator (m:nary).
 */
function parseNary(element: XmlElement, context?: DocxParseContext): DocxMathNary {
  const naryPrEl = getChild(element, "naryPr");
  const chrEl = naryPrEl ? getChild(naryPrEl, "chr") : undefined;
  const limLocEl = naryPrEl ? getChild(naryPrEl, "limLoc") : undefined;
  const growEl = naryPrEl ? getChild(naryPrEl, "grow") : undefined;
  const subHideEl = naryPrEl ? getChild(naryPrEl, "subHide") : undefined;
  const supHideEl = naryPrEl ? getChild(naryPrEl, "supHide") : undefined;

  return {
    type: "mathNary",
    char: getValAttr(chrEl),
    limLoc: parseLimitLocation(getValAttr(limLocEl)),
    grow: growEl ? (parseBoolean(getValAttr(growEl)) ?? true) : undefined,
    subHide: subHideEl ? (parseBoolean(getValAttr(subHideEl)) ?? true) : undefined,
    supHide: supHideEl ? (parseBoolean(getValAttr(supHideEl)) ?? true) : undefined,
    subscript: parseArgument(element, "sub", context),
    superscript: parseArgument(element, "sup", context),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse superscript (m:sSup).
 */
function parseSuperscript(element: XmlElement, context?: DocxParseContext): DocxMathSuperscript {
  return {
    type: "mathSuperscript",
    base: parseArgument(element, "e", context),
    superscript: parseArgument(element, "sup", context),
  };
}

/**
 * Parse subscript (m:sSub).
 */
function parseSubscript(element: XmlElement, context?: DocxParseContext): DocxMathSubscript {
  return {
    type: "mathSubscript",
    base: parseArgument(element, "e", context),
    subscript: parseArgument(element, "sub", context),
  };
}

/**
 * Parse subscript-superscript (m:sSubSup).
 */
function parseSubSup(element: XmlElement, context?: DocxParseContext): DocxMathSubSup {
  return {
    type: "mathSubSup",
    base: parseArgument(element, "e", context),
    subscript: parseArgument(element, "sub", context),
    superscript: parseArgument(element, "sup", context),
  };
}

/**
 * Parse pre-sub-superscript (m:sPre).
 */
function parsePreSubSup(element: XmlElement, context?: DocxParseContext): DocxMathPreSubSup {
  return {
    type: "mathPreSubSup",
    subscript: parseArgument(element, "sub", context),
    superscript: parseArgument(element, "sup", context),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse delimiter (m:d).
 */
function parseDelimiter(element: XmlElement, context?: DocxParseContext): DocxMathDelimiter {
  const dPrEl = getChild(element, "dPr");
  const begChrEl = dPrEl ? getChild(dPrEl, "begChr") : undefined;
  const endChrEl = dPrEl ? getChild(dPrEl, "endChr") : undefined;
  const sepChrEl = dPrEl ? getChild(dPrEl, "sepChr") : undefined;
  const growEl = dPrEl ? getChild(dPrEl, "grow") : undefined;
  const shpEl = dPrEl ? getChild(dPrEl, "shp") : undefined;

  // Parse delimiter elements (e)
  const elements: (readonly DocxMathContent[])[] = [];
  for (const eEl of getChildren(element, "e")) {
    elements.push(parseMathContentChildren(eEl, context));
  }

  return {
    type: "mathDelimiter",
    begChr: getValAttr(begChrEl),
    endChr: getValAttr(endChrEl),
    sepChr: getValAttr(sepChrEl),
    grow: growEl ? (parseBoolean(getValAttr(growEl)) ?? true) : undefined,
    shp: shpEl ? (getValAttr(shpEl) as "centered" | "match") : undefined,
    elements,
  };
}

/**
 * Parse matrix (m:m).
 */
function parseMatrix(element: XmlElement, context?: DocxParseContext): DocxMathMatrix {
  const mPrEl = getChild(element, "mPr");
  const baseJcEl = mPrEl ? getChild(mPrEl, "baseJc") : undefined;
  const rSpEl = mPrEl ? getChild(mPrEl, "rSp") : undefined;
  const rSpRuleEl = mPrEl ? getChild(mPrEl, "rSpRule") : undefined;
  const cGpEl = mPrEl ? getChild(mPrEl, "cGp") : undefined;
  const cGpRuleEl = mPrEl ? getChild(mPrEl, "cGpRule") : undefined;

  const rows: DocxMathMatrixRow[] = [];
  for (const mrEl of getChildren(element, "mr")) {
    const cells: (readonly DocxMathContent[])[] = [];
    for (const eEl of getChildren(mrEl, "e")) {
      cells.push(parseMathContentChildren(eEl, context));
    }
    rows.push({ cells });
  }

  return {
    type: "mathMatrix",
    rows,
    baseJc: baseJcEl ? (getValAttr(baseJcEl) as "top" | "center" | "bottom") : undefined,
    rSp: rSpEl ? parseInt32(getValAttr(rSpEl)) : undefined,
    rSpRule: rSpRuleEl ? parseInt32(getValAttr(rSpRuleEl)) : undefined,
    cGp: cGpEl ? parseInt32(getValAttr(cGpEl)) : undefined,
    cGpRule: cGpRuleEl ? parseInt32(getValAttr(cGpRuleEl)) : undefined,
  };
}

/**
 * Parse limit lower (m:limLow).
 */
function parseLimitLower(element: XmlElement, context?: DocxParseContext): DocxMathLimitLower {
  return {
    type: "mathLimitLower",
    base: parseArgument(element, "e", context),
    limit: parseArgument(element, "lim", context),
  };
}

/**
 * Parse limit upper (m:limUpp).
 */
function parseLimitUpper(element: XmlElement, context?: DocxParseContext): DocxMathLimitUpper {
  return {
    type: "mathLimitUpper",
    base: parseArgument(element, "e", context),
    limit: parseArgument(element, "lim", context),
  };
}

/**
 * Parse accent (m:acc).
 */
function parseAccent(element: XmlElement, context?: DocxParseContext): DocxMathAccent {
  const accPrEl = getChild(element, "accPr");
  const chrEl = accPrEl ? getChild(accPrEl, "chr") : undefined;

  return {
    type: "mathAccent",
    char: getValAttr(chrEl),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse bar (m:bar).
 */
function parseBar(element: XmlElement, context?: DocxParseContext): DocxMathBar {
  const barPrEl = getChild(element, "barPr");
  const posEl = barPrEl ? getChild(barPrEl, "pos") : undefined;

  return {
    type: "mathBar",
    pos: parseBarPosition(getValAttr(posEl)),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse box (m:box).
 */
function parseBox(element: XmlElement, context?: DocxParseContext): DocxMathBox {
  const boxPrEl = getChild(element, "boxPr");
  const opEmuEl = boxPrEl ? getChild(boxPrEl, "opEmu") : undefined;
  const noBreakEl = boxPrEl ? getChild(boxPrEl, "noBreak") : undefined;
  const diffEl = boxPrEl ? getChild(boxPrEl, "diff") : undefined;
  const brkEl = boxPrEl ? getChild(boxPrEl, "brk") : undefined;
  const alnEl = boxPrEl ? getChild(boxPrEl, "aln") : undefined;

  return {
    type: "mathBox",
    base: parseArgument(element, "e", context),
    opEmu: opEmuEl ? (parseBoolean(getValAttr(opEmuEl)) ?? true) : undefined,
    noBreak: noBreakEl ? (parseBoolean(getValAttr(noBreakEl)) ?? true) : undefined,
    diff: diffEl ? (parseBoolean(getValAttr(diffEl)) ?? true) : undefined,
    brk: brkEl ? parseInt32(getAttr(brkEl, "alnAt")) : undefined,
    aln: alnEl ? (parseBoolean(getValAttr(alnEl)) ?? true) : undefined,
  };
}

/**
 * Parse border box (m:borderBox).
 */
function parseBorderBox(element: XmlElement, context?: DocxParseContext): DocxMathBorderBox {
  const borderBoxPrEl = getChild(element, "borderBoxPr");
  const hideTopEl = borderBoxPrEl ? getChild(borderBoxPrEl, "hideTop") : undefined;
  const hideBotEl = borderBoxPrEl ? getChild(borderBoxPrEl, "hideBot") : undefined;
  const hideLeftEl = borderBoxPrEl ? getChild(borderBoxPrEl, "hideLeft") : undefined;
  const hideRightEl = borderBoxPrEl ? getChild(borderBoxPrEl, "hideRight") : undefined;
  const strikeHEl = borderBoxPrEl ? getChild(borderBoxPrEl, "strikeH") : undefined;
  const strikeVEl = borderBoxPrEl ? getChild(borderBoxPrEl, "strikeV") : undefined;
  const strikeBLTREl = borderBoxPrEl ? getChild(borderBoxPrEl, "strikeBLTR") : undefined;
  const strikeTLBREl = borderBoxPrEl ? getChild(borderBoxPrEl, "strikeTLBR") : undefined;

  return {
    type: "mathBorderBox",
    hideTop: hideTopEl ? (parseBoolean(getValAttr(hideTopEl)) ?? true) : undefined,
    hideBot: hideBotEl ? (parseBoolean(getValAttr(hideBotEl)) ?? true) : undefined,
    hideLeft: hideLeftEl ? (parseBoolean(getValAttr(hideLeftEl)) ?? true) : undefined,
    hideRight: hideRightEl ? (parseBoolean(getValAttr(hideRightEl)) ?? true) : undefined,
    strikeH: strikeHEl ? (parseBoolean(getValAttr(strikeHEl)) ?? true) : undefined,
    strikeV: strikeVEl ? (parseBoolean(getValAttr(strikeVEl)) ?? true) : undefined,
    strikeBLTR: strikeBLTREl ? (parseBoolean(getValAttr(strikeBLTREl)) ?? true) : undefined,
    strikeTLBR: strikeTLBREl ? (parseBoolean(getValAttr(strikeTLBREl)) ?? true) : undefined,
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse function (m:func).
 */
function parseFunction(element: XmlElement, context?: DocxParseContext): DocxMathFunction {
  return {
    type: "mathFunction",
    functionName: parseArgument(element, "fName", context),
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse equation array (m:eqArr).
 */
function parseEquationArray(element: XmlElement, context?: DocxParseContext): DocxMathEquationArray {
  const eqArrPrEl = getChild(element, "eqArrPr");
  const baseJcEl = eqArrPrEl ? getChild(eqArrPrEl, "baseJc") : undefined;
  const maxDistEl = eqArrPrEl ? getChild(eqArrPrEl, "maxDist") : undefined;
  const objDistEl = eqArrPrEl ? getChild(eqArrPrEl, "objDist") : undefined;
  const rSpEl = eqArrPrEl ? getChild(eqArrPrEl, "rSp") : undefined;
  const rSpRuleEl = eqArrPrEl ? getChild(eqArrPrEl, "rSpRule") : undefined;

  const equations: (readonly DocxMathContent[])[] = [];
  for (const eEl of getChildren(element, "e")) {
    equations.push(parseMathContentChildren(eEl, context));
  }

  return {
    type: "mathEquationArray",
    baseJc: baseJcEl ? (getValAttr(baseJcEl) as "top" | "center" | "bottom") : undefined,
    maxDist: maxDistEl ? (parseBoolean(getValAttr(maxDistEl)) ?? true) : undefined,
    objDist: objDistEl ? (parseBoolean(getValAttr(objDistEl)) ?? true) : undefined,
    rSp: rSpEl ? parseInt32(getValAttr(rSpEl)) : undefined,
    rSpRule: rSpRuleEl ? parseInt32(getValAttr(rSpRuleEl)) : undefined,
    equations,
  };
}

/**
 * Parse grouping character (m:groupChr).
 */
function parseGroupChar(element: XmlElement, context?: DocxParseContext): DocxMathGroupChar {
  const groupChrPrEl = getChild(element, "groupChrPr");
  const chrEl = groupChrPrEl ? getChild(groupChrPrEl, "chr") : undefined;
  const posEl = groupChrPrEl ? getChild(groupChrPrEl, "pos") : undefined;
  const vertJcEl = groupChrPrEl ? getChild(groupChrPrEl, "vertJc") : undefined;

  return {
    type: "mathGroupChar",
    char: getValAttr(chrEl),
    pos: parseBarPosition(getValAttr(posEl)),
    vertJc: vertJcEl ? (getValAttr(vertJcEl) as "top" | "bot") : undefined,
    base: parseArgument(element, "e", context),
  };
}

/**
 * Parse phantom (m:phant).
 */
function parsePhantom(element: XmlElement, context?: DocxParseContext): DocxMathPhantom {
  const phantPrEl = getChild(element, "phantPr");
  const showEl = phantPrEl ? getChild(phantPrEl, "show") : undefined;
  const zeroWidEl = phantPrEl ? getChild(phantPrEl, "zeroWid") : undefined;
  const zeroAscEl = phantPrEl ? getChild(phantPrEl, "zeroAsc") : undefined;
  const zeroDescEl = phantPrEl ? getChild(phantPrEl, "zeroDesc") : undefined;
  const transpEl = phantPrEl ? getChild(phantPrEl, "transp") : undefined;

  return {
    type: "mathPhantom",
    show: showEl ? (parseBoolean(getValAttr(showEl)) ?? true) : undefined,
    zeroWid: zeroWidEl ? (parseBoolean(getValAttr(zeroWidEl)) ?? true) : undefined,
    zeroAsc: zeroAscEl ? (parseBoolean(getValAttr(zeroAscEl)) ?? true) : undefined,
    zeroDesc: zeroDescEl ? (parseBoolean(getValAttr(zeroDescEl)) ?? true) : undefined,
    transp: transpEl ? (parseBoolean(getValAttr(transpEl)) ?? true) : undefined,
    base: parseArgument(element, "e", context),
  };
}

// =============================================================================
// Main Parsers
// =============================================================================

/**
 * Parse a math element.
 */
export function parseMathElement(element: XmlElement, context?: DocxParseContext): DocxMathElement | undefined {
  const name = localName(element);

  switch (name) {
    case "r":
      return parseMathRun(element, context);
    case "f":
      return parseFraction(element, context);
    case "rad":
      return parseRadical(element, context);
    case "nary":
      return parseNary(element, context);
    case "sSup":
      return parseSuperscript(element, context);
    case "sSub":
      return parseSubscript(element, context);
    case "sSubSup":
      return parseSubSup(element, context);
    case "sPre":
      return parsePreSubSup(element, context);
    case "d":
      return parseDelimiter(element, context);
    case "m":
      return parseMatrix(element, context);
    case "limLow":
      return parseLimitLower(element, context);
    case "limUpp":
      return parseLimitUpper(element, context);
    case "acc":
      return parseAccent(element, context);
    case "bar":
      return parseBar(element, context);
    case "box":
      return parseBox(element, context);
    case "borderBox":
      return parseBorderBox(element, context);
    case "func":
      return parseFunction(element, context);
    case "eqArr":
      return parseEquationArray(element, context);
    case "groupChr":
      return parseGroupChar(element, context);
    case "phant":
      return parsePhantom(element, context);
    default:
      return undefined;
  }
}

/**
 * Parse Office Math element (m:oMath).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.77 (oMath)
 */
export function parseOfficeMath(element: XmlElement, context?: DocxParseContext): DocxOfficeMath {
  return {
    type: "oMath",
    content: parseMathContentChildren(element, context),
  };
}

/**
 * Parse Office Math Paragraph element (m:oMathPara).
 *
 * @see ECMA-376 Part 1, Section 22.1.2.78 (oMathPara)
 */
export function parseOfficeMathPara(element: XmlElement, context?: DocxParseContext): DocxOfficeMathPara {
  const oMathParaPrEl = getChild(element, "oMathParaPr");
  const jcEl = oMathParaPrEl ? getChild(oMathParaPrEl, "jc") : undefined;

  const content: DocxOfficeMath[] = [];
  for (const oMathEl of getChildren(element, "oMath")) {
    content.push(parseOfficeMath(oMathEl, context));
  }

  return {
    type: "oMathPara",
    justification: parseMathJustification(getValAttr(jcEl)),
    content,
  };
}
