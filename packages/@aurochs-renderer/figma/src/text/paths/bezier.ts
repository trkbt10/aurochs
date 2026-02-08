/**
 * @file Bezier curve conversion utilities
 *
 * Provides quadratic-to-cubic bezier conversion for path commands.
 * Figma exports all curves as cubic beziers even for TrueType fonts.
 */

import type { PathCommand } from "../../font/types";

/**
 * Convert an array of path commands, replacing quadratic beziers with cubics
 *
 * Mathematical conversion:
 * Q(P0, P1, P2) → C(P0, CP1, CP2, P2)
 * CP1 = P0 + 2/3*(P1-P0)
 * CP2 = P2 + 2/3*(P1-P2)
 *
 * @param commands - Path commands (may contain Q commands)
 * @returns New array with all Q commands replaced by C commands
 */
export function convertQuadraticsToCubic(
  commands: readonly PathCommand[]
): PathCommand[] {
  const result: PathCommand[] = [];
  let currentX = 0;
  let currentY = 0;

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        result.push(cmd);
        break;

      case "L":
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        result.push(cmd);
        break;

      case "Q": {
        const p0x = currentX;
        const p0y = currentY;
        const p1x = cmd.x1 ?? 0;
        const p1y = cmd.y1 ?? 0;
        const p2x = cmd.x ?? 0;
        const p2y = cmd.y ?? 0;

        // Cubic control points from quadratic
        const cp1x = p0x + (2 / 3) * (p1x - p0x);
        const cp1y = p0y + (2 / 3) * (p1y - p0y);
        const cp2x = p2x + (2 / 3) * (p1x - p2x);
        const cp2y = p2y + (2 / 3) * (p1y - p2y);

        result.push({
          type: "C",
          x1: cp1x,
          y1: cp1y,
          x2: cp2x,
          y2: cp2y,
          x: p2x,
          y: p2y,
        });

        currentX = p2x;
        currentY = p2y;
        break;
      }

      case "C":
        currentX = cmd.x ?? 0;
        currentY = cmd.y ?? 0;
        result.push(cmd);
        break;

      case "Z":
        result.push(cmd);
        break;
    }
  }

  return result;
}
