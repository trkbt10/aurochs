/**
 * @file Ellipse node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { getFilterAttr, type FigEffect } from "../effects";

// =============================================================================
// Ellipse Node
// =============================================================================

/**
 * Extract ellipse properties from a Figma node
 */
function extractEllipseProps(node: FigNode): {
  size: FigVector;
  transform: FigMatrix | undefined;
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
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    effects: nodeData.effects as readonly FigEffect[] | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

/**
 * Render an ELLIPSE node to SVG
 */
export function renderEllipseNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { size, transform, fillPaints, strokePaints, strokeWeight, effects, opacity } =
    extractEllipseProps(node);

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
