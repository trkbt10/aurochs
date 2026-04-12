/**
 * @file SVG output primitives
 *
 * Type-safe SVG string generation using branded types.
 */

// =============================================================================
// Branded SVG String Type
// =============================================================================

/**
 * Branded type for safe SVG strings
 */
export type SvgString = string & { readonly __brand: "svg" };

/**
 * Mark a string as safe SVG (use with caution)
 */
export function unsafeSvg(svg: string): SvgString {
  return svg as SvgString;
}

/**
 * Empty SVG string
 */
export const EMPTY_SVG: SvgString = "" as SvgString;

// =============================================================================
// Attribute Helpers
// =============================================================================

/**
 * Build SVG attributes string
 */
export function buildAttrs(attrs: Record<string, string | number | boolean | undefined>): string {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (value === true) {
      parts.push(key);
    } else {
      const escaped = String(value)
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;");
      parts.push(`${key}="${escaped}"`);
    }
  }

  return parts.join(" ");
}

// =============================================================================
// SVG Elements
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
  ...children: readonly SvgString[]
): SvgString {
  const fullAttrs = {
    xmlns: attrs.xmlns ?? "http://www.w3.org/2000/svg",
    ...attrs,
  };
  const attrStr = buildAttrs(fullAttrs);
  return unsafeSvg(`<svg ${attrStr}>${children.join("")}</svg>`);
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
    mask?: string;
    filter?: string;
    opacity?: number | string;
    fill?: string;
  },
  ...children: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  if (attrStr) {
    return unsafeSvg(`<g ${attrStr}>${children.join("")}</g>`);
  }
  return unsafeSvg(`<g>${children.join("")}</g>`);
}

/**
 * Create an SVG defs element
 */
export function defs(...children: readonly SvgString[]): SvgString {
  return unsafeSvg(`<defs>${children.join("")}</defs>`);
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
  "fill-opacity"?: number | string;
  "stroke-opacity"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<path ${attrStr}/>`);
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
  "fill-opacity"?: number | string;
  "stroke-opacity"?: number | string;
  transform?: string;
  filter?: string;
  class?: string;
  style?: string;
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<rect ${attrStr}/>`);
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
  "fill-opacity"?: number | string;
  "stroke-opacity"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<circle ${attrStr}/>`);
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
  "fill-opacity"?: number | string;
  "stroke-opacity"?: number | string;
  transform?: string;
  filter?: string;
  class?: string;
  style?: string;
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<ellipse ${attrStr}/>`);
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
  "stroke-opacity"?: number | string;
  transform?: string;
  class?: string;
  style?: string;
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<line ${attrStr}/>`);
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
    "fill-opacity"?: number | string;
    "font-family"?: string;
    "font-size"?: number | string;
    "font-weight"?: string | number;
    "font-style"?: string;
    "letter-spacing"?: number | string;
    "line-height"?: number | string;
    transform?: string;
    class?: string;
    style?: string;
    opacity?: number | string;
  },
  content: string
): SvgString {
  const attrStr = buildAttrs(attrs);
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return unsafeSvg(`<text ${attrStr}>${escaped}</text>`);
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
    "font-weight"?: string | number;
    "font-style"?: string;
    "text-decoration"?: string;
    class?: string;
    style?: string;
  },
  content: string
): SvgString {
  const attrStr = buildAttrs(attrs);
  const escaped = content
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  if (attrStr) {
    return unsafeSvg(`<tspan ${attrStr}>${escaped}</tspan>`);
  }
  return unsafeSvg(`<tspan>${escaped}</tspan>`);
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
  opacity?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<image ${attrStr}/>`);
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
  ...stops: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<linearGradient ${attrStr}>${stops.join("")}</linearGradient>`);
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
  ...stops: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<radialGradient ${attrStr}>${stops.join("")}</radialGradient>`);
}

/**
 * Create an SVG gradient stop element
 */
export function stop(attrs: {
  offset: string | number;
  "stop-color": string;
  "stop-opacity"?: number | string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<stop ${attrStr}/>`);
}

// =============================================================================
// Patterns
// =============================================================================

/**
 * Create an SVG pattern element
 */
export function pattern(
  attrs: {
    id: string;
    x?: string | number;
    y?: string | number;
    width: string | number;
    height: string | number;
    patternUnits?: "userSpaceOnUse" | "objectBoundingBox";
    patternContentUnits?: "userSpaceOnUse" | "objectBoundingBox";
    preserveAspectRatio?: string;
  },
  ...children: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<pattern ${attrStr}>${children.join("")}</pattern>`);
}

// =============================================================================
// Clip Paths and Masks
// =============================================================================

/**
 * Create an SVG clipPath element
 */
export function clipPath(
  attrs: { id: string },
  ...children: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<clipPath ${attrStr}>${children.join("")}</clipPath>`);
}

/**
 * Create an SVG mask element
 */
export function mask(
  attrs: { id: string; x?: string; y?: string; width?: string; height?: string; style?: string },
  ...children: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<mask ${attrStr}>${children.join("")}</mask>`);
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
    x?: string | number;
    y?: string | number;
    width?: string | number;
    height?: string | number;
    filterUnits?: "userSpaceOnUse" | "objectBoundingBox";
    "color-interpolation-filters"?: "auto" | "sRGB" | "linearRGB";
  },
  ...children: readonly SvgString[]
): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<filter ${attrStr}>${children.join("")}</filter>`);
}

/**
 * Create an feFlood element
 */
export function feFlood(attrs: {
  "flood-color"?: string;
  "flood-opacity"?: number | string;
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feFlood ${attrStr}/>`);
}

/**
 * Create an feColorMatrix element
 */
export function feColorMatrix(attrs: {
  in?: string;
  type?: "matrix" | "saturate" | "hueRotate" | "luminanceToAlpha";
  values?: string;
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feColorMatrix ${attrStr}/>`);
}

/**
 * Create an feOffset element
 */
export function feOffset(attrs: {
  in?: string;
  dx?: number | string;
  dy?: number | string;
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feOffset ${attrStr}/>`);
}

/**
 * Create an feGaussianBlur element
 */
export function feGaussianBlur(attrs: {
  in?: string;
  stdDeviation?: number | string;
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feGaussianBlur ${attrStr}/>`);
}

/**
 * Create an feBlend element
 */
export function feBlend(attrs: {
  in?: string;
  in2?: string;
  mode?: "normal" | "multiply" | "screen" | "overlay" | "darken" | "lighten";
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feBlend ${attrStr}/>`);
}

/**
 * Create an feMerge element
 */
export function feMerge(
  attrs: Record<string, never>,
  ...children: readonly SvgString[]
): SvgString {
  return unsafeSvg(`<feMerge>${children.join("")}</feMerge>`);
}

/**
 * Create an feMergeNode element
 */
export function feMergeNode(attrs: { in?: string }): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feMergeNode ${attrStr}/>`);
}

/**
 * Create an feComposite element
 */
export function feComposite(attrs: {
  in?: string;
  in2?: string;
  operator?: "over" | "in" | "out" | "atop" | "xor" | "lighter" | "arithmetic";
  k1?: number;
  k2?: number;
  k3?: number;
  k4?: number;
  result?: string;
}): SvgString {
  const attrStr = buildAttrs(attrs);
  return unsafeSvg(`<feComposite ${attrStr}/>`);
}
