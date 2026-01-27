/**
 * @file CSS style building utilities
 */

import type { CssString, CssProperties } from "./types";

/**
 * Convert camelCase to kebab-case.
 * Example: "fontSize" -> "font-size"
 */
function toKebabCase(str: string): string {
  return str.replace(/([A-Z])/g, (match) => `-${match.toLowerCase()}`);
}

/**
 * Build a CSS style string from a properties object.
 * Only includes properties with defined, non-empty values.
 *
 * @param props - CSS properties object with camelCase keys
 * @returns CSS string with kebab-case properties
 *
 * @example
 * buildStyle({ fontSize: "12pt", backgroundColor: "#fff" })
 * // Returns: "font-size: 12pt; background-color: #fff;"
 */
export function buildStyle(props: CssProperties): CssString {
  const parts: string[] = [];

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === "") {
      continue;
    }

    const cssKey = toKebabCase(key);
    parts.push(`${cssKey}: ${value};`);
  }

  return parts.join(" ") as CssString;
}

/**
 * Merge multiple CSS strings into one.
 * Filters out undefined and empty strings.
 *
 * @param styles - CSS strings to merge
 * @returns Combined CSS string
 */
export function mergeStyles(...styles: (CssString | undefined)[]): CssString {
  return styles
    .filter((s): s is CssString => s !== undefined && s !== "")
    .join(" ") as CssString;
}

/**
 * Create a raw CSS string from a trusted source.
 * Use for complex CSS values or custom properties.
 *
 * @param css - Raw CSS string
 * @returns Branded CssString
 */
export function rawStyle(css: string): CssString {
  return css as CssString;
}

/**
 * Create an empty CssString.
 */
export function emptyStyle(): CssString {
  return "" as CssString;
}

