/**
 * @file Geometry renderer for PPTX
 *
 * Converts Geometry domain objects to SVG paths with PPTX-specific fill and line styling.
 *
 * Core geometry rendering is shared from @aurochs-renderer/drawing-ml.
 * This module adds PPTX-specific features like Fill, Line, and marker support.
 */

import type { GeometryPath, Transform } from "@aurochs-office/drawing-ml/domain/geometry";
import type { HtmlString } from "./string-utils";
import { path } from "./primitives";
import { renderFillToStyle, renderLineToStyle } from "./fill";
import { generateLineMarkers, type MarkerCollection } from "./marker";
import { resolveFill, formatRgba } from "@aurochs-office/pptx/domain/color/fill";
import type { Fill, Line } from "@aurochs-office/pptx/domain";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";

// Import shared geometry rendering from drawing-ml
import { renderGeometryPathData, buildTransformAttr } from "@aurochs-renderer/drawing-ml/svg";

// =============================================================================
// PPTX-Specific Path Rendering
// =============================================================================

/**
 * Render a geometry path to SVG path element with PPTX fill and line styling.
 */
export function renderGeometryPath({
  geomPath,
  fill,
  line,
  transform,
}: {
  geomPath: GeometryPath;
  fill: Fill | undefined;
  line: Line | undefined;
  transform?: Transform;
}): HtmlString {
  const d = renderGeometryPathData(geomPath);

  const fillStyle = fill ? renderFillToStyle(fill) : undefined;
  const strokeStyle = line ? renderLineToStyle(line) : undefined;

  const pathAttrs: Record<string, string | number | undefined> = {
    d,
    fill: fillStyle?.fill ?? "none",
    stroke: strokeStyle?.stroke,
    "stroke-width": strokeStyle?.strokeWidth,
    "stroke-linecap": strokeStyle?.strokeLinecap,
    "stroke-linejoin": strokeStyle?.strokeLinejoin,
    "stroke-dasharray": strokeStyle?.strokeDasharray,
  };

  if (transform) {
    pathAttrs.transform = buildTransformAttr(transform);
  }

  return path(pathAttrs as Parameters<typeof path>[0]);
}

// =============================================================================
// Geometry Path with Markers
// =============================================================================

/**
 * Extract stroke color from line fill.
 */
function getStrokeColorFromLine(line: Line, colorContext?: ColorContext): string {
  if (line.fill.type !== "solidFill") {
    return "#000000";
  }
  const resolved = resolveFill(line.fill, colorContext);
  if (resolved.type !== "solid") {
    return "#000000";
  }
  return formatRgba(resolved.color.hex, resolved.color.alpha);
}

/**
 * Generate markers for a line if it has headEnd or tailEnd.
 */
function generateMarkersForLine(
  line: Line | undefined,
  strokeStyle: { strokeWidth: number } | undefined,
  colorContext?: ColorContext,
): MarkerCollection {
  if (!line) {
    return { defs: [] };
  }
  if (!line.headEnd && !line.tailEnd) {
    return { defs: [] };
  }
  if (!strokeStyle) {
    return { defs: [] };
  }

  const strokeColor = getStrokeColorFromLine(line, colorContext);
  return generateLineMarkers({
    headEnd: line.headEnd,
    tailEnd: line.tailEnd,
    strokeWidth: strokeStyle.strokeWidth,
    colorHex: strokeColor,
  });
}

/**
 * Result of rendering a geometry path with markers
 */
export type GeometryPathWithMarkersResult = {
  /** The rendered path element */
  pathElement: HtmlString;
  /** Marker definitions to include in <defs> */
  markerDefs: HtmlString[];
};

/**
 * Render a geometry path to SVG path element with marker support.
 *
 * This function generates both the path element and any required marker
 * definitions for line ends (arrows).
 *
 * @see ECMA-376 Part 1, Section 20.1.8.37 (headEnd)
 * @see ECMA-376 Part 1, Section 20.1.8.57 (tailEnd)
 */
export function renderGeometryPathWithMarkers({
  geomPath,
  fill,
  line,
  colorContext,
  transform,
}: {
  geomPath: GeometryPath;
  fill: Fill | undefined;
  line: Line | undefined;
  colorContext?: ColorContext;
  transform?: Transform;
}): GeometryPathWithMarkersResult {
  const d = renderGeometryPathData(geomPath);

  const fillStyle = fill ? renderFillToStyle(fill) : undefined;
  const strokeStyle = line ? renderLineToStyle(line) : undefined;

  // Generate markers if line has headEnd or tailEnd
  const markers = generateMarkersForLine(line, strokeStyle, colorContext);

  const pathAttrs: Record<string, string | number | undefined> = {
    d,
    fill: fillStyle?.fill ?? "none",
    stroke: strokeStyle?.stroke,
    "stroke-width": strokeStyle?.strokeWidth,
    "stroke-linecap": strokeStyle?.strokeLinecap,
    "stroke-linejoin": strokeStyle?.strokeLinejoin,
    "stroke-dasharray": strokeStyle?.strokeDasharray,
    "marker-start": markers.markerStart,
    "marker-end": markers.markerEnd,
  };

  if (transform) {
    pathAttrs.transform = buildTransformAttr(transform);
  }

  return {
    pathElement: path(pathAttrs as Parameters<typeof path>[0]),
    markerDefs: markers.defs,
  };
}
