/**
 * @file Shared path rendering functions
 *
 * Eliminates duplication of single-path vs multi-path rendering logic
 * across vector.ts, rectangle.ts, and frame.ts.
 */

import type { GeometryPathData } from "./geometry-path";
import { mapWindingRule } from "./geometry-path";
import type { FillAttrs } from "./fill";
import type { StrokeAttrs } from "./stroke";
import { path, g, type SvgString } from "./primitives";

/**
 * Build path elements from decoded geometry paths (low-level, returns array).
 *
 * Used by frame.ts where path elements are pushed into a parent group
 * alongside other elements (background rect, children, etc.).
 */
export function buildPathElements(
  paths: readonly GeometryPathData[],
  fillAttrs: FillAttrs,
  strokeAttrs: StrokeAttrs,
): SvgString[] {
  return paths.map(({ data, windingRule }) =>
    path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      ...fillAttrs,
      ...strokeAttrs,
    }),
  );
}

/**
 * Render decoded geometry paths to SVG with single/multi-path grouping,
 * transform, opacity, and optional filter wrapping.
 *
 * Single path: attrs applied directly to `<path>`.
 * Multiple paths: wrapped in `<g>` with transform/opacity, each path gets fill/stroke.
 * Filter (if provided): outer `<g filter="...">` wraps everything.
 */
export function renderPaths(params: {
  readonly paths: readonly GeometryPathData[];
  readonly fillAttrs: FillAttrs;
  readonly strokeAttrs: StrokeAttrs;
  readonly transform?: string;
  readonly opacity?: number;
  readonly filter?: string;
}): SvgString {
  const { paths, fillAttrs, strokeAttrs, transform, opacity, filter } = params;

  const opacityAttr = opacity !== undefined && opacity < 1 ? opacity : undefined;

  let result: SvgString;

  if (paths.length === 1) {
    const { data, windingRule } = paths[0];
    result = path({
      d: data,
      "fill-rule": mapWindingRule(windingRule),
      transform: transform || undefined,
      opacity: opacityAttr,
      ...fillAttrs,
      ...strokeAttrs,
    });
  } else {
    const elements = buildPathElements(paths, fillAttrs, strokeAttrs);
    result = g(
      {
        transform: transform || undefined,
        opacity: opacityAttr,
      },
      ...elements,
    );
  }

  if (filter) {
    return g({ filter }, result);
  }
  return result;
}
