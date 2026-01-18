/**
 * @file DOCX Style Property Resolver with Memoization
 *
 * Resolves run properties from style chains with caching for performance.
 * Follows ECMA-376 property inheritance order:
 * 1. Direct run properties (explicit on the run)
 * 2. Paragraph-level run properties (pPr/rPr)
 * 3. Character style properties
 * 4. Paragraph style run properties
 * 5. Document defaults (docDefaults/rPrDefault)
 * 6. Specification defaults (ECMA-376)
 *
 * @see ECMA-376-1:2016 Section 17.7 (Styles)
 * @see ECMA-376-1:2016 Section 17.3.2 (Run Properties)
 */

import type { DocxRunProperties, DocxHighlightColor } from "../../docx/domain/run";
import type { DocxStyle, DocxStyles, DocxDocDefaults } from "../../docx/domain/styles";
import type { Points, Pixels } from "../../ooxml/domain/units";
import { pt, px } from "../../ooxml/domain/units";
import {
  SPEC_DEFAULT_FONT_SIZE_PT,
  TWIPS_PER_POINT,
  PT_TO_PX,
} from "../../docx/domain/ecma376-defaults";

// =============================================================================
// Resolved Properties Type
// =============================================================================

/**
 * Fully resolved run properties with all values present.
 * No optional values - all properties have been resolved from the
 * inheritance chain or specification defaults.
 */
export type ResolvedRunProperties = {
  /** Font size in points */
  readonly fontSize: Points;
  /** Font family name (Latin) */
  readonly fontFamily: string;
  /** East Asian font family */
  readonly fontFamilyEastAsian: string | undefined;
  /** Complex Script font family */
  readonly fontFamilyComplexScript: string | undefined;
  /** Font weight (400 = normal, 700 = bold) */
  readonly fontWeight: number;
  /** Font style */
  readonly fontStyle: "normal" | "italic";
  /** Text decoration */
  readonly textDecoration: string | undefined;
  /** Text color as hex (with #) */
  readonly color: string;
  /** Vertical alignment */
  readonly verticalAlign: "baseline" | "superscript" | "subscript";
  /** Letter spacing in pixels */
  readonly letterSpacing: Pixels;
  /** Text direction */
  readonly direction: "ltr" | "rtl";
  /** Highlight color as hex (with #) */
  readonly highlightColor: string | undefined;
  /** Text transform */
  readonly textTransform: "none" | "uppercase" | "lowercase";
};

// =============================================================================
// Highlight Color Mapping
// =============================================================================

const HIGHLIGHT_COLOR_MAP: Record<DocxHighlightColor, string | undefined> = {
  black: "#000000",
  blue: "#0000FF",
  cyan: "#00FFFF",
  green: "#00FF00",
  magenta: "#FF00FF",
  red: "#FF0000",
  yellow: "#FFFF00",
  white: "#FFFFFF",
  darkBlue: "#00008B",
  darkCyan: "#008B8B",
  darkGreen: "#006400",
  darkMagenta: "#8B008B",
  darkRed: "#8B0000",
  darkYellow: "#808000",
  darkGray: "#A9A9A9",
  lightGray: "#D3D3D3",
  none: undefined,
};

// =============================================================================
// Default Font Family
// =============================================================================

/**
 * Default font family when none specified.
 * ECMA-376 does not specify a default font family.
 */
const DEFAULT_FONT_FAMILY = "sans-serif";

// =============================================================================
// Style Resolver Cache
// =============================================================================

/**
 * Cache for resolved style properties.
 * Key is the style ID, value is the resolved properties.
 */
type StyleCache = Map<string, ResolvedRunProperties>;

/**
 * Create a style resolver with memoization.
 *
 * @param styles - Document styles (styles.xml content)
 * @returns A function that resolves properties for a given style ID
 */
export function createStyleResolver(
  styles: DocxStyles | undefined,
): (styleId: string | undefined) => ResolvedRunProperties {
  const cache: StyleCache = new Map();
  const styleMap = buildStyleMap(styles?.style ?? []);
  const docDefaults = styles?.docDefaults;

  return (styleId: string | undefined): ResolvedRunProperties => {
    if (styleId === undefined) {
      return resolveFromDocDefaults(docDefaults);
    }

    const cached = cache.get(styleId);
    if (cached !== undefined) {
      return cached;
    }

    const resolved = resolveStyleChain(styleId, styleMap, docDefaults);
    cache.set(styleId, resolved);
    return resolved;
  };
}

/**
 * Build a map from style ID to style definition.
 */
function buildStyleMap(styles: readonly DocxStyle[]): Map<string, DocxStyle> {
  const map = new Map<string, DocxStyle>();
  for (const style of styles) {
    map.set(style.styleId, style);
  }
  return map;
}

/**
 * Resolve properties from document defaults only.
 */
function resolveFromDocDefaults(docDefaults: DocxDocDefaults | undefined): ResolvedRunProperties {
  const rPr = docDefaults?.rPrDefault?.rPr;
  return resolveRunProperties(rPr, undefined);
}

/**
 * Collect style properties from the inheritance chain.
 * Uses recursion to avoid mutable variables.
 */
function collectStyleProperties(
  currentId: string | undefined,
  styleMap: Map<string, DocxStyle>,
  visited: Set<string>,
): readonly (DocxRunProperties | undefined)[] {
  if (currentId === undefined || visited.has(currentId)) {
    return [];
  }

  const style = styleMap.get(currentId);
  if (style === undefined) {
    return [];
  }

  const newVisited = new Set(visited);
  newVisited.add(currentId);

  // Collect current style's properties
  const currentProps: (DocxRunProperties | undefined)[] = [style.rPr];
  if (style.pPr?.rPr !== undefined) {
    currentProps.push(style.pPr.rPr);
  }

  // Recurse to parent style
  const parentProps = collectStyleProperties(style.basedOn?.val, styleMap, newVisited);

  return [...currentProps, ...parentProps];
}

/**
 * Resolve the complete style chain for a style ID.
 * Walks up the basedOn chain and merges properties.
 */
function resolveStyleChain(
  styleId: string,
  styleMap: Map<string, DocxStyle>,
  docDefaults: DocxDocDefaults | undefined,
): ResolvedRunProperties {
  // Collect properties from the inheritance chain (derived to base)
  const propertyStack = collectStyleProperties(styleId, styleMap, new Set());

  // Reverse so we process from base to derived
  const reversedStack = [...propertyStack].reverse();

  // Add document defaults at the bottom
  const docDefaultsRPr = docDefaults?.rPrDefault?.rPr;

  // Merge all properties
  return mergePropertyStack(docDefaultsRPr, reversedStack);
}

/**
 * Merge a stack of properties, with later entries overriding earlier ones.
 */
function mergePropertyStack(
  base: DocxRunProperties | undefined,
  stack: readonly (DocxRunProperties | undefined)[],
): ResolvedRunProperties {
  const merged = stack.reduce<DocxRunProperties>(
    (acc, props) => (props !== undefined ? mergeRunProperties(acc, props) : acc),
    base ?? {},
  );

  return resolveRunProperties(merged, undefined);
}

/**
 * Merge two run properties objects, with override taking precedence.
 */
function mergeRunProperties(
  base: DocxRunProperties,
  override: DocxRunProperties,
): DocxRunProperties {
  return {
    ...base,
    ...override,
    // Merge font families if present
    rFonts: override.rFonts ?? base.rFonts,
    // Merge color if present
    color: override.color ?? base.color,
    // Merge underline if present
    u: override.u ?? base.u,
  };
}

// =============================================================================
// Property Resolution
// =============================================================================

/**
 * Resolve run properties to fully-specified values.
 * Uses the inheritance chain and specification defaults.
 *
 * @param props - Direct run properties
 * @param paragraphRPr - Paragraph-level run properties
 * @returns Fully resolved properties
 */
export function resolveRunProperties(
  props: DocxRunProperties | undefined,
  paragraphRPr: DocxRunProperties | undefined,
): ResolvedRunProperties {
  const merged = props ?? {};
  const defaults = paragraphRPr ?? {};

  // Font size (in half-points)
  const szHalfPoints = merged.sz ?? defaults.sz;
  const fontSize = pt(szHalfPoints !== undefined ? szHalfPoints / 2 : SPEC_DEFAULT_FONT_SIZE_PT);

  // Font families
  const fonts = merged.rFonts ?? defaults.rFonts;
  const fontFamily = fonts?.ascii ?? fonts?.hAnsi ?? DEFAULT_FONT_FAMILY;
  const fontFamilyEastAsian = fonts?.eastAsia;
  const fontFamilyComplexScript = fonts?.cs;

  // Bold
  const isBold = merged.b ?? defaults.b ?? false;
  const fontWeight = isBold ? 700 : 400;

  // Italic
  const isItalic = merged.i ?? defaults.i ?? false;
  const fontStyle = isItalic ? "italic" : "normal";

  // Text decoration
  const underline = merged.u ?? defaults.u;
  const strike = merged.strike ?? defaults.strike ?? false;
  const dstrike = merged.dstrike ?? defaults.dstrike ?? false;
  const decorations: string[] = [];
  if (underline !== undefined && underline.val !== "none") {
    decorations.push("underline");
  }
  if (strike || dstrike) {
    decorations.push("line-through");
  }
  const textDecoration = decorations.length > 0 ? decorations.join(" ") : undefined;

  // Color
  const colorProp = merged.color ?? defaults.color;
  const color = colorProp?.val !== undefined ? `#${colorProp.val}` : "#000000";

  // Vertical alignment
  const vertAlignProp = merged.vertAlign ?? defaults.vertAlign;
  const verticalAlign = vertAlignProp ?? "baseline";

  // Letter spacing (in twips)
  const spacingTwips = merged.spacing ?? defaults.spacing;
  const letterSpacing = px(spacingTwips !== undefined ? (spacingTwips / TWIPS_PER_POINT) * PT_TO_PX : 0);

  // Direction
  const isRtl = merged.rtl ?? defaults.rtl ?? false;
  const direction = isRtl ? "rtl" : "ltr";

  // Highlight color
  const highlight = merged.highlight ?? defaults.highlight;
  const highlightColor = highlight !== undefined ? HIGHLIGHT_COLOR_MAP[highlight] : undefined;

  // Text transform
  const caps = merged.caps ?? defaults.caps ?? false;
  const smallCaps = merged.smallCaps ?? defaults.smallCaps ?? false;
  const textTransform = caps ? "uppercase" : smallCaps ? "lowercase" : "none";

  return {
    fontSize,
    fontFamily,
    fontFamilyEastAsian,
    fontFamilyComplexScript,
    fontWeight,
    fontStyle,
    textDecoration,
    color,
    verticalAlign,
    letterSpacing,
    direction,
    highlightColor,
    textTransform,
  };
}

/**
 * Resolve run properties with a pre-built style resolver.
 * Combines style resolution with direct/paragraph properties.
 *
 * @param resolveStyle - Style resolver function
 * @param styleId - Character style ID (if any)
 * @param paragraphStyleId - Paragraph style ID (if any)
 * @param paragraphRPr - Paragraph-level run properties
 * @param runProps - Direct run properties
 * @returns Fully resolved properties
 */
export function resolveRunPropertiesWithStyles(
  resolveStyle: (styleId: string | undefined) => ResolvedRunProperties,
  styleId: string | undefined,
  paragraphStyleId: string | undefined,
  paragraphRPr: DocxRunProperties | undefined,
  runProps: DocxRunProperties | undefined,
): ResolvedRunProperties {
  // Start with paragraph style
  const baseParagraphStyle = resolveStyle(paragraphStyleId);

  // Apply character style if present
  const baseCharacterStyle = styleId !== undefined ? resolveStyle(styleId) : baseParagraphStyle;

  // Apply paragraph-level run properties
  const withParagraphRPr = paragraphRPr !== undefined ? applyOverrides(baseCharacterStyle, paragraphRPr) : baseCharacterStyle;

  // Apply direct run properties
  return runProps !== undefined ? applyOverrides(withParagraphRPr, runProps) : withParagraphRPr;
}

/**
 * Apply run property overrides to resolved properties.
 */
function applyOverrides(
  base: ResolvedRunProperties,
  overrides: DocxRunProperties,
): ResolvedRunProperties {
  return {
    ...base,
    fontSize: overrides.sz !== undefined ? pt(overrides.sz / 2) : base.fontSize,
    fontFamily: overrides.rFonts?.ascii ?? overrides.rFonts?.hAnsi ?? base.fontFamily,
    fontFamilyEastAsian: overrides.rFonts?.eastAsia ?? base.fontFamilyEastAsian,
    fontFamilyComplexScript: overrides.rFonts?.cs ?? base.fontFamilyComplexScript,
    fontWeight: overrides.b !== undefined ? (overrides.b ? 700 : 400) : base.fontWeight,
    fontStyle: overrides.i !== undefined ? (overrides.i ? "italic" : "normal") : base.fontStyle,
    textDecoration: resolveTextDecoration(overrides, base.textDecoration),
    color: overrides.color?.val !== undefined ? `#${overrides.color.val}` : base.color,
    verticalAlign: overrides.vertAlign ?? base.verticalAlign,
    letterSpacing: resolveLetterSpacing(overrides.spacing, base.letterSpacing),
    direction: overrides.rtl !== undefined ? (overrides.rtl ? "rtl" : "ltr") : base.direction,
    highlightColor: resolveHighlightColor(overrides.highlight, base.highlightColor),
    textTransform: resolveTextTransform(overrides, base.textTransform),
  };
}

function resolveLetterSpacing(spacing: number | undefined, base: Pixels): Pixels {
  if (spacing === undefined) {
    return base;
  }
  return px((spacing / TWIPS_PER_POINT) * PT_TO_PX);
}

function resolveHighlightColor(highlight: DocxHighlightColor | undefined, base: string | undefined): string | undefined {
  if (highlight === undefined) {
    return base;
  }
  return HIGHLIGHT_COLOR_MAP[highlight];
}

function resolveTextDecoration(
  overrides: DocxRunProperties,
  baseDecoration: string | undefined,
): string | undefined {
  if (overrides.u === undefined && overrides.strike === undefined && overrides.dstrike === undefined) {
    return baseDecoration;
  }

  const decorations: string[] = [];
  if (overrides.u !== undefined && overrides.u.val !== "none") {
    decorations.push("underline");
  }
  if (overrides.strike === true || overrides.dstrike === true) {
    decorations.push("line-through");
  }
  return decorations.length > 0 ? decorations.join(" ") : undefined;
}

function resolveTextTransform(
  overrides: DocxRunProperties,
  baseTransform: "none" | "uppercase" | "lowercase",
): "none" | "uppercase" | "lowercase" {
  if (overrides.caps !== undefined) {
    return overrides.caps ? "uppercase" : "none";
  }
  if (overrides.smallCaps !== undefined) {
    return overrides.smallCaps ? "lowercase" : "none";
  }
  return baseTransform;
}
