/**
 * @file Shared path types for text rendering
 *
 * Uses PathCommand from font/types.ts as the canonical format.
 * Both SVG serialization and WebGL tessellation consume these types.
 */

import type { PathCommand } from "../../font/types";

/**
 * A single glyph's outline path data
 */
export type GlyphOutline = {
  /** Path commands for this glyph */
  readonly commands: readonly PathCommand[];
};

/**
 * A contour (closed path segment)
 */
export type PathContour = {
  readonly commands: readonly PathCommand[];
  readonly windingRule?: "nonzero" | "evenodd";
};

/**
 * Decoration rectangle (underline, strikethrough)
 */
export type DecorationRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

/**
 * Result of text path extraction
 */
export type TextPathResult = {
  /** Glyph outline paths (one per line or combined) */
  readonly glyphContours: readonly PathContour[];
  /** Decoration paths (underlines, strikethroughs) */
  readonly decorations: readonly DecorationRect[];
};

export type { PathCommand };
