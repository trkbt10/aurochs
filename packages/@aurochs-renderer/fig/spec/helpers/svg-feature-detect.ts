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
 * 2. Path data containing both L (straight) and C (curve) commands —
 *    the pattern of a rounded rectangle rendered as a path
 */
export function hasCornerRadius(svg: string): boolean {
  if (svg.includes("rx=")) {
    return true;
  }
  const pathDMatches = svg.match(/d="([^"]+)"/g);
  if (pathDMatches) {
    for (const match of pathDMatches) {
      const d = match.slice(3, -1);
      if (d.includes("L") && d.includes("C")) {
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
  if (svg.includes("<linearGradient") || svg.includes("<radialGradient")) {
    features.push("gradient");
  }
  if (svg.includes("conic-gradient") || svg.includes("conicalGradient")) {
    features.push("conic-gradient");
  }
  if (svg.includes("<pattern") || svg.includes("data:image")) {
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
