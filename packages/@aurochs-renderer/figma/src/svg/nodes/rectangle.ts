/**
 * @file Rectangle node renderer
 */

import type { FigNode, FigPaint } from "@aurochs/fig/types";

import type { FigSvgRenderContext } from "../../types";
import { rect, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs, type FillAttrs } from "../fill";
import { getStrokeAttrs, type StrokeAttrs } from "../stroke";
import { getFilterAttr } from "../effects";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import { figColorToHex, getPaintType } from "../../core/color";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
  resolveCornerRadius,
} from "./extract-props";

/**
 * Build fill attrs from stroke paints (for strokeGeometry).
 */
function strokePaintsToFillAttrs(paints: readonly FigPaint[] | undefined): FillAttrs {
  if (!paints || paints.length === 0) return { fill: "none" };
  const visible = paints.find((p) => p.visible !== false);
  if (!visible) return { fill: "none" };
  if (getPaintType(visible) === "SOLID") {
    const solid = visible as FigPaint & { color: { r: number; g: number; b: number; a: number } };
    const hex = figColorToHex(solid.color);
    const opacity = visible.opacity ?? 1;
    if (opacity < 1) return { fill: hex, "fill-opacity": opacity };
    return { fill: hex };
  }
  return { fill: "#000000" };
}

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
  const baseFillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const baseStrokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };

  // Get filter attribute if effects are present
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  const hasFillGeo = fillGeometry && fillGeometry.length > 0;
  const geometry = hasFillGeo ? fillGeometry : strokeGeometry;
  const isStrokeGeometry = !hasFillGeo && !!(strokeGeometry && strokeGeometry.length > 0);

  if (geometry && geometry.length > 0) {
    const paths = decodePathsFromGeometry(geometry, ctx.blobs);
    if (paths.length > 0) {
      let fillAttrs: FillAttrs;
      let strokeAttrs: StrokeAttrs;
      if (isStrokeGeometry) {
        fillAttrs = strokePaintsToFillAttrs(strokePaints);
        strokeAttrs = {};
      } else {
        fillAttrs = baseFillAttrs;
        strokeAttrs = baseStrokeAttrs;
      }
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
    ...baseFillAttrs,
    ...baseStrokeAttrs,
  });

  if (filterAttr) {
    return g({ filter: filterAttr }, rectElement);
  }

  return rectElement;
}
