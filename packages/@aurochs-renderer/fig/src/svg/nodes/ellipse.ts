/**
 * @file Ellipse node renderer
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
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
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Center of ellipse
  const cx = size.x / 2;
  const cy = size.y / 2;

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
    ...fillAttrs,
    ...strokeAttrs,
  });

  if (filterAttr) {
    return g({ filter: filterAttr }, ellipseElement);
  }

  return ellipseElement;
}
