/**
 * @file TextRendering — SoT domain object for a fully resolved TEXT node
 *
 * A TextRendering represents the final, backend-agnostic form of a Figma TEXT
 * node after:
 *   1. Property extraction (font, size, alignment, CPA/override-resolved chars).
 *   2. Selection of rendering strategy: pre-outlined glyph contours (from
 *      Figma's derivedTextData) OR line-based rendering via font measurement.
 *   3. Layout resolution (line positions, baseline math, alignment).
 *   4. Fill color/opacity resolution.
 *
 * Every renderer (SVG, React, WebGL) consumes this single shape rather than
 * re-deriving any of it. Renderer-specific formatting (SVG attributes,
 * React JSX, WebGL tessellation) happens in the thin render layers on top.
 */

import type { PathContour } from "../paths/types";
import type { ExtractedTextProps, TextAlignHorizontal, TextAlignVertical } from "../layout/types";
import type { TextLayout } from "../layout/compute-layout";
import type { FigMatrix } from "@aurochs/fig/types";

/**
 * Resolved per-line-height metric for line-mode rendering.
 *
 * Extracted from Figma's fontMetaData when available; otherwise derived
 * from the explicit lineHeight/fontSize on the node.
 */
export type ResolvedFontMetrics = {
  /** Font family recorded by Figma (useful for fallback resolution). */
  readonly fontFamily: string | undefined;
  /** Font weight recorded by Figma. */
  readonly fontWeight: number | undefined;
  /** Multiplier: line height in ems (e.g. 1.32). Never 0. */
  readonly fontLineHeight: number;
};

/**
 * Fully resolved text rendering — discriminated union by strategy.
 */
export type TextRendering =
  | TextRenderingEmpty
  | TextRenderingGlyphs
  | TextRenderingLines;

/** No visible text (empty string, fully transparent, etc.) */
export type TextRenderingEmpty = {
  readonly kind: "empty";
};

/**
 * Truncation directive from Figma's text layout engine.
 *
 * When present, the renderer should display the source characters up to
 * `startIndex` followed by `ellipsis`. Additional lines past the given
 * truncatedHeight (multi-line truncation) are clipped.
 */
export type TextTruncation = {
  /** Kiwi "ENDING" → tail-ellipsis; other modes reserved for future. */
  readonly mode: "ENDING";
  /**
   * Codepoint index in the source characters where the ellipsis begins.
   * -1 / undefined means "no runtime truncation was computed" (the source
   * already fits, or Figma did not pre-compute truncation for this node).
   */
  readonly startIndex: number;
  /** Ellipsis string appended after the truncation cut (typically "…" or "..."). */
  readonly ellipsis: string;
  /**
   * Max visible height in pixels (for multi-line truncation).
   * undefined when only single-line end truncation applies.
   */
  readonly maxHeight?: number;
};

/**
 * Pre-outlined glyphs from Figma's derivedTextData.
 *
 * This strategy is used when Figma exported glyph path blobs, giving us
 * pixel-perfect output independent of the rendering system's font availability
 * (essential for SF Symbols and other private-use codepoints).
 */
export type TextRenderingGlyphs = {
  readonly kind: "glyphs";
  /** Glyph outline contours in screen coordinates. */
  readonly glyphContours: readonly PathContour[];
  /** Decoration rectangles (underline, strikethrough) in screen coordinates. */
  readonly decorationContours: readonly PathContour[];
  /** Fill color (CSS string, e.g. "#333333"). */
  readonly fillColor: string;
  /** Fill alpha in [0, 1]. */
  readonly fillOpacity: number;
  /** Node transform (identity if unset). */
  readonly transform: FigMatrix | undefined;
  /** Node opacity in [0, 1]. */
  readonly opacity: number;
  /** Extracted props (for downstream consumers that want original values). */
  readonly props: ExtractedTextProps;
  /**
   * Line layout — included even for glyph mode because Canvas2D / tessellation
   * rasterizers may use it when glyph outlines are too small to rasterize cleanly.
   */
  readonly layout: TextLayout;
  /**
   * Truncation directive. `undefined` when text fits uncropped.
   * In glyph mode, Figma has already baked truncation into the glyph
   * positions; the truncation metadata is provided for consumers that
   * need to render an alternate form (e.g. accessibility labels).
   */
  readonly truncation?: TextTruncation;
};

/**
 * Line-based rendering using system font / opentype.js.
 *
 * Used when no pre-outlined glyphs are available. The renderer lays out
 * text via `<text>` (SVG), HTML text, or font measurement + path extraction.
 */
export type TextRenderingLines = {
  readonly kind: "lines";
  /** Computed per-line positions (post-truncation). */
  readonly layout: TextLayout;
  /** Font family (CSS). */
  readonly fontFamily: string;
  /** Font size in pixels. */
  readonly fontSize: number;
  /** Font weight (100–900). */
  readonly fontWeight: number | undefined;
  /** Font style ("italic"/"oblique" or undefined for normal). */
  readonly fontStyle: string | undefined;
  /** Letter spacing in pixels (applied on top of font defaults). */
  readonly letterSpacing: number | undefined;
  /** Horizontal alignment (maps to SVG text-anchor). */
  readonly textAlignHorizontal: TextAlignHorizontal;
  /** Vertical alignment (used for line-height / baseline placement). */
  readonly textAlignVertical: TextAlignVertical;
  /** Text decoration. */
  readonly textDecoration: "NONE" | "UNDERLINE" | "STRIKETHROUGH";
  /** Fill color (CSS string). */
  readonly fillColor: string;
  /** Fill alpha in [0, 1]. */
  readonly fillOpacity: number;
  /** Node transform (identity if unset). */
  readonly transform: FigMatrix | undefined;
  /** Node opacity in [0, 1]. */
  readonly opacity: number;
  /** Extracted props (for downstream consumers that want original values). */
  readonly props: ExtractedTextProps;
  /**
   * Truncation directive. `undefined` when the full source text is drawn
   * unchanged. When set, `layout.lines` already reflects the post-truncation
   * rendering (e.g. the last line ends with the ellipsis). Renderers may
   * still consult the original `props.characters` for accessibility labels.
   */
  readonly truncation?: TextTruncation;
  /**
   * Per-line-height font metrics resolved from Figma's fontMetaData. Present
   * when Figma pre-computed font metrics for this TEXT node; absent when
   * we fall back to CSS/font-library defaults.
   */
  readonly fontMetrics?: ResolvedFontMetrics;
};
