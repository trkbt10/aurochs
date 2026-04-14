/**
 * @file Vector node renderer
 */

import type { FigNode, FigVectorPath, FigFillGeometry } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { path as svgPath, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, strokePaintsToFillAttrs, type FillAttrs, type ShapeGeometry } from "../fill";
import { getStrokeAttrs, type StrokeAttrs } from "../stroke";
import type { GeometryPathData } from "../geometry-path";
import { decodePathsFromGeometry } from "../geometry-path";
import { mapWindingRule } from "../../geometry";
import { renderPaths } from "../render-paths";
import { extractBaseProps, extractSizeProps, extractPaintProps, extractGeometryProps } from "./extract-props";

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
    const paths = vectorPaths.filter((vp) => vp.data).map((vp) => ({ data: vp.data!, windingRule: mapWindingRule(vp.windingRule) }));
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
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
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

  // Build clip shapes from paths for complex fill geometry
  const clipShapes = pathsToRender.map((p) =>
    svgPath({ d: p.data, "fill-rule": p.windingRule ?? "nonzero", fill: "black" }),
  );
  const geometry: ShapeGeometry = {
    clipShapes,
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => {
      // Re-render all paths with the given fill
      const elements = pathsToRender.map((p) =>
        svgPath({ d: p.data, "fill-rule": p.windingRule ?? "nonzero", ...attrs }),
      );
      return elements.length === 1 ? elements[0] : g({}, ...elements);
    },
  };

  const fillResultRef = { value: undefined as ReturnType<typeof getFillResult> | undefined };
  const fillAttrsRef = { value: undefined as FillAttrs | undefined };
  const strokeAttrsRef = { value: undefined as StrokeAttrs | undefined };

  if (isStrokeGeometry) {
    // strokeGeometry paths are pre-expanded outlines — fill them with stroke
    // colour and do NOT apply an additional stroke.
    fillAttrsRef.value = strokePaintsToFillAttrs(strokePaints);
    strokeAttrsRef.value = {};
  } else {
    fillResultRef.value = getFillResult(fillPaints, ctx, geometry, {
      elementSize: { width: size.x, height: size.y },
    });
    fillAttrsRef.value = fillResultRef.value.attrs;
    strokeAttrsRef.value = getStrokeAttrs({ paints: strokePaints, strokeWeight });
  }

  const pathResult = renderPaths({
    paths: pathsToRender,
    fillAttrs: fillAttrsRef.value,
    strokeAttrs: strokeAttrsRef.value,
    transform: transformStr,
    opacity,
  });

  if (fillResultRef.value) {
    return applyFillResult(fillResultRef.value, pathResult);
  }
  return pathResult;
}
