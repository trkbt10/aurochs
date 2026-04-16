/**
 * @file Path serialization — shared SoT for SceneGraph PathContour → SVG d attribute
 *
 * Both SVG string and React renderers MUST use this function.
 */

import type { PathContour } from "../types";

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
        case "A":
          return `A${cmd.rx} ${cmd.ry} ${cmd.rotation} ${cmd.largeArc ? 1 : 0} ${cmd.sweep ? 1 : 0} ${cmd.x} ${cmd.y}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}
