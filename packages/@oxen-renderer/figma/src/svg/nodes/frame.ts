/**
 * @file Frame node renderer
 */

import { getNodeType } from "@oxen/fig/parser";
import type { FigNode, FigVector } from "@oxen/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, rect, clipPath, path, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { decodePathsFromGeometry, mapWindingRule, type FigFillGeometry } from "../geometry-path";
import { buildPathElements } from "../render-paths";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractCornerRadiusProps,
} from "./extract-props";

function resolveClipsContent(node: FigNode): boolean {
  // Explicit clipsContent (set by mergeSymbolProperties or API clients)
  if (node.clipsContent === true) return true;
  if (node.clipsContent === false) return false;

  // Kiwi schema field: frameMaskDisabled (inverted meaning)
  if (node.frameMaskDisabled === true) return false;
  if (node.frameMaskDisabled === false) return true;

  // Default based on node type
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

function buildClipShapes(
  geometry: readonly FigFillGeometry[] | undefined,
  ctx: FigSvgRenderContext,
  size: FigVector,
  cornerRadius: number | undefined,
): readonly SvgString[] {
  if (geometry) {
    const paths = decodePathsFromGeometry(geometry, ctx.blobs);
    if (paths.length > 0) {
      return paths.map(({ data, windingRule }) =>
        path({
          d: data,
          "fill-rule": mapWindingRule(windingRule),
          fill: "black",
        }),
      );
    }
  }
  return [rect({
    x: 0,
    y: 0,
    width: size.x,
    height: size.y,
    rx: cornerRadius && cornerRadius > 0 ? cornerRadius : undefined,
    fill: "black",
  })];
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
  const { transform, opacity, visible } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { cornerRadius } = extractCornerRadiusProps(node);
  const clipsContent = resolveClipsContent(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx, { elementSize: { width: size.x, height: size.y } });
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  const elements: SvgString[] = [];

  const geometry = selectGeometry(fillGeometry, strokeGeometry);
  const decodedPaths = geometry ? decodePathsFromGeometry(geometry, ctx.blobs) : [];
  if (decodedPaths.length > 0) {
    elements.push(...buildPathElements(decodedPaths, fillAttrs, strokeAttrs));
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
      const clipShapes = buildClipShapes(geometry, ctx, size, cornerRadius);
      const clipDef = clipPath({ id: clipId }, ...clipShapes);
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
