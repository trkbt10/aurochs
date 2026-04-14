/**
 * @file Ellipse node renderer
 *
 * Handles both full ellipses and arcs (via arcData).
 * When arcData is present with a non-full sweep, renders as a <path>
 * using SVG arc commands instead of an <ellipse> element.
 */

import type { FigNode } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { ellipse, path as svgPath, g, type SvgString } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, type FillAttrs, type ShapeGeometry } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { getFilterAttr } from "../effects";
import { decodePathsFromGeometry } from "../geometry-path";
import { renderPaths } from "../render-paths";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  extractEffectsProps,
} from "./extract-props";

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
  const raw = (node as Record<string, unknown>).arcData as ArcData | undefined;
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
  readonly filterAttr: string | undefined;
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
  const { fillPaints, strokeAttrs, transformStr, opacity, filterAttr, ctx, size } = params;

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
    filter: filterAttr,
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
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { effects } = extractEffectsProps(node);

  const transformStr = buildTransformAttr(transform);
  const strokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  const cx = size.x / 2;
  const cy = size.y / 2;

  // Calculate bounds for filter region
  const tx = transform?.m02 ?? 0;
  const ty = transform?.m12 ?? 0;
  const bounds = { x: tx, y: ty, width: size.x, height: size.y };
  const filterAttr = getFilterAttr(effects, ctx, bounds);

  // Priority 1a: fillGeometry — pre-computed fill paths (supports arcs, donuts)
  if (fillGeometry && fillGeometry.length > 0) {
    const paths = decodePathsFromGeometry(fillGeometry, ctx.blobs);
    if (paths.length > 0) {
      return renderEllipseFromPaths(paths, {
        fillPaints, strokeAttrs, transformStr, opacity, filterAttr, ctx, size,
      });
    }
  }

  // Priority 1b: strokeGeometry — pre-expanded stroke outlines
  if (strokeGeometry && strokeGeometry.length > 0) {
    const paths = decodePathsFromGeometry(strokeGeometry, ctx.blobs);
    if (paths.length > 0) {
      return renderPaths({
        paths,
        fillAttrs: { fill: "none" },
        strokeAttrs: {},
        transform: transformStr,
        opacity,
        filter: filterAttr,
      });
    }
  }

  // Priority 2: arcData — generate arc path from parameters
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

    const arcElement = svgPath({
      d,
      "fill-rule": "evenodd",
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
      ...fillResult.attrs,
      ...strokeAttrs,
    });

    const withFill = applyFillResult(fillResult, arcElement);

    if (filterAttr) {
      return g({ filter: filterAttr }, withFill);
    }
    return withFill;
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

  const ellipseElement = ellipse({
    cx,
    cy,
    rx: cx,
    ry: cy,
    transform: transformStr || undefined,
    opacity: opacity < 1 ? opacity : undefined,
    ...fillResult.attrs,
    ...strokeAttrs,
  });

  const withFill = applyFillResult(fillResult, ellipseElement);

  if (filterAttr) {
    return g({ filter: filterAttr }, withFill);
  }

  return withFill;
}
