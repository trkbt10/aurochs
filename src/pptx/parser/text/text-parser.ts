/**
 * @file Text parser
 *
 * Parses DrawingML text elements to TextBody domain objects.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 - Text
 */

import type {
  AutoFit,
  AutoNumberBullet,
  BlipBullet,
  BodyProperties,
  Bullet,
  BulletStyle,
  CharBullet,
  FieldRun,
  Hyperlink,
  HyperlinkMouseOver,
  LineBreakRun,
  LineSpacing,
  NoBullet,
  Paragraph,
  ParagraphProperties,
  RegularRun,
  RunProperties,
  StrikeStyle,
  TabStop,
  TextBody,
  TextRun,
  TextVerticalOverflow,
  TextWarp,
  TextWarpAdjustValue,
  UnderlineStyle,
} from "../../domain/index";
import { px, pt } from "../../domain/types";
import {
  getAttr,
  getChild,
  getChildren,
  getTextContent,
  isXmlElement,
  type XmlElement,
} from "../../../xml/index";
import { parseColorFromParent } from "../graphics/color-parser";
import { parseEffects } from "../graphics/effects-parser";
import { parseFillFromParent } from "../graphics/fill-parser";
import { parseLine } from "../graphics/line-parser";
import type { TextStyleContext } from "../context";
import {
  resolveFontSize,
  resolveAlignment,
  resolveTextColor,
  resolveBulletStyle,
  resolveSpaceBefore,
  resolveSpaceAfter,
  resolveLineSpacing,
  resolveMarginLeft,
  resolveMarginRight,
  resolveIndent,
} from "./text-style-resolver";
import {
  getAngleAttr,
  getCharacterSpacingAttr,
  getEmuAttr,
  getEmuAttrOr,
  getBoolAttr,
  getBoolAttrOr,
  getFontSizeAttr,
  getIntAttr,
  getPercentAttr,
  parseTextBulletSize,
  parseTextBulletStartAt,
  parseTextColumnCount,
  parseTextFontScalePercent,
  parseTextIndent,
  parseTextIndentLevel,
  parseTextMargin,
  parseTextNonNegativePoint,
  parseTextShapeType,
  parseTextSpacingPoint,
} from "../primitive";

// =============================================================================
// Body Properties Parsing
// =============================================================================

/**
 * Parse auto-fit settings
 * @see ECMA-376 Part 1, Section 21.1.2.1.1-3
 */
function parseAutoFit(bodyPr: XmlElement): AutoFit {
  // Check for shape auto-fit
  if (getChild(bodyPr, "a:spAutoFit")) {
    return { type: "shape" };
  }

  // Check for normal auto-fit
  const normAutofit = getChild(bodyPr, "a:normAutofit");
  if (normAutofit) {
    return {
      type: "normal",
      fontScale: parseTextFontScalePercent(getAttr(normAutofit, "fontScale")),
      lineSpaceReduction: getPercentAttr(normAutofit, "lnSpcReduction"),
    };
  }

  // No auto-fit
  return { type: "none" };
}

/**
 * Parse preset text warp (a:prstTxWarp)
 * @see ECMA-376 Part 1, Section 21.1.2.1.28
 */
function parseTextWarp(bodyPr: XmlElement): TextWarp | undefined {
  const prstTxWarp = getChild(bodyPr, "a:prstTxWarp");
  if (!prstTxWarp) {return undefined;}

  const preset = parseTextShapeType(getAttr(prstTxWarp, "prst"));
  if (!preset) {return undefined;}

  // Parse adjust values
  const adjustValues: TextWarpAdjustValue[] = [];
  const avLst = getChild(prstTxWarp, "a:avLst");
  if (avLst) {
    for (const gd of getChildren(avLst, "a:gd")) {
      const name = getAttr(gd, "name");
      const fmla = getAttr(gd, "fmla");
      if (name && fmla) {
        // Formula is typically "val X" where X is the value
        const match = fmla.match(/^val\s+(\d+)$/);
        if (match) {
          adjustValues.push({
            name,
            value: parseInt(match[1], 10),
          });
        }
      }
    }
  }

  return {
    preset,
    adjustValues,
  };
}

/**
 * Map OOXML vertical overflow type to domain type
 * @see ECMA-376 Part 1, Section 21.1.2.1.42 (ST_TextVertOverflowType)
 */
function mapVerticalOverflow(overflow: string | undefined): TextVerticalOverflow | undefined {
  switch (overflow) {
    case "overflow": return "overflow";
    case "ellipsis": return "ellipsis";
    case "clip": return "clip";
    default: return undefined;
  }
}

/**
 * Parse body properties (a:bodyPr)
 * @see ECMA-376 Part 1, Section 21.1.2.1.1
 */
export function parseBodyProperties(bodyPr: XmlElement | undefined): BodyProperties {
  if (!bodyPr) {
    return {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
    };
  }

  return {
    rotation: getAngleAttr(bodyPr, "rot"),
    verticalType: mapVerticalType(getAttr(bodyPr, "vert")),
    wrapping: mapWrapping(getAttr(bodyPr, "wrap")),
    anchor: mapAnchor(getAttr(bodyPr, "anchor")),
    anchorCenter: getBoolAttrOr(bodyPr, "anchorCtr", false),
    overflow: mapOverflow(getAttr(bodyPr, "horzOverflow")),
    verticalOverflow: mapVerticalOverflow(getAttr(bodyPr, "vertOverflow")),
    autoFit: parseAutoFit(bodyPr),
    insets: {
      left: getEmuAttrOr(bodyPr, "lIns", px(91440 * 96 / 914400)), // ~0.1 inch default
      top: getEmuAttrOr(bodyPr, "tIns", px(45720 * 96 / 914400)), // ~0.05 inch default
      right: getEmuAttrOr(bodyPr, "rIns", px(91440 * 96 / 914400)),
      bottom: getEmuAttrOr(bodyPr, "bIns", px(45720 * 96 / 914400)),
    },
    columns: parseTextColumnCount(getAttr(bodyPr, "numCol")),
    columnSpacing: getEmuAttr(bodyPr, "spcCol"),
    upright: getBoolAttr(bodyPr, "upright"),
    compatibleLineSpacing: getBoolAttr(bodyPr, "compatLnSpc"),
    rtlColumns: getBoolAttr(bodyPr, "rtlCol"),
    spaceFirstLastPara: getBoolAttr(bodyPr, "spcFirstLastPara"),
    forceAntiAlias: getBoolAttr(bodyPr, "forceAA"),
    fromWordArt: getBoolAttr(bodyPr, "fromWordArt"),
    textWarp: parseTextWarp(bodyPr),
  };
}

// =============================================================================
// Line Spacing Parsing
// =============================================================================

/**
 * Parse line spacing element
 * @see ECMA-376 Part 1, Section 21.1.2.2.10
 */
function parseLineSpacing(element: XmlElement | undefined): LineSpacing | undefined {
  if (!element) {return undefined;}

  // Check for percentage-based spacing
  const spcPct = getChild(element, "a:spcPct");
  if (spcPct) {
    const val = getPercentAttr(spcPct, "val");
    if (val !== undefined) {
      return { type: "percent", value: val };
    }
  }

  // Check for point-based spacing
  const spcPts = getChild(element, "a:spcPts");
  if (spcPts) {
    const val = parseTextSpacingPoint(getAttr(spcPts, "val"));
    if (val !== undefined) {
      return { type: "points", value: val };
    }
  }

  return undefined;
}

// =============================================================================
// Bullet Parsing
// =============================================================================

/**
 * Parse bullet properties from paragraph properties
 */
function parseBullet(pPr: XmlElement): Bullet {
  // No bullet
  if (getChild(pPr, "a:buNone")) {
    return { type: "none" } as NoBullet;
  }

  // Auto-numbered bullet
  const buAutoNum = getChild(pPr, "a:buAutoNum");
  if (buAutoNum) {
    return {
      type: "auto",
      scheme: getAttr(buAutoNum, "type") ?? "arabicPeriod",
      startAt: parseTextBulletStartAt(getAttr(buAutoNum, "startAt")),
    } as AutoNumberBullet;
  }

  // Character bullet
  const buChar = getChild(pPr, "a:buChar");
  if (buChar) {
    return {
      type: "char",
      char: getAttr(buChar, "char") ?? "•",
    } as CharBullet;
  }

  // Picture bullet
  const buBlip = getChild(pPr, "a:buBlip");
  if (buBlip) {
    const blip = getChild(buBlip, "a:blip");
    const resourceId = blip ? getAttr(blip, "r:embed") ?? getAttr(blip, "r:link") : undefined;
    if (resourceId) {
      return { type: "blip", resourceId } as BlipBullet;
    }
  }

  return { type: "none" } as NoBullet;
}

/**
 * Parse bullet style from paragraph properties
 */
function parseBulletStyle(pPr: XmlElement): BulletStyle | undefined {
  const bullet = parseBullet(pPr);

  // If no bullet, don't create style
  if (bullet.type === "none" && !getChild(pPr, "a:buNone")) {
    return undefined;
  }

  // Bullet color
  const buClr = getChild(pPr, "a:buClr");
  const color = buClr ? parseColorFromParent(buClr) : undefined;
  const colorFollowText = getChild(pPr, "a:buClrTx") !== undefined;

  // Bullet size
  const buSzPct = getChild(pPr, "a:buSzPct");
  const buSzPts = getChild(pPr, "a:buSzPts");
  const sizePercent = buSzPct ? parseTextBulletSize(getAttr(buSzPct, "val")) : undefined;
  const sizePoints = buSzPts ? pt((getIntAttr(buSzPts, "val") ?? 0) / 100) : undefined;
  const sizeFollowText = getChild(pPr, "a:buSzTx") !== undefined;

  // Bullet font
  const buFont = getChild(pPr, "a:buFont");
  const font = buFont ? getAttr(buFont, "typeface") : undefined;
  const fontFollowText = getChild(pPr, "a:buFontTx") !== undefined;

  return {
    bullet,
    color,
    colorFollowText,
    sizePercent,
    sizePoints,
    sizeFollowText,
    font,
    fontFollowText,
  };
}

// =============================================================================
// OOXML to Domain Mapping Functions
// =============================================================================

/**
 * Map OOXML text vertical type to domain vertical type
 * @see ECMA-376 Part 1, Section 21.1.2.1.39 (ST_TextVerticalType)
 */
function mapVerticalType(vert: string | undefined): BodyProperties["verticalType"] {
  switch (vert) {
    case "horz": return "horz";
    case "vert": return "vert";
    case "vert270": return "vert270";
    case "wordArtVert": return "wordArtVert";
    case "eaVert": return "eaVert";
    case "mongolianVert": return "mongolianVert";
    case "wordArtVertRtl": return "wordArtVertRtl";
    default: return "horz";
  }
}

/**
 * Map OOXML text anchor type to domain anchor type
 * @see ECMA-376 Part 1, Section 21.1.2.1.3 (ST_TextAnchoringType)
 */
function mapAnchor(anchor: string | undefined): BodyProperties["anchor"] {
  switch (anchor) {
    case "t": return "top";
    case "ctr": return "center";
    case "b": return "bottom";
    default: return "top";
  }
}

/**
 * Map OOXML text wrapping type to domain wrapping type
 * @see ECMA-376 Part 1, Section 21.1.2.1.40 (ST_TextWrappingType)
 */
function mapWrapping(wrap: string | undefined): BodyProperties["wrapping"] {
  switch (wrap) {
    case "none": return "none";
    case "square": return "square";
    default: return "square";
  }
}

/**
 * Map OOXML text overflow type to domain overflow type
 * @see ECMA-376 Part 1, Section 21.1.2.1.16 (ST_TextHorzOverflowType)
 */
function mapOverflow(overflow: string | undefined): BodyProperties["overflow"] {
  switch (overflow) {
    case "overflow": return "overflow";
    case "ellipsis": return "ellipsis";
    case "clip": return "clip";
    default: return "overflow";
  }
}

/**
 * Map OOXML text caps type to domain caps type
 * @see ECMA-376 Part 1, Section 21.1.2.1.6 (ST_TextCapsType)
 */
function mapCaps(cap: string | undefined): RunProperties["caps"] {
  switch (cap) {
    case "none": return "none";
    case "small": return "small";
    case "all": return "all";
    default: return undefined;
  }
}

/**
 * Map OOXML text strike type to domain strike type
 * @see ECMA-376 Part 1, Section 21.1.2.3.26 (ST_TextStrikeType)
 */
function mapStrike(strike: string | undefined): StrikeStyle | undefined {
  switch (strike) {
    case "noStrike": return "noStrike";
    case "sngStrike": return "sngStrike";
    case "dblStrike": return "dblStrike";
    default: return undefined;
  }
}

/**
 * Map OOXML text underline type to domain underline type
 * @see ECMA-376 Part 1, Section 21.1.2.3.32 (ST_TextUnderlineType)
 */
function mapUnderline(u: string | undefined): UnderlineStyle | undefined {
  switch (u) {
    case "none": return "none";
    case "words": return "words";
    case "sng": return "sng";
    case "dbl": return "dbl";
    case "heavy": return "heavy";
    case "dotted": return "dotted";
    case "dottedHeavy": return "dottedHeavy";
    case "dash": return "dash";
    case "dashHeavy": return "dashHeavy";
    case "dashLong": return "dashLong";
    case "dashLongHeavy": return "dashLongHeavy";
    case "dotDash": return "dotDash";
    case "dotDashHeavy": return "dotDashHeavy";
    case "dotDotDash": return "dotDotDash";
    case "dotDotDashHeavy": return "dotDotDashHeavy";
    case "wavy": return "wavy";
    case "wavyHeavy": return "wavyHeavy";
    case "wavyDbl": return "wavyDbl";
    default: return undefined;
  }
}

/**
 * Map OOXML paragraph alignment to domain alignment
 * @see ECMA-376 Part 1, Section 21.1.2.1.25 (ST_TextAlignType)
 */
function mapParagraphAlignment(algn: string | undefined): ParagraphProperties["alignment"] {
  switch (algn) {
    case "l": return "left";
    case "ctr": return "center";
    case "r": return "right";
    case "just": return "justify";
    case "justLow": return "justifyLow";
    case "dist": return "distributed";
    case "thaiDist": return "thaiDistributed";
    default: return "left";
  }
}

/**
 * Map OOXML tab stop alignment to domain alignment
 * @see ECMA-376 Part 1, Section 21.1.2.1.37 (ST_TextTabAlignType)
 */
function mapTabStopAlignment(algn: string | undefined): TabStop["alignment"] {
  switch (algn) {
    case "l": return "left";
    case "ctr": return "center";
    case "r": return "right";
    case "dec": return "decimal";
    default: return "left";
  }
}

/**
 * Map OOXML font alignment to domain alignment
 * @see ECMA-376 Part 1, Section 21.1.2.1.12 (ST_TextFontAlignType)
 */
function mapFontAlignment(fontAlgn: string | undefined): ParagraphProperties["fontAlignment"] {
  switch (fontAlgn) {
    case "auto": return "auto";
    case "base": return "base";
    case "t": return "top";
    case "ctr": return "center";
    case "b": return "bottom";
    default: return undefined;
  }
}

// =============================================================================
// Tab Stop Parsing
// =============================================================================

/**
 * Parse tab stops
 */
function parseTabStops(pPr: XmlElement): readonly TabStop[] | undefined {
  const tabLst = getChild(pPr, "a:tabLst");
  if (!tabLst) {return undefined;}

  const tabs: TabStop[] = [];
  for (const tab of getChildren(tabLst, "a:tab")) {
    const pos = getEmuAttr(tab, "pos");
    if (pos !== undefined) {
      tabs.push({
        position: pos,
        alignment: mapTabStopAlignment(getAttr(tab, "algn")),
      });
    }
  }

  return tabs.length > 0 ? tabs : undefined;
}

// =============================================================================
// Paragraph Properties Parsing
// =============================================================================

/**
 * Parse paragraph properties (a:pPr)
 *
 * Includes parsing of a:defRPr (default run properties) for chart text styling.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr)
 * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:defRPr)
 */
export function parseParagraphProperties(pPr: XmlElement | undefined): ParagraphProperties {
  if (!pPr) {
    return {
      level: 0,
      alignment: "left",
    };
  }

  // Parse default run properties (a:defRPr)
  // This is used in charts (c:txPr) to define default text styling
  const defRPr = getChild(pPr, "a:defRPr");

  return {
    level: parseTextIndentLevel(getAttr(pPr, "lvl")) ?? 0,
    alignment: mapParagraphAlignment(getAttr(pPr, "algn")),
    defaultTabSize: getEmuAttr(pPr, "defTabSz"),
    marginLeft: parseTextMargin(getAttr(pPr, "marL")),
    marginRight: parseTextMargin(getAttr(pPr, "marR")),
    indent: parseTextIndent(getAttr(pPr, "indent")),
    lineSpacing: parseLineSpacing(getChild(pPr, "a:lnSpc")),
    spaceBefore: parseLineSpacing(getChild(pPr, "a:spcBef")),
    spaceAfter: parseLineSpacing(getChild(pPr, "a:spcAft")),
    bulletStyle: parseBulletStyle(pPr),
    tabStops: parseTabStops(pPr),
    rtl: getBoolAttr(pPr, "rtl"),
    fontAlignment: mapFontAlignment(getAttr(pPr, "fontAlgn")),
    eaLineBreak: getBoolAttr(pPr, "eaLnBrk"),
    latinLineBreak: getBoolAttr(pPr, "latinLnBrk"),
    hangingPunctuation: getBoolAttr(pPr, "hangingPunct"),
    defaultRunProperties: parseRunProperties(defRPr),
  };
}

// =============================================================================
// Run Properties Parsing
// =============================================================================

/**
 * Parse hyperlink
 * @see ECMA-376 Part 1, Section 21.1.2.3.5 (a:hlinkClick)
 */
function parseHyperlinkSound(hlink: XmlElement): Hyperlink["sound"] {
  const snd = getChild(hlink, "a:snd");
  if (!snd) {return undefined;}
  const embed = getAttr(snd, "r:embed");
  if (!embed) {return undefined;}
  return {
    embed,
    name: getAttr(snd, "name"),
  };
}

function parseHyperlink(rPr: XmlElement): Hyperlink | undefined {
  const hlinkClick = getChild(rPr, "a:hlinkClick");
  if (!hlinkClick) {return undefined;}

  const id = getAttr(hlinkClick, "r:id");
  if (!id) {return undefined;}

  return {
    id,
    tooltip: getAttr(hlinkClick, "tooltip"),
    action: getAttr(hlinkClick, "action"),
    sound: parseHyperlinkSound(hlinkClick),
  };
}

/**
 * Parse mouse over hyperlink
 * @see ECMA-376 Part 1, Section 21.1.2.3.6 (a:hlinkMouseOver)
 */
function parseHyperlinkMouseOver(rPr: XmlElement): HyperlinkMouseOver | undefined {
  const hlinkMouseOver = getChild(rPr, "a:hlinkMouseOver");
  if (!hlinkMouseOver) {return undefined;}

  return {
    id: getAttr(hlinkMouseOver, "r:id"),
    tooltip: getAttr(hlinkMouseOver, "tooltip"),
    action: getAttr(hlinkMouseOver, "action"),
    highlightClick: getBoolAttr(hlinkMouseOver, "highlightClick"),
    endSound: getBoolAttr(hlinkMouseOver, "endSnd"),
    sound: parseHyperlinkSound(hlinkMouseOver),
  };
}

function resolveUnderlineColor(
  underlineColor: ReturnType<typeof parseColorFromParent> | undefined,
  underlineLineFollowText: boolean,
  underlineFillFollowText: boolean,
  textColor: ReturnType<typeof parseColorFromParent> | undefined,
  underlineFillFromText: ReturnType<typeof parseFillFromParent> | undefined,
): ReturnType<typeof parseColorFromParent> | undefined {
  if (underlineColor) {return underlineColor;}
  const followText = underlineLineFollowText ? true : underlineFillFollowText;
  if (!followText) {return undefined;}
  if (textColor) {return textColor;}
  if (underlineFillFromText?.type === "solidFill") {return underlineFillFromText.color;}
  return undefined;
}

function resolveRunProperties(
  runProps: RunProperties | undefined,
  fontSize: ReturnType<typeof resolveFontSize>,
  color: ReturnType<typeof resolveTextColor>,
): RunProperties {
  if (runProps !== undefined) {
    return { ...runProps, fontSize, color };
  }
  return { fontSize, color };
}

/**
 * Parse run properties (a:rPr)
 * @see ECMA-376 Part 1, Section 21.1.2.3.18
 */
export function parseRunProperties(rPr: XmlElement | undefined): RunProperties | undefined {
  if (!rPr) {return undefined;}

  // Font families
  const latin = getChild(rPr, "a:latin");
  const ea = getChild(rPr, "a:ea");
  const cs = getChild(rPr, "a:cs");
  const sym = getChild(rPr, "a:sym");

  // Color - solidFill is also parsed as color for backwards compatibility
  const solidFill = getChild(rPr, "a:solidFill");
  const color = parseColorFromParent(solidFill);

  // Text fill (supports all fill types: gradFill, blipFill, pattFill, noFill, grpFill)
  // @see ECMA-376 Part 1, Section 20.1.8
  const fill = parseFillFromParent(rPr);

  // Highlight
  const highlight = getChild(rPr, "a:highlight");
  const highlightColor = highlight ? parseColorFromParent(highlight) : undefined;

  // Underline
  const uLn = getChild(rPr, "a:uLn");
  const uLnTx = getChild(rPr, "a:uLnTx");
  const uFill = getChild(rPr, "a:uFill");
  const uFillTx = getChild(rPr, "a:uFillTx");

  // Text outline (a:ln) - stroke/outline applied to text
  // @see ECMA-376 Part 1, Section 20.1.2.2.24
  const ln = getChild(rPr, "a:ln");
  const textOutline = ln ? parseLine(ln) : undefined;

  // Text effects (effectLst or effectDag)
  // @see ECMA-376 Part 1, Section 20.1.8.25 (effectLst), 20.1.8.24 (effectDag)
  const effects = parseEffects(rPr);

  const underlineLine = uLn ? parseLine(uLn) : uLnTx ? textOutline : undefined;
  const underlineFillFollowText = uFillTx !== undefined;
  const underlineLineFollowText = uLnTx !== undefined;
  const underlineFillFromText = fill ?? (color ? { type: "solidFill", color } : undefined);
  const underlineFill = uFill ? parseFillFromParent(uFill) : underlineFillFollowText ? underlineFillFromText : undefined;
  const underlineColor = resolveUnderlineColor(
    uLn ? parseColorFromParent(uLn) : undefined,
    underlineLineFollowText,
    underlineFillFollowText,
    color,
    underlineFillFromText,
  );

  return {
    fontSize: getFontSizeAttr(rPr, "sz"),
    fontFamily: latin ? getAttr(latin, "typeface") : undefined,
    fontFamilyPitchFamily: latin ? getIntAttr(latin, "pitchFamily") : undefined,
    fontFamilyEastAsian: ea ? getAttr(ea, "typeface") : undefined,
    fontFamilyEastAsianPitchFamily: ea ? getIntAttr(ea, "pitchFamily") : undefined,
    fontFamilyComplexScript: cs ? getAttr(cs, "typeface") : undefined,
    fontFamilyComplexScriptPitchFamily: cs ? getIntAttr(cs, "pitchFamily") : undefined,
    fontFamilySymbol: sym ? getAttr(sym, "typeface") : undefined,
    fontFamilySymbolPitchFamily: sym ? getIntAttr(sym, "pitchFamily") : undefined,
    bold: getBoolAttr(rPr, "b"),
    italic: getBoolAttr(rPr, "i"),
    underline: mapUnderline(getAttr(rPr, "u")),
    underlineColor,
    underlineFill,
    underlineLine,
    underlineLineFollowText,
    underlineFillFollowText,
    strike: mapStrike(getAttr(rPr, "strike")),
    caps: mapCaps(getAttr(rPr, "cap")),
    baseline: getIntAttr(rPr, "baseline"),
    spacing: getCharacterSpacingAttr(rPr, "spc"),
    kerning: parseTextNonNegativePoint(getAttr(rPr, "kern")),
    color: color,
    fill: fill,
    highlightColor: highlightColor,
    textOutline: textOutline,
    effects: effects,
    outline: getBoolAttr(rPr, "outline"),
    shadow: getBoolAttr(rPr, "shadow"),
    emboss: getBoolAttr(rPr, "emboss"),
    hyperlink: parseHyperlink(rPr),
    hyperlinkMouseOver: parseHyperlinkMouseOver(rPr),
    language: getAttr(rPr, "lang"),
    altLanguage: getAttr(rPr, "altLang"),
    noProof: getBoolAttr(rPr, "noProof"),
    dirty: getBoolAttr(rPr, "dirty"),
    smartTagClean: getBoolAttr(rPr, "smtClean"),
    bookmark: getAttr(rPr, "bmk"),
    error: getBoolAttr(rPr, "err"),
    kumimoji: getBoolAttr(rPr, "kumimoji"),
    normalizeHeights: getBoolAttr(rPr, "normalizeH"),
    smartTagId: getIntAttr(rPr, "smtId"),
    rtl: getChild(rPr, "a:rtl") !== undefined,
  };
}

// =============================================================================
// Text Run Parsing
// =============================================================================

/**
 * Parse regular text run (a:r)
 * @see ECMA-376 Part 1, Section 21.1.2.3.13
 */
function parseRegularRun(element: XmlElement): RegularRun {
  const t = getChild(element, "a:t");
  const text = t ? getTextContent(t) : "";
  const rPr = getChild(element, "a:rPr");

  return {
    type: "text",
    text,
    properties: parseRunProperties(rPr),
  };
}

/**
 * Parse line break (a:br)
 * @see ECMA-376 Part 1, Section 21.1.2.2.1
 */
function parseLineBreak(element: XmlElement): LineBreakRun {
  const rPr = getChild(element, "a:rPr");

  return {
    type: "break",
    properties: parseRunProperties(rPr),
  };
}

/**
 * Parse field (a:fld)
 * @see ECMA-376 Part 1, Section 21.1.2.2.4
 */
function parseField(element: XmlElement): FieldRun {
  const t = getChild(element, "a:t");
  const text = t ? getTextContent(t) : "";
  const rPr = getChild(element, "a:rPr");

  return {
    type: "field",
    fieldType: getAttr(element, "type") ?? "",
    id: getAttr(element, "id") ?? "",
    text,
    properties: parseRunProperties(rPr),
  };
}

/**
 * Parse text runs from paragraph
 */
function parseTextRuns(paragraph: XmlElement): readonly TextRun[] {
  const runs: TextRun[] = [];

  for (const child of paragraph.children) {
    if (!isXmlElement(child)) {continue;}

    switch (child.name) {
      case "a:r":
        runs.push(parseRegularRun(child));
        break;
      case "a:br":
        runs.push(parseLineBreak(child));
        break;
      case "a:fld":
        runs.push(parseField(child));
        break;
    }
  }

  return runs;
}

// =============================================================================
// Paragraph Parsing
// =============================================================================

/**
 * Parse paragraph (a:p)
 * @see ECMA-376 Part 1, Section 21.1.2.2.6
 */
export function parseParagraph(element: XmlElement): Paragraph {
  const pPr = getChild(element, "a:pPr");
  const endParaRPr = getChild(element, "a:endParaRPr");

  return {
    properties: parseParagraphProperties(pPr),
    runs: parseTextRuns(element),
    endProperties: parseRunProperties(endParaRPr),
  };
}

// =============================================================================
// Text Body Parsing
// =============================================================================

/**
 * Parse text body (p:txBody or a:txBody)
 *
 * When ctx is provided, resolves text styles using ECMA-376 inheritance chain:
 * Direct → Local lstStyle → Layout placeholder → Master placeholder → Master text styles → Default
 *
 * @param txBody - Text body element
 * @param ctx - Text style context for inheritance resolution (optional)
 * @see ECMA-376 Part 1, Section 21.1.2.1.40
 */
export function parseTextBody(
  txBody: XmlElement | undefined,
  ctx?: TextStyleContext,
): TextBody | undefined {
  if (!txBody) {return undefined;}

  const bodyPr = getChild(txBody, "a:bodyPr");
  const lstStyle = getChild(txBody, "a:lstStyle");
  const paragraphs: Paragraph[] = [];

  for (const p of getChildren(txBody, "a:p")) {
    paragraphs.push(parseTextParagraph(p, lstStyle, ctx));
  }

  // Empty text body (no paragraphs) is valid
  if (paragraphs.length === 0) {
    paragraphs.push({
      properties: { level: 0, alignment: "left" },
      runs: [],
    });
  }

  return {
    bodyProperties: parseBodyProperties(bodyPr),
    paragraphs,
  };
}

// =============================================================================
// Internal: Text Run Parsing with Style Resolution
// =============================================================================

/**
 * Parse a text run, resolving styles from inheritance chain when context provided.
 */
function parseTextRun(
  runElement: XmlElement,
  rPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): TextRun {
  const runProps = parseRunProperties(rPr);

  // Resolve font size with inheritance if not directly specified
  const resolvedFontSize = runProps?.fontSize ?? resolveFontSize(rPr, localLstStyle, lvl, ctx);

  // Resolve color with inheritance if not directly specified
  const resolvedColor = runProps?.color ?? resolveTextColor(rPr, localLstStyle, lvl, ctx);

  // Build resolved properties
  const resolvedProps = resolveRunProperties(runProps, resolvedFontSize, resolvedColor);

  // Create run with resolved properties
  if (runElement.name === "a:br") {
    return {
      type: "break",
      properties: resolvedProps,
    } satisfies LineBreakRun;
  }

  if (runElement.name === "a:fld") {
    const t = getChild(runElement, "a:t");
    return {
      type: "field",
      fieldType: getAttr(runElement, "type") ?? "",
      id: getAttr(runElement, "id") ?? "",
      text: t ? getTextContent(t) ?? "" : "",
      properties: resolvedProps,
    } satisfies FieldRun;
  }

  // Regular run (a:r)
  const t = getChild(runElement, "a:t");
  return {
    type: "text",
    text: t ? getTextContent(t) ?? "" : "",
    properties: resolvedProps,
  } satisfies RegularRun;
}

/**
 * Parse text runs from a paragraph with style resolution.
 */
function parseTextRunsFromParagraph(
  paragraph: XmlElement,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): TextRun[] {
  const runs: TextRun[] = [];

  for (const child of paragraph.children) {
    if (!isXmlElement(child)) {continue;}

    if (child.name === "a:r" || child.name === "a:br" || child.name === "a:fld") {
      const rPr = getChild(child, "a:rPr");
      runs.push(parseTextRun(child, rPr, localLstStyle, lvl, ctx));
    }
  }

  return runs;
}

/**
 * Parse paragraph with style resolution.
 * @param element - Paragraph element (a:p)
 * @param localLstStyle - Local list style from txBody
 * @param ctx - Text inheritance context (optional)
 * @returns Paragraph with resolved styles
 */
function parseTextParagraph(
  element: XmlElement,
  localLstStyle: XmlElement | undefined,
  ctx: TextStyleContext | undefined,
): Paragraph {
  const pPr = getChild(element, "a:pPr");
  const endParaRPr = getChild(element, "a:endParaRPr");
  const props = parseParagraphProperties(pPr);
  const lvl = props.level;

  // Resolve alignment with inheritance chain
  const directAlgn = pPr ? getAttr(pPr, "algn") : undefined;
  const resolvedAlignment = resolveAlignment(directAlgn, localLstStyle, lvl, ctx);

  // Resolve bullet style with inheritance chain
  // @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet properties)
  // If no direct bullet is specified, inherit from lstStyle/layout/master/txStyles
  const resolvedBulletStyle = resolveBulletStyle(pPr, localLstStyle, lvl, ctx);

  // Resolve paragraph spacing with inheritance chain
  // @see ECMA-376 Part 1, Section 21.1.2.2.18-19 (a:spcBef, a:spcAft)
  const resolvedSpaceBefore = props.spaceBefore ?? resolveSpaceBefore(pPr, localLstStyle, lvl, ctx);
  const resolvedSpaceAfter = props.spaceAfter ?? resolveSpaceAfter(pPr, localLstStyle, lvl, ctx);
  const resolvedLineSpacing = props.lineSpacing ?? resolveLineSpacing(pPr, localLstStyle, lvl, ctx);

  // Resolve margins with inheritance chain
  // @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr marL, marR, indent)
  const resolvedMarginLeft = props.marginLeft ?? resolveMarginLeft(pPr, localLstStyle, lvl, ctx);
  const resolvedMarginRight = props.marginRight ?? resolveMarginRight(pPr, localLstStyle, lvl, ctx);
  const resolvedIndent = props.indent ?? resolveIndent(pPr, localLstStyle, lvl, ctx);

  return {
    properties: {
      ...props,
      alignment: resolvedAlignment,
      bulletStyle: resolvedBulletStyle,
      spaceBefore: resolvedSpaceBefore,
      spaceAfter: resolvedSpaceAfter,
      lineSpacing: resolvedLineSpacing,
      marginLeft: resolvedMarginLeft,
      marginRight: resolvedMarginRight,
      indent: resolvedIndent,
    },
    runs: parseTextRunsFromParagraph(element, localLstStyle, lvl, ctx),
    endProperties: parseRunProperties(endParaRPr),
  };
}
