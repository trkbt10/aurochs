/**
 * @file SVG scene graph renderer
 *
 * Renders a SceneGraph to an SVG string via the RenderTree intermediate
 * representation. All attribute resolution is performed by the RenderTree
 * resolver — this file only formats pre-resolved data to SVG strings.
 *
 * ## Architecture
 *
 * ```
 * SceneGraph
 *     ↓ resolveRenderTree()
 * RenderTree (fully resolved)
 *     ↓ formatRenderTree() [this file]
 * SVG string
 * ```
 *
 * This ensures parity with the React renderer, which formats the same
 * RenderTree to JSX elements.
 */

import type { SceneGraph } from "../scene-graph/types";
import {
  resolveRenderTree,
  type RenderTree,
  type RenderNode,
  type RenderGroupNode,
  type RenderFrameNode,
  type RenderRectNode,
  type RenderEllipseNode,
  type RenderPathNode,
  type RenderTextNode,
  type RenderImageNode,
  type RenderDef,
  type ResolvedFillResult,
  type ResolvedWrapperAttrs,
  type ClipPathShape,
} from "../scene-graph/render-tree";

import type { ResolvedStrokeAttrs } from "../scene-graph/render";

import type { ResolvedFilterPrimitive } from "../scene-graph/render";

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

// =============================================================================
// Def Formatting
// =============================================================================

function formatClipPathShape(shape: ClipPathShape): SvgString {
  return rect({
    x: shape.x,
    y: shape.y,
    width: shape.width,
    height: shape.height,
    rx: shape.rx,
    ry: shape.ry,
  });
}

function formatFilterPrimitive(p: ResolvedFilterPrimitive): SvgString {
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

function formatDef(def: RenderDef): SvgString {
  switch (def.type) {
    case "linear-gradient": {
      const d = def.def;
      const stops = d.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      return linearGradient({ id: d.id, x1: d.x1, y1: d.y1, x2: d.x2, y2: d.y2 }, ...stops);
    }
    case "radial-gradient": {
      const d = def.def;
      const stops = d.stops.map((s) =>
        stop({
          offset: s.offset,
          "stop-color": s.stopColor,
          "stop-opacity": s.stopOpacity,
        }),
      );
      return radialGradient({ id: d.id, cx: d.cx, cy: d.cy, r: d.r }, ...stops);
    }
    case "pattern": {
      const d = def.def;
      return pattern(
        {
          id: d.id,
          patternContentUnits: d.patternContentUnits === "objectBoundingBox" ? "objectBoundingBox" : undefined,
          patternUnits: d.patternContentUnits === "userSpaceOnUse" ? "userSpaceOnUse" : undefined,
          width: d.width,
          height: d.height,
        },
        image({
          href: d.dataUri,
          x: 0,
          y: 0,
          width: d.imageWidth,
          height: d.imageHeight,
          preserveAspectRatio: d.preserveAspectRatio,
        }),
      );
    }
    case "filter": {
      const f = def.filter;
      const primitives = f.primitives.map((p) => formatFilterPrimitive(p));
      return filter({ id: f.id }, ...primitives);
    }
    case "clip-path": {
      return clipPath({ id: def.id }, formatClipPathShape(def.shape));
    }
  }
}

function formatDefs(renderDefs: readonly RenderDef[]): SvgString {
  if (renderDefs.length === 0) { return EMPTY_SVG; }
  const formatted = renderDefs.map(formatDef);
  return defs(...formatted);
}

// =============================================================================
// Fill/Stroke Attribute Formatting
// =============================================================================

function fillToSvgAttrs(fill: ResolvedFillResult): { fill: string; "fill-opacity"?: number } {
  return {
    fill: fill.attrs.fill,
    "fill-opacity": fill.attrs.fillOpacity,
  };
}

function strokeToSvgAttrs(attrs: ResolvedStrokeAttrs): Record<string, string | number | undefined> {
  return {
    stroke: attrs.stroke,
    "stroke-width": attrs.strokeWidth,
    "stroke-opacity": attrs.strokeOpacity,
    "stroke-linecap": attrs.strokeLinecap,
    "stroke-linejoin": attrs.strokeLinejoin,
    "stroke-dasharray": attrs.strokeDasharray,
  };
}

function wrapperAttrs(w: ResolvedWrapperAttrs): { transform?: string; opacity?: number; filter?: string } {
  return {
    transform: w.transform,
    opacity: w.opacity,
    filter: w.filterAttr,
  };
}

// =============================================================================
// Node Formatters
// =============================================================================

function formatGroupNode(node: RenderGroupNode): SvgString {
  const children = node.children.map(formatNode);
  const defsStr = formatDefs(node.defs);

  // Optimization: unwrap single child if no wrapper attrs needed
  if (node.canUnwrapSingleChild && children.length === 1 && node.defs.length === 0) {
    return children[0];
  }

  const parts: SvgString[] = [];
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
  parts.push(...children);

  return g(wrapperAttrs(node.wrapper), ...parts);
}

function formatFrameNode(node: RenderFrameNode): SvgString {
  const parts: SvgString[] = [];
  const defsStr = formatDefs(node.defs);
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }

  // Background fill
  if (node.background) {
    const fillAttrs = fillToSvgAttrs(node.background.fill);
    const strokeAttrs = node.background.stroke ? strokeToSvgAttrs(node.background.stroke) : {};
    parts.push(
      rect({
        x: 0, y: 0,
        width: node.width, height: node.height,
        rx: node.cornerRadius, ry: node.cornerRadius,
        ...fillAttrs,
        ...strokeAttrs,
      } as Parameters<typeof rect>[0]),
    );
  }

  // Children (with optional clipping)
  const childElements = node.children.map(formatNode);
  if (node.childClipId && childElements.length > 0) {
    parts.push(g({ "clip-path": `url(#${node.childClipId})` }, ...childElements));
  } else {
    parts.push(...childElements);
  }

  return g(wrapperAttrs(node.wrapper), ...parts);
}

function formatRectNode(node: RenderRectNode): SvgString {
  const fillAttrs = fillToSvgAttrs(node.fill);
  const strokeAttrs = node.stroke ? strokeToSvgAttrs(node.stroke) : {};

  const rectEl = rect({
    x: 0, y: 0,
    width: node.width, height: node.height,
    rx: node.cornerRadius, ry: node.cornerRadius,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof rect>[0]);

  if (node.needsWrapper) {
    const defsStr = formatDefs(node.defs);
    const parts: SvgString[] = [];
    if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
    parts.push(rectEl);
    return g(wrapperAttrs(node.wrapper), ...parts);
  }
  return rectEl;
}

function formatEllipseNode(node: RenderEllipseNode): SvgString {
  const fillAttrs = fillToSvgAttrs(node.fill);
  const strokeAttrs = node.stroke ? strokeToSvgAttrs(node.stroke) : {};

  const ellipseEl = ellipse({
    cx: node.cx, cy: node.cy, rx: node.rx, ry: node.ry,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof ellipse>[0]);

  if (node.needsWrapper) {
    const defsStr = formatDefs(node.defs);
    const parts: SvgString[] = [];
    if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
    parts.push(ellipseEl);
    return g(wrapperAttrs(node.wrapper), ...parts);
  }
  return ellipseEl;
}

function formatPathNode(node: RenderPathNode): SvgString {
  const fillAttrs = fillToSvgAttrs(node.fill);
  const strokeAttrs = node.stroke ? strokeToSvgAttrs(node.stroke) : {};

  const pathElements: SvgString[] = node.paths.map((p) =>
    path({
      d: p.d,
      "fill-rule": p.fillRule,
      ...fillAttrs,
      ...strokeAttrs,
    } as Parameters<typeof path>[0]),
  );

  if (pathElements.length === 0) {
    return EMPTY_SVG;
  }

  if (node.needsWrapper) {
    const defsStr = formatDefs(node.defs);
    const parts: SvgString[] = [];
    if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
    parts.push(...pathElements);
    return g(wrapperAttrs(node.wrapper), ...parts);
  }
  return pathElements[0];
}

function formatTextNode(node: RenderTextNode): SvgString {
  const defsStr = formatDefs(node.defs);

  if (node.content.mode === "glyphs") {
    if (node.content.d === "") {
      return EMPTY_SVG;
    }
    const pathEl = path({
      d: node.content.d,
      fill: node.fillColor,
      "fill-opacity": node.fillOpacity,
    });
    const content = node.textClipId
      ? g({ "clip-path": `url(#${node.textClipId})` }, pathEl)
      : pathEl;

    const parts: SvgString[] = [];
    if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
    parts.push(content);

    return g(wrapperAttrs(node.wrapper), ...parts);
  }

  // Text line layout: <text> elements
  const fb = node.content.layout;
  if (fb.lines.length === 0) {
    return EMPTY_SVG;
  }

  const textAnchor = fb.textAnchor !== "start" ? fb.textAnchor : undefined;
  const textElements: SvgString[] = fb.lines.map((line) =>
    text(
      {
        x: line.x,
        y: line.y,
        fill: node.fillColor,
        "fill-opacity": node.fillOpacity,
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

  const textContent = textElements.length === 1 ? textElements[0] : g({}, ...textElements);
  const clippedContent = node.textClipId
    ? g({ "clip-path": `url(#${node.textClipId})` }, textContent)
    : textContent;

  const parts: SvgString[] = [];
  if (defsStr !== EMPTY_SVG) { parts.push(defsStr); }
  parts.push(clippedContent);

  return g(wrapperAttrs(node.wrapper), ...parts);
}

function formatImageNode(node: RenderImageNode): SvgString {
  if (!node.dataUri) {
    return EMPTY_SVG;
  }

  const imageEl = image({
    href: node.dataUri,
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
    preserveAspectRatio: "xMidYMid slice",
  });

  if (node.needsWrapper) {
    return g(wrapperAttrs(node.wrapper), imageEl);
  }
  return imageEl;
}

function formatNode(node: RenderNode): SvgString {
  switch (node.type) {
    case "group":
      return formatGroupNode(node);
    case "frame":
      return formatFrameNode(node);
    case "rect":
      return formatRectNode(node);
    case "ellipse":
      return formatEllipseNode(node);
    case "path":
      return formatPathNode(node);
    case "text":
      return formatTextNode(node);
    case "image":
      return formatImageNode(node);
  }
}

// =============================================================================
// RenderTree → SVG string
// =============================================================================

/**
 * Format a RenderTree to an SVG string.
 *
 * This is a pure formatter — no attribute resolution happens here.
 * All rendering decisions were made by resolveRenderTree().
 */
export function formatRenderTreeToSvg(renderTree: RenderTree): SvgString {
  const children = renderTree.children.map(formatNode);

  return svg(
    {
      width: renderTree.width,
      height: renderTree.height,
      viewBox: `0 0 ${renderTree.width} ${renderTree.height}`,
    },
    ...children,
  );
}

// =============================================================================
// Public API (backward-compatible)
// =============================================================================

/**
 * Render a scene graph to SVG string.
 *
 * Resolves the SceneGraph to a RenderTree, then formats to SVG.
 * This is the backward-compatible entry point.
 */
export function renderSceneGraphToSvg(sceneGraph: SceneGraph): SvgString {
  const renderTree = resolveRenderTree(sceneGraph);
  return formatRenderTreeToSvg(renderTree);
}
