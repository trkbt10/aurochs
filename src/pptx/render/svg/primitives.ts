/**
 * @file SVG output primitives
 *
 * Type-safe SVG string generation.
 */

import { unsafeHtml, type HtmlString, buildAttrs } from "../html/primitives";

// =============================================================================
// SVG Element Creation
// =============================================================================

/**
 * Create an SVG container element
 */
export function svg(
  attrs: {
    width?: number | string;
    height?: number | string;
    viewBox?: string;
    preserveAspectRatio?: string;
    overflow?: "visible" | "hidden" | "scroll" | "auto";
    class?: string;
    style?: string;
    xmlns?: string;
  },
  ...children: readonly HtmlString[]
): HtmlString {
  const fullAttrs = {
    xmlns: attrs.xmlns ?? "http://www.w3.org/2000/svg",
    ...attrs,
  };
  const attrStr = buildAttrs(fullAttrs);
  return unsafeHtml(`<svg ${attrStr}>${children.join("")}</svg>`);
}

/**
 * Create an SVG group element
 */
export function g(
  attrs: {
    transform?: string;
    class?: string;
    style?: string;
    id?: string;
    "clip-path"?: string;
  },
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  if (attrStr) {
    return unsafeHtml(`<g ${attrStr}>${children.join("")}</g>`);
  }
  return unsafeHtml(`<g>${children.join("")}</g>`);
}

/**
 * Create an SVG path element
 */
export function path(attrs: {
  d: string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  "stroke-linecap"?: "butt" | "round" | "square";
  "stroke-linejoin"?: "miter" | "round" | "bevel";
  "stroke-dasharray"?: string;
  "fill-rule"?: "nonzero" | "evenodd";
  "marker-start"?: string;
  "marker-end"?: string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<path ${attrStr}/>`);
}

/**
 * Create an SVG rect element
 */
export function rect(attrs: {
  x?: number | string;
  y?: number | string;
  width: number | string;
  height: number | string;
  rx?: number | string;
  ry?: number | string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<rect ${attrStr}/>`);
}

/**
 * Create an SVG circle element
 */
export function circle(attrs: {
  cx: number | string;
  cy: number | string;
  r: number | string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<circle ${attrStr}/>`);
}

/**
 * Create an SVG ellipse element
 */
export function ellipse(attrs: {
  cx: number | string;
  cy: number | string;
  rx: number | string;
  ry: number | string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<ellipse ${attrStr}/>`);
}

/**
 * Create an SVG line element
 */
export function line(attrs: {
  x1: number | string;
  y1: number | string;
  x2: number | string;
  y2: number | string;
  stroke?: string;
  "stroke-width"?: number | string;
  "stroke-linecap"?: "butt" | "round" | "square";
  "stroke-dasharray"?: string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<line ${attrStr}/>`);
}

/**
 * Create an SVG polyline element
 */
export function polyline(attrs: {
  points: string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  "stroke-linejoin"?: "miter" | "round" | "bevel";
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<polyline ${attrStr}/>`);
}

/**
 * Create an SVG polygon element
 */
export function polygon(attrs: {
  points: string;
  fill?: string;
  stroke?: string;
  "stroke-width"?: number | string;
  "fill-rule"?: "nonzero" | "evenodd";
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<polygon ${attrStr}/>`);
}

/**
 * Create an SVG text element
 */
export function text(
  attrs: {
    x?: number | string;
    y?: number | string;
    dx?: string;
    dy?: string;
    "text-anchor"?: "start" | "middle" | "end";
    "dominant-baseline"?: string;
    fill?: string;
    "font-family"?: string;
    "font-size"?: number | string;
    "font-weight"?: string;
    "font-style"?: string;
    transform?: string;
    class?: string;
    style?: string;
  },
  content: string,
): HtmlString {
  const attrStr = buildAttrs(attrs);
  // Escape text content
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return unsafeHtml(`<text ${attrStr}>${escaped}</text>`);
}

/**
 * Create an SVG tspan element
 */
export function tspan(
  attrs: {
    x?: number | string;
    y?: number | string;
    dx?: string;
    dy?: string;
    fill?: string;
    "font-family"?: string;
    "font-size"?: number | string;
    "font-weight"?: string;
    "font-style"?: string;
    "text-decoration"?: string;
    class?: string;
    style?: string;
  },
  content: string,
): HtmlString {
  const attrStr = buildAttrs(attrs);
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (attrStr) {
    return unsafeHtml(`<tspan ${attrStr}>${escaped}</tspan>`);
  }
  return unsafeHtml(`<tspan>${escaped}</tspan>`);
}

/**
 * Create an SVG image element
 */
export function image(attrs: {
  "xlink:href"?: string;
  href?: string;
  x?: number | string;
  y?: number | string;
  width: number | string;
  height: number | string;
  preserveAspectRatio?: string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<image ${attrStr}/>`);
}

/**
 * Create an SVG use element
 */
export function use(attrs: {
  "xlink:href"?: string;
  href?: string;
  x?: number | string;
  y?: number | string;
  width?: number | string;
  height?: number | string;
  transform?: string;
  class?: string;
  style?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<use ${attrStr}/>`);
}

// =============================================================================
// Definitions
// =============================================================================

/**
 * Create an SVG defs element
 */
export function defs(...children: readonly HtmlString[]): HtmlString {
  return unsafeHtml(`<defs>${children.join("")}</defs>`);
}

/**
 * Create an SVG clipPath element
 */
export function clipPath(
  attrs: { id: string },
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<clipPath ${attrStr}>${children.join("")}</clipPath>`);
}

/**
 * Create an SVG mask element
 */
export function mask(
  attrs: { id: string; x?: string; y?: string; width?: string; height?: string },
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<mask ${attrStr}>${children.join("")}</mask>`);
}

// =============================================================================
// Gradients
// =============================================================================

/**
 * Create an SVG linearGradient element
 */
export function linearGradient(
  attrs: {
    id: string;
    x1?: string;
    y1?: string;
    x2?: string;
    y2?: string;
    gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
    gradientTransform?: string;
  },
  ...stops: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<linearGradient ${attrStr}>${stops.join("")}</linearGradient>`);
}

/**
 * Create an SVG radialGradient element
 */
export function radialGradient(
  attrs: {
    id: string;
    cx?: string;
    cy?: string;
    r?: string;
    fx?: string;
    fy?: string;
    gradientUnits?: "userSpaceOnUse" | "objectBoundingBox";
    gradientTransform?: string;
  },
  ...stops: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<radialGradient ${attrStr}>${stops.join("")}</radialGradient>`);
}

/**
 * Create an SVG gradient stop element
 */
export function stop(attrs: {
  offset: string;
  "stop-color": string;
  "stop-opacity"?: number | string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<stop ${attrStr}/>`);
}

// =============================================================================
// Filters
// =============================================================================

/**
 * Create an SVG filter element
 */
export function filter(
  attrs: {
    id: string;
    x?: string;
    y?: string;
    width?: string;
    height?: string;
    filterUnits?: "userSpaceOnUse" | "objectBoundingBox";
  },
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<filter ${attrStr}>${children.join("")}</filter>`);
}

/**
 * Create an SVG feGaussianBlur element
 */
export function feGaussianBlur(attrs: {
  in?: string;
  stdDeviation: number | string;
  result?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<feGaussianBlur ${attrStr}/>`);
}

/**
 * Create an SVG feOffset element
 */
export function feOffset(attrs: {
  in?: string;
  dx?: number | string;
  dy?: number | string;
  result?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<feOffset ${attrStr}/>`);
}

/**
 * Create an SVG feColorMatrix element
 */
export function feColorMatrix(attrs: {
  in?: string;
  type?: "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha";
  values?: string;
  result?: string;
}): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<feColorMatrix ${attrStr}/>`);
}

/**
 * Create an SVG feMerge element
 */
export function feMerge(...nodes: readonly HtmlString[]): HtmlString {
  return unsafeHtml(`<feMerge>${nodes.join("")}</feMerge>`);
}

/**
 * Create an SVG feMergeNode element
 */
export function feMergeNode(attrs: { in?: string }): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<feMergeNode ${attrStr}/>`);
}

// =============================================================================
// Markers
// =============================================================================

/**
 * Create an SVG marker element
 * @see https://developer.mozilla.org/en-US/docs/Web/SVG/Element/marker
 */
export function marker(
  attrs: {
    id: string;
    markerWidth: number | string;
    markerHeight: number | string;
    refX: number | string;
    refY: number | string;
    orient?: "auto" | "auto-start-reverse" | number | string;
    markerUnits?: "strokeWidth" | "userSpaceOnUse";
    viewBox?: string;
    preserveAspectRatio?: string;
  },
  ...children: readonly HtmlString[]
): HtmlString {
  const attrStr = buildAttrs(attrs);
  return unsafeHtml(`<marker ${attrStr}>${children.join("")}</marker>`);
}
