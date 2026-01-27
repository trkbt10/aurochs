/**
 * @file CSS variable injection utilities
 *
 * Injects design tokens as CSS custom properties for runtime theming.
 */

import { colorTokens, radiusTokens, spacingTokens, fontTokens } from "./tokens";

/**
 * CSS variable names mapped to token paths
 */
const CSS_VAR_MAP = {
  // Accent colors
  "--accent-primary": colorTokens.accent.primary,
  "--accent-secondary": colorTokens.accent.secondary,
  "--accent-danger": colorTokens.accent.danger,

  // Background colors
  "--bg-primary": colorTokens.background.primary,
  "--bg-secondary": colorTokens.background.secondary,
  "--bg-tertiary": colorTokens.background.tertiary,
  "--bg-hover": colorTokens.background.hover,

  // Text colors
  "--text-primary": colorTokens.text.primary,
  "--text-secondary": colorTokens.text.secondary,
  "--text-tertiary": colorTokens.text.tertiary,
  "--text-inverse": colorTokens.text.inverse,

  // Border colors
  "--border-subtle": colorTokens.border.subtle,
  "--border-primary": colorTokens.border.primary,
  "--border-strong": colorTokens.border.strong,

  // Selection colors
  "--selection-primary": colorTokens.selection.primary,
  "--selection-secondary": colorTokens.selection.secondary,

  // Radius
  "--radius-sm": radiusTokens.sm,
  "--radius-md": radiusTokens.md,
  "--radius-lg": radiusTokens.lg,

  // Spacing
  "--spacing-2xs": spacingTokens["2xs"],
  "--spacing-xs": spacingTokens.xs,
  "--spacing-xs-plus": spacingTokens["xs-plus"],
  "--spacing-sm": spacingTokens.sm,
  "--spacing-md": spacingTokens.md,
  "--spacing-lg": spacingTokens.lg,
  "--spacing-xl": spacingTokens.xl,

  // Font sizes
  "--font-size-xs": fontTokens.size.xs,
  "--font-size-sm": fontTokens.size.sm,
  "--font-size-md": fontTokens.size.md,
  "--font-size-lg": fontTokens.size.lg,
} as const;

/**
 * Inject design tokens as CSS custom properties on the given element.
 * Typically called on the root editor container.
 *
 * @param element - The element to set CSS variables on (defaults to document.documentElement)
 */
export function injectCSSVariables(element: HTMLElement = document.documentElement): void {
  for (const [varName, value] of Object.entries(CSS_VAR_MAP)) {
    element.style.setProperty(varName, value);
  }
}

/**
 * Remove injected CSS variables from the given element.
 *
 * @param element - The element to remove CSS variables from
 */
export function removeCSSVariables(element: HTMLElement = document.documentElement): void {
  for (const varName of Object.keys(CSS_VAR_MAP)) {
    element.style.removeProperty(varName);
  }
}

/**
 * Generate a CSS string with all design token variables.
 * Useful for injecting into a <style> tag or CSS-in-JS.
 *
 * @param selector - CSS selector to scope the variables (defaults to ":root")
 * @returns CSS string with variable declarations
 */
export function generateCSSVariables(selector = ":root"): string {
  const declarations = Object.entries(CSS_VAR_MAP)
    .map(([varName, value]) => `  ${varName}: ${value};`)
    .join("\n");

  return `${selector} {\n${declarations}\n}`;
}

/**
 * Get a CSS variable reference with fallback.
 * Helper for consistent CSS variable usage in inline styles.
 *
 * @param varName - Variable name (with or without --)
 * @param fallback - Fallback value (defaults to token value)
 * @returns CSS var() reference string
 */
export function cssVar(
  varName: keyof typeof CSS_VAR_MAP | string,
  fallback?: string
): string {
  const normalizedName = varName.startsWith("--") ? varName : `--${varName}`;
  const defaultFallback = CSS_VAR_MAP[normalizedName as keyof typeof CSS_VAR_MAP];
  return `var(${normalizedName}, ${fallback ?? defaultFallback})`;
}

export { CSS_VAR_MAP };
