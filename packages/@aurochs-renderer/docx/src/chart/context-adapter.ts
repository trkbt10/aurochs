/**
 * @file DOCX Chart Context Adapter
 *
 * Adapts DOCX drawing context to chart rendering context.
 *
 * @see ECMA-376 Part 1, Section 21.2 (DrawingML - Charts)
 */

import type { ChartRenderContext, FillResolver, GenericTextBody, ResolvedFill } from "@aurochs-renderer/chart/svg";
import type { BaseFill } from "@aurochs-office/drawing-ml/domain/fill";
import type { Color } from "@aurochs-office/drawing-ml/domain/color";
import type { DocxDrawingRenderContext } from "../react/context";

// =============================================================================
// Default Colors
// =============================================================================

/**
 * Default accent colors for chart series (Office theme colors).
 */
const DEFAULT_ACCENT_COLORS = [
  "#4472c4", // accent1
  "#ed7d31", // accent2
  "#a5a5a5", // accent3
  "#ffc000", // accent4
  "#5b9bd5", // accent5
  "#70ad47", // accent6
];

/**
 * Default axis color.
 */
const DEFAULT_AXIS_COLOR = "#808080";

/**
 * Default gridline color.
 */
const DEFAULT_GRIDLINE_COLOR = "#d9d9d9";

// =============================================================================
// Helpers
// =============================================================================

/**
 * Normalize hex color string.
 */
function normalizeHexColor(color: string): string {
  if (color.startsWith("#")) {
    return color;
  }
  if (/^[0-9A-Fa-f]{6}$/.test(color)) {
    return `#${color}`;
  }
  return color;
}

/**
 * Resolve scheme color using color context.
 */
function resolveSchemeColor(
  schemeColor: string,
  ctx: DocxDrawingRenderContext,
): string | undefined {
  // First check color map for remapping
  const mappedColor = ctx.colorContext.colorMap[schemeColor];
  const lookupKey = mappedColor ?? schemeColor;

  // Look up in color scheme
  return ctx.colorContext.colorScheme[lookupKey];
}

// =============================================================================
// Fill Resolver
// =============================================================================

/**
 * Resolve a Color to a hex string.
 */
function resolveColorToHex(color: Color | undefined, ctx: DocxDrawingRenderContext): string {
  if (color === undefined) {
    return "#000000";
  }

  const spec = color.spec;

  switch (spec.type) {
    case "srgb":
      return normalizeHexColor(spec.value);
    case "scheme": {
      const resolved = resolveSchemeColor(spec.value, ctx);
      if (resolved !== undefined) {
        return normalizeHexColor(resolved);
      }
      return "#000000";
    }
    case "preset": {
      // Common preset colors
      const presetColors: Record<string, string> = {
        black: "#000000",
        white: "#FFFFFF",
        red: "#FF0000",
        green: "#00FF00",
        blue: "#0000FF",
      };
      return presetColors[spec.value] ?? "#000000";
    }
    default:
      return "#000000";
  }
}

/**
 * Creates a fill resolver for DOCX charts.
 */
export function createDocxFillResolver(ctx: DocxDrawingRenderContext): FillResolver {
  return {
    resolve(fill: BaseFill): ResolvedFill {
      if (fill === undefined) {
        return { type: "none" };
      }

      if (fill.type === "solidFill") {
        // Resolve solid fill color
        const colorDef = fill.color;
        const hex = resolveColorToHex(colorDef, ctx);
        // Check for alpha transform (OOXML alpha is in 1/100000)
        const alphaValue = colorDef?.transform?.alpha;
        const alpha = alphaValue !== undefined ? alphaValue / 100000 : 1;

        return { type: "solid", color: { hex, alpha } };
      }

      if (fill.type === "noFill") {
        return { type: "none" };
      }

      // Unsupported fill types
      return { type: "unresolved", originalType: fill.type };
    },
  };
}

// =============================================================================
// Chart Render Context
// =============================================================================

/**
 * Creates a chart render context from DOCX drawing context.
 */
export function createDocxChartRenderContext(ctx: DocxDrawingRenderContext): ChartRenderContext {
  const fillResolver = createDocxFillResolver(ctx);

  return {
    getSeriesColor(index: number, explicit?: BaseFill): string {
      if (explicit !== undefined) {
        const resolved = fillResolver.resolve(explicit);
        if (resolved.type === "solid") {
          return resolved.color.hex;
        }
      }

      // Try to get accent color from theme
      const accentKeys = ["accent1", "accent2", "accent3", "accent4", "accent5", "accent6"] as const;
      const accentKey = accentKeys[index % accentKeys.length];
      const themeColor = ctx.colorContext.colorScheme[accentKey];
      if (themeColor !== undefined) {
        return normalizeHexColor(themeColor);
      }

      // Fall back to default accent colors
      return DEFAULT_ACCENT_COLORS[index % DEFAULT_ACCENT_COLORS.length];
    },

    getAxisColor(): string {
      return DEFAULT_AXIS_COLOR;
    },

    getGridlineColor(): string {
      return DEFAULT_GRIDLINE_COLOR;
    },

    getTextStyle(_textBody?: GenericTextBody) {
      return {
        fontFamily: "Calibri, sans-serif",
        fontSize: 11,
        fontWeight: "normal",
        color: "#000000",
      };
    },

    warnings: {
      add: (warning) => ctx.warnings.add({ type: "unsupported", message: warning.message }),
      getAll: () => [],
      hasErrors: () => false,
    },
  };
}
