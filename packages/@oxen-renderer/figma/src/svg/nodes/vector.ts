/**
 * @file Vector node renderer
 */

import type {
  FigNode,
  FigMatrix,
  FigPaint,
  FigStrokeWeight,
} from "@oxen/fig/types";
import type { FigBlob } from "@oxen/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { path, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { decodePathsFromGeometry, mapWindingRule, type FigFillGeometry } from "../geometry-path";

// =============================================================================
// Vector Path Types
// =============================================================================

/**
 * Figma vector path (from vectorPaths property)
 */
type FigVectorPath = {
  readonly windingRule?: "NONZERO" | "EVENODD" | "ODD";
  readonly data?: string;
};

// =============================================================================
// Vector Node
// =============================================================================

/**
 * Extract vector properties from a Figma node
 */
function extractVectorProps(node: FigNode): {
  transform: FigMatrix | undefined;
  vectorPaths: readonly FigVectorPath[] | undefined;
  fillGeometry: readonly FigFillGeometry[] | undefined;
  strokeGeometry: readonly FigFillGeometry[] | undefined;
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  strokeWeight: FigStrokeWeight | undefined;
  opacity: number;
} {
  const nodeData = node as Record<string, unknown>;

  return {
    transform: nodeData.transform as FigMatrix | undefined,
    vectorPaths: nodeData.vectorPaths as readonly FigVectorPath[] | undefined,
    fillGeometry: nodeData.fillGeometry as readonly FigFillGeometry[] | undefined,
    strokeGeometry: nodeData.strokeGeometry as readonly FigFillGeometry[] | undefined,
    fillPaints: nodeData.fillPaints as readonly FigPaint[] | undefined,
    strokePaints: nodeData.strokePaints as readonly FigPaint[] | undefined,
    strokeWeight: nodeData.strokeWeight as FigStrokeWeight | undefined,
    opacity: (nodeData.opacity as number) ?? 1,
  };
}

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
  const { transform, vectorPaths, fillGeometry, strokeGeometry, fillPaints, strokePaints, strokeWeight, opacity } =
    extractVectorProps(node);

  const transformStr = buildTransformAttr(transform);
  const fillAttrs = getFillAttrs(fillPaints, ctx);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Try vectorPaths first (if available), then fillGeometry, then strokeGeometry
  const pathsToRender = getPathsToRender({ vectorPaths, fillGeometry, strokeGeometry, blobs: ctx.blobs });

  if (pathsToRender.length === 0) {
    return EMPTY_SVG;
  }

  // Single path
  if (pathsToRender.length === 1) {
    const { data, windingRule } = pathsToRender[0];
    return path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
      ...fillAttrs,
      ...strokeAttrs,
    });
  }

  // Multiple paths - wrap in group
  const pathElements = pathsToRender.map(({ data, windingRule }) =>
    path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      ...fillAttrs,
      ...strokeAttrs,
    })
  );

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...pathElements
  );
}
