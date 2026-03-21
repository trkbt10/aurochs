/**
 * @file Custom geometry shape factory
 *
 * Creates shapes with custom geometry paths (pen/pencil tool results).
 * This is pptx-editor-specific and not shared with potx-editor.
 */

import type { SpShape } from "@aurochs-office/pptx/domain";
import type { CustomGeometry } from "@aurochs-office/drawing-ml/domain/geometry";
import type { ShapeId } from "@aurochs-office/pptx/domain/types";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";
import type { ShapeBounds } from "@aurochs-ui/ooxml-components";
import { DEFAULT_COLOR_SCHEME } from "@aurochs-office/pptx/domain";

/** Default fill color (Office theme accent1) */
const DEFAULT_FILL_COLOR = DEFAULT_COLOR_SCHEME.accent1;

/** Default stroke color (darker blue) */
const DEFAULT_STROKE_COLOR = "2F528F";

/**
 * Create a custom geometry shape
 *
 * @param id - Shape ID
 * @param geometry - Custom geometry definition
 * @param bounds - Position and size in slide coordinates
 * @returns SpShape with CustomGeometry
 */
export function createCustomGeometryShape(id: ShapeId, geometry: CustomGeometry, bounds: ShapeBounds): SpShape {
  const pathFill = geometry.paths[0]?.fill;
  const isFillEnabled = pathFill !== "none";

  function getCustomGeometryFill(isFillEnabled: boolean): SpShape["properties"]["fill"] {
    if (!isFillEnabled) {
      return { type: "noFill" };
    }
    return {
      type: "solidFill",
      color: {
        spec: { type: "srgb", value: DEFAULT_FILL_COLOR },
      },
    };
  }

  return {
    type: "sp",
    nonVisual: {
      id,
      name: `Path ${id}`,
    },
    properties: {
      transform: {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        rotation: deg(0),
        flipH: false,
        flipV: false,
      },
      geometry,
      fill: getCustomGeometryFill(isFillEnabled),
      line: {
        width: px(2),
        cap: "round",
        compound: "sng",
        alignment: "ctr",
        fill: {
          type: "solidFill",
          color: {
            spec: { type: "srgb", value: DEFAULT_STROKE_COLOR },
          },
        },
        dash: "solid",
        join: "round",
      },
    },
  };
}
