/**
 * @file Convert Fig node geometry to DrawingML Geometry
 *
 * Maps Figma node types and properties to DrawingML preset shapes
 * or custom geometry as appropriate.
 *
 * Node type → Geometry mapping:
 *   RECTANGLE → "rect" (or "roundRect" with corner radii)
 *   ROUNDED_RECTANGLE → "roundRect" with adjust values
 *   ELLIPSE → "ellipse"
 *   LINE → "line"
 *   STAR → "star{N}" preset or custom if unsupported count
 *   REGULAR_POLYGON → "triangle" for 3, custom for others
 *   VECTOR → custom geometry (if path data available)
 *   FRAME/GROUP/COMPONENT/INSTANCE → "rect" (container)
 *   TEXT → no geometry (text shape uses implicit rect)
 */

import type { FigDesignNode } from "@aurochs/fig/domain";

import type { Geometry, PresetGeometry, CustomGeometry, AdjustValue } from "@aurochs-office/drawing-ml/domain/geometry/shape";
import type { Pixels } from "@aurochs-office/drawing-ml/domain/units";
import { px } from "@aurochs-office/drawing-ml/domain/units";

/**
 * Convert a Fig node's shape type and properties to DrawingML Geometry.
 *
 * Returns undefined for node types that don't need explicit geometry
 * (e.g., TEXT, GROUP when used as a group shape).
 */
export function convertGeometry(node: FigDesignNode): Geometry | undefined {
  switch (node.type) {
    case "RECTANGLE":
      return convertRectangleGeometry(node);
    case "ROUNDED_RECTANGLE":
      return convertRoundedRectangleGeometry(node);
    case "ELLIPSE":
      return createPreset("ellipse");
    case "LINE":
      return createPreset("line");
    case "STAR":
      return convertStarGeometry(node);
    case "REGULAR_POLYGON":
      return convertPolygonGeometry(node);
    case "FRAME":
    case "COMPONENT":
    case "COMPONENT_SET":
    case "INSTANCE":
    case "SYMBOL":
      // Container nodes use rect geometry when they have fills/strokes
      return hasVisualProperties(node) ? createPreset("rect") : undefined;
    case "VECTOR":
    case "BOOLEAN_OPERATION":
      // Vector nodes could have custom paths, but the high-level
      // FigDesignNode doesn't expose parsed path commands.
      // Fall back to rect as a bounding-box placeholder.
      return createPreset("rect");
    default:
      return undefined;
  }
}

/**
 * Rectangle: plain rect, or roundRect if any corner radius is set.
 */
function convertRectangleGeometry(node: FigDesignNode): PresetGeometry {
  if (node.rectangleCornerRadii) {
    return convertIndividualCornerRadii(node.rectangleCornerRadii, node.size.x, node.size.y);
  }
  if (node.cornerRadius && node.cornerRadius > 0) {
    return convertUniformCornerRadius(node.cornerRadius, node.size.x, node.size.y);
  }
  return createPreset("rect");
}

/**
 * Rounded rectangle: always has corner radius.
 */
function convertRoundedRectangleGeometry(node: FigDesignNode): PresetGeometry {
  if (node.rectangleCornerRadii) {
    return convertIndividualCornerRadii(node.rectangleCornerRadii, node.size.x, node.size.y);
  }
  const radius = node.cornerRadius ?? 0;
  return convertUniformCornerRadius(radius, node.size.x, node.size.y);
}

/**
 * Convert a uniform corner radius to a roundRect preset.
 *
 * DrawingML's "roundRect" takes a single adjust value "adj"
 * expressed as a percentage of the shorter side (0-50000 in
 * 1/1000th of a percent, i.e., 50000 = 50% = half the shorter side).
 *
 * Figma's cornerRadius is in absolute pixels. We convert:
 *   adj = (radius / min(width, height)) * 50000
 * capped at 50000 (maximum rounding = semicircle ends).
 */
function convertUniformCornerRadius(radius: number, width: number, height: number): PresetGeometry {
  const minDim = Math.min(width, height);
  const adjValue = minDim > 0 ? Math.min(Math.round((radius / minDim) * 50000), 50000) : 0;

  return {
    type: "preset",
    preset: "roundRect",
    adjustValues: [{ name: "adj", value: adjValue }],
  };
}

/**
 * Convert per-corner radii.
 *
 * Figma supports individual corner radii [topLeft, topRight, bottomRight, bottomLeft].
 * DrawingML has no built-in per-corner roundRect. We check if all corners
 * are equal (use roundRect) or fall back to roundRect with the average
 * as a best-effort. True per-corner would require custom geometry.
 */
function convertIndividualCornerRadii(radii: readonly number[], width: number, height: number): PresetGeometry {
  // If all corners equal, use uniform
  if (radii.length >= 4 && radii[0] === radii[1] && radii[1] === radii[2] && radii[2] === radii[3]) {
    return convertUniformCornerRadius(radii[0], width, height);
  }
  // Use average as best-effort approximation
  const avgRadius = radii.reduce((sum, r) => sum + r, 0) / radii.length;
  return convertUniformCornerRadius(avgRadius, width, height);
}

/**
 * Convert a Figma star to a DrawingML preset star shape.
 *
 * DrawingML has preset stars: star4, star5, star6, star8, star10, star12,
 * star16, star24, star32. For point counts that don't match a preset,
 * we pick the nearest.
 *
 * The star's inner radius ratio maps to the adjust value.
 */
function convertStarGeometry(node: FigDesignNode): PresetGeometry {
  const points = node.pointCount ?? 5;
  const preset = nearestStarPreset(points);

  const adjustValues: AdjustValue[] = [];
  if (node.starInnerRadius !== undefined) {
    // DrawingML star adj value: inner radius as percentage of outer radius
    // Range 0-50000 (in 1/1000ths of percent)
    // Figma's starInnerRadius is a 0-1 ratio
    adjustValues.push({
      name: "adj",
      value: Math.round(node.starInnerRadius * 50000),
    });
  }

  return { type: "preset", preset, adjustValues };
}

const STAR_PRESETS: readonly { count: number; preset: string }[] = [
  { count: 4, preset: "star4" },
  { count: 5, preset: "star5" },
  { count: 6, preset: "star6" },
  { count: 8, preset: "star8" },
  { count: 10, preset: "star10" },
  { count: 12, preset: "star12" },
  { count: 16, preset: "star16" },
  { count: 24, preset: "star24" },
  { count: 32, preset: "star32" },
];

function nearestStarPreset(points: number): string {
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for min-diff search; STAR_PRESETS has no .reduce-able structure
  let best = STAR_PRESETS[1]; // default star5
  // eslint-disable-next-line no-restricted-syntax -- mutable accumulator for min-diff search
  let bestDiff = Infinity;
  for (const entry of STAR_PRESETS) {
    const diff = Math.abs(entry.count - points);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = entry;
    }
  }
  return best.preset;
}

/**
 * Convert a regular polygon.
 *
 * DrawingML has no generic n-gon preset. Available polygons:
 *   3 → "triangle"
 *   4 → "rect" (or "diamond" for rotated)
 *   5 → "pentagon" (from homePentagon or irregular)
 *   6 → "hexagon"
 *   8 → "octagon"
 *
 * For other counts, we fall back to a custom geometry with
 * computed vertex positions.
 */
function convertPolygonGeometry(node: FigDesignNode): Geometry {
  const sides = node.pointCount ?? 3;
  switch (sides) {
    case 3:
      return createPreset("triangle");
    case 4:
      return createPreset("diamond");
    case 5:
      return createPreset("pentagon");
    case 6:
      return createPreset("hexagon");
    case 8:
      return createPreset("octagon");
    default:
      return createPolygonCustomGeometry(sides, node.size.x, node.size.y);
  }
}

/**
 * Generate custom geometry for an n-sided regular polygon.
 *
 * Vertices are placed on a circle inscribed in the bounding box,
 * starting from the top center (-90°) and going clockwise.
 */
function createPolygonCustomGeometry(sides: number, width: number, height: number): CustomGeometry {
  const cx = width / 2;
  const cy = height / 2;
  const rx = width / 2;
  const ry = height / 2;

  const commands: Array<{ readonly type: "moveTo"; readonly point: { readonly x: Pixels; readonly y: Pixels } } | { readonly type: "lineTo"; readonly point: { readonly x: Pixels; readonly y: Pixels } } | { readonly type: "close" }> = [];

  for (let i = 0; i < sides; i++) {
    // Start from top center, go clockwise
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / sides;
    const x = cx + rx * Math.cos(angle);
    const y = cy + ry * Math.sin(angle);
    const point = { x: px(x), y: px(y) };

    if (i === 0) {
      commands.push({ type: "moveTo", point });
    } else {
      commands.push({ type: "lineTo", point });
    }
  }
  commands.push({ type: "close" });

  return {
    type: "custom",
    paths: [
      {
        width: px(width),
        height: px(height),
        fill: "norm",
        stroke: true,
        extrusionOk: false,
        commands,
      },
    ],
  };
}

function createPreset(preset: string): PresetGeometry {
  return { type: "preset", preset, adjustValues: [] };
}

function hasVisualProperties(node: FigDesignNode): boolean {
  return node.fills.length > 0 || node.strokes.length > 0;
}
