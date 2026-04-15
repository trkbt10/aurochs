/**
 * @file Vector node renderer
 */

import type { FigNode, FigPaint, FigVectorPath, FigFillGeometry, FigVectorStyleOverride } from "@aurochs/fig/types";
import type { FigBlob } from "@aurochs/fig/parser";
import { guidToString } from "@aurochs/fig/parser";
import type { FigSvgRenderContext } from "../../types";
import { path as svgPath, g, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, paintToFillAttrs, strokePaintsToFillAttrs, type FillAttrs, type ShapeGeometry } from "../fill";
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

// =============================================================================
// Per-path Style Override Resolution
// =============================================================================

/**
 * Resolve the fill paints for a specific styleID using vectorData.styleOverrideTable.
 *
 * Returns the resolved FigPaint array, or undefined if the styleID is 0 (base)
 * or not found in the override table.
 */
function resolveStyleOverrideFillPaints(
  styleID: number | undefined,
  overrideTable: readonly FigVectorStyleOverride[] | undefined,
  ctx: FigSvgRenderContext,
): readonly FigPaint[] | undefined {
  if (!styleID || styleID === 0 || !overrideTable) {
    return undefined;
  }

  const entry = overrideTable.find((e) => e.styleID === styleID);
  if (!entry) {
    return undefined;
  }

  // If the override has styleIdForFill, resolve it via the style registry
  if (entry.styleIdForFill) {
    const resolved = ctx.styleRegistry.fills.get(guidToString(entry.styleIdForFill.guid));
    if (resolved) {
      return resolved;
    }
  }

  // Otherwise, use the override's own fillPaints
  if (entry.fillPaints && entry.fillPaints.length > 0) {
    return entry.fillPaints;
  }

  return undefined;
}

/**
 * Check whether any path in the set uses a non-base styleID.
 */
function hasStyleOverrides(paths: readonly GeometryPathData[]): boolean {
  return paths.some((p) => p.styleID !== undefined && p.styleID !== 0);
}

// =============================================================================
// Rendering
// =============================================================================

/**
 * Render a VECTOR node to SVG
 */
export function renderVectorNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
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

  const opacityAttr = opacity < 1 ? opacity : undefined;
  const baseStrokeAttrs = isStrokeGeometry
    ? ({} as StrokeAttrs)
    : getStrokeAttrs({ paints: strokePaints, strokeWeight, options: { strokeCap, strokeJoin, dashPattern: strokeDashes } });

  // Per-path style overrides: when fillGeometry entries carry different styleIDs,
  // each group of paths with the same styleID gets its own fill attrs resolved
  // from vectorData.styleOverrideTable.
  const overrideTable = node.vectorData?.styleOverrideTable;
  const needsPerPathStyles = !isStrokeGeometry && hasStyleOverrides(pathsToRender);

  if (needsPerPathStyles) {
    return renderPerPathStyles({
      pathsToRender,
      baseFillPaints: fillPaints,
      overrideTable,
      baseStrokeAttrs,
      isStrokeGeometry,
      strokePaints,
      ctx,
      size,
      transformStr,
      opacityAttr,
    });
  }

  // All paths share the same fill — single-style rendering
  return renderUniformStyle({
    pathsToRender,
    fillPaints,
    strokePaints,
    isStrokeGeometry,
    baseStrokeAttrs,
    ctx,
    size,
    transformStr,
    opacity,
  });
}

// =============================================================================
// Single-style rendering (all paths share one fill)
// =============================================================================

function renderUniformStyle(params: {
  pathsToRender: readonly GeometryPathData[];
  fillPaints: readonly FigPaint[] | undefined;
  strokePaints: readonly FigPaint[] | undefined;
  isStrokeGeometry: boolean;
  baseStrokeAttrs: StrokeAttrs;
  ctx: FigSvgRenderContext;
  size: { x: number; y: number };
  transformStr: string | undefined;
  opacity: number;
}): SvgString {
  const { pathsToRender, fillPaints, strokePaints, isStrokeGeometry, baseStrokeAttrs, ctx, size, transformStr, opacity } = params;

  // Build clip shapes from paths for complex fill geometry
  const clipShapes = pathsToRender.map((p) =>
    svgPath({ d: p.data, "fill-rule": p.windingRule ?? "nonzero", fill: "black" }),
  );
  const geometry: ShapeGeometry = {
    clipShapes,
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => {
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
    fillAttrsRef.value = strokePaintsToFillAttrs(strokePaints);
    strokeAttrsRef.value = {};
  } else {
    fillResultRef.value = getFillResult(fillPaints, ctx, geometry, {
      elementSize: { width: size.x, height: size.y },
    });
    fillAttrsRef.value = fillResultRef.value.attrs;
    strokeAttrsRef.value = baseStrokeAttrs;
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

// =============================================================================
// Per-path style rendering (paths have different styleIDs)
// =============================================================================

function renderPerPathStyles(params: {
  pathsToRender: readonly GeometryPathData[];
  baseFillPaints: readonly FigPaint[] | undefined;
  overrideTable: readonly FigVectorStyleOverride[] | undefined;
  baseStrokeAttrs: StrokeAttrs;
  isStrokeGeometry: boolean;
  strokePaints: readonly FigPaint[] | undefined;
  ctx: FigSvgRenderContext;
  size: { x: number; y: number };
  transformStr: string | undefined;
  opacityAttr: number | undefined;
}): SvgString {
  const { pathsToRender, baseFillPaints, overrideTable, baseStrokeAttrs, ctx, size, transformStr, opacityAttr } = params;

  const elements: SvgString[] = [];

  for (const pathData of pathsToRender) {
    const overridePaints = resolveStyleOverrideFillPaints(pathData.styleID, overrideTable, ctx);
    const effectivePaints = overridePaints ?? baseFillPaints;

    // Resolve fill for this specific path
    const fillAttrs = resolveFillAttrsForSinglePath(effectivePaints, ctx, size);

    elements.push(
      svgPath({
        d: pathData.data,
        "fill-rule": pathData.windingRule ?? "nonzero",
        ...fillAttrs,
        ...baseStrokeAttrs,
      }),
    );
  }

  if (elements.length === 1) {
    // Re-wrap the single element with transform/opacity
    // The path element already has fill/stroke, just add transform/opacity
    return svgPath({
      d: pathsToRender[0].data,
      "fill-rule": pathsToRender[0].windingRule ?? "nonzero",
      transform: transformStr || undefined,
      opacity: opacityAttr,
      ...resolveFillAttrsForSinglePath(
        resolveStyleOverrideFillPaints(pathsToRender[0].styleID, overrideTable, ctx) ?? baseFillPaints,
        ctx, size,
      ),
      ...baseStrokeAttrs,
    });
  }

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacityAttr,
    },
    ...elements,
  );
}

/**
 * Resolve fill attrs for a single path's paints.
 * Simplified version of getFillResult for per-path rendering where
 * complex multi-paint layering per-path is not needed (the topmost
 * visible paint is used).
 */
function resolveFillAttrsForSinglePath(
  paints: readonly FigPaint[] | undefined,
  ctx: FigSvgRenderContext,
  size: { x: number; y: number },
): FillAttrs {
  if (!paints || paints.length === 0) {
    return { fill: "none" };
  }

  const visiblePaints = paints.filter((p) => p.visible !== false);
  if (visiblePaints.length === 0) {
    return { fill: "none" };
  }

  // Use the topmost visible paint
  const topPaint = visiblePaints[visiblePaints.length - 1];
  return paintToFillAttrs(topPaint, ctx, { width: size.x, height: size.y });
}
