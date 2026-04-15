/**
 * @file Frame node renderer
 */

import { getNodeType } from "@aurochs/fig/parser";
import type { FigNode, FigVector, FigFillGeometry } from "@aurochs/fig/types";
import type { FigSvgRenderContext } from "../../types";
import { g, rect, clipPath, path, type SvgString, EMPTY_SVG } from "../primitives";
import { buildTransformAttr } from "../transform";
import { getFillResult, applyFillResult, strokePaintsToFillAttrs, type ShapeGeometry } from "../fill";
import { getStrokeAttrs } from "../stroke";
import { resolveStrokeWeight } from "../../stroke";
import { decodePathsFromGeometry } from "../geometry-path";
import { mapWindingRule } from "../../geometry";
import { buildPathElements } from "../render-paths";
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
 * Compute the maximum stroke overhang from child nodes.
 *
 * Figma's "Clip content" clips the position of child frames but does NOT
 * clip stroke overhang — strokes that extend beyond the child's bounding
 * box are still visible even when clipsContent is true.
 *
 * In SVG, clipPath clips everything including strokes. To match Figma's
 * behaviour, the clipPath rect must be expanded by the maximum stroke
 * overhang (strokeWeight / 2) of any child node.
 */
function getMaxChildStrokeOverhang(childNodes: readonly FigNode[] | undefined): number {
  if (!childNodes || childNodes.length === 0) { return 0; }
  let maxOverhang = 0;
  for (const child of childNodes) {
    if (child.strokeWeight !== undefined && child.strokePaints && child.strokePaints.length > 0) {
      const weight = resolveStrokeWeight(child.strokeWeight);
      const overhang = weight / 2;
      if (overhang > maxOverhang) {
        maxOverhang = overhang;
      }
    }
  }
  return maxOverhang;
}

function buildClipShapes(
  { geometry, ctx, size, rx, ry, margin }: {
    geometry: readonly FigFillGeometry[] | undefined;
    ctx: FigSvgRenderContext;
    size: FigVector;
    rx: number | undefined;
    ry: number | undefined;
    margin?: number;
  }
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
  const m = margin ?? 0;
  return [
    rect({
      x: -m,
      y: -m,
      width: size.x + 2 * m,
      height: size.y + 2 * m,
      rx: rx !== undefined ? rx + m : undefined,
      ry: ry !== undefined ? ry + m : undefined,
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
  childNodes?: readonly FigNode[],
): SvgString {
  const { transform, opacity, visible } = extractBaseProps(node);
  const { size } = extractSizeProps(node);
  const { fillPaints, strokePaints, strokeWeight, strokeCap, strokeJoin, strokeDashes } = extractPaintProps(node);
  const { fillGeometry, strokeGeometry } = extractGeometryProps(node);
  const { rx, ry } = resolveCornerRadius(node, size);
  const clipsContent = resolveClipsContent(node);

  if (!visible) {
    return EMPTY_SVG;
  }

  const transformStr = buildTransformAttr(transform);
  const baseStrokeAttrs = getStrokeAttrs({ paints: strokePaints, strokeWeight, options: { strokeCap, strokeJoin, dashPattern: strokeDashes } });

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

  const decodedStrokePaths = strokeGeometry ? decodePathsFromGeometry(strokeGeometry, ctx.blobs) : [];

  const hasCornerRadius = (rx !== undefined && rx > 0) || (ry !== undefined && ry > 0);
  const rawDecodedFillPaths = fillGeometry ? decodePathsFromGeometry(fillGeometry, ctx.blobs) : [];

  // When cornerRadius is set, the fill geometry may be a stale simple rectangle
  // inherited from a SYMBOL (without rounded corners). Detect this by checking
  // whether the decoded path data contains any curve commands (C, c, A, a).
  // If it's straight lines only and cornerRadius is set, the geometry doesn't
  // reflect the actual rounded shape — fall back to <rect rx ry>.
  const fillPathsHaveCurves = rawDecodedFillPaths.some((p) =>
    /[CcAa]/.test(p.data),
  );
  const decodedFillPaths = (hasCornerRadius && !fillPathsHaveCurves)
    ? []  // Discard straight-only fill geometry; use <rect rx ry> instead
    : rawDecodedFillPaths;

  if (decodedFillPaths.length > 0 && decodedStrokePaths.length > 0) {
    elements.push(...buildPathElements(decodedFillPaths, baseFillAttrs, {}));
    const strokeFillAttrs = strokePaintsToFillAttrs(strokePaints);
    elements.push(...buildPathElements(decodedStrokePaths, strokeFillAttrs, {}));
  } else if (decodedFillPaths.length > 0) {
    elements.push(...buildPathElements(decodedFillPaths, baseFillAttrs, baseStrokeAttrs));
  } else if (decodedStrokePaths.length > 0) {
    // No fill geometry — render background rect + stroke geometry separately
    const hasFill = baseFillAttrs.fill !== "none";
    if (hasFill) {
      elements.push(rect({
        x: 0, y: 0, width: size.x, height: size.y, rx, ry,
        ...baseFillAttrs,
      }));
    }
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
      const strokeMargin = getMaxChildStrokeOverhang(childNodes);
      const clipShapes = buildClipShapes({ geometry: clipGeometry, ctx, size, rx, ry, margin: strokeMargin });
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
