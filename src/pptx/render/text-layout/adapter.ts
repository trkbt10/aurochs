/**
 * @file TextBody to LayoutInput adapter
 * Converts domain TextBody objects to layout engine input format
 */

import type { TextBody, Paragraph, TextRun, RunProperties, BulletStyle, AutoNumberBullet } from "../../domain/text";
import type { Pixels, Points } from "../../domain/types";
import type { LayoutInput, LayoutParagraphInput, LayoutSpan, TextBoxConfig, BulletConfig, AutoFitConfig, TextOutlineConfig, TextFillConfig, FontAlignment, LayoutTabStop } from "./types";
import type { RenderOptions } from "../core/types";
import type { ColorContext, FontScheme } from "../../domain/resolution";
import { resolveThemeFont } from "../../domain/resolution";
import type { Color, Line, Fill } from "../../domain/color";

import { resolveColor as resolveColorRaw } from "../../core/dml/render/color";
import { px, pt, pct } from "../../domain/types";
import { DEFAULT_FONT_SIZE_PT } from "../../core/ecma376/defaults";
import type { AutoFit } from "../../domain/text";
import { formatAutoNumber } from "../../utils/auto-number";

/** Default font family when none specified */
const DEFAULT_FONT_FAMILY = "sans-serif";

/**
 * Resolve font family, handling theme references.
 *
 * Per ECMA-376 Part 1, Section 20.1.4.1.16-17:
 * Theme font references (+mj-lt, +mn-lt, etc.) should be resolved
 * to actual font names from the theme's font scheme.
 *
 * When no font is specified, falls back to the theme's minor Latin font,
 * since most body text uses the minor font in typical presentations.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17
 */
function resolveFontFamily(
  rawFontFamily: string | undefined,
  fontScheme: FontScheme | undefined,
): string {
  if (rawFontFamily === undefined) {
    // When no explicit font, use theme minor font (typical for body text)
    // This handles the case where font is inherited from master/layout
    // but not explicitly specified in the text run properties.
    const themeFont = fontScheme?.minorFont.latin;
    return themeFont ?? DEFAULT_FONT_FAMILY;
  }

  // Try to resolve theme reference
  const resolved = resolveThemeFont(rawFontFamily, fontScheme);
  return resolved ?? DEFAULT_FONT_FAMILY;
}

function resolveThemeFontIfDefined(
  fontFamily: string | undefined,
  fontScheme: FontScheme | undefined
): string | undefined {
  if (fontFamily !== undefined) {
    return resolveThemeFont(fontFamily, fontScheme);
  }
  return undefined;
}

function resolveWrapMode(wrapping: TextBody["bodyProperties"]["wrapping"]): TextBoxConfig["wrapMode"] {
  if (wrapping === "none") {
    return "none";
  }
  return "wrap";
}

function resolveVerticalAlign(
  props: RunProperties | undefined
): "baseline" | "superscript" | "subscript" {
  if (props?.baseline !== undefined) {
    if (props.baseline > 0) {
      return "superscript";
    }
    if (props.baseline < 0) {
      return "subscript";
    }
  }
  return "baseline";
}

function resolveTextTransform(
  caps: RunProperties["caps"] | undefined
): "none" | "uppercase" | "lowercase" {
  if (caps === "all") {
    return "uppercase";
  }
  if (caps === "small") {
    return "lowercase";
  }
  return "none";
}

function resolveLineCap(cap: Line["cap"]): TextOutlineConfig["cap"] {
  switch (cap) {
    case "round":
      return "round";
    case "square":
      return "square";
    case "flat":
    default:
      return "butt";
  }
}

function resolveLineJoin(join: Line["join"]): TextOutlineConfig["join"] {
  switch (join) {
    case "bevel":
      return "bevel";
    case "round":
      return "round";
    case "miter":
    default:
      return "miter";
  }
}

function resolveBulletFontSize(
  bulletStyle: BulletStyle,
  defaultFontSize: Points
): Points {
  if (bulletStyle.sizePoints !== undefined) {
    return bulletStyle.sizePoints;
  }
  if (bulletStyle.sizePercent !== undefined) {
    return pt((defaultFontSize as number) * ((bulletStyle.sizePercent as number) / 100));
  }
  return defaultFontSize;
}

function resolveBulletChar(
  bullet: BulletStyle["bullet"],
  autoNumberIndex: number
): string | undefined {
  switch (bullet.type) {
    case "none":
      return undefined;
    case "char":
      return bullet.char;
    case "auto":
      return getAutoNumberChar(bullet, autoNumberIndex);
  }
}

function resolveBulletFontFamily(
  bulletStyle: BulletStyle,
  textFontFamily: string,
  fontScheme: FontScheme | undefined
): string {
  if (bulletStyle.fontFollowText) {
    return textFontFamily;
  }
  if (bulletStyle.font !== undefined) {
    // Resolve theme font references
    const resolved = resolveThemeFont(bulletStyle.font, fontScheme);
    return resolved ?? bulletStyle.font;
  }
  // Fall back to theme minor font (typical for bullets)
  const themeFont = fontScheme?.minorFont.latin;
  return themeFont ?? DEFAULT_FONT_FAMILY;
}

function resolveParagraphSpacing(
  spacing: Paragraph["properties"]["spaceBefore"] | Paragraph["properties"]["spaceAfter"] | undefined,
  defaultFontSize: Points
): Points {
  if (spacing === undefined) {
    return pt(0);
  }
  if (spacing.type === "points") {
    return spacing.value;
  }
  return pt((defaultFontSize as number) * ((spacing.value as number) / 100));
}

function resolveAlpha(transform: Color["transform"] | undefined): number {
  if (transform?.alpha !== undefined) {
    return transform.alpha / 100;
  }
  return 1;
}

function resolveBulletColor(
  bulletStyle: BulletStyle,
  colorContext: ColorContext
): string {
  if (bulletStyle.colorFollowText) {
    return "#000000";
  }
  return resolveColor(bulletStyle.color, colorContext) ?? "#000000";
}

function resolveBulletConfig(
  hasVisibleText: boolean,
  bulletStyle: BulletStyle | undefined,
  defaultFontSize: Points,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
  textFontFamily: string,
  autoNumberIndex: number,
  resourceResolver?: ResourceResolver,
): BulletConfig | undefined {
  if (hasVisibleText) {
    return toBulletConfig(
      bulletStyle,
      defaultFontSize,
      colorContext,
      fontScheme,
      textFontFamily,
      autoNumberIndex,
      resourceResolver
    );
  }
  return undefined;
}

function resolveBulletWithTextColor(
  bulletConfig: BulletConfig | undefined,
  bulletStyle: BulletStyle | undefined,
  firstSpanColor: string | undefined
): BulletConfig | undefined {
  if (bulletConfig === undefined) {
    return undefined;
  }

  // Check if bullet should follow text color:
  // 1. colorFollowText is explicitly true (a:buClrTx was present)
  // 2. No explicit bullet color was set (color is "#000000" placeholder)
  const shouldFollowTextColor =
    bulletStyle?.colorFollowText === true ||
    (bulletStyle?.color === undefined && firstSpanColor !== undefined);

  if (shouldFollowTextColor && firstSpanColor !== undefined) {
    return {
      ...bulletConfig,
      color: firstSpanColor,
    };
  }

  return bulletConfig;
}

// =============================================================================
// Text Box Conversion
// =============================================================================

/**
 * Convert domain AutoFit to layout AutoFitConfig.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.1-3
 */
function toAutoFitConfig(autoFit: AutoFit): AutoFitConfig {
  switch (autoFit.type) {
    case "none":
      return { type: "none" };
    case "shape":
      return { type: "shape" };
    case "normal":
      return {
        type: "normal",
        // Default fontScale: 100% (no scaling)
        fontScale: autoFit.fontScale ?? pct(100),
        // Default lineSpaceReduction: 0% (no reduction)
        lineSpaceReduction: autoFit.lineSpaceReduction ?? pct(0),
      };
  }
}

/**
 * Options for converting TextBody to TextBoxConfig.
 */
export type ToTextBoxConfigOptions = {
  /** TextBody domain object */
  readonly body: TextBody;
  /** Text box width in pixels */
  readonly width: Pixels;
  /** Text box height in pixels */
  readonly height: Pixels;
};

/**
 * Convert TextBody bodyProperties to TextBoxConfig
 */
export function toTextBoxConfig(options: ToTextBoxConfigOptions): TextBoxConfig {
  const { body, width, height } = options;
  const { bodyProperties } = body;

  // Determine wrap mode
  const wrapMode = resolveWrapMode(bodyProperties.wrapping);

  return {
    width,
    height,
    insetLeft: bodyProperties.insets.left,
    insetRight: bodyProperties.insets.right,
    insetTop: bodyProperties.insets.top,
    insetBottom: bodyProperties.insets.bottom,
    anchor: bodyProperties.anchor,
    anchorCenter: bodyProperties.anchorCenter,
    wrapMode,
    autoFit: toAutoFitConfig(bodyProperties.autoFit),
    // Overflow handling
    // @see ECMA-376 Part 1, Section 21.1.2.1.16 (horzOverflow)
    // @see ECMA-376 Part 1, Section 21.1.2.1.42 (vertOverflow)
    horzOverflow: bodyProperties.overflow,
    vertOverflow: bodyProperties.verticalOverflow ?? "overflow",
    // Additional body properties
    // @see ECMA-376 Part 1, Section 21.1.2.1.2
    compatLnSpc: bodyProperties.compatibleLineSpacing ?? false,
    forceAA: bodyProperties.forceAntiAlias ?? false,
    rtlCol: bodyProperties.rtlColumns ?? false,
    spcFirstLastPara: bodyProperties.spaceFirstLastPara ?? false,
    upright: bodyProperties.upright ?? false,
  };
}

// =============================================================================
// Run Properties Resolution
// =============================================================================

/**
 * Resolve run properties with defaults.
 *
 * Font families are resolved through the theme font scheme if they
 * contain theme references (+mj-lt, +mn-lt, etc.).
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.16-17 (theme fonts)
 */
function resolveRunProperties(
  props: RunProperties | undefined,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
): {
  fontSize: Points;
  fontFamily: string;
  fontFamilyEastAsian: string | undefined;
  fontFamilyComplexScript: string | undefined;
  fontFamilySymbol: string | undefined;
  fontWeight: number;
  fontStyle: "normal" | "italic";
  textDecoration: string | undefined;
  color: string;
  verticalAlign: "baseline" | "superscript" | "subscript";
  letterSpacing: Pixels;
  highlightColor: string | undefined;
  textTransform: "none" | "uppercase" | "lowercase" | undefined;
  linkId: string | undefined;
  linkTooltip: string | undefined;
  mouseOverLinkId: string | undefined;
  mouseOverLinkTooltip: string | undefined;
  bookmark: string | undefined;
  textOutline: TextOutlineConfig | undefined;
  kerning: Points | undefined;
  underlineColor: string | undefined;
} {
  const fontSize = props?.fontSize ?? pt(DEFAULT_FONT_SIZE_PT);

  // Resolve font families, handling theme references (+mj-lt, +mn-lt, etc.)
  // @see ECMA-376 Part 1, Section 20.1.4.1.16-17
  const fontFamily = resolveFontFamily(props?.fontFamily, fontScheme);

  // Font fallback families - also resolve theme references
  // @see ECMA-376 Part 1, Section 21.1.2.3.1-2, 21.1.2.3.10 (a:cs, a:ea, a:sym)
  const fontFamilyEastAsian = resolveThemeFontIfDefined(props?.fontFamilyEastAsian, fontScheme);
  const fontFamilyComplexScript = resolveThemeFontIfDefined(props?.fontFamilyComplexScript, fontScheme);
  const fontFamilySymbol = resolveThemeFontIfDefined(props?.fontFamilySymbol, fontScheme);
  const fontWeight = props?.bold === true ? 700 : 400;
  const fontStyle = props?.italic === true ? "italic" as const : "normal" as const;

  // Text decoration
  const decorations: string[] = [];
  if (props?.underline !== undefined && props.underline !== "none") {
    decorations.push("underline");
  }
  if (props?.strike !== undefined && props.strike !== "noStrike") {
    decorations.push("line-through");
  }
  const textDecoration = decorations.length > 0 ? decorations.join(" ") : undefined;

  // Color resolution
  const color = resolveColor(props?.color, colorContext) ?? "#000000";

  // Vertical alignment
  const verticalAlign = resolveVerticalAlign(props);

  // Letter spacing
  const letterSpacing = props?.spacing ?? px(0);

  // Highlight color
  const highlightColor = resolveColor(props?.highlightColor, colorContext);

  // Text transform from caps
  const textTransform = resolveTextTransform(props?.caps);

  // Hyperlink
  const linkId = props?.hyperlink?.id;
  const linkTooltip = props?.hyperlink?.tooltip;

  // Mouse-over hyperlink
  // @see ECMA-376 Part 1, Section 21.1.2.3.6 (a:hlinkMouseOver)
  const mouseOverLinkId = props?.hyperlinkMouseOver?.id;
  const mouseOverLinkTooltip = props?.hyperlinkMouseOver?.tooltip;

  // Bookmark
  // @see ECMA-376 Part 1, Section 21.1.2.3.9 (bmk attribute)
  const bookmark = props?.bookmark;

  // Text outline - will be resolved in textRunToSpan
  // Note: We can't resolve it here because we need colorContext in toTextOutlineConfig
  // but it's passed separately. Return undefined here.
  const textOutline = undefined as TextOutlineConfig | undefined;

  // Kerning threshold
  // @see ECMA-376 Part 1, Section 21.1.2.3.9 (kern attribute)
  const kerning = props?.kerning;

  // Underline color
  // @see ECMA-376 Part 1, Section 21.1.2.3.33 (a:uLn)
  const underlineColor = resolveColor(props?.underlineColor, colorContext);

  return {
    fontSize,
    fontFamily,
    fontFamilyEastAsian,
    fontFamilyComplexScript,
    fontFamilySymbol,
    fontWeight,
    fontStyle,
    textDecoration,
    color,
    verticalAlign,
    letterSpacing,
    highlightColor,
    textTransform,
    linkId,
    linkTooltip,
    mouseOverLinkId,
    mouseOverLinkTooltip,
    bookmark,
    textOutline,
    kerning,
    underlineColor,
  };
}

/**
 * Resolve a Color to a hex string with # prefix.
 *
 * Delegates to color-parser.ts resolveColor which properly handles:
 * - All color types (srgb, scheme, system, preset, hsl)
 * - Color transforms (lumMod, satMod, shade, tint, etc.)
 * - Color scheme/map resolution
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */
function resolveColor(
  color: Color | undefined,
  colorContext: ColorContext,
): string | undefined {
  if (color === undefined) {
    return undefined;
  }

  const resolved = resolveColorRaw(color, colorContext);
  return resolved !== undefined ? `#${resolved}` : undefined;
}

// =============================================================================
// Text Outline Conversion
// =============================================================================

/**
 * Resolve fill color from a Fill object.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
function resolveFillColor(fill: Fill, colorContext: ColorContext): string | undefined {
  switch (fill.type) {
    case "solidFill":
      return resolveColor(fill.color, colorContext);
    case "gradientFill":
      // For gradient, use first stop color as fallback
      if (fill.stops.length > 0) {
        return resolveColor(fill.stops[0].color, colorContext);
      }
      return undefined;
    case "noFill":
      return undefined;
    default:
      return undefined;
  }
}

/**
 * Convert Line to TextOutlineConfig for SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function toTextOutlineConfig(
  line: Line | undefined,
  colorContext: ColorContext,
): TextOutlineConfig | undefined {
  if (line === undefined) {
    return undefined;
  }

  // Resolve stroke color from line fill
  const strokeColor = resolveFillColor(line.fill, colorContext);
  if (strokeColor === undefined) {
    return undefined;
  }

  // Convert line cap to SVG stroke-linecap
  const cap = resolveLineCap(line.cap);

  // Convert line join to SVG stroke-linejoin
  const join = resolveLineJoin(line.join);

  return {
    width: line.width,
    color: strokeColor,
    cap,
    join,
  };
}

// =============================================================================
// Text Fill Conversion
// =============================================================================

/**
 * Convert Fill to TextFillConfig for SVG rendering.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 */
function toTextFillConfig(
  fill: Fill | undefined,
  colorContext: ColorContext,
): TextFillConfig | undefined {
  if (fill === undefined) {
    return undefined;
  }

  switch (fill.type) {
    case "solidFill": {
      const hex = resolveColor(fill.color, colorContext);
      if (hex === undefined) {
        return undefined;
      }
      const alpha = resolveAlpha(fill.color.transform);
      return {
        type: "solid",
        color: hex,
        alpha,
      };
    }

    case "gradientFill": {
      if (fill.stops.length === 0) {
        return undefined;
      }

      const stops = fill.stops
        .map((stop) => {
          const hex = resolveColor(stop.color, colorContext);
          if (hex === undefined) {
            return undefined;
          }
          const alpha = resolveAlpha(stop.color.transform);
          return {
            position: stop.position,
            color: hex,
            alpha,
          };
        })
        .filter((s): s is NonNullable<typeof s> => s !== undefined);

      if (stops.length === 0) {
        return undefined;
      }

      const isRadial = fill.path !== undefined;
      const radialCenter = resolveRadialCenter(fill, isRadial);

      return {
        type: "gradient",
        stops,
        angle: fill.linear?.angle !== undefined ? (fill.linear.angle as number) : 0,
        isRadial,
        radialCenter,
      };
    }

    case "noFill":
      // Return explicit noFill config for transparent text
      // @see ECMA-376 Part 1, Section 20.1.8.44 (a:noFill)
      return { type: "noFill" };

    case "blipFill":
    case "patternFill":
    case "groupFill":
      return undefined;
  }
}

// =============================================================================
// Text Run Conversion
// =============================================================================

/**
 * Convert a TextRun to LayoutSpan.
 *
 * @param run - TextRun domain object
 * @param colorContext - Color resolution context
 * @param fontScheme - Font scheme for resolving theme font references
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3.13 (a:r)
 */
function textRunToSpan(
  run: TextRun,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
): LayoutSpan {
  const props = resolveRunProperties(run.properties, colorContext, fontScheme);

  // Resolve text outline (a:ln on a:rPr)
  // @see ECMA-376 Part 1, Section 20.1.2.2.24
  const textOutline = toTextOutlineConfig(run.properties?.textOutline, colorContext);

  // Resolve text fill (gradFill, etc. on a:rPr)
  // @see ECMA-376 Part 1, Section 20.1.8
  const textFill = toTextFillConfig(run.properties?.fill, colorContext);

  // Resolve text direction from rtl attribute
  // @see ECMA-376 Part 1, Section 21.1.2.3.12 (a:rtl)
  const direction: "ltr" | "rtl" = run.properties?.rtl === true ? "rtl" : "ltr";

  if (run.type === "break") {
    return {
      text: "",
      isBreak: true,
      direction,
      ...props,
      textOutline,
      textFill,
    };
  }

  return {
    text: run.text,
    isBreak: false,
    direction,
    ...props,
    textOutline,
    textFill,
  };
}

// =============================================================================
// Bullet Conversion
// =============================================================================

/**
 * Get auto-number bullet character for a given index.
 *
 * @param bullet - Auto bullet configuration
 * @param index - 1-based index within the sequence
 * @returns Formatted bullet string
 *
 * @see ECMA-376 Part 1, 21.1.2.1.32 (ST_TextAutonumberScheme)
 */
function getAutoNumberChar(bullet: AutoNumberBullet, index: number): string {
  const scheme = bullet.scheme ?? "arabicPeriod";
  const startAt = bullet.startAt ?? 1;
  return formatAutoNumber(scheme, index, startAt);
}

/**
 * Convert bullet style to BulletConfig
 *
 * @param bulletStyle - Bullet style from domain
 * @param defaultFontSize - Default font size for the paragraph
 * @param colorContext - Color resolution context
 * @param fontScheme - Font scheme for resolving theme font references
 * @param textFontFamily - Font family from text for fontFollowText bullets
 * @param autoNumberIndex - 1-based index for auto-numbered bullets
 * @param resourceResolver - Optional function to resolve resource IDs to data URLs (for picture bullets)
 * @returns BulletConfig or undefined if no bullet
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet properties)
 */
function toBulletConfig(
  bulletStyle: BulletStyle | undefined,
  defaultFontSize: Points,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
  textFontFamily: string,
  autoNumberIndex: number,
  resourceResolver?: ResourceResolver,
): BulletConfig | undefined {
  if (bulletStyle === undefined) {
    return undefined;
  }

  const { bullet } = bulletStyle;

  // For picture bullets, resolve the image URL
  // @see ECMA-376 Part 1, Section 21.1.2.4.2 (a:buBlip)
  if (bullet.type === "blip") {
    const imageUrl = resourceResolver?.(bullet.resourceId);
    if (imageUrl !== undefined) {
      // Calculate font size for picture bullet (determines image size)
      const fontSize = resolveBulletFontSize(bulletStyle, defaultFontSize);

      return {
        char: "", // No character for picture bullets
        fontSize,
        color: "#000000", // Not used for picture bullets
        fontFamily: DEFAULT_FONT_FAMILY, // Not used for picture bullets
        imageUrl,
      };
    }
    // Fall back to no bullet if image cannot be resolved
    return undefined;
  }

  // Get bullet character
  const char = resolveBulletChar(bullet, autoNumberIndex);

  if (char === undefined) {
    return undefined;
  }

  // Calculate font size
  const fontSize = resolveBulletFontSize(bulletStyle, defaultFontSize);

  // Resolve color
  const color = resolveBulletColor(bulletStyle, colorContext);

  // Font family resolution:
  // - If fontFollowText, use the text's font family
  // - If explicit font specified, resolve theme references if needed
  // - Otherwise, fall back to theme minor font
  // @see ECMA-376 Part 1, Section 21.1.2.4.1 (a:buFont)
  const fontFamily = resolveBulletFontFamily(bulletStyle, textFontFamily, fontScheme);

  return {
    char,
    fontSize,
    color,
    fontFamily,
  };
}

// =============================================================================
// Paragraph Conversion
// =============================================================================

/**
 * Convert a Paragraph to LayoutParagraphInput
 *
 * @param para - Paragraph domain object
 * @param colorContext - Color resolution context
 * @param fontScheme - Font scheme for resolving theme font references
 * @param autoNumberIndex - 1-based index for auto-numbered bullets
 * @param resourceResolver - Optional function to resolve resource IDs to data URLs (for picture bullets)
 * @returns LayoutParagraphInput for the layout engine
 */
function paragraphToInput(
  para: Paragraph,
  colorContext: ColorContext,
  fontScheme: FontScheme | undefined,
  autoNumberIndex: number,
  resourceResolver?: ResourceResolver,
): LayoutParagraphInput {
  const { properties } = para;

  // Convert runs to spans
  const spans = para.runs.map((run) => textRunToSpan(run, colorContext, fontScheme));

  // Get default font size from first run
  const defaultFontSize = spans[0]?.fontSize ?? pt(DEFAULT_FONT_SIZE_PT);

  // Convert line spacing
  const lineSpacing = properties.lineSpacing;

  // Convert space before/after
  const spaceBefore = resolveParagraphSpacing(properties.spaceBefore, defaultFontSize);
  const spaceAfter = resolveParagraphSpacing(properties.spaceAfter, defaultFontSize);

  // Check if paragraph has visible text content.
  //
  // Empty paragraphs (containing only a:endParaRPr with no a:r text runs) do not
  // render bullets. This behavior is derived from:
  //
  // 1. a:endParaRPr purpose (ECMA-376 Part 1, Section 21.1.2.2.3):
  //    "This element specifies the text run properties that are to be used if
  //    another run is inserted after the last run specified."
  //    @see http://www.datypic.com/sc/ooxml/e-a_endParaRPr-1.html
  //    This means a:endParaRPr is editing metadata, not renderable content.
  //
  // 2. Paragraph structure (ECMA-376 Part 1, Section 21.1.2.2.6):
  //    a:p contains optional a:pPr, zero or more a:r (text runs), and optional a:endParaRPr.
  //    @see https://www.datypic.com/sc/ooxml/e-a_p-1.html
  //
  // 3. Bullets are visual markers that precede text content.
  //    If there are no text runs (a:r), there is no content for the bullet to mark.
  //
  // NOTE: ECMA-376 does not explicitly state "do not render bullets for empty paragraphs".
  // This interpretation may need Dialect-level adjustment if implementations differ.
  const hasVisibleText = spans.some((span) => span.text.length > 0 && !span.isBreak);

  // Convert bullet with auto-number index
  // @see ECMA-376 Part 1, Section 21.1.2.4 (Bullet properties)
  // Only compute bullet config if paragraph has visible text content
  // Pass first span's font family for fontFollowText bullets
  const textFontFamily = spans[0]?.fontFamily ?? DEFAULT_FONT_FAMILY;
  const bulletConfig = resolveBulletConfig(
    hasVisibleText,
    properties.bulletStyle,
    defaultFontSize,
    colorContext,
    fontScheme,
    textFontFamily,
    autoNumberIndex,
    resourceResolver
  );

  // Apply bullet color inheritance per ECMA-376 Part 1, Section 21.1.2.4.4-5
  // When a:buClr is not specified and a:buClrTx is not present, bullet color follows text color.
  // This is the implicit buClrTx behavior per ECMA-376.
  const firstSpanColor = spans[0]?.color;
  const bullet = resolveBulletWithTextColor(bulletConfig, properties.bulletStyle, firstSpanColor);

  // Convert font alignment
  // @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
  const fontAlignment: FontAlignment = properties.fontAlignment ?? "auto";

  // Convert default tab size
  // Default: 914400 EMU = 1 inch = 96px at 96 DPI
  // @see ECMA-376 Part 1, Section 21.1.2.2.7 (defTabSz attribute)
  const defaultTabSize = properties.defaultTabSize ?? px(96);

  // Convert tab stops
  // @see ECMA-376 Part 1, Section 21.1.2.2.13 (a:tabLst)
  const tabStops: LayoutTabStop[] = (properties.tabStops ?? []).map((tab) => ({
    position: tab.position,
    alignment: tab.alignment,
  }));

  // Line break behavior flags
  // @see ECMA-376 Part 1, Section 21.1.2.2.7
  const eaLineBreak = properties.eaLineBreak ?? true; // default: true
  const latinLineBreak = properties.latinLineBreak ?? false; // default: false
  const hangingPunctuation = properties.hangingPunctuation ?? true; // default: true

  // Get endParaRPr font size for empty paragraph line height calculation
  // Per ECMA-376 Part 1, Section 21.1.2.2.3:
  // Empty paragraphs should use endParaRPr font size for height
  // @see ECMA-376 Part 1, Section 21.1.2.2.3 (a:endParaRPr)
  const endParaFontSize = para.endProperties?.fontSize ?? defaultFontSize;

  return {
    spans,
    alignment: properties.alignment,
    marginLeft: properties.marginLeft ?? px(0),
    indent: properties.indent ?? px(0),
    marginRight: properties.marginRight ?? px(0),
    spaceBefore,
    spaceAfter,
    lineSpacing,
    bullet,
    fontAlignment,
    defaultTabSize,
    tabStops,
    eaLineBreak,
    latinLineBreak,
    hangingPunctuation,
    endParaFontSize,
  };
}

// =============================================================================
// Main Adapter Function
// =============================================================================

/**
 * Check if a paragraph has an auto-numbered bullet.
 */
function hasAutoNumberBullet(para: Paragraph): boolean {
  const bulletStyle = para.properties.bulletStyle;
  return bulletStyle !== undefined && bulletStyle.bullet.type === "auto";
}

/**
 * Resource resolver function for converting resource IDs to data URLs.
 * Used for resolving picture bullet images.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.4.2 (a:buBlip)
 */
export type ResourceResolver = (resourceId: string) => string | undefined;

/**
 * Options for converting TextBody to LayoutInput.
 */
export type ToLayoutInputOptions = {
  /** The TextBody domain object */
  readonly body: TextBody;
  /** Text box width in pixels */
  readonly width: Pixels;
  /** Text box height in pixels */
  readonly height: Pixels;
  /** Color resolution context */
  readonly colorContext: ColorContext;
  /** Font scheme for resolving theme font references (+mj-lt, +mn-lt, etc.) */
  readonly fontScheme?: FontScheme;
  /** Optional render options */
  readonly renderOptions?: RenderOptions;
  /** Optional function to resolve resource IDs to data URLs (for picture bullets) */
  readonly resourceResolver?: ResourceResolver;
};

/**
 * Convert TextBody domain object to LayoutInput.
 *
 * This function tracks auto-number sequences across paragraphs.
 * Each auto-numbered paragraph gets an incrementing index.
 *
 * @see ECMA-376 Part 1, 21.1.2.4.1 (a:buAutoNum)
 * @see ECMA-376 Part 1, 20.1.4.1.16-17 (theme fonts)
 */
export function toLayoutInput(options: ToLayoutInputOptions): LayoutInput {
  const { body, width, height, colorContext, fontScheme, renderOptions, resourceResolver } = options;
  const textBox = toTextBoxConfig({ body, width, height });

  // Track auto-number index across paragraphs
  const autoNumberState = { index: 0 };

  const paragraphs = body.paragraphs.map((para) => {
    // Increment index for auto-numbered bullets
    if (hasAutoNumberBullet(para)) {
      autoNumberState.index += 1;
    } else {
      // Reset counter when encountering non-auto-numbered paragraph
      // Note: ECMA-376 specifies that auto-number sequence resets
      // when bullet type changes or when startAt is explicitly set
      // For simplicity, we reset on any non-auto paragraph
      autoNumberState.index = 0;
    }

    return paragraphToInput(para, colorContext, fontScheme, autoNumberState.index, resourceResolver);
  });

  return {
    textBox,
    paragraphs,
    renderOptions,
  };
}

function resolveRadialCenter(
  fill: Fill,
  isRadial: boolean
): { cx: number; cy: number } | undefined {
  if (!isRadial || !fill.path?.fillToRect) {
    return undefined;
  }

  const rect = fill.path.fillToRect;
  return {
    cx: ((rect.left as number) + (100 - (rect.right as number))) / 2,
    cy: ((rect.top as number) + (100 - (rect.bottom as number))) / 2,
  };
}
