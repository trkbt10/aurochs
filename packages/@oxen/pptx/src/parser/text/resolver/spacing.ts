/**
 * @file Paragraph spacing resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 * @see ECMA-376 Part 1, Section 21.1.2.2.18 (a:spcBef)
 * @see ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcAft)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild } from "@oxen/xml";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import type { LineSpacing } from "../../../domain/text";
import { parsePercentage100k, parseTextSpacingPoint } from "../../primitive";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Parse line spacing from spacing element (a:spcBef, a:spcAft, a:lnSpc).
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.10 (a:lnSpc)
 * @see ECMA-376 Part 1, Section 21.1.2.2.18 (a:spcBef)
 * @see ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcAft)
 */
function parseSpacingElement(element: XmlElement | undefined): LineSpacing | undefined {
  if (element === undefined) {return undefined;}

  // Check for percentage-based spacing (a:spcPct)
  const spcPct = getChild(element, "a:spcPct");
  if (spcPct !== undefined) {
    const val = parsePercentage100k(spcPct.attrs?.val);
    if (val !== undefined) {
      return { type: "percent", value: val };
    }
  }

  // Check for point-based spacing (a:spcPts)
  const spcPts = getChild(element, "a:spcPts");
  if (spcPts !== undefined) {
    const val = parseTextSpacingPoint(spcPts.attrs?.val);
    if (val !== undefined) {
      return { type: "points", value: val };
    }
  }

  return undefined;
}

/**
 * Get spacing from paragraph properties (a:pPr).
 */
function getSpacingFromPPr(
  pPr: XmlElement | undefined,
  spacingType: "a:spcBef" | "a:spcAft" | "a:lnSpc",
): LineSpacing | undefined {
  if (pPr === undefined) {return undefined;}
  const spacingElement = getChild(pPr, spacingType);
  return parseSpacingElement(spacingElement);
}

/**
 * Get spacing from list style at a specific level.
 */
function getSpacingFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
  spacingType: "a:spcBef" | "a:spcAft" | "a:lnSpc",
): LineSpacing | undefined {
  if (lstStyle === undefined) {return undefined;}
  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(lstStyle, lvlpPr);
  return getSpacingFromPPr(pPr, spacingType);
}

/**
 * Get spacing from placeholder's txBody lstStyle.
 */
function getSpacingFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
  spacingType: "a:spcBef" | "a:spcAft" | "a:lnSpc",
): LineSpacing | undefined {
  if (placeholder === undefined) {return undefined;}
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getSpacingFromLstStyle(lstStyle, lvl, spacingType);
}

/**
 * Get spacing from master text styles.
 */
function getSpacingFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
  spacingType: "a:spcBef" | "a:spcAft" | "a:lnSpc",
): LineSpacing | undefined {
  if (masterTextStyles === undefined || placeholderType === undefined) {
    return undefined;
  }

  const styleKey = TYPE_TO_MASTER_STYLE[placeholderType];
  if (styleKey === undefined) {return undefined;}

  const style = masterTextStyles[styleKey];
  if (style === undefined) {return undefined;}

  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(style, lvlpPr);
  return getSpacingFromPPr(pPr, spacingType);
}

/**
 * Resolve spacing (spcBef, spcAft, lnSpc) with full inheritance chain.
 *
 * Per ECMA-376 Part 1, the inheritance chain is:
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
 * @param spacingType - Which spacing to resolve
 * @returns Resolved spacing, or undefined if not found in chain
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.18 (a:spcBef)
 * @see ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcAft)
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 */
function resolveSpacing(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
  spacingType: "a:spcBef" | "a:spcAft" | "a:lnSpc",
): LineSpacing | undefined {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // 1. Direct paragraph properties
  const directSpacing = getSpacingFromPPr(directPPr, spacingType);
  if (directSpacing !== undefined) {
    return directSpacing;
  }

  // 2. Local list style
  const localSpacing = getSpacingFromLstStyle(localLstStyle, lvlKey, spacingType);
  if (localSpacing !== undefined) {
    return localSpacing;
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
  const layoutSpacing = getSpacingFromPlaceholder(layoutPh, lvlKey, spacingType);
  if (layoutSpacing !== undefined) {
    return layoutSpacing;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhSpacing = getSpacingFromPlaceholder(masterPh, lvlKey, spacingType);
  if (masterPhSpacing !== undefined) {
    return masterPhSpacing;
  }

  // 5. Master text styles
  const masterStyleSpacing = getSpacingFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
    spacingType,
  );
  if (masterStyleSpacing !== undefined) {
    return masterStyleSpacing;
  }

  // 6. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const pPr = getChild(ctx.defaultTextStyle, lvlpPr);
    const defaultSpacing = getSpacingFromPPr(pPr, spacingType);
    if (defaultSpacing !== undefined) {
      return defaultSpacing;
    }
  }

  return undefined;
}

/**
 * Resolve space before (a:spcBef) with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.18 (a:spcBef)
 */
export function resolveSpaceBefore(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): LineSpacing | undefined {
  return resolveSpacing(directPPr, localLstStyle, lvl, ctx, "a:spcBef");
}

/**
 * Resolve space after (a:spcAft) with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.19 (a:spcAft)
 */
export function resolveSpaceAfter(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): LineSpacing | undefined {
  return resolveSpacing(directPPr, localLstStyle, lvl, ctx, "a:spcAft");
}

/**
 * Resolve line spacing (a:lnSpc) with full inheritance chain.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
 */
export function resolveLineSpacing(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): LineSpacing | undefined {
  return resolveSpacing(directPPr, localLstStyle, lvl, ctx, "a:lnSpc");
}
