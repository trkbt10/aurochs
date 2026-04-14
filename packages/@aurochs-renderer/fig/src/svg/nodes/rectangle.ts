/**
 * @file Rectangle node renderer
 */

import type { FigNode } from "@aurochs/fig/types";

import type { FigSvgRenderContext } from "../../types";
import { rect, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, strokePaintsToFillAttrs, type FillAttrs, type ShapeGeometry } from "../fill";
import { getStrokeAttrs, type StrokeAttrs } from "../stroke";
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
export function renderRectangleNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);
  const { rx, ry } = resolveCornerRadius(node, size);

  const transformStr = buildTransformAttr(transform);
  const baseStrokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };

  // Get filter attribute if effects are present
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  // Shape geometry for complex fills
  const clipShape = rect({ x: 0, y: 0, width: size.x, height: size.y, rx, ry, fill: "black" });
  const geometry: ShapeGeometry = {
    clipShapes: [clipShape],
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => rect({ x: 0, y: 0, width: size.x, height: size.y, rx, ry, ...attrs }),
  };

  const fillResult = getFillResult(fillPaints, ctx, geometry, {
    elementSize: { width: size.x, height: size.y },
  });

  const hasFillGeo = fillGeometry && fillGeometry.length > 0;
  const geom = hasFillGeo ? fillGeometry : strokeGeometry;
  const isStrokeGeometry = !hasFillGeo && !!(strokeGeometry && strokeGeometry.length > 0);

  if (geom && geom.length > 0) {
    const paths = decodePathsFromGeometry(geom, ctx.blobs);
    if (paths.length > 0) {
      const fillAttrsRef = { value: undefined as FillAttrs | undefined };
      const strokeAttrsRef = { value: undefined as StrokeAttrs | undefined };
      if (isStrokeGeometry) {
        fillAttrsRef.value = strokePaintsToFillAttrs(strokePaints);
        strokeAttrsRef.value = {};
      } else {
        fillAttrsRef.value = fillResult.attrs;
        strokeAttrsRef.value = baseStrokeAttrs;
      }

      const pathResult = renderPaths({
        paths,
        fillAttrs: fillAttrsRef.value,
        strokeAttrs: strokeAttrsRef.value,
        transform: transformStr,
        opacity,
        filter: filterAttr,
      });

      return applyFillResult(fillResult, pathResult);
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
    ...fillResult.attrs,
    ...baseStrokeAttrs,
  });

  const withFill = applyFillResult(fillResult, rectElement);

  if (filterAttr) {
    return g({ filter: filterAttr }, withFill);
  }

  return withFill;
}
