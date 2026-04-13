/**
 * @file SVG scene graph renderer
 *
 * Renders a SceneGraph to an SVG string. Works through the same shared
 * render module (scene-graph/render/) as the React renderer, ensuring
 * both produce identical visual output from the same SceneGraph.
 *
 * ## SoT Architecture
 *
 * All attribute computation (fill, stroke, effects, transform, path) is
 * delegated to scene-graph/render/. This file only handles SVG string
 * formatting (concatenating element tags from resolved attributes).
 */

import type {
  SceneGraph,
  SceneNode,
  GroupNode,
  FrameNode,
  RectNode,
  EllipseNode,
  PathNode,
  TextNode,
  ImageNode,
} from "../scene-graph/types";
import {
  svg,
  g,
  defs,
  path,
  rect,
  ellipse,
  text,
  clipPath,
  linearGradient,
  radialGradient,
  stop,
  pattern,
  image,
  filter,
  feGaussianBlur,
  feFlood,
  feColorMatrix,
  feOffset,
  feBlend,
  feComposite,
  type SvgString,
  EMPTY_SVG,
} from "./primitives";
import {
  // Shared SoT functions
  colorToHex,
  matrixToSvgTransform,
  contourToSvgD,
  resolveFill,
  resolveTopFill,
  resolveStroke,
  resolveEffects,
  // Types
  type ResolvedFill,
  type ResolvedFillDef,
  type ResolvedStrokeAttrs,
  type ResolvedFilter,
  type ResolvedFilterPrimitive,
  type IdGenerator,
} from "../scene-graph/render";

// =============================================================================
// Render Context
// =============================================================================

type SvgDefsCollector = IdGenerator & {
  items: SvgString[];
  add(def: SvgString): void;
};

function createDefsCollector(): SvgDefsCollector {
  // eslint-disable-next-line no-restricted-syntax -- mutable closure counter for sequential ID generation
  let counter = 0;
  const collector: SvgDefsCollector = {
    items: [],
    getNextId(prefix: string): string {
      return `${prefix}-${counter++}`;
    },
    add(def: SvgString): void {
      collector.items.push(def);
    },
  };
  return collector;
}

// =============================================================================
// Fill Def Rendering (ResolvedFillDef → SvgString)
// =============================================================================

function renderFillDef(def: ResolvedFillDef, defsCol: SvgDefsCollector): void {
  switch (def.type) {
    case "linear-gradient": {
      const stops = def.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      defsCol.add(linearGradient({ id: def.id, x1: def.x1, y1: def.y1, x2: def.x2, y2: def.y2 }, ...stops));
      break;
    }
    case "radial-gradient": {
      const stops = def.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      defsCol.add(radialGradient({ id: def.id, cx: def.cx, cy: def.cy, r: def.r }, ...stops));
      break;
    }
    case "image": {
      defsCol.add(
        pattern(
          {
            id: def.id,
            patternContentUnits: def.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined,
            patternUnits: def.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined,
            width: def.width,
            height: def.height,
          },
          image({
            href: def.dataUri,
            x: 0,
            y: 0,
            width: def.imageWidth,
            height: def.imageHeight,
            preserveAspectRatio: def.preserveAspectRatio,
          }),
        ),
      );
      break;
    }
  }
}

function renderResolvedFill(resolved: ResolvedFill, defsCol: SvgDefsCollector): { fill: string; "fill-opacity"?: number } {
  if (resolved.def) {
    renderFillDef(resolved.def, defsCol);
  }
  return {
    fill: resolved.attrs.fill,
    "fill-opacity": resolved.attrs.fillOpacity,
  };
}

// =============================================================================
// Filter Rendering (ResolvedFilter → SvgString)
// =============================================================================

function renderFilterPrimitive(p: ResolvedFilterPrimitive): SvgString {
  switch (p.type) {
    case "feFlood":
      return feFlood({ "flood-opacity": p.floodOpacity, result: p.result });
    case "feColorMatrix":
      return feColorMatrix({
        in: p.in,
        type: p.matrixType as Parameters<typeof feColorMatrix>[0]["type"],
        values: p.values,
        result: p.result,
      });
    case "feOffset":
      return feOffset({ dx: p.dx, dy: p.dy });
    case "feGaussianBlur":
      return feGaussianBlur({ in: p.in, stdDeviation: p.stdDeviation });
    case "feBlend":
      return feBlend({
        mode: p.mode as Parameters<typeof feBlend>[0]["mode"],
        in: p.in,
        in2: p.in2,
        result: p.result,
      });
    case "feComposite":
      return feComposite({
        in2: p.in2,
        operator: p.operator as Parameters<typeof feComposite>[0]["operator"],
        k2: p.k2,
        k3: p.k3,
      });
  }
}

function renderResolvedFilter(resolved: ResolvedFilter, defsCol: SvgDefsCollector): string {
  const primitives = resolved.primitives.map((p) => renderFilterPrimitive(p));
  defsCol.add(filter({ id: resolved.id }, ...primitives));
  return resolved.filterAttr;
}

// =============================================================================
// Stroke Rendering
// =============================================================================

function resolvedStrokeToSvgAttrs(attrs: ResolvedStrokeAttrs): Record<string, string | number | undefined> {
  return {
    stroke: attrs.stroke,
    "stroke-width": attrs.strokeWidth,
    "stroke-opacity": attrs.strokeOpacity,
    "stroke-linecap": attrs.strokeLinecap,
    "stroke-linejoin": attrs.strokeLinejoin,
    "stroke-dasharray": attrs.strokeDasharray,
  };
}

// =============================================================================
// Corner Radius (shared with geometry/)
// =============================================================================

function clampRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) { return undefined; }
  return Math.min(radius, Math.min(width, height) / 2);
}

// =============================================================================
// Node Renderers
// =============================================================================

function renderGroupNode(node: GroupNode, defsCol: SvgDefsCollector): SvgString {
  const children = node.children.map((child) => renderNode(child, defsCol));
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;

  if (!transformStr && node.opacity >= 1 && !filterAttr && children.length === 1) {
    return children[0];
  }

  return g(
    {
      transform: transformStr,
      opacity: node.opacity < 1 ? node.opacity : undefined,
      filter: filterAttr,
    },
    ...children,
  );
}

function renderFrameNode(node: FrameNode, defsCol: SvgDefsCollector): SvgString {
  const elements: SvgString[] = [];
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Background fill
  if (node.fills.length > 0) {
    const fillResolved = resolveFill(node.fills[node.fills.length - 1], defsCol);
    const fillAttrs = renderResolvedFill(fillResolved, defsCol);
    const strokeAttrs = node.stroke ? resolvedStrokeToSvgAttrs(resolveStroke(node.stroke)) : {};
    elements.push(
      rect({
        x: 0, y: 0,
        width: node.width, height: node.height,
        rx: clampedRadius, ry: clampedRadius,
        ...fillAttrs,
        ...strokeAttrs,
      } as Parameters<typeof rect>[0]),
    );
  }

  // Children (with optional clipping)
  const childElements = node.children.map((child) => renderNode(child, defsCol));
  if (node.clipsContent && childElements.length > 0) {
    const clipId = defsCol.getNextId("clip");
    defsCol.add(
      clipPath(
        { id: clipId },
        rect({ x: 0, y: 0, width: node.width, height: node.height, rx: clampedRadius, ry: clampedRadius }),
      ),
    );
    elements.push(g({ "clip-path": `url(#${clipId})` }, ...childElements));
  } else {
    elements.push(...childElements);
  }

  return g(
    {
      transform: transformStr,
      opacity: node.opacity < 1 ? node.opacity : undefined,
      filter: filterAttr,
    },
    ...elements,
  );
}

function renderRectNode(node: RectNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;
  const fillResolved = resolveTopFill(node.fills, defsCol);
  const fillAttrs = renderResolvedFill(fillResolved, defsCol);
  const strokeAttrs = node.stroke ? resolvedStrokeToSvgAttrs(resolveStroke(node.stroke)) : {};
  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  const rectEl = rect({
    x: 0, y: 0,
    width: node.width, height: node.height,
    rx: clampedRadius, ry: clampedRadius,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof rect>[0]);

  if (transformStr || node.opacity < 1 || filterAttr) {
    return g(
      { transform: transformStr, opacity: node.opacity < 1 ? node.opacity : undefined, filter: filterAttr },
      rectEl,
    );
  }
  return rectEl;
}

function renderEllipseNode(node: EllipseNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;
  const fillResolved = resolveTopFill(node.fills, defsCol);
  const fillAttrs = renderResolvedFill(fillResolved, defsCol);
  const strokeAttrs = node.stroke ? resolvedStrokeToSvgAttrs(resolveStroke(node.stroke)) : {};

  const ellipseEl = ellipse({
    cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof ellipse>[0]);

  if (transformStr || node.opacity < 1 || filterAttr) {
    return g(
      { transform: transformStr, opacity: node.opacity < 1 ? node.opacity : undefined, filter: filterAttr },
      ellipseEl,
    );
  }
  return ellipseEl;
}

function renderPathNode(node: PathNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;
  const fillResolved = resolveTopFill(node.fills, defsCol);
  const fillAttrs = renderResolvedFill(fillResolved, defsCol);
  const strokeAttrs = node.stroke ? resolvedStrokeToSvgAttrs(resolveStroke(node.stroke)) : {};

  const pathElements: SvgString[] = node.contours.map((contour) =>
    path({
      d: contourToSvgD(contour),
      "fill-rule": contour.windingRule !== "nonzero" ? contour.windingRule : undefined,
      ...fillAttrs,
      ...strokeAttrs,
    } as Parameters<typeof path>[0]),
  );

  if (pathElements.length === 0) {
    return EMPTY_SVG;
  }

  const needsWrapper = transformStr || node.opacity < 1 || filterAttr || pathElements.length > 1;
  if (needsWrapper) {
    return g(
      { transform: transformStr, opacity: node.opacity < 1 ? node.opacity : undefined, filter: filterAttr },
      ...pathElements,
    );
  }
  return pathElements[0];
}

function buildTextClipAttr(defsCol: SvgDefsCollector, width: number, height: number): string {
  const clipId = defsCol.generateId("text-clip");
  defsCol.add(`<clipPath id="${clipId}"><rect x="0" y="0" width="${width}" height="${height}"/></clipPath>`);
  return `url(#${clipId})`;
}

function renderTextNode(node: TextNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterResult = resolveEffects(node.effects, defsCol);
  const filterAttr = filterResult ? renderResolvedFilter(filterResult, defsCol) : undefined;
  const fillColor = colorToHex(node.fill.color);
  const fillOpacity = node.fill.opacity;

  // Clip text to bounding box when textAutoResize is NONE or TRUNCATE
  const needsClip = node.textAutoResize === "NONE" || node.textAutoResize === "TRUNCATE";
  const clipAttr: string | undefined = needsClip ? buildTextClipAttr(defsCol, node.width, node.height) : undefined;

  // Glyph contours (pre-outlined paths)
  if (node.glyphContours && node.glyphContours.length > 0) {
    const allD: string[] = [];
    for (const contour of node.glyphContours) {
      allD.push(contourToSvgD(contour));
    }
    if (node.decorationContours) {
      for (const contour of node.decorationContours) {
        allD.push(contourToSvgD(contour));
      }
    }
    const pathEl = path({
      d: allD.join(""),
      fill: fillColor,
      "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
    });
    const content = clipAttr ? g({ "clip-path": clipAttr }, pathEl) : pathEl;
    if (transformStr || node.opacity < 1 || filterAttr || clipAttr) {
      return g(
        { transform: transformStr, opacity: node.opacity < 1 ? node.opacity : undefined, filter: filterAttr },
        content,
      );
    }
    return content;
  }

  // Text line layout: <text> elements
  if (!node.textLineLayout) {
    return EMPTY_SVG;
  }

  const fb = node.textLineLayout;
  const textAnchor = fb.textAnchor !== "start" ? fb.textAnchor : undefined;
  const textElements: SvgString[] = fb.lines.map((line) =>
    text(
      {
        x: line.x,
        y: line.y,
        fill: fillColor,
        "fill-opacity": fillOpacity < 1 ? fillOpacity : undefined,
        "font-family": fb.fontFamily,
        "font-size": fb.fontSize,
        "font-weight": fb.fontWeight,
        "font-style": fb.fontStyle,
        "letter-spacing": fb.letterSpacing,
        "text-anchor": textAnchor,
      },
      line.text,
    ),
  );

  if (textElements.length === 0) {
    return EMPTY_SVG;
  }

  const textContent = textElements.length === 1 ? textElements[0] : g({}, ...textElements);
  const clippedContent = clipAttr ? g({ "clip-path": clipAttr }, textContent) : textContent;

  if (transformStr || node.opacity < 1 || filterAttr || clipAttr) {
    return g(
      { transform: transformStr, opacity: node.opacity < 1 ? node.opacity : undefined, filter: filterAttr },
      clippedContent,
    );
  }
  return clippedContent;
}

function renderImageNode(_node: ImageNode, _defsCol: SvgDefsCollector): SvgString {
  // TODO: Implement image node rendering via shared render module
  return EMPTY_SVG;
}

function renderNode(node: SceneNode, defsCol: SvgDefsCollector): SvgString {
  if (!node.visible) {
    return EMPTY_SVG;
  }
  switch (node.type) {
    case "group":
      return renderGroupNode(node, defsCol);
    case "frame":
      return renderFrameNode(node, defsCol);
    case "rect":
      return renderRectNode(node, defsCol);
    case "ellipse":
      return renderEllipseNode(node, defsCol);
    case "path":
      return renderPathNode(node, defsCol);
    case "text":
      return renderTextNode(node, defsCol);
    case "image":
      return renderImageNode(node, defsCol);
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Render a scene graph to SVG string.
 *
 * Uses the same shared render module as the React renderer,
 * ensuring both produce identical visual output.
 */
export function renderSceneGraphToSvg(sceneGraph: SceneGraph): SvgString {
  const defsCol = createDefsCollector();

  const children = sceneGraph.root.children.map((child) =>
    renderNode(child, defsCol),
  );

  const defsSection = defsCol.items.length > 0 ? defs(...defsCol.items) : EMPTY_SVG;

  return svg(
    {
      width: sceneGraph.width,
      height: sceneGraph.height,
      viewBox: `0 0 ${sceneGraph.width} ${sceneGraph.height}`,
    },
    defsSection,
    ...children,
  );
}
