/**
 * @file SVG string utilities
 *
 * Type-safe string builders for generating SVG output with proper escaping.
 */

/**
 * Branded type for safe SVG/XML strings.
 * Use the builder functions to create SvgString values.
 *
 * @deprecated This branded type exists for backwards compatibility.
 * New code should use plain strings.
 */
export type SvgString = string & { readonly __brand: "SvgString" };

/**
 * @deprecated Alias for backwards compatibility with code using HtmlString.
 */
export type HtmlString = SvgString;

/** Empty string constant */
export const EMPTY_SVG = "" as SvgString;

/**
 * Escape XML special characters.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Mark a string as safe SVG (use with caution).
 */
export function unsafeHtml(str: string): SvgString {
  return str as SvgString;
}

/**
 * Build attribute string from an object.
 */
export function buildAttrs(
  attrs: Record<string, string | number | boolean | undefined>,
): string {
  return Object.entries(attrs)
    .filter(([, v]) => v !== undefined && v !== false)
    .map(([k, v]) => (v === true ? k : `${k}="${escapeXml(String(v))}"`))
    .join(" ");
}
