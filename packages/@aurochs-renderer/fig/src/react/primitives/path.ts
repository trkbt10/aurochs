/**
 * @file Path command serialization for React renderer
 */

import type { PathContour } from "../../scene-graph/types";

/** Serialize a PathContour to an SVG path `d` attribute string */
export function contourToSvgD(contour: PathContour): string {
  return contour.commands
    .map((cmd) => {
      switch (cmd.type) {
        case "M":
          return `M${cmd.x} ${cmd.y}`;
        case "L":
          return `L${cmd.x} ${cmd.y}`;
        case "C":
          return `C${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
        case "Q":
          return `Q${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}
