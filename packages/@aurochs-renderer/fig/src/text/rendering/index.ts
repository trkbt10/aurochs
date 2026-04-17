/**
 * @file TextRendering SoT — public surface.
 *
 * Any renderer (SVG, React, WebGL) that needs to draw a Figma TEXT node
 * should obtain a `TextRendering` via `resolveTextRendering` and consume
 * that single shape instead of reading FigNode fields directly.
 */

export { resolveTextRendering } from "./resolve";
export type { ResolveTextContext } from "./resolve";
export type {
  TextRendering,
  TextRenderingEmpty,
  TextRenderingGlyphs,
  TextRenderingLines,
  TextTruncation,
  ResolvedFontMetrics,
} from "./types";
