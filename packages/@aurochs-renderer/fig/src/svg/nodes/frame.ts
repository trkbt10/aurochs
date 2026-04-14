/**
 * @file Frame node renderer
 */

import { getNodeType } from "@aurochs/fig/parser";
import type { FigNode, FigVector, FigPaint, FigFillGeometry } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, rect, clipPath, path, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, type FillAttrs, type ShapeGeometry } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { decodePathsFromGeometry } from "../geometry-path";
import { mapWindingRule } from "../../geometry";
import { buildPathElements } from "../render-paths";
import { figColorToHex, getPaintType } from "@aurochs/fig/color";
import {
  extractBaseProps,
  extractSizeProps,
  extractPaintProps,
  extractGeometryProps,
  resolveCornerRadius,
} from "./extract-props";

function resolveClipsContent(node: FigNode): boolean {
  // Explicit clipsContent (set by mergeSymbolProperties or API clients)
  if (node.clipsContent === true) {return true;}
  if (node.clipsContent === false) {return false;}

  // Kiwi schema field: frameMaskDisabled (inverted meaning)
  if (node.frameMaskDisabled === true) {return false;}
  if (node.frameMaskDisabled === false) {return true;}

  // Default based on node type
  const nodeType = getNodeType(node);
  if (nodeType === "INSTANCE") {
    return false;
  }
  if (nodeType === "FRAME" || nodeType === "COMPONENT" || nodeType === "COMPONENT_SET" || nodeType === "SYMBOL") {
    return true;
  }
  return false;
}

/**
 * Build fill attrs from stroke paints (for strokeGeometry).
 */
function strokePaintsToFillAttrs(paints: readonly FigPaint[] | undefined): FillAttrs {
  if (!paints || paints.length === 0) {return { fill: "none" };}
  const visible = paints.find((p) => p.visible !== false);
  if (!visible) {return { fill: "none" };}
  if (getPaintType(visible) === "SOLID") {
    const solid = visible as FigPaint & { color: { r: number; g: number; b: number; a: number } };
    const hex = figColorToHex(solid.color);
    const opacity = visible.opacity ?? 1;
    if (opacity < 1) {return { fill: hex, "fill-opacity": opacity };}
    return { fill: hex };
  }
  return { fill: "#000000" };
}

function buildClipShapes(
  { geometry, ctx, size, rx, ry }: { geometry: readonly FigFillGeometry[] | undefined; ctx: FigSvgRenderContext; size: FigVector; rx: number | undefined; ry: number | undefined; }
): readonly SvgString[] {
  if (geometry) {
    const paths = decodePathsFromGeometry(geometry, ctx.blobs);
    if (paths.length > 0) {
      return paths.map(({ data, windingRule }) =>
        path({
          d: data,
          "fill-rule": mapWindingRule(windingRule),
          fill: "black",
        }),
      );
    }
  }
  return [
    rect({
      x: 0,
      y: 0,
      width: size.x,
      height: size.y,
      rx,
      ry,
      fill: "black",
    }),
  ];
}

/**
 * Render a FRAME node to SVG
 *
 * Also used for COMPONENT, COMPONENT_SET, INSTANCE, and SYMBOL nodes.
 *
 * @param node - The frame node
 * @param ctx - Render context
 * @param renderedChildren - Pre-rendered children SVG strings
 */
export function renderFrameNode(
  node: FigNode,
  ctx: FigSvgRenderContext,
  renderedChildren: readonly SvgString[],
): SvgString {
  const { transform, opacity, visible } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { rx, ry } = resolveCornerRadius(node, size);
  const clipsContent = resolveClipsContent(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const baseStrokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight });

  // Shape geometry for complex fills (angular/diamond gradients)
  const bgClipShape = rect({ x: 0, y: 0, width: size.x, height: size.y, rx, ry, fill: "black" });
  const bgGeometry: ShapeGeometry = {
    clipShapes: [bgClipShape],
    bounds: { x: 0, y: 0, width: size.x, height: size.y },
    renderFillLayer: (attrs) => rect({ x: 0, y: 0, width: size.x, height: size.y, rx, ry, ...attrs }),
  };
  const fillResult = getFillResult(fillPaints, ctx, bgGeometry, {
    elementSize: { width: size.x, height: size.y },
  });
  const baseFillAttrs = fillResult.attrs;

  const elements: SvgString[] = [];

  // Prepend complex fill elements (angular/diamond gradients) if present
  if (fillResult.kind === "complex") {
    elements.push(...fillResult.prependElements);
  }

  const decodedFillPaths = fillGeometry ? decodePathsFromGeometry(fillGeometry, ctx.blobs) : [];
  const decodedStrokePaths = strokeGeometry ? decodePathsFromGeometry(strokeGeometry, ctx.blobs) : [];

  if (decodedFillPaths.length > 0 && decodedStrokePaths.length > 0) {
    elements.push(...buildPathElements(decodedFillPaths, baseFillAttrs, {}));
    const strokeFillAttrs = strokePaintsToFillAttrs(strokePaints);
    elements.push(...buildPathElements(decodedStrokePaths, strokeFillAttrs, {}));
  } else if (decodedFillPaths.length > 0) {
    elements.push(...buildPathElements(decodedFillPaths, baseFillAttrs, baseStrokeAttrs));
  } else if (decodedStrokePaths.length > 0) {
    const strokeFillAttrs = strokePaintsToFillAttrs(strokePaints);
    elements.push(...buildPathElements(decodedStrokePaths, strokeFillAttrs, {}));
  } else {
    const hasFill = baseFillAttrs.fill !== "none";
    const hasStroke = baseStrokeAttrs.stroke !== undefined && baseStrokeAttrs.stroke !== "none";
    if (hasFill || hasStroke) {
      const bgRect = rect({
        x: 0,
        y: 0,
        width: size.x,
        height: size.y,
        rx,
        ry,
        ...baseFillAttrs,
        ...baseStrokeAttrs,
      });
      elements.push(bgRect);
    }
  }

  // Children
  if (renderedChildren.length > 0) {
    if (clipsContent) {
      // Create clip path.
      // Always use <rect rx ry> for the clip shape when cornerRadius is set,
      // even if fillGeometry exists. fillGeometry from the builder contains
      // a simple rectangle without corners, so using it would lose the
      // rounded clipping that Figma applies.
      const clipId = ctx.defs.generateId("clip");
      const hasCornerRadius = (rx !== undefined && rx > 0) || (ry !== undefined && ry > 0);
      const clipGeometry = hasCornerRadius
        ? undefined  // Force <rect rx ry> fallback
        : (decodedFillPaths.length > 0 ? fillGeometry : strokeGeometry);
      const clipShapes = buildClipShapes({ geometry: clipGeometry, ctx, size, rx, ry });
      const clipDef = clipPath({ id: clipId }, ...clipShapes);
      ctx.defs.add(clipDef);

      // Wrap children in clipped group
      const clippedGroup = g({ "clip-path": `url(#${clipId})` }, ...renderedChildren);
      elements.push(clippedGroup);
    } else {
      elements.push(...renderedChildren);
    }
  }

  return g(
    {
      transform: transformStr || undefined,
      opacity: opacity < 1 ? opacity : undefined,
    },
    ...elements,
  );
}
