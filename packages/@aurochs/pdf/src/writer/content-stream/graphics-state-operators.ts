/**
 * @file PDF Graphics State Operators
 *
 * Serializes graphics state to PDF content stream operators.
 * @see ISO 32000-1:2008 Section 8.4 (Graphics State)
 */

import type { PdfGraphicsState } from "../../domain/graphics-state";
import type { PdfColor } from "../../domain/color";
import type { PdfMatrix } from "../../domain/coordinate";

/**
 * Format a number for PDF content stream.
 */
function formatNum(value: number): string {
  if (Number.isInteger(value)) {
    return String(value);
  }
  const fixed = value.toFixed(6);
  return fixed.replace(/\.?0+$/, "");
}

/**
 * Serialize a color to PDF color operator.
 *
 * @param color - The color to serialize
 * @param stroke - If true, use stroking color operators; otherwise non-stroking
 * @returns PDF color operator string
 *
 * @see ISO 32000-1:2008 Table 74
 */
export function serializeColor(color: PdfColor, stroke: boolean): string {
  const components = color.components.map(formatNum).join(" ");

  // Use the effective color space for ICCBased colors
  const colorSpace = color.colorSpace === "ICCBased" ? (color.alternateColorSpace ?? "DeviceRGB") : color.colorSpace;

  switch (colorSpace) {
    case "DeviceGray":
      return stroke ? `${components} G` : `${components} g`;

    case "DeviceRGB":
      return stroke ? `${components} RG` : `${components} rg`;

    case "DeviceCMYK":
      return stroke ? `${components} K` : `${components} k`;

    case "Pattern":
      // Pattern colors need special handling with scn/SCN
      // This is a simplified case; full pattern support would need pattern references
      return stroke ? `${components} SCN` : `${components} scn`;

    default:
      // Fall back to DeviceRGB for unknown color spaces
      return stroke ? `${components} RG` : `${components} rg`;
  }
}

/**
 * Serialize line width operator.
 * @see ISO 32000-1:2008 Table 57 - w operator
 */
export function serializeLineWidth(width: number): string {
  return `${formatNum(width)} w`;
}

/**
 * Serialize line cap operator.
 * @see ISO 32000-1:2008 Table 57 - J operator
 */
export function serializeLineCap(cap: 0 | 1 | 2): string {
  return `${cap} J`;
}

/**
 * Serialize line join operator.
 * @see ISO 32000-1:2008 Table 57 - j operator
 */
export function serializeLineJoin(join: 0 | 1 | 2): string {
  return `${join} j`;
}

/**
 * Serialize miter limit operator.
 * @see ISO 32000-1:2008 Table 57 - M operator
 */
export function serializeMiterLimit(limit: number): string {
  return `${formatNum(limit)} M`;
}

/**
 * Serialize dash pattern operator.
 * @see ISO 32000-1:2008 Table 57 - d operator
 */
export function serializeDashPattern(array: readonly number[], phase: number): string {
  const dashArray = `[${array.map(formatNum).join(" ")}]`;
  return `${dashArray} ${formatNum(phase)} d`;
}

/**
 * Serialize CTM modification operator.
 * @see ISO 32000-1:2008 Table 57 - cm operator
 */
export function serializeTransform(matrix: PdfMatrix): string {
  const [a, b, c, d, e, f] = matrix;
  return `${formatNum(a)} ${formatNum(b)} ${formatNum(c)} ${formatNum(d)} ${formatNum(e)} ${formatNum(f)} cm`;
}

/**
 * Serialize graphics state for a shape element.
 *
 * This generates the operators needed to set up the graphics state
 * before drawing a shape. It handles:
 * - Fill and stroke colors
 * - Line styles (width, cap, join, dash)
 * - CTM transformation (if needed)
 *
 * @param state - The graphics state to serialize
 * @param options - Options controlling what to include
 * @returns PDF operators as newline-separated string
 */
export function serializeGraphicsState(
  state: PdfGraphicsState,
  options: {
    includeColors?: boolean;
    includeLineStyle?: boolean;
    includeTransform?: boolean;
  } = {}
): string {
  const {
    includeColors = true,
    includeLineStyle = true,
    includeTransform = false,
  } = options;

  const lines: string[] = [];

  // Transform (CTM)
  if (includeTransform) {
    // Check if CTM is not identity
    const [a, b, c, d, e, f] = state.ctm;
    const isIdentity = a === 1 && b === 0 && c === 0 && d === 1 && e === 0 && f === 0;
    if (!isIdentity) {
      lines.push(serializeTransform(state.ctm));
    }
  }

  // Colors
  if (includeColors) {
    lines.push(serializeColor(state.fillColor, false));
    lines.push(serializeColor(state.strokeColor, true));
  }

  // Line style
  if (includeLineStyle) {
    lines.push(serializeLineWidth(state.lineWidth));
    lines.push(serializeLineCap(state.lineCap));
    lines.push(serializeLineJoin(state.lineJoin));
    lines.push(serializeMiterLimit(state.miterLimit));

    if (state.dashArray.length > 0) {
      lines.push(serializeDashPattern(state.dashArray, state.dashPhase));
    }
  }

  return lines.join("\n");
}

/**
 * Generate q (save) and Q (restore) wrapper around content.
 *
 * @param content - The content to wrap
 * @returns Content wrapped in q ... Q
 */
export function wrapInGraphicsState(content: string): string {
  return `q\n${content}\nQ`;
}
