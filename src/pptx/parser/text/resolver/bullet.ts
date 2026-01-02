/**
 * @file Bullet style resolution with inheritance
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering)
 */

import type { XmlElement } from "../../../../xml/index";
import { getChild } from "../../../../xml/index";
import type { TextStyleContext, MasterTextStyles } from "../../context";
import type { Points, Percent } from "../../../domain/types";
import { pt } from "../../../domain/types";
import type { Bullet, BulletStyle } from "../../../domain/text";
import type { Color } from "../../../domain/color";
import { parseColorFromParent } from "../../graphics/color-parser";
import { parseTextBulletSize, parseTextBulletStartAt } from "../../primitive";
import { TYPE_TO_MASTER_STYLE } from "./constants";
import { lookupPlaceholder } from "./placeholder";

/**
 * Bullet style properties as parsed from OOXML.
 * Contains all bullet-related properties for a paragraph level.
 */
export type BulletProperties = {
  /** Bullet character (a:buChar char attribute) */
  readonly char?: string;
  /** Auto-number type (a:buAutoNum type attribute) */
  readonly autoNumType?: string;
  /** Auto-number start value (a:buAutoNum startAt attribute) */
  readonly autoNumStartAt?: number;
  /** Picture bullet resource ID (a:buBlip r:embed) */
  readonly blipResourceId?: string;
  /** No bullet flag (a:buNone present) */
  readonly none?: boolean;
  /** Bullet font (a:buFont typeface attribute) */
  readonly font?: string;
  /** Bullet font follow text flag (a:buFontTx present) */
  readonly fontFollowText?: boolean;
  /** Bullet color */
  readonly color?: Color;
  /** Bullet color follow text flag (a:buClrTx present) */
  readonly colorFollowText?: boolean;
  /** Bullet size as percent (a:buSzPct val) */
  readonly sizePercent?: Percent;
  /** Bullet size as points (a:buSzPts val) */
  readonly sizePoints?: Points;
  /** Bullet size follow text flag (a:buSzTx present) */
  readonly sizeFollowText?: boolean;
};

/**
 * Get bullet properties from paragraph properties element (a:pPr or a:lvlXpPr)
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering)
 */
function getBulletPropertiesFromPPr(pPr: XmlElement | undefined): BulletProperties | undefined {
  if (pPr === undefined) {
    return undefined;
  }

  const result: Partial<BulletProperties> = {};
  const propertyState = { hasProperty: false };

  // Bullet type
  const buNone = getChild(pPr, "a:buNone");
  if (buNone !== undefined) {
    (result as { none?: boolean }).none = true;
    propertyState.hasProperty = true;
  }

  const buChar = getChild(pPr, "a:buChar");
  if (buChar !== undefined) {
    (result as { char?: string }).char = buChar.attrs?.char;
    propertyState.hasProperty = true;
  }

  const buAutoNum = getChild(pPr, "a:buAutoNum");
  if (buAutoNum !== undefined) {
    (result as { autoNumType?: string }).autoNumType = buAutoNum.attrs?.type;
    const startAt = buAutoNum.attrs?.startAt;
    if (startAt !== undefined) {
      (result as { autoNumStartAt?: number }).autoNumStartAt = parseTextBulletStartAt(startAt);
    }
    propertyState.hasProperty = true;
  }

  const buBlip = getChild(pPr, "a:buBlip");
  if (buBlip !== undefined) {
    const blip = getChild(buBlip, "a:blip");
    if (blip !== undefined) {
      (result as { blipResourceId?: string }).blipResourceId = blip.attrs?.["r:embed"] ?? blip.attrs?.["r:link"];
    }
    propertyState.hasProperty = true;
  }

  // Bullet font
  const buFont = getChild(pPr, "a:buFont");
  if (buFont !== undefined) {
    (result as { font?: string }).font = buFont.attrs?.typeface;
    propertyState.hasProperty = true;
  }

  const buFontTx = getChild(pPr, "a:buFontTx");
  if (buFontTx !== undefined) {
    (result as { fontFollowText?: boolean }).fontFollowText = true;
    propertyState.hasProperty = true;
  }

  // Bullet color
  const buClr = getChild(pPr, "a:buClr");
  if (buClr !== undefined) {
    (result as { color?: Color }).color = parseColorFromParent(buClr);
    propertyState.hasProperty = true;
  }

  const buClrTx = getChild(pPr, "a:buClrTx");
  if (buClrTx !== undefined) {
    (result as { colorFollowText?: boolean }).colorFollowText = true;
    propertyState.hasProperty = true;
  }

  // Bullet size
  const buSzPct = getChild(pPr, "a:buSzPct");
  if (buSzPct !== undefined) {
    const val = parseTextBulletSize(buSzPct.attrs?.val);
    if (val !== undefined) {
      (result as { sizePercent?: Percent }).sizePercent = val;
    }
    propertyState.hasProperty = true;
  }

  const buSzPts = getChild(pPr, "a:buSzPts");
  if (buSzPts !== undefined) {
    const val = buSzPts.attrs?.val;
    if (val !== undefined) {
      // OOXML stores points in 100ths (e.g., 1200 = 12pt)
      (result as { sizePoints?: Points }).sizePoints = pt(parseInt(val, 10) / 100);
    }
    propertyState.hasProperty = true;
  }

  const buSzTx = getChild(pPr, "a:buSzTx");
  if (buSzTx !== undefined) {
    (result as { sizeFollowText?: boolean }).sizeFollowText = true;
    propertyState.hasProperty = true;
  }

  return propertyState.hasProperty ? result as BulletProperties : undefined;
}

/**
 * Get bullet properties from list style at a specific level.
 */
function getBulletPropertiesFromLstStyle(
  lstStyle: XmlElement | undefined,
  lvl: number,
): BulletProperties | undefined {
  if (lstStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvl}pPr`;
  const pPr = getChild(lstStyle, lvlpPr);
  return getBulletPropertiesFromPPr(pPr);
}

/**
 * Get bullet properties from placeholder's txBody lstStyle.
 */
function getBulletPropertiesFromPlaceholder(
  placeholder: XmlElement | undefined,
  lvl: number,
): BulletProperties | undefined {
  if (placeholder === undefined) {
    return undefined;
  }
  const txBody = getChild(placeholder, "p:txBody");
  const lstStyle = txBody ? getChild(txBody, "a:lstStyle") : undefined;
  return getBulletPropertiesFromLstStyle(lstStyle, lvl);
}

/**
 * Get bullet properties from master text styles.
 */
function getBulletPropertiesFromMasterTextStyles(
  masterTextStyles: MasterTextStyles | undefined,
  placeholderType: string | undefined,
  lvl: number,
): BulletProperties | undefined {
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
  return getBulletPropertiesFromPPr(pPr);
}

/**
 * Merge bullet properties with fallback chain.
 * Properties from earlier sources take precedence.
 */
function mergeBulletProperties(
  ...sources: (BulletProperties | undefined)[]
): BulletProperties {
  const result: Partial<BulletProperties> = {};

  for (const source of sources) {
    if (source === undefined) {
      continue;
    }

    // Bullet type - first defined wins
    if (result.none === undefined && result.char === undefined &&
        result.autoNumType === undefined && result.blipResourceId === undefined) {
      if (source.none !== undefined) {
        (result as { none?: boolean }).none = source.none;
      } else if (source.char !== undefined) {
        (result as { char?: string }).char = source.char;
      } else if (source.autoNumType !== undefined) {
        (result as { autoNumType?: string }).autoNumType = source.autoNumType;
        (result as { autoNumStartAt?: number }).autoNumStartAt = source.autoNumStartAt;
      } else if (source.blipResourceId !== undefined) {
        (result as { blipResourceId?: string }).blipResourceId = source.blipResourceId;
      }
    }

    // Font - first defined wins (including fontFollowText)
    if (result.font === undefined && result.fontFollowText === undefined) {
      if (source.fontFollowText !== undefined) {
        (result as { fontFollowText?: boolean }).fontFollowText = source.fontFollowText;
      } else if (source.font !== undefined) {
        (result as { font?: string }).font = source.font;
      }
    }

    // Color - first defined wins (including colorFollowText)
    if (result.color === undefined && result.colorFollowText === undefined) {
      if (source.colorFollowText !== undefined) {
        (result as { colorFollowText?: boolean }).colorFollowText = source.colorFollowText;
      } else if (source.color !== undefined) {
        (result as { color?: Color }).color = source.color;
      }
    }

    // Size - first defined wins (including sizeFollowText)
    if (result.sizePercent === undefined && result.sizePoints === undefined &&
        result.sizeFollowText === undefined) {
      if (source.sizeFollowText !== undefined) {
        (result as { sizeFollowText?: boolean }).sizeFollowText = source.sizeFollowText;
      } else if (source.sizePercent !== undefined) {
        (result as { sizePercent?: Percent }).sizePercent = source.sizePercent;
      } else if (source.sizePoints !== undefined) {
        (result as { sizePoints?: Points }).sizePoints = source.sizePoints;
      }
    }
  }

  return result as BulletProperties;
}

/**
 * Resolve bullet style with full inheritance chain.
 *
 * ECMA-376 inheritance chain:
 * 1. Direct paragraph properties (a:pPr)
 * 2. Local list style (a:lstStyle in shape's txBody)
 * 3. Layout placeholder (p:txBody a:lstStyle)
 * 4. Master placeholder (p:txBody a:lstStyle)
 * 5. Master text styles (p:txStyles)
 * 6. Default text style
 *
 * @param directPPr - Direct paragraph properties
 * @param localLstStyle - Local list style from shape's txBody
 * @param lvl - Paragraph level (0-based)
 * @param ctx - Text inheritance context
 * @returns Resolved bullet style, or undefined if no bullet
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet and Numbering)
 */
export function resolveBulletStyle(
  directPPr: XmlElement | undefined,
  localLstStyle: XmlElement | undefined,
  lvl: number,
  ctx: TextStyleContext | undefined,
): BulletStyle | undefined {
  // Use 1-based level for lstStyle lookup
  const lvlKey = lvl + 1;

  // Collect properties from all sources
  const directProps = getBulletPropertiesFromPPr(directPPr);
  const localProps = getBulletPropertiesFromLstStyle(localLstStyle, lvlKey);

  // Placeholders and master styles (if context available)
  const contextProps = resolveContextBulletProps(ctx, lvlKey);
  const layoutProps = contextProps.layoutProps;
  const masterPhProps = contextProps.masterPhProps;
  const masterStyleProps = contextProps.masterStyleProps;
  const defaultProps = contextProps.defaultProps;

  // Merge properties following inheritance chain
  const merged = mergeBulletProperties(
    directProps,
    localProps,
    layoutProps,
    masterPhProps,
    masterStyleProps,
    defaultProps,
  );

  // If no bullet type defined, return undefined
  if (merged.none === undefined && merged.char === undefined &&
      merged.autoNumType === undefined && merged.blipResourceId === undefined) {
    return undefined;
  }

  // Build bullet object
  const bullet = resolveBullet(merged);
  if (!bullet) {return undefined;}

  // Build bullet style
  return {
    bullet,
    color: merged.color,
    colorFollowText: merged.colorFollowText ?? false,
    sizePercent: merged.sizePercent,
    sizePoints: merged.sizePoints,
    sizeFollowText: merged.sizeFollowText ?? false,
    font: merged.font,
    fontFollowText: merged.fontFollowText ?? false,
  };
}

function resolveContextBulletProps(
  ctx: TextStyleContext | undefined,
  lvlKey: number,
): {
  layoutProps: BulletProperties | undefined;
  masterPhProps: BulletProperties | undefined;
  masterStyleProps: BulletProperties | undefined;
  defaultProps: BulletProperties | undefined;
} {
  if (ctx === undefined) {
    return {
      layoutProps: undefined,
      masterPhProps: undefined,
      masterStyleProps: undefined,
      defaultProps: undefined,
    };
  }

  // 3. Layout placeholder
  const layoutPh = lookupPlaceholder(
    ctx.layoutPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const layoutProps = getBulletPropertiesFromPlaceholder(layoutPh, lvlKey);

  // 4. Master placeholder
  const masterPh = lookupPlaceholder(
    ctx.masterPlaceholders,
    ctx.placeholderType,
    ctx.placeholderIdx,
  );
  const masterPhProps = getBulletPropertiesFromPlaceholder(masterPh, lvlKey);

  // 5. Master text styles
  const masterStyleProps = getBulletPropertiesFromMasterTextStyles(
    ctx.masterTextStyles,
    ctx.placeholderType,
    lvlKey,
  );

  // 6. Default text style
  const defaultProps = resolveDefaultBulletProps(ctx.defaultTextStyle, lvlKey);

  return { layoutProps, masterPhProps, masterStyleProps, defaultProps };
}

function resolveDefaultBulletProps(
  defaultTextStyle: XmlElement | undefined,
  lvlKey: number,
): BulletProperties | undefined {
  if (defaultTextStyle === undefined) {
    return undefined;
  }
  const lvlpPr = `a:lvl${lvlKey}pPr`;
  const pPr = getChild(defaultTextStyle, lvlpPr);
  return getBulletPropertiesFromPPr(pPr);
}

function resolveBullet(merged: BulletProperties): Bullet | undefined {
  if (merged.none === true) {
    return { type: "none" };
  }
  if (merged.char !== undefined) {
    return { type: "char", char: merged.char };
  }
  if (merged.autoNumType !== undefined) {
    return {
      type: "auto",
      scheme: merged.autoNumType,
      startAt: merged.autoNumStartAt,
    };
  }
  if (merged.blipResourceId !== undefined) {
    return { type: "blip", resourceId: merged.blipResourceId };
  }
  return undefined;
}
