/**
 * @file Font family mappings and fallbacks
 *
 * Maps Figma font families to CSS font stacks with appropriate fallbacks.
 */

/**
 * System UI font stack
 */
export const SYSTEM_UI_STACK = [
  "system-ui",
  "-apple-system",
  "BlinkMacSystemFont",
  "Segoe UI",
  "Roboto",
  "Helvetica Neue",
  "Arial",
  "sans-serif",
] as const;

/**
 * Monospace font stack
 */
export const MONOSPACE_STACK = [
  "ui-monospace",
  "SFMono-Regular",
  "SF Mono",
  "Menlo",
  "Consolas",
  "Liberation Mono",
  "monospace",
] as const;

/**
 * Serif font stack
 */
export const SERIF_STACK = [
  "ui-serif",
  "Georgia",
  "Cambria",
  "Times New Roman",
  "Times",
  "serif",
] as const;

/**
 * Sans-serif font stack
 */
export const SANS_SERIF_STACK = [
  "ui-sans-serif",
  "Helvetica Neue",
  "Arial",
  "sans-serif",
] as const;

/**
 * Common Figma font to CSS font mappings
 *
 * Maps Figma font family names to their web equivalents
 */
export const COMMON_FONT_MAPPINGS: ReadonlyMap<string, readonly string[]> = new Map([
  // Google Fonts (commonly used in Figma)
  ["Inter", ["Inter", ...SANS_SERIF_STACK]],
  ["Roboto", ["Roboto", ...SANS_SERIF_STACK]],
  ["Open Sans", ["Open Sans", ...SANS_SERIF_STACK]],
  ["Lato", ["Lato", ...SANS_SERIF_STACK]],
  ["Montserrat", ["Montserrat", ...SANS_SERIF_STACK]],
  ["Poppins", ["Poppins", ...SANS_SERIF_STACK]],
  ["Source Sans Pro", ["Source Sans Pro", "Source Sans 3", ...SANS_SERIF_STACK]],
  ["Noto Sans", ["Noto Sans", ...SANS_SERIF_STACK]],
  ["Noto Sans JP", ["Noto Sans JP", "Noto Sans CJK JP", ...SANS_SERIF_STACK]],
  ["Noto Sans KR", ["Noto Sans KR", "Noto Sans CJK KR", ...SANS_SERIF_STACK]],
  ["Noto Sans SC", ["Noto Sans SC", "Noto Sans CJK SC", ...SANS_SERIF_STACK]],
  ["Noto Sans TC", ["Noto Sans TC", "Noto Sans CJK TC", ...SANS_SERIF_STACK]],

  // Serif fonts
  ["Roboto Slab", ["Roboto Slab", ...SERIF_STACK]],
  ["Playfair Display", ["Playfair Display", ...SERIF_STACK]],
  ["Merriweather", ["Merriweather", ...SERIF_STACK]],
  ["Lora", ["Lora", ...SERIF_STACK]],
  ["Noto Serif", ["Noto Serif", ...SERIF_STACK]],
  ["Noto Serif JP", ["Noto Serif JP", "Noto Serif CJK JP", ...SERIF_STACK]],

  // Monospace fonts
  ["Roboto Mono", ["Roboto Mono", ...MONOSPACE_STACK]],
  ["Source Code Pro", ["Source Code Pro", ...MONOSPACE_STACK]],
  ["Fira Code", ["Fira Code", ...MONOSPACE_STACK]],
  ["JetBrains Mono", ["JetBrains Mono", ...MONOSPACE_STACK]],
  ["IBM Plex Mono", ["IBM Plex Mono", ...MONOSPACE_STACK]],

  // System fonts
  ["SF Pro", ["SF Pro", "-apple-system", "BlinkMacSystemFont", ...SANS_SERIF_STACK]],
  ["SF Pro Display", ["SF Pro Display", "SF Pro", "-apple-system", ...SANS_SERIF_STACK]],
  ["SF Pro Text", ["SF Pro Text", "SF Pro", "-apple-system", ...SANS_SERIF_STACK]],
  ["SF Pro Rounded", ["SF Pro Rounded", "SF Pro", "-apple-system", ...SANS_SERIF_STACK]],
  ["SF Mono", ["SF Mono", "SFMono-Regular", ...MONOSPACE_STACK]],
  ["New York", ["New York", "ui-serif", ...SERIF_STACK]],
  ["Segoe UI", ["Segoe UI", ...SANS_SERIF_STACK]],
  ["Helvetica", ["Helvetica", "Helvetica Neue", ...SANS_SERIF_STACK]],
  ["Helvetica Neue", ["Helvetica Neue", "Helvetica", ...SANS_SERIF_STACK]],
  ["Arial", ["Arial", "Helvetica", ...SANS_SERIF_STACK]],
  ["Times New Roman", ["Times New Roman", "Times", ...SERIF_STACK]],
  ["Georgia", ["Georgia", ...SERIF_STACK]],
  ["Courier New", ["Courier New", "Courier", ...MONOSPACE_STACK]],

  // Display/decorative fonts
  ["Bebas Neue", ["Bebas Neue", ...SANS_SERIF_STACK]],
  ["Oswald", ["Oswald", ...SANS_SERIF_STACK]],
  ["Raleway", ["Raleway", ...SANS_SERIF_STACK]],
]);

/**
 * Generic font family keywords to fallback stacks
 */
export const GENERIC_FALLBACKS: ReadonlyMap<string, readonly string[]> = new Map([
  ["sans-serif", [...SANS_SERIF_STACK]],
  ["serif", [...SERIF_STACK]],
  ["monospace", [...MONOSPACE_STACK]],
  ["system-ui", [...SYSTEM_UI_STACK]],
  ["cursive", ["Brush Script MT", "cursive"]],
  ["fantasy", ["Papyrus", "fantasy"]],
]);

/**
 * Detect font category from family name
 */
export function detectFontCategory(
  family: string
): "sans-serif" | "serif" | "monospace" | "display" | "unknown" {
  const lower = family.toLowerCase();

  // Monospace indicators
  if (
    lower.includes("mono") ||
    lower.includes("code") ||
    lower.includes("consol") ||
    lower.includes("courier")
  ) {
    return "monospace";
  }

  // Serif indicators
  if (
    lower.includes("serif") ||
    lower.includes("times") ||
    lower.includes("georgia") ||
    lower.includes("garamond") ||
    lower.includes("palatino")
  ) {
    // But not "sans-serif"
    if (!lower.includes("sans")) {
      return "serif";
    }
  }

  // Display/decorative indicators
  if (
    lower.includes("display") ||
    lower.includes("headline") ||
    lower.includes("poster") ||
    lower.includes("decorative")
  ) {
    return "display";
  }

  // Sans-serif indicators (or default)
  if (
    lower.includes("sans") ||
    lower.includes("gothic") ||
    lower.includes("grotesk") ||
    lower.includes("helvetica") ||
    lower.includes("arial")
  ) {
    return "sans-serif";
  }

  return "unknown";
}

/**
 * Get default fallback stack for a font family
 */
export function getDefaultFallbacks(family: string): readonly string[] {
  const category = detectFontCategory(family);

  switch (category) {
    case "monospace":
      return MONOSPACE_STACK;
    case "serif":
      return SERIF_STACK;
    case "sans-serif":
    case "display":
    default:
      return SANS_SERIF_STACK;
  }
}
