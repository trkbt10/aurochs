/**
 * @file SVG path data serialization
 *
 * Converts PathCommand arrays to SVG path data strings (d attribute).
 * Used by the SVG backend. WebGL tessellates PathCommand arrays directly.
 */

import type { PathCommand, DecorationRect } from "./types";

/**
 * Serialize PathCommand array to SVG path data string
 *
 * @param commands - Path commands to serialize
 * @param precision - Decimal precision for rounding (default: 5)
 * @returns SVG path data string
 */
export function pathCommandsToSvgD(
  commands: readonly PathCommand[],
  precision: number = 5
): string {
  const factor = Math.pow(10, precision);
  const round = (n: number) => Math.round(n * factor) / factor;

  const parts: string[] = [];

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        parts.push(`M${round(cmd.x!)} ${round(cmd.y!)}`);
        break;
      case "L":
        parts.push(`L${round(cmd.x!)} ${round(cmd.y!)}`);
        break;
      case "C":
        parts.push(
          `C${round(cmd.x1!)} ${round(cmd.y1!)} ${round(cmd.x2!)} ${round(cmd.y2!)} ${round(cmd.x!)} ${round(cmd.y!)}`
        );
        break;
      case "Q":
        parts.push(
          `Q${round(cmd.x1!)} ${round(cmd.y1!)} ${round(cmd.x!)} ${round(cmd.y!)}`
        );
        break;
      case "Z":
        parts.push("Z");
        break;
    }
  }

  return parts.join("");
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
