/**
 * @file Vector node renderer
 */

import type { FigNode, FigVectorPath, FigFillGeometry } from "@oxen/fig/types";
import type { FigBlob } from "@oxen/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import { extractBaseProps, extractPaintProps, extractGeometryProps } from "./extract-props";

// =============================================================================
// Vector Path Types
// =============================================================================

type PathSources = {
  readonly vectorPaths: readonly FigVectorPath[] | undefined;
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
  readonly blobs: readonly FigBlob[];
};

/**
 * Get paths to render from various sources
 */
function getPathsToRender(sources: PathSources): readonly { data: string; windingRule?: "NONZERO" | "EVENODD" | "ODD" }[] {
  const { vectorPaths, fillGeometry, strokeGeometry, blobs } = sources;

  // Try vectorPaths first (if available)
  if (vectorPaths && vectorPaths.length > 0) {
    const paths = vectorPaths
      .filter((vp) => vp.data)
      .map((vp) => ({ data: vp.data!, windingRule: vp.windingRule }));
    if (paths.length > 0) {
      return paths;
    }
  }

  // Try fillGeometry with blob decoding
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, blobs);
    if (paths.length > 0) {
      return paths;
    }
  }

  // For LINE nodes, use strokeGeometry instead of fillGeometry
  if (strokeGeometry && strokeGeometry.length > 0) {
    return decodePathsFromGeometry(strokeGeometry, blobs);
  }

  return [];
}

/**
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(
  node: FigNode,
  ctx: FigSvgRenderContext
): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const vectorPaths = node.vectorPaths;

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Try vectorPaths first (if available), then fillGeometry, then strokeGeometry
  const pathsToRender = getPathsToRender({ vectorPaths, fillGeometry, strokeGeometry, blobs: ctx.blobs });

  if (pathsToRender.length === 0) {
    return EMPTY_SVG;
  }

  return renderPaths({
    paths: pathsToRender,
    fillAttrs,
    strokeAttrs,
    transform: transformStr,
    opacity,
  });
}
