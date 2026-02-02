/**
 * @file Frame node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigVector,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, rect, clipPath, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";

// =============================================================================
// Frame Node
// =============================================================================

/**
 * Extract frame properties from a Figma node
 */
function extractFrameProps(node: FigNode): {
  size: FigVector;
  transform: FigMatrix | undefined;
  cornerRadius: number | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
  visible: boolean;
  clipsContent: boolean;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    size: (nodeData.size as FigVector) ?? { x: 100, y: 100 },
    transform: nodeData.transform as FigMatrix | undefined,
    cornerRadius: nodeData.cornerRadius as number | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
    visible: (nodeData.visible as boolean) ?? true,
    clipsContent: (nodeData.clipsContent as boolean) ?? true,
  };
}

/**
 * Render a FRAME node to SVG
 *
 * @param node - The frame node
 * @param ctx - Render context
 * @param renderedChildren - Pre-rendered children SVG strings
 */
export function renderFrameNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  renderedChildren: readonly SvgString[]
): SvgString {
  const { size, transform, cornerRadius, fillPaints, strokePaints, strokeWeight, opacity, visible, clipsContent } =
    extractFrameProps(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  const elements: SvgString[] = [];

  // Background rect
  const bgRect = rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx: cornerRadius && cornerRadius > 0 ? cornerRadius : undefined,
    ...fillAttrs,
    ...strokeAttrs,
  });
  elements.push(bgRect);

  // Children
  if (renderedChildren.length > 0) {
    if (clipsContent) {
      // Create clip path
      const clipId = ctx.defs.generateId("clip");
      const clipDef = clipPath(
        { id: clipId },
        rect({
          x: 0,
          y: 0,
          width: size.x,
          height: size.y,
          rx: cornerRadius && cornerRadius > 0 ? cornerRadius : undefined,
          fill: "black",
        })
      );
      ctx.defs.add(clipDef);

      // Wrap children in clipped group
      const clippedGroup = g(
        { "clip-path": `url(#${clipId})` },
        ...renderedChildren
      );
      elements.push(clippedGroup);
    } else {
      elements.push(...renderedChildren);
    }
  }

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...elements
  );
}
