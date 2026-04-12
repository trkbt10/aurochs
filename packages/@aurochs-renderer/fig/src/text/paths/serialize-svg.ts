/**
 * @file SVG path data serialization
 *
 * Re-exports pathCommandsToSvgPath from @aurochs/fig/parser for SVG rendering,
 * and provides text-specific helpers (decoration rects, text path results).
 */

import { pathCommandsToSvgPath } from "@aurochs/fig/parser";
import type { PathCommand } from "../../font/types";
import type { DecorationRect } from "./types";

/**
 * Serialize PathCommand array to SVG path data string
 *
 * Uses compact format (no separator between command and coordinates)
 * for minimal SVG output size.
 *
 * @param commands - Path commands to serialize
 * @param precision - Decimal precision for rounding (default: 5)
 * @returns SVG path data string
 */
export function pathCommandsToSvgD(
  commands: readonly PathCommand[],
  precision: number = 5
): string {
  // font/types.ts PathCommand has optional fields; cast is safe because
  // callers always provide the fields matching the command type.
  return pathCommandsToSvgPath(commands as Parameters<typeof pathCommandsToSvgPath>[0], {
    precision,
    separator: "",
  });
}

/**
 * Serialize a decoration rectangle to SVG path data
 *
 * @param rect - Decoration rectangle
 * @param precision - Decimal precision for rounding (default: 5)
 * @returns SVG path data string (M x y H x2 V y2 H x Z)
 */
export function decorationRectToSvgD(
  rect: DecorationRect,
  precision: number = 5
): string {
  const factor = Math.pow(10, precision);
  const round = (n: number) => Math.round(n * factor) / factor;

  const x = round(rect.x);
  const y = round(rect.y);
  const x2 = round(rect.x + rect.width);
  const y2 = round(rect.y + rect.height);

  return `M${x} ${y}H${x2}V${y2}H${x}Z`;
}

/**
 * Serialize a TextPathResult to a combined SVG path data string
 *
 * @param contourCommands - Array of PathCommand arrays (one per contour)
 * @param decorations - Array of decoration rectangles
 * @param precision - Decimal precision for rounding (default: 5)
 * @returns Combined SVG path data string, or empty string if no data
 */
export function textPathResultToSvgD(
  contourCommands: readonly (readonly PathCommand[])[],
  decorations: readonly DecorationRect[],
  precision: number = 5
): string {
  const parts: string[] = [];

  for (const commands of contourCommands) {
    const d = pathCommandsToSvgD(commands, precision);
    if (d) {
      parts.push(d);
    }
  }

  for (const rect of decorations) {
    parts.push(decorationRectToSvgD(rect, precision));
  }

  return parts.join("");
}
