/**
 * @file SVG Utilities
 *
 * Shared utilities for SVG manipulation.
 */

/**
 * Extract inner content from a complete SVG string.
 *
 * Removes outer `<svg>` wrapper, returning only the inner content.
 *
 * @param svg - Full SVG string with `<svg>` wrapper
 * @returns Inner content without the outer svg element
 */
export function extractSvgContent(svg: string): string {
  const match = svg.match(/<svg[^>]*>([\s\S]*)<\/svg>/);
  if (match !== null) {
    return match[1];
  }
  return svg;
}
