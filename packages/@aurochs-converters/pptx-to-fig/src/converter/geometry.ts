/**
 * @file Convert DrawingML Geometry to Fig node type and properties
 *
 * DrawingML geometry determines the Fig node type:
 *   preset "rect" → RECTANGLE
 *   preset "roundRect" → ROUNDED_RECTANGLE (with cornerRadius)
 *   preset "ellipse" → ELLIPSE
 *   preset "line" → LINE
 *   preset "triangle/pentagon/hexagon/octagon/diamond" → REGULAR_POLYGON
 *   preset "star*" → STAR
 *   custom geometry → VECTOR
 *   no geometry → RECTANGLE (default)
 */

import type { Geometry, PresetGeometry, AdjustValue } from "@aurochs-office/drawing-ml/domain/geometry/shape";
import type { FigNodeType } from "@aurochs/fig/types";

export type FigGeometryResult = {
  readonly nodeType: FigNodeType;
  readonly cornerRadius?: number;
  readonly rectangleCornerRadii?: readonly number[];
  readonly pointCount?: number;
  readonly starInnerRadius?: number;
};

/**
 * Convert DrawingML Geometry to Fig node type and shape properties.
 */
export function convertGeometry(geometry: Geometry | undefined, width: number, height: number): FigGeometryResult {
  if (!geometry) {
    return { nodeType: "RECTANGLE" };
  }

  if (geometry.type === "preset") {
    return convertPresetGeometry(geometry, width, height);
  }

  // Custom geometry → VECTOR
  return { nodeType: "VECTOR" };
}

function convertPresetGeometry(geometry: PresetGeometry, width: number, height: number): FigGeometryResult {
  const preset = geometry.preset;

  switch (preset) {
    case "rect":
      return { nodeType: "RECTANGLE" };

    case "roundRect":
      return convertRoundRect(geometry.adjustValues, width, height);

    case "ellipse":
      return { nodeType: "ELLIPSE" };

    case "line":
      return { nodeType: "LINE" };

    case "triangle":
      return { nodeType: "REGULAR_POLYGON", pointCount: 3 };

    case "diamond":
      return { nodeType: "REGULAR_POLYGON", pointCount: 4 };

    case "pentagon":
      return { nodeType: "REGULAR_POLYGON", pointCount: 5 };

    case "hexagon":
      return { nodeType: "REGULAR_POLYGON", pointCount: 6 };

    case "octagon":
      return { nodeType: "REGULAR_POLYGON", pointCount: 8 };

    default:
      // Check for star presets
      if (preset.startsWith("star")) {
        return convertStarPreset(preset, geometry.adjustValues);
      }
      // Unknown preset → treat as rectangle
      return { nodeType: "RECTANGLE" };
  }
}

/**
 * Convert a roundRect preset to Fig properties.
 *
 * DrawingML's roundRect adjust value "adj" is a percentage of
 * the shorter side (0-50000 in 1/1000ths of percent).
 *
 * Figma's cornerRadius is in absolute pixels:
 *   cornerRadius = (adj / 50000) * min(width, height)
 */
function convertRoundRect(adjustValues: readonly AdjustValue[], width: number, height: number): FigGeometryResult {
  const adj = adjustValues.find((a) => a.name === "adj");
  const minDim = Math.min(width, height);

  const cornerRadius = adj ? (adj.value / 50000) * minDim : minDim * 0.1; // Default ~10% rounding

  return {
    nodeType: "ROUNDED_RECTANGLE",
    cornerRadius,
  };
}

/**
 * Convert star preset names to Fig STAR properties.
 *
 * Presets: star4, star5, star6, star8, star10, star12, star16, star24, star32
 * The number suffix gives the point count.
 */
function convertStarPreset(preset: string, adjustValues: readonly AdjustValue[]): FigGeometryResult {
  const countStr = preset.replace("star", "");
  const pointCount = parseInt(countStr, 10) || 5;

  const adj = adjustValues.find((a) => a.name === "adj");
  const starInnerRadius = adj ? adj.value / 50000 : 0.382; // Golden ratio default

  return {
    nodeType: "STAR",
    pointCount,
    starInnerRadius,
  };
}
