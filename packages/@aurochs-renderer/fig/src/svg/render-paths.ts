/**
 * @file Shared path rendering functions
 *
 * Eliminates duplication of single-path vs multi-path rendering logic
 * across vector.ts, rectangle.ts, and frame.ts.
 */

import type { GeometryPathData } from "./geometry-path";
import type { FillAttrs } from "./fill";
import type { StrokeAttrs } from "./stroke";
import { path, g, type SvgString } from "./primitives";

/**
 * Build path elements from decoded geometry paths (low-level, returns array).
 *
 * Used by frame.ts where path elements are pushed into a parent group
 * alongside other elements (background rect, children, etc.).
 *
 * Note: GeometryPathData.windingRule is already a mapped WindingRule
 * ("evenodd" | "nonzero"), produced by decodePathsFromGeometry.
 * Do NOT re-map it through mapWindingRule — that would convert the
 * lowercase "evenodd" back to "nonzero" (the function expects uppercase
 * Figma enum names like "EVENODD" or "ODD").
 */
export function buildPathElements(
  paths: readonly GeometryPathData[],
  fillAttrs: FillAttrs,
  strokeAttrs: StrokeAttrs,
): SvgString[] {
  return paths.map(({ data, windingRule }) =>
    path({
      d: data,
      "fill-rule": windingRule ?? "nonzero",
      ...fillAttrs,
      ...strokeAttrs,
    }),
  );
}

/**
 * Render decoded geometry paths to SVG with single/multi-path grouping,
 * transform, and opacity.
 *
 * Single path: attrs applied directly to `<path>`.
 * Multiple paths: wrapped in `<g>` with transform/opacity, each path gets fill/stroke.
 *
 * Effects (filters) are applied at the renderNode level, not here.
 */
export function renderPaths(params: {
  readonly paths: readonly GeometryPathData[];
  readonly fillAttrs: FillAttrs;
  readonly strokeAttrs: StrokeAttrs;
  readonly transform?: string;
  readonly opacity?: number;
}): SvgString {
  const { paths, fillAttrs, strokeAttrs, transform, opacity } = params;

  const opacityAttr = opacity !== undefined && opacity < 1 ? opacity : undefined;

  if (paths.length === 1) {
    const { data, windingRule } = paths[0];
    return path({
      d: data,
      "fill-rule": windingRule ?? "nonzero",
      transform: transform || undefined,
      opacity: opacityAttr,
      ...fillAttrs,
      ...strokeAttrs,
    });
  }

  const elements = buildPathElements(paths, fillAttrs, strokeAttrs);
  return g(
    {
      transform: transform || undefined,
      opacity: opacityAttr,
    },
    ...elements,
  );
}
