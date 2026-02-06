/**
 * @file Rectangle node renderer
 */

import type { FigNode } from "@oxen/fig/types";

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
  resolveCornerRadius,
} from "./extract-props";

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
  const { rx, ry } = resolveCornerRadius(node, size);

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

  const rectElement = rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx,
    ry,
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
