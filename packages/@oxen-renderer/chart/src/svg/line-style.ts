/**
 * @file Chart line styling utilities
 *
 * Extract line styling from ChartLines and ChartShapeProperties
 * following ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.30 (CT_ChartLines)
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */

import type { ChartLines, ChartShapeProperties } from "@oxen-office/chart/domain";
import type { BaseFill } from "@oxen-office/drawing-ml/domain/fill";
import type { FillResolver, ResolvedFill } from "./types";

// =============================================================================
// Default Values
// =============================================================================

/**
 * Default line styling values
 *
 * Per ECMA-376, implementation-defined defaults are used when not specified.
 */
export const DEFAULT_LINE_COLOR = "#000000";
export const DEFAULT_LINE_WIDTH = 1;
export const DEFAULT_DROP_LINE_COLOR = "#808080";
export const DEFAULT_DROP_LINE_DASH = "2,2";
export const DEFAULT_HI_LOW_LINE_COLOR = "#000000";

// =============================================================================
// Types
// =============================================================================

/**
 * Resolved line style for SVG rendering
 */
export type ResolvedLineStyle = {
  readonly color: string;
  readonly width: number;
  readonly dashArray?: string;
};

// =============================================================================
// Style Extraction
// =============================================================================

/**
 * Extract line style from ChartShapeProperties
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
export function extractLineStyle(spPr: ChartShapeProperties | undefined, fillResolver: FillResolver): ResolvedLineStyle {
  if (!spPr?.line) {
    return {
      color: DEFAULT_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
    };
  }

  const line = spPr.line;

  // Extract color from line fill
  const color = resolveLineColor(line.fill, fillResolver);

  // Extract width (convert from EMU to pixels if needed)
  const width = line.width ?? DEFAULT_LINE_WIDTH;

  // Extract dash pattern
  const dashArray = typeof line.dash === "string" ? mapDashStyle(line.dash) : undefined;

  return { color, width, dashArray };
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

function resolvedFillToColor(fill: ResolvedFill): string | undefined {
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

function resolveLineColor(fill: BaseFill | undefined, fillResolver: FillResolver): string {
  if (!fill) {
    return DEFAULT_LINE_COLOR;
  }
  const resolved = fillResolver.resolve(fill);
  const color = resolvedFillToColor(resolved);
  return color ?? DEFAULT_LINE_COLOR;
}

/**
 * Extract drop line style from ChartLines
 *
 * @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
 */
export function extractDropLineStyle(chartLines: ChartLines | undefined, fillResolver: FillResolver): ResolvedLineStyle {
  if (!chartLines?.shapeProperties) {
    return {
      color: DEFAULT_DROP_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
      dashArray: DEFAULT_DROP_LINE_DASH,
    };
  }

  return extractLineStyle(chartLines.shapeProperties, fillResolver);
}

/**
 * Extract hi-low line style from ChartLines
 *
 * @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
 */
export function extractHiLowLineStyle(chartLines: ChartLines | undefined, fillResolver: FillResolver): ResolvedLineStyle {
  if (!chartLines?.shapeProperties) {
    return {
      color: DEFAULT_HI_LOW_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
    };
  }

  return extractLineStyle(chartLines.shapeProperties, fillResolver);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Map ECMA-376 dash style to SVG dash array
 *
 * @see ECMA-376 Part 1, Section 20.1.10.32 (ST_PresetLineDashVal)
 */
function mapDashStyle(dashStyle: string | undefined): string | undefined {
  switch (dashStyle) {
    case "solid":
      return undefined;
    case "dot":
      return "1,1";
    case "dash":
      return "4,3";
    case "lgDash":
      return "8,3";
    case "dashDot":
      return "4,3,1,3";
    case "lgDashDot":
      return "8,3,1,3";
    case "lgDashDotDot":
      return "8,3,1,3,1,3";
    case "sysDash":
      return "3,1";
    case "sysDot":
      return "1,1";
    case "sysDashDot":
      return "3,1,1,1";
    case "sysDashDotDot":
      return "3,1,1,1,1,1";
    default:
      return undefined;
  }
}

/**
 * Generate SVG stroke attributes from line style
 */
export function toSvgStrokeAttributes(style: ResolvedLineStyle): string {
  const parts: string[] = [];

  parts.push(`stroke="${style.color}"`);
  parts.push(`stroke-width="${style.width}"`);

  if (style.dashArray) {
    parts.push(`stroke-dasharray="${style.dashArray}"`);
  }

  return parts.join(" ");
}
