/**
 * @file Font family resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 * @see ECMA-376 Part 1, Section 21.1.2.3.10 (a:latin, a:ea, a:cs, a:sym)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild, getByPath } from "@oxen/xml";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Font family resolution result
 */
export type FontFamilyResult = {
  /** Latin font (a:latin) */
  readonly latin?: string;
  /** East Asian font (a:ea) */
  readonly eastAsian?: string;
  /** Complex Script font (a:cs) */
  readonly complexScript?: string;
  /** Symbol font (a:sym) */
  readonly symbol?: string;
};

/**
 * Get font families from run properties element (a:rPr or a:defRPr)
 */
function getFontFamilyFromRPr(rPr: XmlElement | undefined): FontFamilyResult | undefined {
  if (rPr === undefined) {
    return undefined;
  }

  const latin = getChild(rPr, "a:latin");
  const ea = getChild(rPr, "a:ea");
  const cs = getChild(rPr, "a:cs");
  const sym = getChild(rPr, "a:sym");

  // Return undefined if no font is specified
  if (!latin && !ea && !cs && !sym) {
    return undefined;
  }

  return {
    latin: latin?.attrs?.typeface,
    eastAsian: ea?.attrs?.typeface,
    complexScript: cs?.attrs?.typeface,
    symbol: sym?.attrs?.typeface,
  };
}

/**
 * Get font family from list style at a specific level
 */
function getFontFamilyFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
): FontFamilyResult | undefined {
  if (lstStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvl}pPr`;
  const defRPr = getByPath(lstStyle, [lvlpPr, "a:defRPr"]);
  return getFontFamilyFromRPr(defRPr);
}

/**
 * Get font family from placeholder's txBody lstStyle
 */
function getFontFamilyFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
): FontFamilyResult | undefined {
  if (placeholder === undefined) {
    return undefined;
  }
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getFontFamilyFromLstStyle(lstStyle, lvl);
}

/**
 * Get font family from master text styles
 */
function getFontFamilyFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
): FontFamilyResult | undefined {
  if (masterTextStyles === undefined || placeholderType === undefined) {
    return undefined;
  }

  const styleKey = TYPE_TO_MASTER_STYLE[placeholderType];
  if (styleKey === undefined) {
    return undefined;
  }

  const style = masterTextStyles[styleKey];
  if (style === undefined) {
    return undefined;
  }

  const lvlpPr = `a:lvl${lvl}pPr`;
  const defRPr = getByPath(style, [lvlpPr, "a:defRPr"]);
  return getFontFamilyFromRPr(defRPr);
}

/**
 * Resolve font family with full inheritance chain.
 *
 * @param directRPr - Direct run properties from the text run
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @returns Resolved font family result, or undefined if no font found in chain
 */
export function resolveFontFamily(
  directRPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): FontFamilyResult | undefined {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // 1. Direct run properties
  const directFont = getFontFamilyFromRPr(directRPr);
  if (directFont !== undefined) {
    return directFont;
  }

  // 2. Local list style
  const localFont = getFontFamilyFromLstStyle(localLstStyle, lvlKey);
  if (localFont !== undefined) {
    return localFont;
  }

  // Without context, no inherited font
  if (ctx === undefined) {
    return undefined;
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutFont = getFontFamilyFromPlaceholder(layoutPh, lvlKey);
  if (layoutFont !== undefined) {
    return layoutFont;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhFont = getFontFamilyFromPlaceholder(masterPh, lvlKey);
  if (masterPhFont !== undefined) {
    return masterPhFont;
  }

  // 5. Master text styles
  const masterStyleFont = getFontFamilyFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
  );
  if (masterStyleFont !== undefined) {
    return masterStyleFont;
  }

  // 6. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const defRPr = getByPath(ctx.defaultTextStyle, [lvlpPr, "a:defRPr"]);
    const defaultFont = getFontFamilyFromRPr(defRPr);
    if (defaultFont !== undefined) {
      return defaultFont;
    }
  }

  return undefined;
}
