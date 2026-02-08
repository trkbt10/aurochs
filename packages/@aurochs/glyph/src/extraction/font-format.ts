/**
 * @file Font family formatting helpers for glyph extraction
 */

export const GENERIC_FONT_FAMILIES = [
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
] as const;

/** Formats a font family string with proper quoting for CSS. */
export function formatFontFamily(
  fontFamily: string,
  genericFamilies: readonly string[] = GENERIC_FONT_FAMILIES,
): string {
  const genericSet = new Set(genericFamilies);
  const families = fontFamily
    .split(",")
    .map((family) => family.trim())
    .filter((family) => family.length > 0)
    .map((family) => {
      const unquoted = family.replace(/^["']|["']$/g, "");
      if (genericSet.has(unquoted)) {
        return unquoted;
      }
      if (/\s/.test(unquoted)) {
        return `"${unquoted}"`;
      }
      return unquoted;
    });
  return families.join(", ");
}
