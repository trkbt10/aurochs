/**
 * @file Chart render context adapter for PPTX rendering
 */

import type { ChartRenderContext, FillResolver, ResolvedFill, ResolvedTextStyle } from "@aurochs-renderer/chart/svg";
import type { GenericTextBody } from "@aurochs-renderer/chart/svg";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Fill } from "@aurochs-office/pptx/domain/color/types";
import { resolveColor } from "@aurochs-office/drawing-ml/domain/color-resolution";
import { resolveThemeFont } from "@aurochs-office/ooxml/domain/font-scheme";
import { resolveFill } from "@aurochs-office/pptx/domain/color/fill";
import type { CoreRenderContext } from "../render-context";
import { FALLBACK_CHART_COLORS } from "./colors";

function normalizeHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}

function resolvedFillToCssColor(fill: ResolvedFill): string | undefined {
  if (fill.type === "solid") {
    return normalizeHexColor(fill.color.hex);
  }
  if (fill.type === "gradient") {
    const first = fill.stops[0];
    if (!first) {
      return undefined;
    }
    return normalizeHexColor(first.color.hex);
  }
  return undefined;
}

function resolveFillForChartRender(fill: BaseFill, ctx: CoreRenderContext): ResolvedFill {
  // Skip blip fills (charts don't typically use blip fills)
  if (fill.type === "blipFill") {
    return { type: "unresolved", originalType: "blipFill" };
  }
  const resolved = resolveFill(fill as Fill, ctx.colorContext, ctx.resources.resolve);
  switch (resolved.type) {
    case "none":
      return { type: "none" };
    case "solid":
      return { type: "solid", color: resolved.color };
    case "gradient":
      return {
        type: "gradient",
        stops: resolved.stops,
        angle: resolved.angle,
        isRadial: resolved.isRadial,
        radialCenter: resolved.radialCenter,
      };
    case "pattern":
      return { type: "pattern", preset: resolved.preset };
    case "image":
      return { type: "unresolved", originalType: "image" };
    case "unresolved":
      return { type: "unresolved", originalType: resolved.originalType };
  }
}

/**
 * Create a FillResolver that adapts PPTX fill resolution to chart renderer.
 */
export function createFillResolver(ctx: CoreRenderContext): FillResolver {
  return {
    resolve: (fill) => resolveFillForChartRender(fill, ctx),
  };
}

/**
 * Create a ChartRenderContext from a PPTX CoreRenderContext.
 */
export function createChartRenderContext(ctx: CoreRenderContext): ChartRenderContext {
  return {
    getSeriesColor: (index: number, explicit?: BaseFill): string => {
      if (explicit) {
        const resolved = resolveFillForChartRender(explicit, ctx);
        const color = resolvedFillToCssColor(resolved);
        if (color) {
          return color;
        }
      }

      const accentKeys = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"] as const;
      const accentKey = accentKeys[index % accentKeys.length];
      const themeColor = ctx.colorContext.colorScheme[accentKey];
      if (themeColor) {
        return normalizeHexColor(themeColor);
      }

      return FALLBACK_CHART_COLORS[index % FALLBACK_CHART_COLORS.length] ?? "#4472C4";
    },
    getAxisColor: () => "#333",
    getGridlineColor: () => "#ddd",
    getTextStyle: (textBody?: GenericTextBody): ResolvedTextStyle => {
      const defaultStyle: ResolvedTextStyle = {
        fontFamily: "Calibri",
        fontSize: 9,
        fontWeight: "normal",
        color: "#666",
      };

      if (!textBody) {
        return defaultStyle;
      }

      const firstPara = textBody.paragraphs[0];
      const defRPr = firstPara?.properties.defaultRunProperties;
      const firstRunProps = firstPara?.runs[0]?.properties;
      const props = defRPr ?? firstRunProps;

      const fontSize = typeof props?.fontSize === "number" ? props.fontSize : defaultStyle.fontSize;
      const fontFamily = resolveThemeFont(props?.fontFamily, ctx.fontScheme) ?? defaultStyle.fontFamily;
      const fontWeight = props?.bold ? "bold" : defaultStyle.fontWeight;
      const colorHex = props?.color ? resolveColor(props.color, ctx.colorContext) : undefined;
      const color = colorHex ? normalizeHexColor(colorHex) : defaultStyle.color;

      return { fontFamily, fontSize, fontWeight, color };
    },
    warnings: ctx.warnings,
  };
}
