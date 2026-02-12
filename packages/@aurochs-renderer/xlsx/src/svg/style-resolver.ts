/**
 * @file Style resolution for XLSX cells
 *
 * Resolves styleId to complete computed styles including:
 * - Font (name, size, bold, italic, color, etc.)
 * - Fill (background color, patterns, gradients)
 * - Border (edges with styles and colors)
 * - Alignment
 * - Number format
 *
 * @see ECMA-376 Part 4, Section 18.8 (Styles)
 */

import type { XlsxStyleSheet, XlsxCellXf } from "@aurochs-office/xlsx/domain/style/types";
import type { XlsxFont } from "@aurochs-office/xlsx/domain/style/font";
import type { XlsxFill } from "@aurochs-office/xlsx/domain/style/fill";
import type { XlsxBorder, XlsxBorderEdge } from "@aurochs-office/xlsx/domain/style/border";
import type { StyleId } from "@aurochs-office/xlsx/domain/types";
import type { ColorScheme } from "@aurochs-office/drawing-ml/domain/color-context";
import { resolveFormatCode } from "@aurochs-office/xlsx/domain/style/number-format";
import type {
  ResolvedCellStyle,
  ResolvedFont,
  ResolvedFill,
  ResolvedBorder,
  ResolvedBorderEdge,
  XlsxRenderOptions,
} from "./types";
import { resolveXlsxColor, getDefaultFontColor, getDefaultBorderColor } from "./color-resolver";

// =============================================================================
// Default Styles
// =============================================================================

/**
 * Create default resolved font.
 */
export function createDefaultFont(options: XlsxRenderOptions): ResolvedFont {
  return {
    name: options.defaultFontFamily,
    size: options.defaultFontSize,
    color: getDefaultFontColor(),
  };
}

/**
 * Create default resolved fill (none).
 */
export function createDefaultFill(): ResolvedFill {
  return { type: "none" };
}

/**
 * Create default resolved border (no borders).
 */
export function createDefaultBorder(): ResolvedBorder {
  return {};
}

/**
 * Create default resolved style.
 */
export function createDefaultStyle(options: XlsxRenderOptions): ResolvedCellStyle {
  return {
    font: createDefaultFont(options),
    fill: createDefaultFill(),
    border: createDefaultBorder(),
    numberFormat: "General",
  };
}

// =============================================================================
// Font Resolution
// =============================================================================

type ColorResolveParams = {
  readonly colorScheme?: ColorScheme;
  readonly indexedColors?: readonly string[];
};

function resolveFont(font: XlsxFont, params: ColorResolveParams): ResolvedFont {
  const fontColor = resolveFontColor(font, params);

  return {
    name: font.name,
    size: font.size,
    bold: font.bold,
    italic: font.italic,
    underline: font.underline !== undefined && font.underline !== "none",
    strikethrough: font.strikethrough,
    color: fontColor,
    vertAlign: font.vertAlign,
  };
}

function resolveFontColor(font: XlsxFont, params: ColorResolveParams): string {
  if (!font.color) {
    return getDefaultFontColor();
  }
  return resolveXlsxColor(font.color, params.colorScheme, params.indexedColors) ?? getDefaultFontColor();
}

// =============================================================================
// Fill Resolution
// =============================================================================

function resolveFill(fill: XlsxFill, params: ColorResolveParams): ResolvedFill {
  switch (fill.type) {
    case "none":
      return { type: "none" };

    case "pattern":
      return resolvePatternFill(fill.pattern, params);

    case "gradient":
      return resolveGradientFill(fill.gradient, params);

    default:
      return { type: "none" };
  }
}

function resolvePatternFill(
  pattern: { patternType: string; fgColor?: { type: string; value?: string; theme?: number; tint?: number; index?: number } },
  params: ColorResolveParams,
): ResolvedFill {
  const { patternType, fgColor } = pattern;

  if (patternType === "none") {
    return { type: "none" };
  }

  if (patternType === "solid" || patternType !== "none") {
    const color = resolveXlsxColor(fgColor as Parameters<typeof resolveXlsxColor>[0], params.colorScheme, params.indexedColors);
    if (color) {
      return { type: "solid", color };
    }
  }

  return { type: "none" };
}

type GradientFillInput = {
  gradientType: "linear" | "path";
  degree?: number;
  stops: readonly { position: number; color: Parameters<typeof resolveXlsxColor>[0] }[];
};

function resolveGradientFill(gradient: GradientFillInput, params: ColorResolveParams): ResolvedFill {
  const { gradientType, degree, stops } = gradient;
  const resolvedStops = stops.map((stop) => ({
    position: stop.position,
    color: resolveXlsxColor(stop.color, params.colorScheme, params.indexedColors) ?? "#FFFFFF",
  }));

  return {
    type: "gradient",
    gradientType,
    degree,
    stops: resolvedStops,
  };
}

// =============================================================================
// Border Resolution
// =============================================================================

function resolveBorderEdge(edge: XlsxBorderEdge | undefined, params: ColorResolveParams): ResolvedBorderEdge | undefined {
  if (!edge || edge.style === "none") {
    return undefined;
  }

  const edgeColor = resolveEdgeColor(edge, params);

  return {
    style: edge.style,
    color: edgeColor,
  };
}

function resolveEdgeColor(edge: XlsxBorderEdge, params: ColorResolveParams): string {
  if (!edge.color) {
    return getDefaultBorderColor();
  }
  return resolveXlsxColor(edge.color, params.colorScheme, params.indexedColors) ?? getDefaultBorderColor();
}

function resolveBorder(border: XlsxBorder, params: ColorResolveParams): ResolvedBorder {
  return {
    left: resolveBorderEdge(border.left, params),
    right: resolveBorderEdge(border.right, params),
    top: resolveBorderEdge(border.top, params),
    bottom: resolveBorderEdge(border.bottom, params),
    diagonal: resolveBorderEdge(border.diagonal, params),
    diagonalUp: border.diagonalUp,
    diagonalDown: border.diagonalDown,
  };
}

// =============================================================================
// Cell Style Resolution
// =============================================================================

type ResolveCellStyleParams = {
  readonly styleId: StyleId | undefined;
  readonly styles: XlsxStyleSheet;
  readonly colorScheme: ColorScheme | undefined;
  readonly options: XlsxRenderOptions;
};

/**
 * Resolve a cell's style by its styleId.
 */
export function resolveCellStyle(params: ResolveCellStyleParams): ResolvedCellStyle {
  const { styleId, styles, colorScheme, options } = params;

  if (styleId === undefined) {
    return createDefaultStyle(options);
  }

  const cellXf = styles.cellXfs[styleId as number];
  if (!cellXf) {
    return createDefaultStyle(options);
  }

  const colorParams: ColorResolveParams = {
    colorScheme,
    indexedColors: styles.indexedColors,
  };

  return buildResolvedStyle({ cellXf, styles, colorParams, options });
}

type BuildResolvedStyleParams = {
  readonly cellXf: XlsxCellXf;
  readonly styles: XlsxStyleSheet;
  readonly colorParams: ColorResolveParams;
  readonly options: XlsxRenderOptions;
};

function buildResolvedStyle(params: BuildResolvedStyleParams): ResolvedCellStyle {
  const { cellXf, styles, colorParams, options } = params;

  const font = resolveXlsxCellXfFont({ cellXf, styles, colorParams, options });
  const fill = resolveXlsxCellXfFill({ cellXf, styles, colorParams });
  const border = resolveXlsxCellXfBorder({ cellXf, styles, colorParams });
  const numberFormat = resolveFormatCode(cellXf.numFmtId as number, styles.numberFormats);

  return {
    font,
    fill,
    border,
    alignment: cellXf.alignment,
    numberFormat,
  };
}

type ResolveFontParams = {
  readonly cellXf: XlsxCellXf;
  readonly styles: XlsxStyleSheet;
  readonly colorParams: ColorResolveParams;
  readonly options: XlsxRenderOptions;
};

function resolveXlsxCellXfFont(params: ResolveFontParams): ResolvedFont {
  const { cellXf, styles, colorParams, options } = params;
  const font = styles.fonts[cellXf.fontId as number];
  if (!font) {
    return createDefaultFont(options);
  }
  return resolveFont(font, colorParams);
}

type ResolveFillParams = {
  readonly cellXf: XlsxCellXf;
  readonly styles: XlsxStyleSheet;
  readonly colorParams: ColorResolveParams;
};

function resolveXlsxCellXfFill(params: ResolveFillParams): ResolvedFill {
  const { cellXf, styles, colorParams } = params;
  const fill = styles.fills[cellXf.fillId as number];
  if (!fill) {
    return createDefaultFill();
  }
  return resolveFill(fill, colorParams);
}

type ResolveBorderParams = {
  readonly cellXf: XlsxCellXf;
  readonly styles: XlsxStyleSheet;
  readonly colorParams: ColorResolveParams;
};

function resolveXlsxCellXfBorder(params: ResolveBorderParams): ResolvedBorder {
  const { cellXf, styles, colorParams } = params;
  const border = styles.borders[cellXf.borderId as number];
  if (!border) {
    return createDefaultBorder();
  }
  return resolveBorder(border, colorParams);
}

// =============================================================================
// Style Cache
// =============================================================================

type StyleCacheConfig = {
  readonly styles: XlsxStyleSheet;
  readonly colorScheme: ColorScheme | undefined;
  readonly options: XlsxRenderOptions;
};

/**
 * Create a style cache for efficient style resolution.
 *
 * Caches resolved styles by styleId to avoid repeated resolution.
 */
export function createStyleCache(
  styles: XlsxStyleSheet,
  colorScheme: ColorScheme | undefined,
  options: XlsxRenderOptions,
): (styleId: StyleId | undefined) => ResolvedCellStyle {
  const cache = new Map<number | undefined, ResolvedCellStyle>();
  const config: StyleCacheConfig = { styles, colorScheme, options };

  return (styleId) => {
    const key = styleId as number | undefined;
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }

    const resolved = resolveCellStyle({ styleId, styles: config.styles, colorScheme: config.colorScheme, options: config.options });
    cache.set(key, resolved);
    return resolved;
  };
}
