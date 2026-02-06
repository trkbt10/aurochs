/** @file Test utilities for chart rendering */
import type { BaseFill } from "@oxen-office/drawing-ml/domain/fill";
import { resolveColor } from "@oxen-office/drawing-ml/domain/color-resolution";
import type { ColorContext } from "@oxen-office/drawing-ml/domain/color-context";
import type { GenericTextBody, ChartRenderContext, FillResolver, RenderWarning, ResolvedFill, ResolvedTextStyle, WarningCollector } from "./types";

function createNoopWarnings(): WarningCollector {
  const warnings: RenderWarning[] = [];
  return {
    add: (w) => warnings.push(w),
    getAll: () => warnings,
    hasErrors: () => warnings.some((w) => w.type === "error"),
  };
}

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
    if (!first) {return undefined;}
    return normalizeHexColor(first.color.hex);
  }
  return undefined;
}

/** Creates a fill resolver for testing with optional color context. */
export function createTestFillResolver(colorContext?: ColorContext): FillResolver {
  return {
    resolve: (fill: BaseFill): ResolvedFill => {
      switch (fill.type) {
        case "noFill":
          return { type: "none" };
        case "groupFill":
          return { type: "unresolved", originalType: "groupFill" };
        case "solidFill": {
          const hex = resolveColor(fill.color, colorContext);
          return { type: "solid", color: { hex: hex ?? "000000", alpha: 1 } };
        }
        case "gradientFill": {
          const stops = fill.stops.map((s) => {
            const hex = resolveColor(s.color, colorContext);
            return { position: typeof s.position === "number" ? s.position : 0, color: { hex: hex ?? "000000", alpha: 1 } };
          });
          const angle = fill.linear?.angle;
          return { type: "gradient", stops, angle: typeof angle === "number" ? angle : 0, isRadial: fill.path !== undefined };
        }
        case "patternFill":
          return { type: "pattern", preset: fill.preset };
      }
    },
  };
}

/** Creates a test chart render context with optional configuration. */
export function createTestChartRenderContext(options?: {
  readonly colorContext?: ColorContext;
  readonly axisColor?: string;
  readonly gridlineColor?: string;
  readonly defaultTextColor?: string;
}): { ctx: ChartRenderContext; fillResolver: FillResolver } {
  const fillResolver = createTestFillResolver(options?.colorContext);
  const warnings = createNoopWarnings();

  const defaultTextColor = options?.defaultTextColor ?? "#666";
  const axisColor = options?.axisColor ?? "#333";
  const gridlineColor = options?.gridlineColor ?? "#ddd";

  const ctx: ChartRenderContext = {
    getSeriesColor: (index, explicit) => {
      const explicitResolved = explicit ? resolvedFillToCssColor(fillResolver.resolve(explicit)) : undefined;
      if (explicitResolved) {
        return explicitResolved;
      }

      const palette = ["#4472C4", "#ED7D31", "#A5A5A5", "#FFC000", "#5B9BD5", "#70AD47"];
      return palette[index % palette.length];
    },
    getAxisColor: () => axisColor,
    getGridlineColor: () => gridlineColor,
    getTextStyle: (textBody?: GenericTextBody): ResolvedTextStyle => {
      const defaultStyle: ResolvedTextStyle = {
        fontFamily: "Calibri",
        fontSize: 9,
        fontWeight: "normal",
        color: defaultTextColor,
      };

      if (!textBody) {
        return defaultStyle;
      }

      const firstPara = textBody.paragraphs[0];
      const defRPr = firstPara?.properties.defaultRunProperties;
      const firstRunProps = firstPara?.runs[0]?.properties;
      const props = defRPr ?? firstRunProps;

      const fontSize = typeof props?.fontSize === "number" ? props.fontSize : defaultStyle.fontSize;
      const fontFamily = props?.fontFamily ?? defaultStyle.fontFamily;
      const fontWeight = props?.bold ? "bold" : defaultStyle.fontWeight;
      const colorHex = props?.color ? resolveColor(props.color, options?.colorContext) : undefined;
      const color = colorHex ? normalizeHexColor(colorHex) : defaultStyle.color;

      return { fontFamily, fontSize, fontWeight, color };
    },
    warnings,
  };

  return { ctx, fillResolver };
}
