/**
 * @file Font size resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.9 (a:rPr)
 * @see ECMA-376 Part 1, Section 20.1.10.72 (ST_TextFontSize)
 */

import type { XmlElement } from "../../../../xml/index";
import { getChild, getByPath } from "../../../../xml/index";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import type { Points } from "../../../domain/types";
import { pt } from "../../../domain/types";
import { DEFAULT_FONT_SIZE_PT, FONT_SIZE_CENTIPOINTS_TO_PT } from "../../../core/ecma376/defaults";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Parse font size from sz attribute value.
 * OOXML stores font size in hundredths of a point (centipoints).
 *
 * @see ECMA-376-1:2016, Section 20.1.10.72 (ST_TextFontSize)
 */
function parseFontSize(sz: string | undefined): Points | undefined {
  if (sz === undefined) {
    return undefined;
  }
  const parsed = parseInt(sz, 10) / FONT_SIZE_CENTIPOINTS_TO_PT;
  return isNaN(parsed) ? undefined : pt(parsed);
}

/**
 * Get font size from run properties element (a:rPr or a:defRPr)
 */
export function getFontSizeFromRPr(rPr: XmlElement | undefined): Points | undefined {
  if (rPr === undefined) {
    return undefined;
  }
  return parseFontSize(rPr.attrs?.sz);
}

/**
 * Get font size from list style at a specific level
 */
export function getFontSizeFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
): Points | undefined {
  if (lstStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvl}pPr`;
  const defRPr = getByPath(lstStyle, [lvlpPr, "a:defRPr"]);
  return getFontSizeFromRPr(defRPr);
}

/**
 * Get font size from placeholder's txBody lstStyle
 */
function getFontSizeFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
): Points | undefined {
  if (placeholder === undefined) {
    return undefined;
  }
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getFontSizeFromLstStyle(lstStyle, lvl);
}

/**
 * Get font size from master text styles
 */
function getFontSizeFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
): Points | undefined {
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
  return getFontSizeFromRPr(defRPr);
}

/**
 * Resolve font size with full inheritance chain.
 *
 * @param directRPr - Direct run properties from the text run
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (1-based for lookup, typically 0-8)
 * @param ctx - Text inheritance context
 * @returns Resolved font size in points
 */
export function resolveFontSize(
  directRPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): Points {
  // Use 1-based level for lstStyle lookup (a:lvl1pPr, a:lvl2pPr, etc.)
  const lvlKey = lvl + 1;

  // 1. Direct run properties
  const directSz = getFontSizeFromRPr(directRPr);
  if (directSz !== undefined) {
    return directSz;
  }

  // 2. Local list style
  const localSz = getFontSizeFromLstStyle(localLstStyle, lvlKey);
  if (localSz !== undefined) {
    return localSz;
  }

  // Without context, fall back to default
  if (ctx === undefined) {
    return pt(DEFAULT_FONT_SIZE_PT);
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutSz = getFontSizeFromPlaceholder(layoutPh, lvlKey);
  if (layoutSz !== undefined) {
    return layoutSz;
  }

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhSz = getFontSizeFromPlaceholder(masterPh, lvlKey);
  if (masterPhSz !== undefined) {
    return masterPhSz;
  }

  // 5. Master text styles
  const masterStyleSz = getFontSizeFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
  );
  if (masterStyleSz !== undefined) {
    return masterStyleSz;
  }

  // 6. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    const lvlpPr = `a:lvl${lvlKey}pPr`;
    const defRPr = getByPath(ctx.defaultTextStyle, [lvlpPr, "a:defRPr"]);
    const defaultSz = getFontSizeFromRPr(defRPr);
    if (defaultSz !== undefined) {
      return defaultSz;
    }
  }

  return pt(DEFAULT_FONT_SIZE_PT);
}

/**
 * Get default run properties (defRPr) with inheritance chain.
 * Used for resolving other text properties like font family, color, etc.
 *
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @returns First defRPr found in inheritance chain, or undefined
 */
export function resolveDefRPr(
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): XmlElement | undefined {
  const lvlKey = lvl + 1;
  const lvlpPr = `a:lvl${lvlKey}pPr`;

  // 1. Local list style
  if (localLstStyle !== undefined) {
    const defRPr = getByPath(localLstStyle, [lvlpPr, "a:defRPr"]);
    if (defRPr !== undefined) {
      return defRPr;
    }
  }

  if (ctx === undefined) {
    return undefined;
  }

  // 2. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  if (layoutPh !== undefined) {
    const defRPr = getByPath(layoutPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
    if (defRPr !== undefined) {
      return defRPr;
    }
  }

  // 3. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  if (masterPh !== undefined) {
    const defRPr = getByPath(masterPh, ["p:txBody", "a:lstStyle", lvlpPr, "a:defRPr"]);
    if (defRPr !== undefined) {
      return defRPr;
    }
  }

  // 4. Master text styles
  if (ctx.masterTextStyles !== undefined && ctx.placeholderType !== undefined) {
    const styleKey = TYPE_TO_MASTER_STYLE[ctx.placeholderType];
    if (styleKey !== undefined) {
      const style = ctx.masterTextStyles[styleKey];
      if (style !== undefined) {
        const defRPr = getByPath(style, [lvlpPr, "a:defRPr"]);
        if (defRPr !== undefined) {
          return defRPr;
        }
      }
    }
  }

  // 5. Default text style
  if (ctx.defaultTextStyle !== undefined) {
    return getByPath(ctx.defaultTextStyle, [lvlpPr, "a:defRPr"]);
  }

  return undefined;
}
