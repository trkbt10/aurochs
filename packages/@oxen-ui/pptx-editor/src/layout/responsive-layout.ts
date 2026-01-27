/**
 * @file Responsive editor layout utilities
 *
 * Provides explicit layout modes and breakpoint-based selection.
 */

export type EditorLayoutMode = "desktop" | "tablet" | "mobile";

export type EditorLayoutBreakpoints = {
  /** Width at or below this is treated as mobile (px). */
  readonly mobileMaxWidth: number;
  /** Width at or below this (and above mobileMaxWidth) is treated as tablet (px). */
  readonly tabletMaxWidth: number;
};

export const DEFAULT_EDITOR_LAYOUT_BREAKPOINTS: EditorLayoutBreakpoints = {
  mobileMaxWidth: 768,
  tabletMaxWidth: 1024,
};

/**
 * Resolves the editor layout mode based on the measured container width.
 *
 * If width is `0` (e.g., not measured yet), falls back to `"desktop"` to keep layout stable.
 */
export function resolveEditorLayoutMode(width: number, breakpoints: EditorLayoutBreakpoints): EditorLayoutMode {
  if (breakpoints.tabletMaxWidth < breakpoints.mobileMaxWidth) {
    throw new Error("Invalid breakpoints: tabletMaxWidth must be >= mobileMaxWidth.");
  }

  if (width > 0 && width <= breakpoints.mobileMaxWidth) {
    return "mobile";
  }
  if (width > breakpoints.mobileMaxWidth && width <= breakpoints.tabletMaxWidth) {
    return "tablet";
  }
  return "desktop";
}
