/**
 * @file Ellipse node renderer
 *
 * Handles both full ellipses and arcs (via arcData).
 * When arcData is present with a non-full sweep, renders as a <path>
 * using SVG arc commands instead of an <ellipse> element.
 */

import type { FigNode, FigPaint } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, path as svgPath, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, strokePaintsToFillAttrs, getPaintBlendModeCss, type ShapeGeometry } from "../fill";
import { getStrokeAttrs, type StrokeAttrs } from "../stroke";
import { figColorToHex, getSolidPaintColor } from "@aurochs/fig/color";
import { resolveStrokeWeight } from "../../stroke";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
} from "./extract-props";

// =============================================================================
// Multi-paint stroke layers
// =============================================================================

/**
 * Build individual stroke layer elements for multi-paint strokes.
 *
 * Figma supports multiple stroke paints layered bottom-to-top, each with its
 * own color, opacity, and blend mode. For example, Activity Rings use:
 *   - Paint 1: bright color (e.g. #F41E5A)
 *   - Paint 2: black with opacity 0.8 and mix-blend-mode:multiply
 *
 * SVG doesn't support multiple strokes on one element, so we render a separate
 * path element for each visible stroke paint.
 *
 * Returns empty array if there are 0 or 1 visible paints (the caller should
 * use the normal single-stroke path in that case).
 */
function buildStrokeLayers(
  d: string,
  strokePaints: readonly FigPaint[] | undefined,
  strokeWeightRaw: import("@aurochs/fig/types").FigStrokeWeight | undefined,
  transformStr: string | undefined,
): SvgString[] {
  if (!strokePaints || !strokeWeightRaw) { return []; }
  const visiblePaints = strokePaints.filter((p) => p.visible !== false);
  if (visiblePaints.length <= 1) { return []; }

  const weight = resolveStrokeWeight(strokeWeightRaw);
  if (weight <= 0) { return []; }

  const layers: SvgString[] = [];
  for (const paint of visiblePaints) {
    const color = getSolidPaintColor(paint);
    if (!color) { continue; }

    const hex = figColorToHex(color);
    const paintOpacity = paint.opacity ?? 1;
    const blendCss = getPaintBlendModeCss(paint);

    const pathEl = svgPath({
      d,
      fill: "none",
      stroke: hex,
      "stroke-width": weight,
      "stroke-opacity": paintOpacity < 1 ? paintOpacity : undefined,
      "stroke-linecap": "round",
      transform: transformStr || undefined,
    });

    if (blendCss) {
      layers.push(g({ style: `mix-blend-mode:${blendCss}` }, pathEl));
    } else {
      layers.push(pathEl);
    }
  }

  return layers;
}

/**
 * Build a full-circle SVG path using two semicircular arcs.
 * Used when we need a `d` attribute for stroke layer rendering on full ellipses.
 */
function buildFullCirclePath(cx: number, cy: number, rx: number, ry: number): string {
  // Two semicircles: top → bottom → top
  return [
    `M ${cx + rx} ${cy}`,
    `A ${rx} ${ry} 0 1 1 ${cx - rx} ${cy}`,
    `A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy}`,
    "Z",
  ].join(" ");
}

// =============================================================================
// Arc Data
// =============================================================================

type ArcData = {
  readonly startingAngle: number;
  readonly endingAngle: number;
  readonly innerRadius: number;
};

/**
 * Extract arcData from the node if present.
 *
 * Returns undefined if the node has no arcData or if the arc covers
 * a full circle (start=0, end=2π), in which case a regular ellipse is used.
 */
function getArcData(node: FigNode): ArcData | undefined {
  const raw = node.arcData;
  if (!raw) {
    return undefined;
  }

  const sweep = Math.abs(raw.endingAngle - raw.startingAngle);
  const fullCircle = Math.abs(sweep - Math.PI * 2) < 0.001;

  if (fullCircle && raw.innerRadius === 0) {
    // Full ellipse, no inner radius — use <ellipse> element
    return undefined;
  }

  return raw;
}

/**
 * Build SVG path data for an arc/donut shape.
 *
 * Supports:
 * - Partial arc (startAngle != endAngle, less than full circle)
 * - Donut (innerRadius > 0): ring with outer and inner arcs
 * - Full donut (full circle with innerRadius > 0)
 *
 * Uses SVG arc commands (A) for curved segments.
 */
function buildArcPath(
  cx: number, cy: number, rx: number, ry: number,
  arcData: ArcData,
): string {
  const { startingAngle, endingAngle, innerRadius } = arcData;
  const sweep = endingAngle - startingAngle;
  const fullCircle = Math.abs(Math.abs(sweep) - Math.PI * 2) < 0.001;
  const largeArc = Math.abs(sweep) > Math.PI ? 1 : 0;
  const sweepFlag = sweep > 0 ? 1 : 0;

  // Outer arc points
  const outerStartX = cx + rx * Math.cos(startingAngle);
  const outerStartY = cy + ry * Math.sin(startingAngle);
  const outerEndX = cx + rx * Math.cos(endingAngle);
  const outerEndY = cy + ry * Math.sin(endingAngle);

  if (innerRadius > 0) {
    // Donut / ring shape
    const irx = rx * innerRadius;
    const iry = ry * innerRadius;

    if (fullCircle) {
      // Full donut — two semicircular arcs for outer, two for inner (reversed)
      const outerMidX = cx + rx * Math.cos(startingAngle + Math.PI);
      const outerMidY = cy + ry * Math.sin(startingAngle + Math.PI);
      const innerStartX = cx + irx * Math.cos(startingAngle);
      const innerStartY = cy + iry * Math.sin(startingAngle);
      const innerMidX = cx + irx * Math.cos(startingAngle + Math.PI);
      const innerMidY = cy + iry * Math.sin(startingAngle + Math.PI);

      return [
        `M ${outerStartX} ${outerStartY}`,
        `A ${rx} ${ry} 0 1 1 ${outerMidX} ${outerMidY}`,
        `A ${rx} ${ry} 0 1 1 ${outerStartX} ${outerStartY}`,
        `M ${innerStartX} ${innerStartY}`,
        `A ${irx} ${iry} 0 1 0 ${innerMidX} ${innerMidY}`,
        `A ${irx} ${iry} 0 1 0 ${innerStartX} ${innerStartY}`,
      ].join(" ");
    }

    // Partial donut arc
    const innerStartX = cx + irx * Math.cos(endingAngle);
    const innerStartY = cy + iry * Math.sin(endingAngle);
    const innerEndX = cx + irx * Math.cos(startingAngle);
    const innerEndY = cy + iry * Math.sin(startingAngle);
    const innerSweepFlag = sweepFlag === 1 ? 0 : 1;

    return [
      `M ${outerStartX} ${outerStartY}`,
      `A ${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${outerEndX} ${outerEndY}`,
      `L ${innerStartX} ${innerStartY}`,
      `A ${irx} ${iry} 0 ${largeArc} ${innerSweepFlag} ${innerEndX} ${innerEndY}`,
      `Z`,
    ].join(" ");
  }

  if (fullCircle) {
    // Full circle without inner radius — handled as <ellipse>, shouldn't reach here
    // but handle gracefully
    const midX = cx + rx * Math.cos(startingAngle + Math.PI);
    const midY = cy + ry * Math.sin(startingAngle + Math.PI);
    return [
      `M ${outerStartX} ${outerStartY}`,
      `A ${rx} ${ry} 0 1 1 ${midX} ${midY}`,
      `A ${rx} ${ry} 0 1 1 ${outerStartX} ${outerStartY}`,
    ].join(" ");
  }

  // Partial arc (pie slice)
  return [
    `M ${cx} ${cy}`,
    `L ${outerStartX} ${outerStartY}`,
    `A ${rx} ${ry} 0 ${largeArc} ${sweepFlag} ${outerEndX} ${outerEndY}`,
    `Z`,
  ].join(" ");
}

// =============================================================================
// Fill geometry path rendering
// =============================================================================

type EllipsePathRenderParams = {
  readonly fillPaints: ReturnType<typeof extractPaintProps>["fillPaints"];
  readonly strokeAttrs: ReturnType<typeof getStrokeAttrs>;
  readonly transformStr: string;
  readonly opacity: number;
  readonly ctx: FigSvgRenderContext;
  readonly size: { x: number; y: number };
};

/**
 * Render decoded fill geometry paths with fill resolution and effects.
 */
function renderEllipseFromPaths(
  paths: ReturnType<typeof decodePathsFromGeometry>,
  params: EllipsePathRenderParams,
): SvgString {
  const { fillPaints, strokeAttrs, transformStr, opacity, ctx, size } = params;

  const clipShapes = paths.map((p) =>
    svgPath({ d: p.data, "fill-rule": p.windingRule ?? "nonzero", fill: "black" }),
  );
  const geometry: ShapeGeometry = {
    clipShapes,
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => {
      const elements = paths.map((p) =>
        svgPath({ d: p.data, "fill-rule": p.windingRule ?? "nonzero", ...attrs }),
      );
      return elements.length === 1 ? elements[0] : g({}, ...elements);
    },
  };

  const fillResult = getFillResult(fillPaints, ctx, geometry, {
    elementSize: { width: size.x, height: size.y },
  });

  const pathResult = renderPaths({
    paths,
    fillAttrs: fillResult.attrs,
    strokeAttrs,
    transform: transformStr,
    opacity,
  });

  return applyFillResult(fillResult, pathResult);
}

// =============================================================================
// Ellipse Node
// =============================================================================

/**
 * Render an ELLIPSE node to SVG.
 *
 * If fillGeometry exists, uses it directly (handles arcs via blob data).
 * If arcData is present (without fillGeometry), generates arc path from parameters.
 * Otherwise, renders a standard <ellipse> element.
 */
export function renderEllipseNode(node: FigNode, ctx: FigSvgRenderContext): SvgString {
  const { transform, opacity } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);

  const transformStr = buildTransformAttr(transform);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight, options: { strokeCap, strokeJoin, dashPattern: strokeDashes } });

  const cx = size.x / 2;
  const cy = size.y / 2;

  // Priority 1a: fillGeometry — pre-computed fill paths (supports arcs, donuts)
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, ctx.blobs);
    if (paths.length > 0) {
      return renderEllipseFromPaths(paths, {
        fillPaints, strokeAttrs, transformStr, opacity, ctx, size,
      });
    }
  }

  // Priority 1b: arcData — generate arc/ellipse path with stroke attributes.
  //
  // When an ELLIPSE has arcData (partial arc or donut), we generate the path
  // from the arc parameters and apply stroke directly, rather than using
  // strokeGeometry (pre-expanded outline). This avoids two problems:
  //
  // 1. strokeGeometry filled paths get clipped by parent clipPath, cutting off
  //    strokes that extend beyond the element bounds (e.g. Activity Rings).
  //    SVG stroke on a <path>/<ellipse> naturally extends beyond the element
  //    bbox, matching Figma's rendering.
  //
  // 2. Multi-paint strokes (e.g. color + black with multiply blend) require
  //    layered rendering. With strokeGeometry we can only apply one fill color.
  //    With stroke attributes, we render one shape per stroke paint.
  const arcData = getArcData(node);
  if (arcData) {
    const d = buildArcPath(cx, cy, cx, cy, arcData);
    const clipShape = svgPath({ d, fill: "black" });
    const geometry: ShapeGeometry = {
      clipShapes: [clipShape],
      bounds: { x: 0, y: 0, width: size.x, height: size.y },
      renderFillLayer: (attrs) => svgPath({ d, ...attrs }),
    };

    const fillResult = getFillResult(fillPaints, ctx, geometry, {
      elementSize: { width: size.x, height: size.y },
    });

    // Build stroke layers: each visible stroke paint becomes a separate element
    // to support multi-paint strokes with blend modes (e.g. color + black multiply)
    const strokeLayers = buildStrokeLayers(d, strokePaints, strokeWeight, transformStr);

    const arcElement = svgPath({
      d,
      "fill-rule": "evenodd",
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
      ...fillResult.attrs,
      ...(strokeLayers.length === 0 ? strokeAttrs : {}),
    });

    const withFill = applyFillResult(fillResult, arcElement);
    const elements: SvgString[] = [withFill, ...strokeLayers];
    const result = elements.length === 1 ? elements[0] : g(
      { opacity: opacity < 1 ? opacity : undefined },
      ...elements,
    );

    return result;
  }

  // Priority 1c: strokeGeometry — pre-expanded stroke outlines.
  //
  // Used only when:
  // - No arcData (already handled above)
  // - Not a stroke-only full circle with multiple paints, which should use
  //   Priority 3's multi-paint stroke layer approach instead.
  //
  // Stroke-only full circles (fillPaints empty, strokePaints present) rendered
  // via strokeGeometry get clipped by parent clipPath, cutting off the stroke
  // that extends beyond the element bounds. Using <ellipse stroke> avoids this
  // because SVG stroke naturally extends beyond the bbox.
  const isStrokeOnlyCircle = (!fillPaints || fillPaints.length === 0 || !fillPaints.some(p => p.visible !== false))
    && strokePaints && strokePaints.length > 0;
  if (!isStrokeOnlyCircle && strokeGeometry && strokeGeometry.length > 0) {
    const paths = decodePathsFromGeometry(strokeGeometry, ctx.blobs);
    if (paths.length > 0) {
      return renderPaths({
        paths,
        fillAttrs: strokePaintsToFillAttrs(strokePaints),
        strokeAttrs: {},
        transform: transformStr,
        opacity,
          });
    }
  }

  // Priority 3: Standard full ellipse
  const clipShape = ellipse({ cx, cy, rx: cx, ry: cy, fill: "black" });
  const geometry: ShapeGeometry = {
    clipShapes: [clipShape],
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => ellipse({ cx, cy, rx: cx, ry: cy, ...attrs }),
  };

  const fillResult = getFillResult(fillPaints, ctx, geometry, {
    elementSize: { width: size.x, height: size.y },
  });

  // Build multi-paint stroke layers for full ellipses (same approach as arcs).
  // Full-circle ellipses that are stroke-only (e.g. Activity Ring dark backgrounds)
  // need layered stroke rendering to match Figma's multi-paint stroke stacking.
  const fullCirclePath = buildFullCirclePath(cx, cy, cx, cy);
  const ellipseStrokeLayers = buildStrokeLayers(fullCirclePath, strokePaints, strokeWeight, transformStr);

  const ellipseElement = ellipse({
    cx,
    cy,
    rx: cx,
    ry: cy,
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillResult.attrs,
    ...(ellipseStrokeLayers.length === 0 ? strokeAttrs : {}),
  });

  const withFill = applyFillResult(fillResult, ellipseElement);

  if (ellipseStrokeLayers.length > 0) {
    const elements: SvgString[] = [withFill, ...ellipseStrokeLayers];
    const result = g(
      { opacity: opacity < 1 ? opacity : undefined },
      ...elements,
    );
    return result;
  }

  return withFill;
}
