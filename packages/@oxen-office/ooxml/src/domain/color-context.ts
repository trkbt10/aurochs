/**
 * @file Color resolution context types
 *
 * Types used by both parser and render layers for resolving
 * color references against theme and slide contexts.
 *
 * @see ECMA-376 Part 1, Section 20.1.6 (Theme)
 */

// =============================================================================
// Color Resolution Types
// =============================================================================

/**
 * Color scheme mapping (theme colors)
 *
 * Maps color names (e.g., "accent1", "dk1", "lt1") to hex color values.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (a:clrScheme)
 */
export type ColorScheme = Readonly<Record<string, string>>;

/**
 * Color map (scheme to theme color mapping)
 *
 * Maps abstract color names (e.g., "tx1", "bg1") to theme color names.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */
export type ColorMap = Readonly<Record<string, string>>;

/**
 * Context for resolving color references
 *
 * Contains the information needed to resolve scheme colors to actual RGB values.
 */
export type ColorContext = {
  readonly colorScheme: ColorScheme;
  readonly colorMap: ColorMap;
};

/**
 * Context for resolving scheme colors with slide-level overrides.
 *
 * Extended color resolution context that includes color map overrides
 * from the slide level. Used by parser modules for color resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3.32 (a:schemeClr)
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */
export type ColorResolveContext = {
  /** Master color map (maps tx1→dk1, bg1→lt1, etc.) */
  readonly colorMap: ColorMap;
  /** Slide color map override (if present) */
  readonly colorMapOverride?: ColorMap;
  /** Theme color scheme (maps dk1→"000000", lt1→"FFFFFF", etc.) */
  readonly colorScheme: ColorScheme;
};
