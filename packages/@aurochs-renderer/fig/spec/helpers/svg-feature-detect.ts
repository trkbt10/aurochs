/**
 * @file SVG feature detection utilities for test assertions
 *
 * Single source of truth for detecting visual features in rendered
 * SVG output and Figma SVG exports. Used across all fixture-based
 * test suites to compare feature parity.
 */

/**
 * Detect whether an SVG contains corner radius.
 *
 * Figma exports rounded rectangles as `<rect rx="...">`.
 * The renderer outputs them as `<path>` with cubic bezier curves
 * tracing the rounded corners. Both are valid representations.
 *
 * Detection:
 * 1. `rx=` attribute on rect elements
 * 2. Path data matching a rounded rectangle pattern:
 *    alternating L (straight edge) and C (corner curve) commands,
 *    with at least 4 of each. This distinguishes rounded rects from
 *    plain arcs/circles which also use C commands but without L segments
 *    in the alternating pattern.
 */
export function hasCornerRadius(svg: string): boolean {
  if (svg.includes("rx=")) {
    return true;
  }
  const pathDMatches = svg.match(/d="([^"]+)"/g);
  if (pathDMatches) {
    for (const match of pathDMatches) {
      const d = match.slice(3, -1);
      // Count L and C commands. A rounded rect has 4 straight edges (L)
      // and 4 corner curves (C), often with a leading M.
      // A circle/arc has only C commands (no L), so L count > 0 + C count > 0
      // is necessary but not sufficient. Require at least 3 of each
      // to distinguish from simple arcs that happen to end with L.
      const lCount = (d.match(/L\s/g) || []).length;
      const cCount = (d.match(/C\s/g) || []).length;
      if (lCount >= 3 && cCount >= 3) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Detect visual features present in an SVG string.
 *
 * Returns an array of feature names. Used to assert that the
 * renderer output contains all features present in the Figma export.
 */
export function detectFeatures(svg: string): string[] {
  const features: string[] = [];
  // Gradient can be emitted as a native SVG `<linearGradient>` /
  // `<radialGradient>`, or as a CSS `background: linear-gradient(...)` /
  // `radial-gradient(...)` inside a `<foreignObject>`. Angular/diamond
  // gradients are now emitted as sectored SVG `<path>` elements inside
  // a `<pattern>` because Chromium refuses to render foreignObject
  // inside a pattern. Any of these counts as a "gradient" visual.
  const svgGradient = svg.includes("<linearGradient") || svg.includes("<radialGradient");
  const cssGradient = /background:\s*(?:linear|radial)-gradient\(/.test(svg);
  const sectoredGradient = /<pattern[^>]*>[\s\S]*?<path[^>]*fill="rgb\(/.test(svg);
  if (svgGradient || cssGradient || sectoredGradient) {
    features.push("gradient");
  }
  // Conic gradient has no direct SVG primitive. Emitted as:
  //   1. Figma export: `<conicalGradient>`
  //   2. Older renderer: `<foreignObject>` + CSS `conic-gradient`
  //   3. Current renderer: sectored SVG paths inside a `<pattern>` (this
  //      approximation is necessary because Chromium does not render
  //      `<foreignObject>` when nested in `<pattern>`)
  // The sectored approximation shows up as a <pattern> containing many
  // `<path ... fill="rgb(...)">` elements without any `<image>` child.
  const svgConic = svg.includes("<conicalGradient");
  const cssConic = /background:\s*conic-gradient\(/.test(svg);
  const sectoredConic = /<pattern[^>]*>[\s\S]*?<path[^>]*fill="rgb\(/.test(svg)
    && !svg.match(/<pattern[^>]*>[\s\S]*?<image/);
  if (svgConic || cssConic || sectoredConic) {
    features.push("conic-gradient");
  }
  // Treat as image-pattern only when a pattern contains a raster image
  // (not a sectored conic approximation).
  const hasImagePattern = /<pattern[^>]*>[\s\S]*?<image/.test(svg) || svg.includes("data:image");
  if (hasImagePattern) {
    features.push("image");
  }
  if (svg.includes("<filter") || svg.includes("filter=")) {
    features.push("filter/effect");
  }
  if (svg.includes("<clipPath") || svg.includes("clip-path=")) {
    features.push("clip-path");
  }
  if (svg.includes("<mask") || svg.includes("mask=")) {
    features.push("mask");
  }
  if (hasCornerRadius(svg)) {
    features.push("corner-radius");
  }
  if (svg.includes("stroke=") && !svg.includes('stroke="none"')) {
    features.push("stroke");
  }
  return features;
}

/**
 * Count shape elements in an SVG string.
 */
export function countShapeElements(svg: string): {
  paths: number;
  rects: number;
  ellipses: number;
  circles: number;
  total: number;
} {
  const paths = (svg.match(/<path[\s>]/g) || []).length;
  const rects = (svg.match(/<rect[\s>]/g) || []).length;
  const ellipses = (svg.match(/<ellipse[\s>]/g) || []).length;
  const circles = (svg.match(/<circle[\s>]/g) || []).length;
  return { paths, rects, ellipses, circles, total: paths + rects + ellipses + circles };
}

/**
 * Extract SVG viewBox dimensions.
 */
export function getSvgSize(svg: string): { width: number; height: number } {
  const w = svg.match(/width="(\d+(?:\.\d+)?)"/);
  const h = svg.match(/height="(\d+(?:\.\d+)?)"/);
  return {
    width: parseFloat(w?.[1] ?? "100"),
    height: parseFloat(h?.[1] ?? "100"),
  };
}
