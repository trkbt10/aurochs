/**
 * @file Rectangle node renderer
 */

import type { FigNode, FigVector } from "@oxen/fig/types";

import type { FigSvgRenderContext } from "../../types";
import { rect, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { getFilterAttr } from "../effects";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
  extractCornerRadiusProps,
} from "./extract-props";

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
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);
  const { cornerRadius } = extractCornerRadiusProps(node);
  const cornerRadii = node.rectangleCornerRadii;

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };

  // Get filter attribute if effects are present
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  const geometry = fillGeometry && fillGeometry.length > 0 ? fillGeometry : strokeGeometry;
  if (geometry && geometry.length > 0) {
    const paths = decodePathsFromGeometry(geometry, ctx.blobs);
    if (paths.length > 0) {
      return renderPaths({
        paths,
        fillAttrs,
        strokeAttrs,
        transform: transformStr,
        opacity,
        filter: filterAttr,
      });
    }
  }

  // Determine corner radius
  const { rx, ry } = calculateCornerRadius(cornerRadii, cornerRadius, size);

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
