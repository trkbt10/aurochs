/**
 * @file Ellipse node renderer
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, type ShapeGeometry } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { getFilterAttr } from "../effects";
import { extractBaseProps, extractSizeProps, extractPaintProps, extractEffectsProps } from "./extract-props";

// =============================================================================
// Ellipse Node
// =============================================================================

/**
 * Render an ELLIPSE node to SVG
 */
export function renderEllipseNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { effects } = extractEffectsProps(node);

  const transformStr = buildTransformAttr(transform);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Center of ellipse
  const cx = size.x / 2;
  const cy = size.y / 2;

  // Shape geometry for complex fills (angular/diamond gradients)
  const clipShape = ellipse({ cx, cy, rx: cx, ry: cy, fill: "black" });
  const geometry: ShapeGeometry = {
    clipShapes: [clipShape],
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
  };

  const fillResult = getFillResult(fillPaints, ctx, geometry, {
    elementSize: { width: size.x, height: size.y },
  });

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };

  // Get filter attribute if effects are present
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  const ellipseElement = ellipse({
    cx,
    cy,
    rx: cx,
    ry: cy,
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillResult.attrs,
    ...strokeAttrs,
  });

  const withFill = applyFillResult(fillResult, ellipseElement);

  if (filterAttr) {
    return g({ filter: filterAttr }, withFill);
  }

  return withFill;
}
