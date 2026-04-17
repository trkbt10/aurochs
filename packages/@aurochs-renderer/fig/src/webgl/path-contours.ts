/** @file SVG path contour helpers for WebGL tessellation */

import type { PathCommand, PathContour } from "../scene-graph/types";
import { parseSvgPathD } from "../scene-graph/convert/path";

export type SvgPathContoursParams = {
  readonly d: string;
  readonly windingRule?: PathContour["windingRule"];
};

/** Split parsed path commands into independent M...Z contour command lists. */
export function splitPathCommandsIntoContours(
  commands: readonly PathCommand[],
  windingRule: PathContour["windingRule"] = "nonzero",
): PathContour[] {
  const contours: PathContour[] = [];
  const currentRef = { value: [] as PathCommand[] };

  for (const command of commands) {
    if (command.type === "M" && currentRef.value.length > 0) {
      contours.push({ commands: currentRef.value, windingRule });
      currentRef.value = [command];
      continue;
    }
    currentRef.value.push(command);
  }

  if (currentRef.value.length > 0) {
    contours.push({ commands: currentRef.value, windingRule });
  }

  return contours;
}

/** Parse an SVG path d string into independent contours for WebGL tessellation. */
export function svgPathDToContours(
  { d, windingRule = "nonzero" }: SvgPathContoursParams,
): PathContour[] {
  if (d.trim().length === 0) {
    return [];
  }
  return splitPathCommandsIntoContours(parseSvgPathD(d), windingRule);
}
