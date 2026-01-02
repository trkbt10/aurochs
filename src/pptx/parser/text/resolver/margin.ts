/**
 * @file Paragraph margin/indent resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr marL, marR, indent)
 */

import type { XmlElement } from "../../../../xml/index";
import { getChild } from "../../../../xml/index";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import type { Pixels } from "../../../domain/types";
import { parseTextIndent, parseTextMargin } from "../../primitive";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Get margin/indent from paragraph properties (a:pPr).
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr marL, indent attributes)
 */
function getMarginFromPPr(
  pPr: XmlElement | undefined,
  attrName: "marL" | "marR" | "indent",
): Pixels | undefined {
  if (pPr === undefined) {return undefined;}
  if (attrName === "indent") {
    return parseTextIndent(pPr.attrs?.indent);
  }
  return parseTextMargin(pPr.attrs?.[attrName]);
}

/**
 * Get margin/indent from list style at a specific level.
 */
function getMarginFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
  attrName: "marL" | "marR" | "indent",
): Pixels | undefined {
  if (lstStyle === undefined) {return undefined;}
  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(lstStyle, lvlpPr);
  return getMarginFromPPr(pPr, attrName);
}

/**
 * Get margin/indent from placeholder's txBody lstStyle.
 */
function getMarginFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
  attrName: "marL" | "marR" | "indent",
): Pixels | undefined {
  if (placeholder === undefined) {return undefined;}
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getMarginFromLstStyle(lstStyle, lvl, attrName);
}

/**
 * Get margin/indent from master text styles.
 */
function getMarginFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
  attrName: "marL" | "marR" | "indent",
): Pixels | undefined {
  if (masterTextStyles === undefined || placeholderType === undefined) {
    return undefined;
  }

  const styleKey = TYPE_TO_MASTER_STYLE[placeholderType];
  if (styleKey === undefined) {return undefined;}

  const style = masterTextStyles[styleKey];
  if (style === undefined) {return undefined;}

  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(style, lvlpPr);
  return getMarginFromPPr(pPr, attrName);
}

/**
 * Resolve margin/indent with full inheritance chain.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.7, the inheritance chain is:
 * 1. Direct paragraph properties (a:pPr)
 * 2. Local list style (a:lstStyle in txBody)
 * 3. Layout placeholder style
 * 4. Master placeholder style
 * 5. Master text styles (p:txStyles)
 * 6. Default text style
 *
 * @param directPPr - Direct paragraph properties
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @param attrName - Which margin to resolve
 * @returns Resolved margin in pixels, or undefined if not found in chain
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr)
 */
function resolveMargin(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
  attrName: "marL" | "marR" | "indent",
): Pixels | undefined {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // 1. Direct paragraph properties
  const directMargin = getMarginFromPPr(directPPr, attrName);
  if (directMargin !== undefined) {
    return directMargin;
  }

  // 2. Local list style
  const localMargin = getMarginFromLstStyle(localLstStyle, lvlKey, attrName);
  if (localMargin !== undefined) {
    return localMargin;
  }

  // Without context, return undefined (no inheritance)
  if (ctx === undefined) {
    return undefined;
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutMargin = getMarginFromPlaceholder(layoutPh, lvlKey, attrName);
  if (layoutMargin !== undefined) {
    return layoutMargin;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhMargin = getMarginFromPlaceholder(masterPh, lvlKey, attrName);
  if (masterPhMargin !== undefined) {
    return masterPhMargin;
  }

  // 5. Master text styles
  const masterStyleMargin = getMarginFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
    attrName,
  );
  if (masterStyleMargin !== undefined) {
    return masterStyleMargin;
  }

  // 6. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const pPr = getChild(ctx.defaultTextStyle, lvlpPr);
    const defaultMargin = getMarginFromPPr(pPr, attrName);
    if (defaultMargin !== undefined) {
      return defaultMargin;
    }
  }

  return undefined;
}

/**
 * Resolve left margin (marL) with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr marL attribute)
 */
export function resolveMarginLeft(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): Pixels | undefined {
  return resolveMargin(directPPr, localLstStyle, lvl, ctx, "marL");
}

/**
 * Resolve right margin (marR) with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr marR attribute)
 */
export function resolveMarginRight(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): Pixels | undefined {
  return resolveMargin(directPPr, localLstStyle, lvl, ctx, "marR");
}

/**
 * Resolve indent with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr indent attribute)
 */
export function resolveIndent(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): Pixels | undefined {
  return resolveMargin(directPPr, localLstStyle, lvl, ctx, "indent");
}
