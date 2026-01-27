/**
 * @file Text alignment resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.2.7 (a:pPr algn attribute)
 */

import type { XmlElement } from "@oxen/xml";
import { getChild } from "@oxen/xml";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Alignment type for paragraphs
 */
export type TextAlignment = "left" | "center" | "right" | "justify" | "justifyLow" | "distributed" | "thaiDistributed";

/**
 * Get alignment from paragraph properties element (a:pPr or a:lvlXpPr)
 */
function getAlignmentFromPPr(pPr: XmlElement | undefined): TextAlignment | undefined {
  if (pPr === undefined) {
    return undefined;
  }
  const algn = pPr.attrs?.algn;
  if (algn === undefined) {
    return undefined;
  }
  // Map OOXML algn values to our alignment type
  switch (algn) {
    case "l": return "left";
    case "ctr": return "center";
    case "r": return "right";
    case "just": return "justify";
    case "justLow": return "justifyLow";
    case "dist": return "distributed";
    case "thaiDist": return "thaiDistributed";
    default: return undefined;
  }
}

/**
 * Get alignment from list style at a specific level
 */
function getAlignmentFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
): TextAlignment | undefined {
  if (lstStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(lstStyle, lvlpPr);
  return getAlignmentFromPPr(pPr);
}

/**
 * Get alignment from placeholder's txBody lstStyle
 */
function getAlignmentFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
): TextAlignment | undefined {
  if (placeholder === undefined) {
    return undefined;
  }
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getAlignmentFromLstStyle(lstStyle, lvl);
}

/**
 * Get alignment from master text styles
 */
function getAlignmentFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
): TextAlignment | undefined {
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
  const pPr = getChild(style, lvlpPr);
  return getAlignmentFromPPr(pPr);
}

/**
 * Resolve alignment with full inheritance chain.
 *
 * @param directAlgn - Direct alignment from paragraph's a:pPr (already parsed as OOXML value like "ctr")
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @returns Resolved alignment
 */
export function resolveAlignment(
  directAlgn: string | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): TextAlignment {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // 1. Direct alignment
  if (directAlgn !== undefined) {
    // Map OOXML value to our type
    switch (directAlgn) {
      case "l": return "left";
      case "ctr": return "center";
      case "r": return "right";
      case "just": return "justify";
      case "justLow": return "justifyLow";
      case "dist": return "distributed";
      case "thaiDist": return "thaiDistributed";
    }
  }

  // 2. Local list style
  const localAlgn = getAlignmentFromLstStyle(localLstStyle, lvlKey);
  if (localAlgn !== undefined) {
    return localAlgn;
  }

  // Without context, fall back to default
  if (ctx === undefined) {
    return "left";
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutAlgn = getAlignmentFromPlaceholder(layoutPh, lvlKey);
  if (layoutAlgn !== undefined) {
    return layoutAlgn;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhAlgn = getAlignmentFromPlaceholder(masterPh, lvlKey);
  if (masterPhAlgn !== undefined) {
    return masterPhAlgn;
  }

  // 5. Master text styles
  const masterStyleAlgn = getAlignmentFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
  );
  if (masterStyleAlgn !== undefined) {
    return masterStyleAlgn;
  }

  // 6. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const pPr = getChild(ctx.defaultTextStyle, lvlpPr);
    const defaultAlgn = getAlignmentFromPPr(pPr);
    if (defaultAlgn !== undefined) {
      return defaultAlgn;
    }
  }

  return "left";
}
