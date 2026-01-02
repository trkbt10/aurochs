/**
 * @file Chart line styling utilities
 *
 * Extract line styling from ChartLines and ChartShapeProperties
 * following ECMA-376 specification.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.30 (CT_ChartLines)
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */

import type { ChartLines, ChartShapeProperties } from "../../../domain/chart";
import type { Fill } from "../../../domain/color";
import { resolveColor } from "../../../core/dml/render/color";

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
export function extractLineStyle(spPr: ChartShapeProperties | undefined): ResolvedLineStyle {
  if (!spPr?.line) {
    return {
      color: DEFAULT_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
    };
  }

  const line = spPr.line;

  // Extract color from line fill
  const color = resolveLineColor(line.fill);

  // Extract width (convert from EMU to pixels if needed)
  const width = line.width ?? DEFAULT_LINE_WIDTH;

  // Extract dash pattern
  const dashArray = typeof line.dash === "string" ? mapDashStyle(line.dash) : undefined;

  return { color, width, dashArray };
}

function resolveLineColor(fill: Fill | undefined): string {
  const fillColor = resolveSolidFillColor(fill);
  if (fillColor) {
    return fillColor;
  }
  return DEFAULT_LINE_COLOR;
}

/**
 * Extract drop line style from ChartLines
 *
 * @see ECMA-376 Part 1, Section 21.2.2.53 (dropLines)
 */
export function extractDropLineStyle(chartLines: ChartLines | undefined): ResolvedLineStyle {
  if (!chartLines?.shapeProperties) {
    return {
      color: DEFAULT_DROP_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
      dashArray: DEFAULT_DROP_LINE_DASH,
    };
  }

  return extractLineStyle(chartLines.shapeProperties);
}

/**
 * Extract hi-low line style from ChartLines
 *
 * @see ECMA-376 Part 1, Section 21.2.2.75 (hiLowLines)
 */
export function extractHiLowLineStyle(chartLines: ChartLines | undefined): ResolvedLineStyle {
  if (!chartLines?.shapeProperties) {
    return {
      color: DEFAULT_HI_LOW_LINE_COLOR,
      width: DEFAULT_LINE_WIDTH,
    };
  }

  return extractLineStyle(chartLines.shapeProperties);
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Convert RGBA color to hex string
 */
function resolveSolidFillColor(fill: Fill | undefined): string | undefined {
  if (!fill) {
    return undefined;
  }
  if (fill.type === "solidFill") {
    const hex = resolveColor(fill.color);
    return hex ? `#${hex}` : undefined;
  }
  if (fill.type === "gradientFill" && fill.stops.length > 0) {
    const hex = resolveColor(fill.stops[0].color);
    return hex ? `#${hex}` : undefined;
  }
  return undefined;
}

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
