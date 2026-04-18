/**
 * @file resolveTextRendering — SoT resolver for TEXT nodes
 *
 * Given a Figma TEXT node and a minimal rendering context, this resolves the
 * full, backend-agnostic `TextRendering` shape. Every text-capable renderer
 * (SVG, React, WebGL) goes through this function, eliminating the duplicated
 * "check derivedTextData? fall back to font? extract props?" ladder that
 * previously lived in each renderer.
 */

import type { FigBlob } from "@aurochs/fig/parser";
import type { DerivedTextData } from "@aurochs/fig/domain";
import type { KiwiEnumValue, FigDerivedTextData, FigFontMetaData } from "@aurochs/fig/types";
import { extractTextProps } from "../layout/extract-props";
import type { TextNodeInput } from "../layout/extract-props";
import { getFillColorAndOpacity } from "../layout/fill";
import { computeTextLayout } from "../layout/compute-layout";
import { extractDerivedTextPathData, hasDerivedGlyphs } from "../paths/derived-paths";
import type { PathContour } from "../paths/types";
import type {
  TextRendering,
  TextRenderingGlyphs,
  TextRenderingLines,
  TextTruncation,
  ResolvedFontMetrics,
} from "./types";

/** Unicode single-codepoint ellipsis (U+2026). */
const ELLIPSIS_CHAR = "\u2026";

/**
 * Compute the in-box translation Figma applies when the resolved glyph
 * run (`derivedTextData.layoutSize`) is smaller than the TEXT node's own
 * box, given the node's alignment.
 *
 * The raw `glyph.position` coordinates stored in derivedTextData are in
 * the layout's own top-left-origin coordinate space. Figma's own SVG
 * export translates those into the node box according to text alignment:
 *   LEFT   → +0
 *   CENTER → +(boxSize - layoutSize) / 2
 *   RIGHT  → +(boxSize - layoutSize)
 * (vertical: TOP / CENTER / BOTTOM analogously.)
 *
 * Skipping this offset produces a visible shift for any TEXT node whose
 * rendered run is narrower/shorter than the box (e.g. single SF Symbol
 * glyphs in a 70×70 icon box that resolve to a 44×44 layout).
 *
 * When `layoutSize` is missing or matches the box, the offset is (0,0)
 * and this is a no-op.
 */
function computeDerivedAlignmentOffset(
  layoutSize: { readonly x: number; readonly y: number } | undefined,
  boxSize: { readonly width: number; readonly height: number } | undefined,
  textAlignH: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED" | undefined,
  textAlignV: "TOP" | "CENTER" | "BOTTOM" | undefined,
): { x: number; y: number } {
  if (!layoutSize || !boxSize) {
    return { x: 0, y: 0 };
  }
  const dx = boxSize.width - layoutSize.x;
  const dy = boxSize.height - layoutSize.y;
  // Only shift when the box is larger than the resolved run. A smaller box
  // than the run means the run overflows; Figma's raw glyph positions in
  // that case already reflect the clipped layout, so don't add an offset.
  const offsetX = dx <= 0
    ? 0
    : textAlignH === "CENTER"
      ? dx / 2
      : textAlignH === "RIGHT"
        ? dx
        : 0;
  const offsetY = dy <= 0
    ? 0
    : textAlignV === "CENTER"
      ? dy / 2
      : textAlignV === "BOTTOM"
        ? dy
        : 0;
  return { x: offsetX, y: offsetY };
}

/**
 * Resolve a text truncation directive from a FigNode.
 *
 * Figma stores textTruncation at the node level and, when truncation was
 * actually applied, includes `truncationStartIndex >= 0` inside the node's
 * derivedTextData. Without derivedTextData we cannot know where to cut, so
 * we return undefined and let the renderer emit the full characters.
 */
function resolveTruncation(
  textTruncation: KiwiEnumValue | string | undefined,
  derivedTextData: DerivedTextData | undefined,
): TextTruncation | undefined {
  const mode = typeof textTruncation === "string" ? textTruncation : textTruncation?.name;
  if (mode !== "ENDING") return undefined;
  if (!derivedTextData) return undefined;
  const startIndex = derivedTextData.truncationStartIndex;
  if (typeof startIndex !== "number" || startIndex < 0) return undefined;
  const mh = derivedTextData.truncatedHeight;
  return {
    mode: "ENDING",
    startIndex,
    ellipsis: ELLIPSIS_CHAR,
    maxHeight: typeof mh === "number" && mh >= 0 ? mh : undefined,
  };
}

/**
 * Extract the per-line character strings from Figma's derivedLines, if present.
 *
 * Figma's text layout engine stores each resolved line's source text in
 * `derivedLines[i].characters`. When this is available, we trust it as the
 * canonical breakdown — it already reflects BIDI reordering, whitespace
 * collapse, and wrap points that our heuristic splitter would only
 * approximate.
 */
function derivedLineStrings(dtd: FigDerivedTextData | undefined): readonly string[] | undefined {
  const lines = dtd?.derivedLines;
  if (!Array.isArray(lines) || lines.length === 0) return undefined;
  const out: string[] = [];
  for (const l of lines) {
    if (typeof l.characters !== "string") {
      // A single missing line invalidates the set — don't mix derived & guessed lines.
      return undefined;
    }
    out.push(l.characters);
  }
  return out;
}

/**
 * Resolve font metrics from Figma's fontMetaData.
 *
 * Figma records `fontLineHeight` (em-relative multiplier) alongside font
 * identity for every TEXT node whose derivedTextData was exported. When
 * multiple font entries exist (e.g. mixed runs), the first entry is the
 * dominant one for the line; more sophisticated per-run metrics could be
 * added later. Returns undefined when no metadata is available.
 */
function resolveFontMetrics(dtd: FigDerivedTextData | undefined): ResolvedFontMetrics | undefined {
  const list = dtd?.fontMetaData;
  if (!Array.isArray(list) || list.length === 0) return undefined;
  const m: FigFontMetaData = list[0];
  const lh = typeof m.fontLineHeight === "number" && m.fontLineHeight > 0
    ? m.fontLineHeight
    : undefined;
  if (lh === undefined) return undefined;
  return {
    fontFamily: m.key?.family,
    fontWeight: m.fontWeight,
    fontLineHeight: lh,
  };
}

/**
 * Apply a truncation directive to a source string.
 *
 * The source is sliced at the codepoint index `truncation.startIndex` and
 * appended with the ellipsis. This matches Figma's tail-ellipsis behavior:
 * the final visible glyph may be part of the ellipsis, not of the original
 * text. The slice is by codepoints (not UTF-16 units) so SF Symbols / emoji
 * are cut cleanly.
 */
function applyTruncation(source: string, truncation: TextTruncation): string {
  const cps = [...source];
  if (truncation.startIndex >= cps.length) return source;
  return cps.slice(0, truncation.startIndex).join("") + truncation.ellipsis;
}

/**
 * Minimal context needed to resolve a TEXT node.
 *
 * `blobs` is required to decode glyph path commands. When absent, the resolver
 * falls back to the lines strategy even if derivedTextData is present.
 */
export type ResolveTextContext = {
  readonly blobs?: readonly FigBlob[];
};

/**
 * Build decoration contours from axis-aligned rectangles.
 *
 * Kept local to this module (vs. scene-graph/convert/text.ts) so the SoT
 * depends only on `text/` internals and the domain types.
 */
function decorationsToContours(
  rects: readonly { readonly x: number; readonly y: number; readonly width: number; readonly height: number }[],
): PathContour[] {
  return rects.map((r) => ({
    commands: [
      { type: "M" as const, x: r.x, y: r.y },
      { type: "L" as const, x: r.x + r.width, y: r.y },
      { type: "L" as const, x: r.x + r.width, y: r.y + r.height },
      { type: "L" as const, x: r.x, y: r.y + r.height },
      { type: "Z" as const },
    ],
  }));
}

/**
 * Narrow TextNodeInput to the shape that carries textTruncation.
 * Both FigNode and FigDesignNode expose it structurally.
 */
type TruncatableTextNode = TextNodeInput & {
  readonly derivedTextData?: DerivedTextData;
  readonly textTruncation?: KiwiEnumValue | string;
  readonly textData?: TextNodeInput["textData"] & {
    readonly textTruncation?: KiwiEnumValue | string;
  };
};

/**
 * Resolve a TEXT node to its final renderable form.
 *
 * Strategy selection:
 *   1. If `blobs` + `derivedTextData.glyphs` available → `glyphs` strategy
 *      (pixel-perfect, survives missing fonts / SF Symbols).
 *   2. Otherwise → `lines` strategy (system font / opentype.js paths),
 *      with tail-ellipsis truncation applied to the source characters
 *      when Figma's layout engine has pre-computed a truncationStartIndex.
 *
 * The resolver never fails: an empty-text node returns `{ kind: "empty" }`.
 */
export function resolveTextRendering(
  node: TruncatableTextNode,
  ctx: ResolveTextContext,
): TextRendering {
  const props = extractTextProps(node);
  if (props.characters.length === 0) {
    return { kind: "empty" };
  }

  const { color: fillColor, opacity: fillOpacity } = getFillColorAndOpacity(props.fillPaints);

  // Resolve truncation from the node and its derivedTextData. Both FigNode
  // and FigDesignNode may expose `textTruncation` at the top or inside
  // `textData`; either is acceptable.
  const dtd = node.derivedTextData;
  const truncation = resolveTruncation(
    node.textTruncation ?? node.textData?.textTruncation,
    dtd,
  );
  // Font metrics from fontMetaData — used by line-mode to compute accurate
  // baselines when a font loader is absent.
  const fontMetrics = resolveFontMetrics(dtd);

  // Glyph-mode when pre-outlined paths are available and we can decode them.
  // Figma has already applied truncation to the glyph positions, so we pass
  // the truncation metadata through unchanged.
  if (ctx.blobs && hasDerivedGlyphs(dtd)) {
    const alignmentOffset = computeDerivedAlignmentOffset(
      dtd?.layoutSize,
      props.size,
      props.textAlignHorizontal,
      props.textAlignVertical,
    );
    const pathData = extractDerivedTextPathData(dtd!, ctx.blobs, alignmentOffset);
    if (pathData.glyphContours.length > 0 || pathData.decorations.length > 0) {
      const layout = computeTextLayout({ props });
      const glyphs: TextRenderingGlyphs = {
        kind: "glyphs",
        glyphContours: pathData.glyphContours,
        decorationContours: decorationsToContours(pathData.decorations),
        fillColor,
        fillOpacity,
        transform: props.transform,
        opacity: props.opacity,
        props,
        layout,
        truncation,
      };
      return glyphs;
    }
  }

  // Lines mode: if truncation applies, rewrite characters before layout so
  // that renderers emit the cut-and-ellipsized string directly (avoiding
  // overflow beyond the text box).
  const displayProps = truncation
    ? { ...props, characters: applyTruncation(props.characters, truncation) }
    : props;

  // Prefer Figma's own per-line breakdown when available — more accurate
  // than the heuristic splitter in compute-layout. Skip when truncation
  // applied because we already rewrote characters.
  const explicitLines = truncation ? undefined : derivedLineStrings(dtd);
  const layout = computeTextLayout({
    props: displayProps,
    lines: explicitLines,
  });

  const lines: TextRenderingLines = {
    kind: "lines",
    layout,
    fontFamily: displayProps.fontFamily,
    fontSize: displayProps.fontSize,
    fontWeight: displayProps.fontWeight,
    fontStyle: displayProps.fontStyle,
    letterSpacing: displayProps.letterSpacing,
    textAlignHorizontal: displayProps.textAlignHorizontal,
    textAlignVertical: displayProps.textAlignVertical,
    textDecoration: displayProps.textDecoration,
    fillColor,
    fillOpacity,
    transform: displayProps.transform,
    opacity: displayProps.opacity,
    props: displayProps,
    truncation,
    fontMetrics,
  };
  return lines;
}
