/**
 * @file DrawingML (a:) color element types
 *
 * These types represent color-related OOXML elements from the DrawingML namespace.
 * Color elements can appear in fills, outlines, effects, and text formatting.
 *
 * @see ECMA-376 Part 1, Section 20.1.2 - DrawingML - Main
 */

import type { OoxmlElement, OoxmlValElement } from "./base";

// =============================================================================
// Color Transformation Elements
// =============================================================================

/**
 * Alpha (transparency) transformation.
 * Value is in 1/100000 units (e.g., 50000 = 50% opacity).
 *
 * @example
 * ```xml
 * <a:alpha val="50000"/>
 * ```
 */
export type AlphaElement = OoxmlValElement;

/**
 * Shade transformation - darkens the color.
 * Value is percentage in 1/100000 units.
 */
export type ShadeElement = OoxmlValElement;

/**
 * Tint transformation - lightens the color.
 * Value is percentage in 1/100000 units.
 */
export type TintElement = OoxmlValElement;

/**
 * Luminance modulation - adjusts brightness.
 * Value is percentage in 1/100000 units.
 */
export type LumModElement = OoxmlValElement;

/**
 * Luminance offset - adds/subtracts brightness.
 * Value is percentage in 1/100000 units.
 */
export type LumOffElement = OoxmlValElement;

/**
 * Hue modulation - adjusts hue.
 * Value is percentage in 1/100000 units.
 */
export type HueModElement = OoxmlValElement;

/**
 * Saturation modulation - adjusts saturation.
 * Value is percentage in 1/100000 units.
 */
export type SatModElement = OoxmlValElement;

/**
 * Common color transformation children that can appear in any color element.
 */
export type ColorTransformChildren = {
  "a:alpha"?: AlphaElement;
  "a:shade"?: ShadeElement;
  "a:tint"?: TintElement;
  "a:lumMod"?: LumModElement;
  "a:lumOff"?: LumOffElement;
  "a:hueMod"?: HueModElement;
  "a:satMod"?: SatModElement;
};

// =============================================================================
// Color Type Elements
// =============================================================================

/**
 * sRGB color - direct hex color specification.
 *
 * @example
 * ```xml
 * <a:srgbClr val="FF0000">
 *   <a:alpha val="50000"/>
 * </a:srgbClr>
 * ```
 */
export type SrgbColorAttrs = {
  /** Hex color value without # (e.g., "FF0000") */
  val: string;
};

export type SrgbColorElement = OoxmlElement<SrgbColorAttrs> & ColorTransformChildren;

/**
 * Scheme color - reference to theme color scheme.
 *
 * @example
 * ```xml
 * <a:schemeClr val="accent1">
 *   <a:shade val="75000"/>
 * </a:schemeClr>
 * ```
 */
export type SchemeColorAttrs = {
  /**
   * Scheme color name:
   * - dk1, dk2: Dark colors
   * - lt1, lt2: Light colors
   * - accent1-accent6: Accent colors
   * - hlink: Hyperlink color
   * - folHlink: Followed hyperlink color
   * - tx1, tx2: Text colors (mapped to dk1/dk2)
   * - bg1, bg2: Background colors (mapped to lt1/lt2)
   * - phClr: Placeholder color (context-dependent)
   */
  val: string;
};

export type SchemeColorElement = OoxmlElement<SchemeColorAttrs> & ColorTransformChildren;

/**
 * scRGB color - RGB in percentage (0-100%).
 *
 * @example
 * ```xml
 * <a:scrgbClr r="100%" g="50%" b="0%"/>
 * ```
 */
export type ScrgbColorAttrs = {
  r: string;
  g: string;
  b: string;
};

export type ScrgbColorElement = OoxmlElement<ScrgbColorAttrs> & ColorTransformChildren;

/**
 * Preset color - named color from predefined list.
 *
 * @example
 * ```xml
 * <a:prstClr val="red"/>
 * ```
 */
export type PrstColorAttrs = {
  /** Preset color name (e.g., "red", "blue", "green", etc.) */
  val: string;
};

export type PrstColorElement = OoxmlElement<PrstColorAttrs> & ColorTransformChildren;

/**
 * HSL color - hue, saturation, luminance.
 *
 * @example
 * ```xml
 * <a:hslClr hue="0" sat="100%" lum="50%"/>
 * ```
 */
export type HslColorAttrs = {
  /** Hue in 1/100000 of a degree (0-21600000) */
  hue: string;
  /** Saturation percentage */
  sat: string;
  /** Luminance percentage */
  lum: string;
};

export type HslColorElement = OoxmlElement<HslColorAttrs> & ColorTransformChildren;

/**
 * System color - OS-defined color.
 *
 * @example
 * ```xml
 * <a:sysClr val="windowText" lastClr="000000"/>
 * ```
 */
export type SysColorAttrs = {
  /** System color name */
  val?: string;
  /** Last known color value (hex) */
  lastClr?: string;
};

export type SysColorElement = OoxmlElement<SysColorAttrs> & ColorTransformChildren;

// =============================================================================
// Color Container Types
// =============================================================================

/**
 * Union of all possible color element types.
 * A color container will have exactly one of these.
 */
export type ColorElements = {
  "a:srgbClr"?: SrgbColorElement;
  "a:schemeClr"?: SchemeColorElement;
  "a:scrgbClr"?: ScrgbColorElement;
  "a:prstClr"?: PrstColorElement;
  "a:hslClr"?: HslColorElement;
  "a:sysClr"?: SysColorElement;
};

/**
 * A node that contains a color specification.
 * Used for solid fills, font colors, etc.
 */
export type ColorContainerNode = OoxmlElement & ColorElements;

/**
 * A node that may contain a:solidFill or be a direct color container.
 *
 * Used as input type for getSolidFill which accepts:
 * - A color element directly (a:srgbClr, a:schemeClr, etc.)
 * - A node containing a:solidFill (e.g., a:rPr, a:defRPr)
 * - A solidFill element containing a color element
 */
export type SolidFillInputNode = ColorContainerNode & {
  "a:solidFill"?: SolidFillElement;
};

/**
 * Solid fill element - contains a single color.
 *
 * @example
 * ```xml
 * <a:solidFill>
 *   <a:srgbClr val="FF0000"/>
 * </a:solidFill>
 * ```
 */
export type SolidFillElement = OoxmlElement & ColorElements;

// =============================================================================
// Gradient Fill Types
// =============================================================================

/**
 * Gradient stop - a color at a position in the gradient.
 *
 * @example
 * ```xml
 * <a:gs pos="0">
 *   <a:srgbClr val="FF0000"/>
 * </a:gs>
 * ```
 */
export type GradientStopAttrs = {
  /** Position in 1/100000 units (0 = start, 100000 = end) */
  pos: string;
};

export type GradientStopElement = OoxmlElement<GradientStopAttrs> & ColorElements;

/**
 * Linear gradient properties.
 *
 * @example
 * ```xml
 * <a:lin ang="5400000" scaled="1"/>
 * ```
 */
export type LinearGradientAttrs = {
  /** Angle in 1/60000 of a degree */
  ang?: string;
  /** Whether gradient is scaled */
  scaled?: string;
};

export type LinearGradientElement = OoxmlElement<LinearGradientAttrs>;

/**
 * Path gradient (radial) properties.
 *
 * @example
 * ```xml
 * <a:path path="circle">
 *   <a:fillToRect l="50000" t="50000" r="50000" b="50000"/>
 * </a:path>
 * ```
 */
export type PathGradientAttrs = {
  /** Path type: circle, rect, or shape */
  path?: "circle" | "rect" | "shape";
};

export type FillToRectAttrs = {
  l?: string;
  t?: string;
  r?: string;
  b?: string;
};

export type FillToRectElement = OoxmlElement<FillToRectAttrs>;

export type PathGradientElement = OoxmlElement<PathGradientAttrs> & {
  "a:fillToRect"?: FillToRectElement;
};

/**
 * Gradient fill element.
 *
 * @example
 * ```xml
 * <a:gradFill>
 *   <a:gsLst>
 *     <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
 *     <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
 *   </a:gsLst>
 *   <a:lin ang="5400000"/>
 * </a:gradFill>
 * ```
 */
export type GradientStopListElement = OoxmlElement & {
  "a:gs": GradientStopElement | GradientStopElement[];
};

export type GradientFillElement = OoxmlElement & {
  "a:gsLst"?: GradientStopListElement;
  "a:lin"?: LinearGradientElement;
  "a:path"?: PathGradientElement;
};

// =============================================================================
// Pattern Fill Types
// =============================================================================

/**
 * Pattern fill attributes.
 */
export type PatternFillAttrs = {
  /** Preset pattern name */
  prst?: string;
};

/**
 * Pattern fill element.
 *
 * @example
 * ```xml
 * <a:pattFill prst="ltHorz">
 *   <a:fgClr><a:srgbClr val="000000"/></a:fgClr>
 *   <a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr>
 * </a:pattFill>
 * ```
 */
export type PatternFillElement = OoxmlElement<PatternFillAttrs> & {
  "a:fgClr"?: ColorContainerNode;
  "a:bgClr"?: ColorContainerNode;
};

// =============================================================================
// Picture Fill Types
// =============================================================================

/**
 * Blip (image reference) attributes.
 */
export type BlipAttrs = {
  /** Embedded relationship ID */
  "r:embed"?: string;
  /** Linked relationship ID */
  "r:link"?: string;
};

/**
 * Alpha modulation fix element - fixed alpha adjustment.
 * Value is in 1/100000 units (e.g., 50000 = 50%).
 */
export type AlphaModFixAttrs = {
  /** Amount in 1/100000 units */
  amt?: string;
};

export type AlphaModFixElement = OoxmlElement<AlphaModFixAttrs>;

/**
 * Duotone effect element - maps colors to two-color tones.
 * Contains exactly two color elements.
 */
export type DuotoneElement = OoxmlElement & ColorElements;

/**
 * Blip element - reference to an image with optional effects.
 */
export type BlipElement = OoxmlElement<BlipAttrs> & {
  /** Alpha modulation fix */
  "a:alphaModFix"?: AlphaModFixElement;
  /** Duotone effect */
  "a:duotone"?: DuotoneElement;
};

/**
 * Tile element - tiling configuration for blip fills.
 */
export type TileAttrs = {
  /** X offset */
  tx?: string;
  /** Y offset */
  ty?: string;
  /** X scale in 1/100000 units */
  sx?: string;
  /** Y scale in 1/100000 units */
  sy?: string;
  /** Flip mode */
  flip?: string;
  /** Alignment */
  algn?: string;
};

export type TileElement = OoxmlElement<TileAttrs>;

/**
 * Stretch element - how to stretch the blip fill.
 */
export type StretchElement = OoxmlElement & {
  /** Fill rectangle */
  "a:fillRect"?: OoxmlElement;
};

/**
 * Blip fill element - image as fill.
 *
 * @example
 * ```xml
 * <a:blipFill>
 *   <a:blip r:embed="rId2"/>
 *   <a:tile sx="100000" sy="100000"/>
 * </a:blipFill>
 * ```
 */
export type BlipFillElement = OoxmlElement & {
  "a:blip"?: BlipElement;
  "a:tile"?: TileElement;
  "a:stretch"?: StretchElement;
};

// =============================================================================
// No Fill Type
// =============================================================================

/**
 * No fill element - indicates transparent fill.
 *
 * @example
 * ```xml
 * <a:noFill/>
 * ```
 */
export type NoFillElement = OoxmlElement;

// =============================================================================
// Fill Container Types
// =============================================================================

/**
 * All possible fill types that can appear in shape properties.
 */
export type FillElements = {
  "a:noFill"?: NoFillElement;
  "a:solidFill"?: SolidFillElement;
  "a:gradFill"?: GradientFillElement;
  "a:pattFill"?: PatternFillElement;
  "a:blipFill"?: BlipFillElement;
  "a:grpFill"?: OoxmlElement; // Group fill - inherits from parent
};

// Note: ShapePropertiesElement is defined in presentationml.ts with full type definitions

// =============================================================================
// Color Type Guards
// =============================================================================

/** All color element keys */
export const COLOR_ELEMENT_KEYS = [
  "a:srgbClr",
  "a:schemeClr",
  "a:scrgbClr",
  "a:prstClr",
  "a:hslClr",
  "a:sysClr",
] as const;

export type ColorElementKey = (typeof COLOR_ELEMENT_KEYS)[number];

/**
 * Find the color element in a container node.
 */
export function findColorElement(
  node: ColorContainerNode | undefined,
): { key: ColorElementKey; element: OoxmlElement & ColorTransformChildren } | undefined {
  if (node === undefined) {return undefined;}

  for (const key of COLOR_ELEMENT_KEYS) {
    const element = node[key];
    if (element !== undefined) {
      return { key, element: element as OoxmlElement & ColorTransformChildren };
    }
  }
  return undefined;
}

/** All fill element keys */
export const FILL_ELEMENT_KEYS = [
  "a:noFill",
  "a:solidFill",
  "a:gradFill",
  "a:pattFill",
  "a:blipFill",
  "a:grpFill",
] as const;

export type FillElementKey = (typeof FILL_ELEMENT_KEYS)[number];

/**
 * Find the fill element in a container node.
 */
export function findFillElement(
  node: FillElements | undefined,
): { key: FillElementKey; element: OoxmlElement } | undefined {
  if (node === undefined) {return undefined;}

  for (const key of FILL_ELEMENT_KEYS) {
    const element = node[key];
    if (element !== undefined) {
      return { key, element: element as OoxmlElement };
    }
  }
  return undefined;
}
