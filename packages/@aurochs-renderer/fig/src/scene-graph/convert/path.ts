/**
 * @file Convert Figma geometry data to scene graph PathContours
 *
 * Winding rule mapping delegates to geometry/interpret.ts (the SoT).
 */

import { decodePathCommands, type FigBlob } from "@aurochs/fig/parser";
import type { FigFillGeometry } from "@aurochs/fig/types";
import { mapWindingRule } from "../../geometry";
import type { PathCommand, PathContour } from "../types";

/**
 * Parse SVG path data string into PathCommand array
 *
 * Handles M, L, H, V, C, Q, Z commands (absolute only).
 */
export function parseSvgPathD(d: string): PathCommand[] {
  const commands: PathCommand[] = [];
  const re = /([MLHVCQZ])\s*((?:[^MLHVCQZ]*)?)/gi;
  const matchRef = { value: undefined as RegExpExecArray | null | undefined };
  const currentXRef = { value: 0 };
  const currentYRef = { value: 0 };

  while ((matchRef.value = re.exec(d)) !== null) {
    const type = matchRef.value[1].toUpperCase();
    const args = matchRef.value[2]
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);

    switch (type) {
      case "M":
        currentXRef.value = args[0];
        currentYRef.value = args[1];
        commands.push({ type: "M", x: currentXRef.value, y: currentYRef.value });
        break;
      case "L":
        currentXRef.value = args[0];
        currentYRef.value = args[1];
        commands.push({ type: "L", x: currentXRef.value, y: currentYRef.value });
        break;
      case "H":
        currentXRef.value = args[0];
        commands.push({ type: "L", x: currentXRef.value, y: currentYRef.value });
        break;
      case "V":
        currentYRef.value = args[0];
        commands.push({ type: "L", x: currentXRef.value, y: currentYRef.value });
        break;
      case "C":
        currentXRef.value = args[4];
        currentYRef.value = args[5];
        commands.push({
          type: "C",
          x1: args[0],
          y1: args[1],
          x2: args[2],
          y2: args[3],
          x: currentXRef.value,
          y: currentYRef.value,
        });
        break;
      case "Q":
        currentXRef.value = args[2];
        currentYRef.value = args[3];
        commands.push({
          type: "Q",
          x1: args[0],
          y1: args[1],
          x: currentXRef.value,
          y: currentYRef.value,
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
    if (blobIndex === undefined || blobIndex >= blobs.length) {continue;}

    const blob = blobs[blobIndex];
    if (!blob) {continue;}

    const commands = decodePathCommands(blob);
    if (commands.length === 0) {continue;}

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
