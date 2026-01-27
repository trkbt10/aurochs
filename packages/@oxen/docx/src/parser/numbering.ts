/**
 * @file DOCX Numbering Parser
 *
 * Parses numbering.xml from WordprocessingML documents.
 *
 * @see ECMA-376 Part 1, Section 17.9 (Numbering)
 */

import { getAttr, getChild, getChildren, type XmlElement } from "@oxen/xml";
import type { NumberFormat, LevelSuffix, MultiLevelType } from "@oxen/ooxml";
import type {
  DocxNumbering,
  DocxAbstractNum,
  DocxNum,
  DocxLevel,
  DocxLevelOverride,
  DocxLevelText,
  DocxLegacy,
  DocxLevelJustification,
} from "../domain/numbering";
import { parseRunProperties } from "./run";
import { parseParagraphProperties } from "./paragraph";
import {
  parseStyleId,
  parseAbstractNumId,
  parseNumId,
  parseIlvl,
  parseTwips,
  parseInt32,
  parseBoolean,
  getChildVal,
} from "./primitive";

// =============================================================================
// Helper Functions
// =============================================================================

function parseLevelPicBulletId(element: XmlElement): { numPicBulletId: number } | undefined {
  const id = parseInt32(getChildVal(element, "lvlPicBulletId"));
  if (id === undefined) {return undefined;}
  return { numPicBulletId: id };
}

// =============================================================================
// Number Format Parsing
// =============================================================================

function parseNumberFormat(value: string | undefined): NumberFormat | undefined {
  switch (value) {
    case "decimal":
    case "upperRoman":
    case "lowerRoman":
    case "upperLetter":
    case "lowerLetter":
    case "ordinal":
    case "cardinalText":
    case "ordinalText":
    case "hex":
    case "chicago":
    case "ideographDigital":
    case "japaneseCounting":
    case "aiueo":
    case "iroha":
    case "decimalFullWidth":
    case "decimalHalfWidth":
    case "japaneseLegal":
    case "japaneseDigitalTenThousand":
    case "decimalEnclosedCircle":
    case "decimalFullWidth2":
    case "aiueoFullWidth":
    case "irohaFullWidth":
    case "decimalZero":
    case "bullet":
    case "ganada":
    case "chosung":
    case "decimalEnclosedFullstop":
    case "decimalEnclosedParen":
    case "decimalEnclosedCircleChinese":
    case "ideographEnclosedCircle":
    case "ideographTraditional":
    case "ideographZodiac":
    case "ideographZodiacTraditional":
    case "taiwaneseCounting":
    case "ideographLegalTraditional":
    case "taiwaneseCountingThousand":
    case "taiwaneseDigital":
    case "chineseCounting":
    case "chineseLegalSimplified":
    case "chineseCountingThousand":
    case "koreanDigital":
    case "koreanCounting":
    case "koreanLegal":
    case "koreanDigital2":
    case "vietnameseCounting":
    case "russianLower":
    case "russianUpper":
    case "none":
    case "numberInDash":
    case "hebrew1":
    case "hebrew2":
    case "arabicAlpha":
    case "arabicAbjad":
    case "hindiVowels":
    case "hindiConsonants":
    case "hindiNumbers":
    case "hindiCounting":
    case "thaiLetters":
    case "thaiNumbers":
    case "thaiCounting":
    case "bahtText":
    case "dollarText":
    case "custom":
      return value;
    default:
      return undefined;
  }
}

function parseLevelSuffix(value: string | undefined): LevelSuffix | undefined {
  switch (value) {
    case "tab":
    case "space":
    case "nothing":
      return value;
    default:
      return undefined;
  }
}

function parseMultiLevelType(value: string | undefined): MultiLevelType | undefined {
  switch (value) {
    case "singleLevel":
    case "multilevel":
    case "hybridMultilevel":
      return value;
    default:
      return undefined;
  }
}

function parseLevelJustification(value: string | undefined): DocxLevelJustification | undefined {
  switch (value) {
    case "left":
    case "center":
    case "right":
      return value;
    default:
      return undefined;
  }
}

// =============================================================================
// Level Text Parsing
// =============================================================================

function parseLevelText(element: XmlElement | undefined): DocxLevelText | undefined {
  if (!element) {return undefined;}

  return {
    val: getAttr(element, "val") ?? "",
    null: parseBoolean(getAttr(element, "null")),
  };
}

// =============================================================================
// Legacy Settings Parsing
// =============================================================================

function parseLegacy(element: XmlElement | undefined): DocxLegacy | undefined {
  if (!element) {return undefined;}

  return {
    legacy: parseBoolean(getAttr(element, "legacy")),
    legacySpace: parseTwips(getAttr(element, "legacySpace")),
    legacyIndent: parseTwips(getAttr(element, "legacyIndent")),
  };
}

// =============================================================================
// Level Parsing
// =============================================================================

/**
 * Parse numbering level element.
 *
 * @see ECMA-376 Part 1, Section 17.9.6 (lvl)
 */
function parseLevel(element: XmlElement): DocxLevel | undefined {
  const ilvl = parseIlvl(getAttr(element, "ilvl"));
  if (ilvl === undefined) {return undefined;}

  return {
    ilvl,
    start: parseInt32(getChildVal(element, "start")),
    numFmt: parseNumberFormat(getChildVal(element, "numFmt")),
    lvlRestart: parseInt32(getChildVal(element, "lvlRestart")),
    pStyle: parseStyleId(getChildVal(element, "pStyle")),
    isLgl: getChild(element, "isLgl") !== undefined,
    suff: parseLevelSuffix(getChildVal(element, "suff")),
    lvlText: parseLevelText(getChild(element, "lvlText")),
    lvlJc: parseLevelJustification(getChildVal(element, "lvlJc")),
    lvlPicBulletId: parseLevelPicBulletId(element),
    legacy: parseLegacy(getChild(element, "legacy")),
    pPr: parseParagraphProperties(getChild(element, "pPr")),
    rPr: parseRunProperties(getChild(element, "rPr")),
  };
}

// =============================================================================
// Abstract Numbering Parsing
// =============================================================================

/**
 * Parse abstract numbering element.
 *
 * @see ECMA-376 Part 1, Section 17.9.1 (abstractNum)
 */
function parseAbstractNum(element: XmlElement): DocxAbstractNum | undefined {
  const abstractNumId = parseAbstractNumId(getAttr(element, "abstractNumId"));
  if (abstractNumId === undefined) {return undefined;}

  const lvl: DocxLevel[] = [];
  for (const level of getChildren(element, "lvl")) {
    const parsed = parseLevel(level);
    if (parsed) {
      lvl.push(parsed);
    }
  }

  return {
    abstractNumId,
    nsid: getChildVal(element, "nsid"),
    multiLevelType: parseMultiLevelType(getChildVal(element, "multiLevelType")),
    tmpl: getChildVal(element, "tmpl"),
    styleLink: parseStyleId(getChildVal(element, "styleLink")),
    numStyleLink: parseStyleId(getChildVal(element, "numStyleLink")),
    lvl,
  };
}

// =============================================================================
// Level Override Parsing
// =============================================================================

/**
 * Parse level override element.
 *
 * @see ECMA-376 Part 1, Section 17.9.8 (lvlOverride)
 */
function parseLevelOverride(element: XmlElement): DocxLevelOverride | undefined {
  const ilvl = parseIlvl(getAttr(element, "ilvl"));
  if (ilvl === undefined) {return undefined;}

  const lvlElement = getChild(element, "lvl");

  return {
    ilvl,
    startOverride: parseInt32(getChildVal(element, "startOverride")),
    lvl: lvlElement ? parseLevel(lvlElement) : undefined,
  };
}

// =============================================================================
// Numbering Instance Parsing
// =============================================================================

/**
 * Parse numbering instance element.
 *
 * @see ECMA-376 Part 1, Section 17.9.15 (num)
 */
function parseNum(element: XmlElement): DocxNum | undefined {
  const numId = parseNumId(getAttr(element, "numId"));
  const abstractNumId = parseAbstractNumId(getChildVal(element, "abstractNumId"));

  if (numId === undefined || abstractNumId === undefined) {return undefined;}

  const lvlOverride: DocxLevelOverride[] = [];
  for (const override of getChildren(element, "lvlOverride")) {
    const parsed = parseLevelOverride(override);
    if (parsed) {
      lvlOverride.push(parsed);
    }
  }

  return {
    numId,
    abstractNumId,
    lvlOverride: lvlOverride.length > 0 ? lvlOverride : undefined,
  };
}

// =============================================================================
// Numbering Part Parsing
// =============================================================================

/**
 * Parse numbering.xml document.
 *
 * @see ECMA-376 Part 1, Section 17.9.17 (numbering)
 */
export function parseNumbering(element: XmlElement): DocxNumbering {
  const abstractNum: DocxAbstractNum[] = [];
  for (const an of getChildren(element, "abstractNum")) {
    const parsed = parseAbstractNum(an);
    if (parsed) {
      abstractNum.push(parsed);
    }
  }

  const num: DocxNum[] = [];
  for (const n of getChildren(element, "num")) {
    const parsed = parseNum(n);
    if (parsed) {
      num.push(parsed);
    }
  }

  return {
    numPicBullet: undefined, // Picture bullets not yet implemented
    abstractNum,
    num,
  };
}
