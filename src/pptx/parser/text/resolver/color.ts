/**
 * @file Text color resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 * @see ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef)
 */

import type { XmlElement } from "../../../../xml/index";
import { getChild, getByPath } from "../../../../xml/index";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import type { Color } from "../../../domain/color";
import { parseColorFromParent } from "../../graphics/color-parser";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Get color from run properties element
 */
function getColorFromRPr(rPr: XmlElement | undefined): Color | undefined {
  if (rPr === undefined) {
    return undefined;
  }
  const solidFill = getChild(rPr, "a:solidFill");
  if (solidFill === undefined) {
    return undefined;
  }
  return parseColorFromParent(solidFill);
}

/**
 * Get color from list style at a specific level
 */
function getColorFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
): Color | undefined {
  if (lstStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvl}pPr`;
  const defRPr = getByPath(lstStyle, [lvlpPr, "a:defRPr"]);
  return getColorFromRPr(defRPr);
}

/**
 * Get color from placeholder's txBody lstStyle
 */
function getColorFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
): Color | undefined {
  if (placeholder === undefined) {
    return undefined;
  }
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getColorFromLstStyle(lstStyle, lvl);
}

/**
 * Get color from master text styles
 */
function getColorFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
): Color | undefined {
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
  return getColorFromRPr(defRPr);
}

/**
 * Resolve text color with full inheritance chain.
 *
 * Inheritance chain per ECMA-376:
 * 1. Direct run properties (a:rPr)
 * 2. Local list style (a:lstStyle in shape's txBody)
 * 3. Layout placeholder style
 * 4. Master placeholder style
 * 5. Master text styles (p:txStyles)
 * 6. Default text style
 * 7. Shape style font reference color (p:style/a:fontRef)
 *
 * @param directRPr - Direct run properties from the text run
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @returns Resolved color, or undefined if no color found in chain
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 * @see ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef)
 */
export function resolveTextColor(
  directRPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): Color | undefined {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // 1. Direct run properties
  const directColor = getColorFromRPr(directRPr);
  if (directColor !== undefined) {
    return directColor;
  }

  // 2. Local list style
  const localColor = getColorFromLstStyle(localLstStyle, lvlKey);
  if (localColor !== undefined) {
    return localColor;
  }

  // Without context, no inherited color
  if (ctx === undefined) {
    return undefined;
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutColor = getColorFromPlaceholder(layoutPh, lvlKey);
  if (layoutColor !== undefined) {
    return layoutColor;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhColor = getColorFromPlaceholder(masterPh, lvlKey);
  if (masterPhColor !== undefined) {
    return masterPhColor;
  }

  // 5. Shape style font reference color (p:style/a:fontRef)
  if (ctx.shapeFontReferenceColor !== undefined) {
    return ctx.shapeFontReferenceColor;
  }

  // 6. Master text styles
  const masterStyleColor = getColorFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
  );
  if (masterStyleColor !== undefined) {
    return masterStyleColor;
  }

  // 7. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const defRPr = getByPath(ctx.defaultTextStyle, [lvlpPr, "a:defRPr"]);
    const defaultColor = getColorFromRPr(defRPr);
    if (defaultColor !== undefined) {
      return defaultColor;
    }
  }

  return undefined;
}
