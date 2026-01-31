/**
 * @file Shared SVG text measurement helpers
 *
 * Provides a single SVG text node and shared normalization for consistent
 * measurement across paragraph and span paths.
 */

// eslint-disable-next-line no-restricted-syntax -- Module state: cached SVG text node for measurement
let sharedTextNode: SVGTextElement | null = null;
const NON_BREAKING_SPACE = "\u00A0";




































/**
 * Get or create a shared SVG text node for text measurement.
 */
export function ensureSvgTextNode(): SVGTextElement | null {
  if (sharedTextNode) {
    return sharedTextNode;
  }
  if (typeof document === "undefined") {
    return null;
  }

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("width", "0");
  svg.setAttribute("height", "0");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.style.position = "absolute";
  svg.style.left = "-10000px";
  svg.style.top = "-10000px";
  svg.style.visibility = "hidden";
  svg.style.pointerEvents = "none";

  const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
  svg.appendChild(text);

  document.body.appendChild(svg);
  sharedTextNode = text;
  return sharedTextNode;
}




































/**
 * Replace regular spaces with non-breaking spaces for accurate measurement.
 */
export function normalizeSpaces(text: string): string {
  return text.includes(" ") ? text.replace(/ /g, NON_BREAKING_SPACE) : text;
}




































/**
 * Set multiple attributes on an SVG text element.
 */
export function setTextAttributes(
  textNode: SVGTextElement,
  attributes: Record<string, string>,
): void {
  Object.entries(attributes).forEach(([key, value]) => {
    textNode.setAttribute(key, value);
  });
}
