/**
 * @file Vector node renderer
 */

import type { FigNode, FigVectorPath, FigFillGeometry, FigPaint } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillAttrs, type FillAttrs } from "../fill";
import { getStrokeAttrs, type StrokeAttrs } from "../stroke";
import type { GeometryPathData } from "../geometry-path";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import { extractBaseProps, extractPaintProps, extractGeometryProps } from "./extract-props";
import { figColorToHex, getPaintType } from "../../core/color";

// =============================================================================
// Vector Path Types
// =============================================================================

type PathSources = {
  readonly vectorPaths: readonly FigVectorPath[] | undefined;
  readonly fillGeometry: readonly FigFillGeometry[] | undefined;
  readonly strokeGeometry: readonly FigFillGeometry[] | undefined;
  readonly blobs: readonly FigBlob[];
};

type PathResolution = {
  readonly paths: readonly GeometryPathData[];
  /** True when paths come from strokeGeometry (already-expanded outlines) */
  readonly isStrokeGeometry: boolean;
};

/**
 * Resolve paths to render, tracking the source.
 *
 * Priority: vectorPaths → fillGeometry → strokeGeometry.
 * When strokeGeometry is used, the paths are pre-expanded outlines that
 * should be *filled* with the stroke colour (not stroked again).
 */
function resolvePaths(sources: PathSources): PathResolution {
  const { vectorPaths, fillGeometry, strokeGeometry, blobs } = sources;

  // Try vectorPaths first (if available)
  if (vectorPaths && vectorPaths.length > 0) {
    const paths = vectorPaths.filter((vp) => vp.data).map((vp) => ({ data: vp.data!, windingRule: vp.windingRule }));
    if (paths.length > 0) {
      return { paths, isStrokeGeometry: false };
    }
  }

  // Try fillGeometry with blob decoding
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, blobs);
    if (paths.length > 0) {
      return { paths, isStrokeGeometry: false };
    }
  }

  // Fallback: strokeGeometry (expanded outline — should be filled, not stroked)
  if (strokeGeometry && strokeGeometry.length > 0) {
    const paths = decodePathsFromGeometry(strokeGeometry, blobs);
    if (paths.length > 0) {
      return { paths, isStrokeGeometry: true };
    }
  }

  return { paths: [], isStrokeGeometry: false };
}

/**
 * Build fill attrs from stroke paints.
 *
 * strokeGeometry is Figma's pre-expanded outline of a stroke.
 * It must be *filled* with the stroke colour instead of being stroked.
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
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const vectorPaths = node.vectorPaths;

  const transformStr = buildTransformAttr(transform);

  const { paths: pathsToRender, isStrokeGeometry } = resolvePaths({
    vectorPaths,
    fillGeometry,
    strokeGeometry,
    blobs: ctx.blobs,
  });

  if (pathsToRender.length === 0) {
    return EMPTY_SVG;
  }

  let fillAttrs: FillAttrs;
  let strokeAttrs: StrokeAttrs;

  if (isStrokeGeometry) {
    // strokeGeometry paths are pre-expanded outlines — fill them with stroke
    // colour and do NOT apply an additional stroke.
    fillAttrs = strokePaintsToFillAttrs(strokePaints);
    strokeAttrs = {};
  } else {
    fillAttrs = getFillAttrs(fillPaints, ctx);
    strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });
  }

  return renderPaths({
    paths: pathsToRender,
    fillAttrs,
    strokeAttrs,
    transform: transformStr,
    opacity,
  });
}
