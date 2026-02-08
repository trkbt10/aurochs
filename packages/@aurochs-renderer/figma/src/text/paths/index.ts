/**
 * @file Text path extraction module (format-agnostic)
 *
 * Provides glyph outline extraction from fonts and derived data.
 * Both SVG and WebGL backends consume the PathCommand arrays.
 */

// Types
export type {
  PathCommand,
  GlyphOutline,
  PathContour,
  DecorationRect,
  TextPathResult,
} from "./types";

// Bezier conversion
export { convertQuadraticsToCubic } from "./bezier";

// OpenType.js path extraction
export {
  calculateTextWidth,
  extractLinePathCommands,
  createUnderlineRect,
  extractTextPathData,
} from "./opentype-paths";

// Derived path extraction
export {
  transformGlyphCommands,
  extractDerivedGlyphCommands,
  extractDerivedDecorations,
  extractDerivedTextPathData,
  hasDerivedGlyphs,
  type DerivedBaseline,
  type DerivedGlyph,
  type DerivedDecoration,
  type DerivedTextData,
} from "./derived-paths";

// SVG serialization
export {
  pathCommandsToSvgD,
  decorationRectToSvgD,
  textPathResultToSvgD,
} from "./serialize-svg";
