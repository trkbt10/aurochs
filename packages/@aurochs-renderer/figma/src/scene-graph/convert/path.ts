/**
 * @file Convert Figma geometry data to scene graph PathContours
 */

import { decodePathCommands, type FigBlob, type PathCommand as FigPathCommand } from "@aurochs/fig/parser";
import type { FigFillGeometry } from "@aurochs/fig/types";
import type { PathContour, PathCommand } from "../types";

/**
 * Convert @aurochs/fig PathCommand to scene graph PathCommand
 */
function convertFigPathCommand(cmd: FigPathCommand): PathCommand {
  switch (cmd.type) {
    case "M":
      return { type: "M", x: cmd.x, y: cmd.y };
    case "L":
      return { type: "L", x: cmd.x, y: cmd.y };
    case "C":
      return {
        type: "C",
        x1: cmd.cp1x,
        y1: cmd.cp1y,
        x2: cmd.cp2x,
        y2: cmd.cp2y,
        x: cmd.x,
        y: cmd.y,
      };
    case "Q":
      return {
        type: "Q",
        x1: cmd.cpx,
        y1: cmd.cpy,
        x: cmd.x,
        y: cmd.y,
      };
    case "Z":
      return { type: "Z" };
  }
}

/**
 * Map Figma winding rule to scene graph format
 */
function mapWindingRule(rule: unknown): "nonzero" | "evenodd" {
  const name = typeof rule === "string" ? rule : (rule as { name?: string })?.name;
  if (name === "EVENODD" || name === "ODD") {
    return "evenodd";
  }
  return "nonzero";
}

/**
 * Parse SVG path data string into PathCommand array
 *
 * Handles M, L, H, V, C, Q, Z commands (absolute only).
 */
export function parseSvgPathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const re = /([MLHVCQZ])\s*((?:[^MLHVCQZ]*)?)/gi;
  let match: RegExpExecArray | null;
  let currentX = 0;
  let currentY = 0;

  while ((match = re.exec(d)) !== null) {
    const type = match[1].toUpperCase();
    const args = match[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    switch (type) {
      case "M":
        currentX = args[0];
        currentY = args[1];
        commands.push({ type: "M", x: currentX, y: currentY });
        break;
      case "L":
        currentX = args[0];
        currentY = args[1];
        commands.push({ type: "L", x: currentX, y: currentY });
        break;
      case "H":
        currentX = args[0];
        commands.push({ type: "L", x: currentX, y: currentY });
        break;
      case "V":
        currentY = args[0];
        commands.push({ type: "L", x: currentX, y: currentY });
        break;
      case "C":
        currentX = args[4];
        currentY = args[5];
        commands.push({
          type: "C",
          x1: args[0],
          y1: args[1],
          x2: args[2],
          y2: args[3],
          x: currentX,
          y: currentY,
        });
        break;
      case "Q":
        currentX = args[2];
        currentY = args[3];
        commands.push({
          type: "Q",
          x1: args[0],
          y1: args[1],
          x: currentX,
          y: currentY,
        });
        break;
      case "Z":
        commands.push({ type: "Z" });
        break;
    }
  }

  return commands;
}

/**
 * Decode fill geometry blobs to PathContour arrays
 */
export function decodeGeometryToContours(
  fillGeometry: readonly FigFillGeometry[] | undefined,
  blobs: readonly FigBlob[],
): PathContour[] {
  if (!fillGeometry || fillGeometry.length === 0) {
    return [];
  }

  const contours: PathContour[] = [];

  for (const geom of fillGeometry) {
    const blobIndex = geom.commandsBlob;
    if (blobIndex === undefined || blobIndex >= blobs.length) continue;

    const blob = blobs[blobIndex];
    if (!blob) continue;

    const figCommands = decodePathCommands(blob);
    if (figCommands.length === 0) continue;

    const commands = figCommands.map(convertFigPathCommand);
    const windingRule = mapWindingRule(geom.windingRule);

    contours.push({ commands, windingRule });
  }

  return contours;
}

/**
 * Convert vectorPaths (pre-decoded SVG path strings) to PathContours
 */
export function convertVectorPathsToContours(
  vectorPaths: readonly { data: string; windingRule?: unknown }[] | undefined,
): PathContour[] {
  if (!vectorPaths || vectorPaths.length === 0) {
    return [];
  }

  return vectorPaths
    .filter((vp) => vp.data)
    .map((vp) => ({
      commands: parseSvgPathD(vp.data),
      windingRule: mapWindingRule(vp.windingRule),
    }));
}
