/**
 * @file Frame node renderer
 */

import { getNodeType } from "@oxen/fig/parser";
import type { FigNode, FigMatrix, FigPaint, FigVector, FigStrokeWeight } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, rect, clipPath, path, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { decodePathsFromGeometry, mapWindingRule, type FigFillGeometry } from "../geometry-path";

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
  fillGeometry: readonly FigFillGeometry[] | undefined;
  strokeGeometry: readonly FigFillGeometry[] | undefined;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    size: nodeData.size as FigVector,
    transform: nodeData.transform as FigMatrix | undefined,
    cornerRadius: nodeData.cornerRadius as number | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
    visible: (nodeData.visible as boolean) ?? true,
    clipsContent: resolveClipsContent(node),
    fillGeometry: nodeData.fillGeometry as readonly FigFillGeometry[] | undefined,
    strokeGeometry: nodeData.strokeGeometry as readonly FigFillGeometry[] | undefined,
  };
}

function resolveClipsContent(node: FigNode): boolean {
  const nodeData = node as Record<string, unknown>;
  const raw = nodeData.clipsContent;
  if (raw === true) return true;
  if (raw === false) return false;

  const nodeType = getNodeType(node);
  if (nodeType === "INSTANCE") {
    return false;
  }
  if (nodeType === "FRAME" || nodeType === "COMPONENT" || nodeType === "COMPONENT_SET" || nodeType === "SYMBOL") {
    return true;
  }
  return false;
}

function selectGeometry(
  fillGeometry: readonly FigFillGeometry[] | undefined,
  strokeGeometry: readonly FigFillGeometry[] | undefined,
): readonly FigFillGeometry[] | undefined {
  if (fillGeometry && fillGeometry.length > 0) {
    return fillGeometry;
  }
  if (strokeGeometry && strokeGeometry.length > 0) {
    return strokeGeometry;
  }
  return undefined;
}

function buildGeometryElements(
  geometry: readonly FigFillGeometry[] | undefined,
  ctx: FigSvgRenderContext,
  fillAttrs: Record<string, unknown>,
  strokeAttrs: Record<string, unknown>,
): readonly SvgString[] {
  if (!geometry) {
    return [];
  }
  const paths = decodePathsFromGeometry(geometry, ctx.blobs);
  if (paths.length === 0) {
    return [];
  }
  return paths.map(({ data, windingRule }) =>
    path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      ...fillAttrs,
      ...strokeAttrs,
    }),
  );
}

function buildClipShape(
  geometry: readonly FigFillGeometry[] | undefined,
  ctx: FigSvgRenderContext,
  size: FigVector,
  cornerRadius: number | undefined,
): SvgString {
  if (geometry) {
    const paths = decodePathsFromGeometry(geometry, ctx.blobs);
    if (paths.length > 0) {
      return g(
        {},
        ...paths.map(({ data, windingRule }) =>
          path({
            d: data,
            "fill-rule": mapWindingRule(windingRule),
            fill: "black",
          }),
        ),
      );
    }
  }
  return rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx: cornerRadius && cornerRadius > 0 ? cornerRadius : undefined,
    fill: "black",
  });
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
  renderedChildren: readonly SvgString[],
): SvgString {
  const { size, transform, cornerRadius, fillPaints, strokePaints, strokeWeight, opacity, visible, clipsContent, fillGeometry, strokeGeometry } =
    extractFrameProps(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  const elements: SvgString[] = [];

  const geometry = selectGeometry(fillGeometry, strokeGeometry);
  const geometryElements = buildGeometryElements(geometry, ctx, fillAttrs, strokeAttrs);
  if (geometryElements.length > 0) {
    elements.push(...geometryElements);
  } else {
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
  }

  // Children
  if (renderedChildren.length > 0) {
    if (clipsContent) {
      // Create clip path
      const clipId = ctx.defs.generateId("clip");
      const clipShape = buildClipShape(geometry, ctx, size, cornerRadius);
      const clipDef = clipPath({ id: clipId }, clipShape);
      ctx.defs.add(clipDef);

      // Wrap children in clipped group
      const clippedGroup = g({ "clip-path": `url(#${clipId})` }, ...renderedChildren);
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
    ...elements,
  );
}
