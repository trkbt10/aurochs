/**
 * @file Rectangle node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { rect, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { getFilterAttr, type FigEffect } from "../effects";

// =============================================================================
// Rectangle Node
// =============================================================================

/**
 * Extract rectangle properties from a Figma node
 */
function extractRectProps(node: FigNode): {
  size: FigVector;
  transform: FigMatrix | undefined;
  cornerRadius: number | undefined;
  cornerRadii: readonly number[] | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  effects: readonly FigEffect[] | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    size: (nodeData.size as FigVector) ?? { x: 100, y: 100 },
    transform: nodeData.transform as FigMatrix | undefined,
    cornerRadius: nodeData.cornerRadius as number | undefined,
    cornerRadii: nodeData.rectangleCornerRadii as readonly number[] | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    effects: nodeData.effects as readonly FigEffect[] | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Calculate corner radius from corner radii array or single value
 * Clamps radius to half of the smallest dimension (SVG behavior)
 */
function calculateCornerRadius(
  cornerRadii: readonly number[] | undefined,
  cornerRadius: number | undefined,
  size: FigVector
): { rx: number | undefined; ry: number | undefined } {
  // Maximum radius is half the smallest dimension
  const maxRadius = Math.min(size.x, size.y) / 2;

  if (cornerRadii && cornerRadii.length === 4) {
    // All corners same? Use rx/ry
    const allSame =
      cornerRadii[0] === cornerRadii[1] &&
      cornerRadii[1] === cornerRadii[2] &&
      cornerRadii[2] === cornerRadii[3];
    if (allSame) {
      const clamped = Math.min(cornerRadii[0], maxRadius);
      return { rx: clamped, ry: clamped };
    }
    // Different corners - would need path, use average for now
    const avg = (cornerRadii[0] + cornerRadii[1] + cornerRadii[2] + cornerRadii[3]) / 4;
    const clamped = Math.min(avg, maxRadius);
    return { rx: clamped, ry: clamped };
  }
  if (cornerRadius) {
    const clamped = Math.min(cornerRadius, maxRadius);
    return { rx: clamped, ry: clamped };
  }
  return { rx: undefined, ry: undefined };
}

/**
 * Get positive radius or undefined
 */
function getPositiveRadius(value: number | undefined): number | undefined {
  if (value && value > 0) {
    return value;
  }
  return undefined;
}

/**
 * Render a RECTANGLE node to SVG
 */
export function renderRectangleNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { size, transform, cornerRadius, cornerRadii, fillPaints, strokePaints, strokeWeight, effects, opacity } =
    extractRectProps(node);

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Determine corner radius
  const { rx, ry } = calculateCornerRadius(cornerRadii, cornerRadius, size);

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };

  // Get filter attribute if effects are present
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  // If we have a filter, wrap in a group with the filter applied
  const rectElement = rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx: getPositiveRadius(rx),
    ry: getPositiveRadius(ry),
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillAttrs,
    ...strokeAttrs,
  });

  if (filterAttr) {
    return g({ filter: filterAttr }, rectElement);
  }

  return rectElement;
}
