/**
 * @file SVG scene graph renderer
 *
 * Renders a SceneGraph to an SVG string. This is an alternative to the existing
 * direct renderer (renderer.ts) that works through the scene graph intermediate layer.
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
  Fill,
  SolidFill,
  LinearGradientFill,
  RadialGradientFill,
  ImageFill,
  Stroke,
  Effect,
  AffineMatrix,
  Color,
  PathContour,
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
  unsafeSvg,
  type SvgString,
  EMPTY_SVG,
} from "./primitives";

// =============================================================================
// Render Context
// =============================================================================

type SvgDefsCollector = {
  items: SvgString[];
  counter: number;
  generateId(prefix: string): string;
  add(def: SvgString): void;
};

function createDefsCollector(): SvgDefsCollector {
  const collector: SvgDefsCollector = {
    items: [],
    counter: 0,
    generateId(prefix: string): string {
      return `${prefix}-${collector.counter++}`;
    },
    add(def: SvgString): void {
      collector.items.push(def);
    },
  };
  return collector;
}

// =============================================================================
// Color & Fill Rendering
// =============================================================================

function colorToHex(c: Color): string {
  const r = Math.round(c.r * 255)
    .toString(16)
    .padStart(2, "0");
  const g = Math.round(c.g * 255)
    .toString(16)
    .padStart(2, "0");
  const b = Math.round(c.b * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${r}${g}${b}`;
}

function renderFill(fill: Fill, defsCol: SvgDefsCollector): { fill: string; "fill-opacity"?: number } {
  switch (fill.type) {
    case "solid": {
      const hex = colorToHex(fill.color);
      return fill.opacity < 1 ? { fill: hex, "fill-opacity": fill.opacity } : { fill: hex };
    }

    case "linear-gradient": {
      const id = defsCol.generateId("lg");
      const stops = fill.stops.map((s) =>
        stop({
          offset: `${s.position * 100}%`,
          "stop-color": colorToHex(s.color),
          "stop-opacity": s.color.a < 1 ? s.color.a : undefined,
        })
      );
      defsCol.add(
        linearGradient(
          {
            id,
            x1: `${fill.start.x * 100}%`,
            y1: `${fill.start.y * 100}%`,
            x2: `${fill.end.x * 100}%`,
            y2: `${fill.end.y * 100}%`,
          },
          ...stops
        )
      );
      return fill.opacity < 1
        ? { fill: `url(#${id})`, "fill-opacity": fill.opacity }
        : { fill: `url(#${id})` };
    }

    case "radial-gradient": {
      const id = defsCol.generateId("rg");
      const stops = fill.stops.map((s) =>
        stop({
          offset: `${s.position * 100}%`,
          "stop-color": colorToHex(s.color),
          "stop-opacity": s.color.a < 1 ? s.color.a : undefined,
        })
      );
      defsCol.add(
        radialGradient(
          {
            id,
            cx: `${fill.center.x * 100}%`,
            cy: `${fill.center.y * 100}%`,
            r: `${Math.abs(fill.radius) * 100}%`,
          },
          ...stops
        )
      );
      return fill.opacity < 1
        ? { fill: `url(#${id})`, "fill-opacity": fill.opacity }
        : { fill: `url(#${id})` };
    }

    case "image": {
      const id = defsCol.generateId("img");
      const base64 = uint8ArrayToBase64(fill.data);
      const dataUri = `data:${fill.mimeType};base64,${base64}`;

      if (fill.width && fill.height) {
        defsCol.add(
          pattern(
            { id, patternUnits: "userSpaceOnUse", width: fill.width, height: fill.height },
            image({ href: dataUri, x: 0, y: 0, width: fill.width, height: fill.height, preserveAspectRatio: "xMidYMid slice" })
          )
        );
      } else {
        defsCol.add(
          pattern(
            { id, patternContentUnits: "objectBoundingBox", width: 1, height: 1 },
            image({ href: dataUri, x: 0, y: 0, width: 1, height: 1, preserveAspectRatio: "xMidYMid slice" })
          )
        );
      }
      return fill.opacity < 1
        ? { fill: `url(#${id})`, "fill-opacity": fill.opacity }
        : { fill: `url(#${id})` };
    }
  }
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary);
}

// =============================================================================
// Stroke Rendering
// =============================================================================

function renderStrokeAttrs(stroke: Stroke): Record<string, string | number | undefined> {
  return {
    stroke: colorToHex(stroke.color),
    "stroke-width": stroke.width,
    "stroke-opacity": stroke.opacity < 1 ? stroke.opacity : undefined,
    "stroke-linecap": stroke.linecap !== "butt" ? stroke.linecap : undefined,
    "stroke-linejoin": stroke.linejoin !== "miter" ? stroke.linejoin : undefined,
    "stroke-dasharray": stroke.dashPattern?.join(" "),
  };
}

// =============================================================================
// Effects Rendering
// =============================================================================

function renderEffectsFilter(effects: readonly Effect[], defsCol: SvgDefsCollector): string | undefined {
  if (effects.length === 0) return undefined;

  const id = defsCol.generateId("filter");
  const primitives: SvgString[] = [];
  let shapeEstablished = false;

  for (const effect of effects) {
    switch (effect.type) {
      case "drop-shadow": {
        const stdDev = effect.radius / 2;
        primitives.push(
          feFlood({ "flood-opacity": 0, result: "BackgroundImageFix" }),
          feColorMatrix({ in: "SourceAlpha", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0", result: "hardAlpha" }),
          feOffset({ dx: effect.offset.x, dy: effect.offset.y }),
          feGaussianBlur({ stdDeviation: stdDev }),
          feColorMatrix({
            type: "matrix",
            values: `0 0 0 0 ${effect.color.r} 0 0 0 0 ${effect.color.g} 0 0 0 0 ${effect.color.b} 0 0 0 ${effect.color.a} 0`,
          }),
          feBlend({ mode: "normal", in2: "BackgroundImageFix" }),
          feBlend({ mode: "normal", in: "SourceGraphic", in2: "effect", result: "shape" })
        );
        shapeEstablished = true;
        break;
      }

      case "inner-shadow": {
        const stdDev = effect.radius / 2;
        // Establish "shape" base if not set by a preceding drop shadow
        if (!shapeEstablished) {
          primitives.push(
            feFlood({ "flood-opacity": 0, result: "BackgroundImageFix" }),
            feBlend({ mode: "normal", in: "SourceGraphic", in2: "BackgroundImageFix", result: "shape" })
          );
          shapeEstablished = true;
        }
        // Figma-standard inner shadow filter:
        // 1. Binarize source alpha (×127 clamps to 1.0)
        // 2. Offset
        // 3. Blur
        // 4. arithmetic: hardAlpha − blurred → inner edge mask
        // 5. Colorize with shadow color
        // 6. Blend onto shape
        primitives.push(
          feColorMatrix({ in: "SourceAlpha", type: "matrix", values: "0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0", result: "hardAlpha" }),
          feOffset({ dx: effect.offset.x, dy: effect.offset.y }),
          feGaussianBlur({ stdDeviation: stdDev }),
          feComposite({ in2: "hardAlpha", operator: "arithmetic", k2: -1, k3: 1 }),
          feColorMatrix({
            type: "matrix",
            values: `0 0 0 0 ${effect.color.r} 0 0 0 0 ${effect.color.g} 0 0 0 0 ${effect.color.b} 0 0 0 ${effect.color.a} 0`,
          }),
          feBlend({ mode: "normal", in2: "shape", result: "shape" })
        );
        break;
      }

      case "layer-blur": {
        const stdDev = effect.radius / 2;
        primitives.push(
          feGaussianBlur({ in: "SourceGraphic", stdDeviation: stdDev })
        );
        break;
      }
    }
  }

  if (primitives.length === 0) return undefined;

  defsCol.add(filter({ id }, ...primitives));
  return `url(#${id})`;
}

// =============================================================================
// Transform
// =============================================================================

function matrixToSvgTransform(m: AffineMatrix): string | undefined {
  // Check identity (with tolerance for floating point)
  if (
    Math.abs(m.m00 - 1) < 1e-6 &&
    Math.abs(m.m01) < 1e-6 &&
    Math.abs(m.m02) < 1e-6 &&
    Math.abs(m.m10) < 1e-6 &&
    Math.abs(m.m11 - 1) < 1e-6 &&
    Math.abs(m.m12) < 1e-6
  ) {
    return undefined;
  }
  // SVG matrix(a, b, c, d, e, f) = matrix(m00, m10, m01, m11, m02, m12)
  return `matrix(${m.m00},${m.m10},${m.m01},${m.m11},${m.m02},${m.m12})`;
}

// =============================================================================
// Path Serialization
// =============================================================================

function contourToSvgD(contour: PathContour): string {
  return contour.commands
    .map((cmd) => {
      switch (cmd.type) {
        case "M":
          return `M${cmd.x} ${cmd.y}`;
        case "L":
          return `L${cmd.x} ${cmd.y}`;
        case "C":
          return `C${cmd.x1} ${cmd.y1} ${cmd.x2} ${cmd.y2} ${cmd.x} ${cmd.y}`;
        case "Q":
          return `Q${cmd.x1} ${cmd.y1} ${cmd.x} ${cmd.y}`;
        case "Z":
          return "Z";
      }
    })
    .join("");
}

// =============================================================================
// Node Renderers
// =============================================================================

function renderGroupNode(node: GroupNode, defsCol: SvgDefsCollector): SvgString {
  const children = node.children.map((child) => renderNode(child, defsCol));
  const transformStr = matrixToSvgTransform(node.transform);

  if (!transformStr && node.opacity >= 1 && children.length === 1) {
    return children[0];
  }

  return g(
    {
      transform: transformStr,
      opacity: node.opacity < 1 ? node.opacity : undefined,
    },
    ...children
  );
}

/**
 * Clamp corner radius to ensure circular corners (Figma behaviour).
 * SVG clamps rx/ry independently; Figma uses min(width, height) / 2.
 */
function clampRadius(
  radius: number | undefined,
  width: number,
  height: number,
): number | undefined {
  if (!radius || radius <= 0) return undefined;
  return Math.min(radius, Math.min(width, height) / 2);
}

function renderFrameNode(node: FrameNode, defsCol: SvgDefsCollector): SvgString {
  const elements: SvgString[] = [];
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = renderEffectsFilter(node.effects, defsCol);

  const clampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  // Background fill
  if (node.fills.length > 0) {
    const fill = node.fills[node.fills.length - 1];
    const fillAttrs = renderFill(fill, defsCol);
    const strokeAttrs = node.stroke ? renderStrokeAttrs(node.stroke) : {};

    elements.push(
      rect({
        x: 0,
        y: 0,
        width: node.width,
        height: node.height,
        rx: clampedRadius,
        ry: clampedRadius,
        ...fillAttrs,
        ...strokeAttrs,
      } as Parameters<typeof rect>[0])
    );
  }

  // Children (with optional clipping)
  const childElements = node.children.map((child) => renderNode(child, defsCol));

  if (node.clipsContent && childElements.length > 0) {
    const clipId = defsCol.generateId("clip");
    defsCol.add(
      clipPath(
        { id: clipId },
        rect({
          x: 0,
          y: 0,
          width: node.width,
          height: node.height,
          rx: clampedRadius,
          ry: clampedRadius,
        })
      )
    );
    elements.push(
      g({ "clip-path": `url(#${clipId})` }, ...childElements)
    );
  } else {
    elements.push(...childElements);
  }

  const wrapperAttrs: Record<string, string | number | undefined> = {
    transform: transformStr,
    opacity: node.opacity < 1 ? node.opacity : undefined,
    filter: filterAttr,
  };

  return g(wrapperAttrs, ...elements);
}

function renderRectNode(node: RectNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = renderEffectsFilter(node.effects, defsCol);

  const fillAttrs = node.fills.length > 0
    ? renderFill(node.fills[node.fills.length - 1], defsCol)
    : { fill: "none" };
  const strokeAttrs = node.stroke ? renderStrokeAttrs(node.stroke) : {};

  const rectClampedRadius = clampRadius(node.cornerRadius, node.width, node.height);

  const rectEl = rect({
    x: 0,
    y: 0,
    width: node.width,
    height: node.height,
    rx: rectClampedRadius,
    ry: rectClampedRadius,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof rect>[0]);

  if (transformStr || node.opacity < 1 || filterAttr) {
    return g(
      {
        transform: transformStr,
        opacity: node.opacity < 1 ? node.opacity : undefined,
        filter: filterAttr,
      },
      rectEl
    );
  }

  return rectEl;
}

function renderEllipseNode(node: EllipseNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = renderEffectsFilter(node.effects, defsCol);

  const fillAttrs = node.fills.length > 0
    ? renderFill(node.fills[node.fills.length - 1], defsCol)
    : { fill: "none" };
  const strokeAttrs = node.stroke ? renderStrokeAttrs(node.stroke) : {};

  const ellipseEl = ellipse({
    cx: node.cx,
    cy: node.cy,
    rx: node.rx,
    ry: node.ry,
    ...fillAttrs,
    ...strokeAttrs,
  } as Parameters<typeof ellipse>[0]);

  if (transformStr || node.opacity < 1 || filterAttr) {
    return g(
      {
        transform: transformStr,
        opacity: node.opacity < 1 ? node.opacity : undefined,
        filter: filterAttr,
      },
      ellipseEl
    );
  }

  return ellipseEl;
}

function renderPathNode(node: PathNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const filterAttr = renderEffectsFilter(node.effects, defsCol);

  const fillAttrs = node.fills.length > 0
    ? renderFill(node.fills[node.fills.length - 1], defsCol)
    : { fill: "none" };
  const strokeAttrs = node.stroke ? renderStrokeAttrs(node.stroke) : {};

  const pathElements: SvgString[] = node.contours.map((contour) =>
    path({
      d: contourToSvgD(contour),
      "fill-rule": contour.windingRule !== "nonzero" ? contour.windingRule : undefined,
      ...fillAttrs,
      ...strokeAttrs,
    } as Parameters<typeof path>[0])
  );

  if (pathElements.length === 0) {
    return EMPTY_SVG;
  }

  const needsWrapper = transformStr || node.opacity < 1 || filterAttr || pathElements.length > 1;

  if (needsWrapper) {
    return g(
      {
        transform: transformStr,
        opacity: node.opacity < 1 ? node.opacity : undefined,
        filter: filterAttr,
      },
      ...pathElements
    );
  }

  return pathElements[0];
}

function renderTextNode(node: TextNode, defsCol: SvgDefsCollector): SvgString {
  const transformStr = matrixToSvgTransform(node.transform);
  const fillColor = colorToHex(node.fill.color);
  const fillOpacity = node.fill.opacity;

  // If we have glyph contours, render as paths
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

    if (transformStr || node.opacity < 1) {
      return g(
        {
          transform: transformStr,
          opacity: node.opacity < 1 ? node.opacity : undefined,
        },
        pathEl
      );
    }

    return pathEl;
  }

  // Fallback: render as <text> elements
  if (!node.fallbackText) {
    return EMPTY_SVG;
  }

  const fb = node.fallbackText;
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
      line.text
    )
  );

  if (textElements.length === 0) {
    return EMPTY_SVG;
  }

  if (transformStr || node.opacity < 1 || textElements.length > 1) {
    return g(
      {
        transform: transformStr,
        opacity: node.opacity < 1 ? node.opacity : undefined,
      },
      ...textElements
    );
  }

  return textElements[0];
}

function renderImageNode(_node: ImageNode, _defsCol: SvgDefsCollector): SvgString {
  // TODO: Implement image node rendering
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
 * Render a scene graph to SVG string
 *
 * @param sceneGraph - Scene graph to render
 * @returns Complete SVG string
 */
export function renderSceneGraphToSvg(sceneGraph: SceneGraph): SvgString {
  const defsCol = createDefsCollector();

  // Render all root children
  const children = sceneGraph.root.children.map((child) =>
    renderNode(child, defsCol)
  );

  // Build defs section
  const defsSection = defsCol.items.length > 0
    ? defs(...defsCol.items)
    : EMPTY_SVG;

  return svg(
    {
      width: sceneGraph.width,
      height: sceneGraph.height,
      viewBox: `0 0 ${sceneGraph.width} ${sceneGraph.height}`,
    },
    defsSection,
    ...children
  );
}
