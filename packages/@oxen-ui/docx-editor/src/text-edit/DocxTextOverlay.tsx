/**
 * @file DocxTextOverlay component
 *
 * Renders DOCX paragraph text as SVG for visual overlay during editing.
 * Includes simple line wrapping and selection highlighting.
 */

import { useMemo, type CSSProperties, type ReactNode } from "react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun, DocxRunContent, DocxRunProperties } from "@oxen/docx/domain/run";
import type { DocxStyles } from "@oxen/docx/domain/styles";

// =============================================================================
// Types
// =============================================================================

export type DocxTextOverlayProps = {
  readonly paragraph: DocxParagraph;
  readonly bounds: DOMRect;
  readonly selectionStart: number;
  readonly selectionEnd: number;
  readonly styles?: DocxStyles;
};

export type LayoutResult = {
  readonly lines: readonly LineLayout[];
  readonly totalHeight: number;
};

export type LineLayout = {
  readonly y: number;
  readonly height: number;
  readonly spans: readonly SpanLayout[];
};

export type SpanLayout = {
  readonly x: number;
  readonly width: number;
  readonly text: string;
  readonly runProperties: DocxRunProperties | undefined;
  readonly startOffset: number;
  readonly endOffset: number;
};

export type SelectionRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type CursorCoordinates = {
  readonly x: number;
  readonly y: number;
  readonly height: number;
};

type FlatSpan = {
  readonly text: string;
  readonly runProperties: DocxRunProperties | undefined;
  readonly startOffset: number;
  readonly endOffset: number;
};

type FontSpec = {
  readonly fontFamily: string;
  readonly fontSizePx: number;
  readonly fontWeight: string;
  readonly fontStyle: string;
};

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_FONT_FAMILY = "sans-serif";
const DEFAULT_FONT_SIZE_PX = 12;
const DEFAULT_FONT_WEIGHT = "normal";
const DEFAULT_FONT_STYLE = "normal";

const LINE_HEIGHT_MULTIPLIER = 1.5;
const ASCENT_RATIO = 0.8;

const SELECTION_FILL = "color-mix(in srgb, var(--selection-primary) 30%, transparent)";

// =============================================================================
// Run Property Merging
// =============================================================================

function mergeRunProperties(
  base: DocxRunProperties | undefined,
  override: DocxRunProperties | undefined,
): DocxRunProperties | undefined {
  if (!base && !override) {
    return undefined;
  }
  if (!base) {
    return override;
  }
  if (!override) {
    return base;
  }

  return {
    ...base,
    ...override,
    rFonts: {
      ...base.rFonts,
      ...override.rFonts,
    },
    color: override.color ?? base.color,
    u: override.u ?? base.u,
    shd: override.shd ?? base.shd,
    bdr: override.bdr ?? base.bdr,
    eastAsianLayout: override.eastAsianLayout ?? base.eastAsianLayout,
  };
}

// =============================================================================
// Font + Style Computation
// =============================================================================

function halfPointsToPx(halfPoints: number): number {
  // halfPoints / 2 = points; points * 96/72 = points * 4/3
  return (halfPoints / 2) * (4 / 3);
}

function resolveFontFamily(properties: DocxRunProperties | undefined): string {
  return (
    properties?.rFonts?.ascii ??
    properties?.rFonts?.hAnsi ??
    properties?.rFonts?.eastAsia ??
    properties?.rFonts?.cs ??
    DEFAULT_FONT_FAMILY
  );
}

function resolveFontSpec(
  runProperties: DocxRunProperties | undefined,
  defaultRunProperties: DocxRunProperties | undefined,
): FontSpec {
  const merged = mergeRunProperties(defaultRunProperties, runProperties);
  const fontSizePx =
    merged?.sz !== undefined ? halfPointsToPx(merged.sz) : DEFAULT_FONT_SIZE_PX;

  return {
    fontFamily: resolveFontFamily(merged),
    fontSizePx,
    fontWeight: merged?.b || merged?.bCs ? "bold" : DEFAULT_FONT_WEIGHT,
    fontStyle: merged?.i || merged?.iCs ? "italic" : DEFAULT_FONT_STYLE,
  };
}

export function computeRunSvgStyles(
  runProperties: DocxRunProperties | undefined,
  defaultRunProperties: DocxRunProperties | undefined,
): CSSProperties {
  const merged = mergeRunProperties(defaultRunProperties, runProperties);
  if (!merged) {
    return {};
  }

  const style: CSSProperties = {};

  const fontSpec = resolveFontSpec(runProperties, defaultRunProperties);
  style.fontFamily = fontSpec.fontFamily;
  style.fontSize = `${fontSpec.fontSizePx}px`;
  if (fontSpec.fontWeight !== DEFAULT_FONT_WEIGHT) {
    style.fontWeight = fontSpec.fontWeight;
  }
  if (fontSpec.fontStyle !== DEFAULT_FONT_STYLE) {
    style.fontStyle = fontSpec.fontStyle;
  }

  const decorations: string[] = [];
  if (merged.u && merged.u.val !== "none") {
    decorations.push("underline");
  }
  if (merged.strike || merged.dstrike) {
    decorations.push("line-through");
  }
  if (decorations.length > 0) {
    style.textDecoration = decorations.join(" ");
    // Double strikethrough uses double line style
    // @see ECMA-376-1:2016 Section 17.3.2.9 (dstrike)
    if (merged.dstrike) {
      style.textDecorationStyle = "double";
    }
  }

  if (merged.color?.val) {
    style.fill = `#${merged.color.val}`;
  }

  if (merged.vanish) {
    style.display = "none";
  }

  return style;
}

// =============================================================================
// Text Flattening
// =============================================================================

function normalizeRunContentText(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return content.value;
    case "tab":
      return "\t";
    case "break":
      return "\n";
    case "symbol":
      return String.fromCharCode(parseInt(content.char, 16));
    default:
      return "";
  }
}

function splitTextWithNewlines(text: string): readonly string[] {
  if (!text.includes("\n")) {
    return [text];
  }
  const parts: string[] = [];
  // Keep newline as its own segment so offsets remain accurate.
  let cursor = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== "\n") {
      continue;
    }
    if (i > cursor) {
      parts.push(text.slice(cursor, i));
    }
    parts.push("\n");
    cursor = i + 1;
  }
  if (cursor < text.length) {
    parts.push(text.slice(cursor));
  }
  return parts;
}

function flattenRun(run: DocxRun, startOffset: number): readonly FlatSpan[] {
  const spans: FlatSpan[] = [];
  let offset = startOffset;

  for (const content of run.content) {
    const rawText = normalizeRunContentText(content);
    if (rawText.length === 0) {
      continue;
    }

    for (const segment of splitTextWithNewlines(rawText)) {
      const endOffset = offset + segment.length;
      spans.push({
        text: segment,
        runProperties: run.properties,
        startOffset: offset,
        endOffset,
      });
      offset = endOffset;
    }
  }

  return spans;
}

function flattenParagraph(paragraph: DocxParagraph): readonly FlatSpan[] {
  const spans: FlatSpan[] = [];
  let offset = 0;

  for (const item of paragraph.content) {
    if (item.type === "run") {
      const runSpans = flattenRun(item, offset);
      spans.push(...runSpans);
      offset = runSpans.length > 0 ? runSpans[runSpans.length - 1].endOffset : offset;
      continue;
    }

    if (item.type === "hyperlink") {
      for (const run of item.content) {
        const runSpans = flattenRun(run, offset);
        spans.push(...runSpans);
        offset = runSpans.length > 0 ? runSpans[runSpans.length - 1].endOffset : offset;
      }
      continue;
    }
  }

  return spans;
}

// =============================================================================
// Text Measurement
// =============================================================================

const textWidthCache = new Map<string, number>();

function fontToCanvasString(font: FontSpec): string {
  return `${font.fontStyle} ${font.fontWeight} ${font.fontSizePx}px ${font.fontFamily}`;
}

function canUseCanvasTextMeasure(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  if (typeof CanvasRenderingContext2D === "undefined") {
    return false;
  }
  // jsdom's canvas context is optional and logs noisy "Not implemented" messages when missing.
  if (typeof navigator !== "undefined" && /jsdom/i.test(navigator.userAgent)) {
    return false;
  }
  return true;
}

function measureTextWidthPx(text: string, font: FontSpec): number {
  const normalized = text.replaceAll("\t", "    ");
  const cacheKey = `${fontToCanvasString(font)}|${normalized}`;
  const cached = textWidthCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  let width = 0;
  if (canUseCanvasTextMeasure()) {
    const canvas = document.createElement("canvas");
    try {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.font = fontToCanvasString(font);
        width = ctx.measureText(normalized).width;
      }
    } catch {
      // Some test environments (e.g. jsdom without canvas) throw on getContext().
    }
  }

  if (!(width > 0)) {
    width = normalized.length * font.fontSizePx * 0.6;
  }

  textWidthCache.set(cacheKey, width);
  return width;
}

function findWrapIndex(text: string, maxWidth: number, font: FontSpec): number {
  if (!(maxWidth > 0)) {
    return Math.max(1, text.length);
  }

  // Fast path: everything fits.
  if (measureTextWidthPx(text, font) <= maxWidth) {
    return text.length;
  }

  // Binary search for the largest prefix that fits.
  let low = 1;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const w = measureTextWidthPx(text.slice(0, mid), font);
    if (w <= maxWidth) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  const candidate = Math.max(1, low);
  const lastWhitespace = text.lastIndexOf(" ", candidate - 1);
  if (lastWhitespace > 0) {
    return lastWhitespace + 1;
  }
  return candidate;
}

// =============================================================================
// Layout
// =============================================================================

export function layoutParagraphText(
  paragraph: DocxParagraph,
  bounds: DOMRect,
  styles?: DocxStyles,
): LayoutResult {
  const maxWidth = Math.max(0, bounds.width);
  const defaultRunProperties = styles?.docDefaults?.rPrDefault?.rPr;

  const lines: Array<{
    spans: SpanLayout[];
    maxFontSizePx: number;
  }> = [];

  let currentSpans: SpanLayout[] = [];
  let currentX = 0;
  let currentMaxFontSizePx = DEFAULT_FONT_SIZE_PX;

  const pushLine = (): void => {
    lines.push({ spans: currentSpans, maxFontSizePx: currentMaxFontSizePx });
    currentSpans = [];
    currentX = 0;
    currentMaxFontSizePx = DEFAULT_FONT_SIZE_PX;
  };

  const flatSpans = flattenParagraph(paragraph);
  if (flatSpans.length === 0) {
    return { lines: [], totalHeight: 0 };
  }

  for (const span of flatSpans) {
    if (span.text === "\n") {
      pushLine();
      continue;
    }

    const font = resolveFontSpec(span.runProperties, defaultRunProperties);
    currentMaxFontSizePx = Math.max(currentMaxFontSizePx, font.fontSizePx);

    let remainingText = span.text;
    let textOffset = span.startOffset;

    // eslint-disable-next-line no-restricted-syntax -- small loop for wrapping
    while (remainingText.length > 0) {
      const availableWidth = maxWidth > 0 ? maxWidth - currentX : Number.POSITIVE_INFINITY;
      if (availableWidth <= 0 && currentSpans.length > 0) {
        pushLine();
        continue;
      }

      const take = findWrapIndex(remainingText, availableWidth, font);
      const chunk = remainingText.slice(0, take);
      const chunkWidth = measureTextWidthPx(chunk, font);

      currentSpans.push({
        x: currentX,
        width: chunkWidth,
        text: chunk,
        runProperties: span.runProperties,
        startOffset: textOffset,
        endOffset: textOffset + chunk.length,
      });
      currentX += chunkWidth;

      remainingText = remainingText.slice(take);
      textOffset += chunk.length;

      if (remainingText.length > 0) {
        pushLine();
      }
    }
  }

  if (currentSpans.length > 0) {
    pushLine();
  }

  const finalizedLines: LineLayout[] = [];
  let yOffset = 0;
  for (const line of lines) {
    const fontSizePx = line.maxFontSizePx || DEFAULT_FONT_SIZE_PX;
    const height = fontSizePx * LINE_HEIGHT_MULTIPLIER;
    const baselineY = yOffset + fontSizePx * ASCENT_RATIO;
    finalizedLines.push({
      y: baselineY,
      height,
      spans: line.spans,
    });
    yOffset += height;
  }

  return {
    lines: finalizedLines,
    totalHeight: yOffset,
  };
}

// =============================================================================
// Selection Highlighting
// =============================================================================

function clampRangeToSpan(
  span: SpanLayout,
  rangeStart: number,
  rangeEnd: number,
): readonly [number, number] | undefined {
  const start = Math.max(span.startOffset, Math.min(rangeStart, span.endOffset));
  const end = Math.max(span.startOffset, Math.min(rangeEnd, span.endOffset));
  if (start >= end) {
    return undefined;
  }
  return [start, end];
}

export function computeSelectionRects(
  layout: LayoutResult,
  selectionStart: number,
  selectionEnd: number,
  defaultRunProperties: DocxRunProperties | undefined,
): readonly SelectionRect[] {
  const rangeStart = Math.min(selectionStart, selectionEnd);
  const rangeEnd = Math.max(selectionStart, selectionEnd);
  if (rangeStart === rangeEnd) {
    return [];
  }

  const rects: SelectionRect[] = [];

  for (const line of layout.lines) {
    const lineFontSizePx = line.height / LINE_HEIGHT_MULTIPLIER;
    const lineTop = line.y - lineFontSizePx * ASCENT_RATIO;

    for (const span of line.spans) {
      const clamped = clampRangeToSpan(span, rangeStart, rangeEnd);
      if (!clamped) {
        continue;
      }
      const [selStart, selEnd] = clamped;
      const relStart = selStart - span.startOffset;
      const relEnd = selEnd - span.startOffset;

      const font = resolveFontSpec(span.runProperties, defaultRunProperties);
      const startWidth = measureTextWidthPx(span.text.slice(0, relStart), font);
      const endWidth = measureTextWidthPx(span.text.slice(0, relEnd), font);
      const width = Math.max(0, endWidth - startWidth);
      if (!(width > 0)) {
        continue;
      }

      rects.push({
        x: span.x + startWidth,
        y: lineTop,
        width,
        height: line.height,
      });
    }
  }

  return rects;
}

// =============================================================================
// Cursor Coordinate Calculation
// =============================================================================

/**
 * Get cursor coordinates from a character offset in the layout.
 * Returns the x, y position and height for the cursor caret.
 */
export function getCursorCoordinates(
  layout: LayoutResult,
  offset: number,
  defaultRunProperties?: DocxRunProperties,
): CursorCoordinates | undefined {
  if (layout.lines.length === 0) {
    const defaultFontSizePx =
      defaultRunProperties?.sz !== undefined
        ? halfPointsToPx(defaultRunProperties.sz)
        : DEFAULT_FONT_SIZE_PX;
    const height = defaultFontSizePx * LINE_HEIGHT_MULTIPLIER;
    return { x: 0, y: 0, height };
  }

  // Walk through lines to find the one containing offset
  for (const line of layout.lines) {
    const lineFontSizePx = line.height / LINE_HEIGHT_MULTIPLIER;
    const lineTop = line.y - lineFontSizePx * ASCENT_RATIO;

    for (const span of line.spans) {
      // Cursor can be at startOffset (before first char) up to endOffset (after last char)
      if (offset >= span.startOffset && offset <= span.endOffset) {
        const relOffset = offset - span.startOffset;
        const font = resolveFontSpec(span.runProperties, defaultRunProperties);
        const textBeforeCursor = span.text.slice(0, relOffset);
        const cursorX = span.x + measureTextWidthPx(textBeforeCursor, font);

        return {
          x: cursorX,
          y: lineTop,
          height: line.height,
        };
      }
    }

    // Check if offset is at the very end of this line (after last span)
    const lastSpan = line.spans[line.spans.length - 1];
    if (lastSpan && offset === lastSpan.endOffset) {
      const font = resolveFontSpec(lastSpan.runProperties, defaultRunProperties);
      const cursorX = lastSpan.x + measureTextWidthPx(lastSpan.text, font);
      return {
        x: cursorX,
        y: lineTop,
        height: line.height,
      };
    }
  }

  // Offset is beyond all lines - position at end of last line
  const lastLine = layout.lines[layout.lines.length - 1];
  const lastSpan = lastLine.spans[lastLine.spans.length - 1];
  const lineFontSizePx = lastLine.height / LINE_HEIGHT_MULTIPLIER;
  const lineTop = lastLine.y - lineFontSizePx * ASCENT_RATIO;

  if (!lastSpan) {
    return {
      x: 0,
      y: lineTop,
      height: lastLine.height,
    };
  }

  const font = resolveFontSpec(lastSpan.runProperties, defaultRunProperties);
  const cursorX = lastSpan.x + measureTextWidthPx(lastSpan.text, font);

  return {
    x: cursorX,
    y: lineTop,
    height: lastLine.height,
  };
}

/**
 * Convert x, y coordinates to a character offset in the layout.
 * Used for click position to cursor position conversion.
 */
export function coordinatesToOffset(
  layout: LayoutResult,
  x: number,
  y: number,
  defaultRunProperties?: DocxRunProperties,
): number {
  if (layout.lines.length === 0) {
    return 0;
  }

  // Find the closest line by y-coordinate
  let closestLine = layout.lines[0];
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const line of layout.lines) {
    const lineFontSizePx = line.height / LINE_HEIGHT_MULTIPLIER;
    const lineTop = line.y - lineFontSizePx * ASCENT_RATIO;
    const lineBottom = lineTop + line.height;

    // Distance to line
    let distance: number;
    if (y < lineTop) {
      distance = lineTop - y;
    } else if (y > lineBottom) {
      distance = y - lineBottom;
    } else {
      // Inside the line
      distance = 0;
    }

    if (distance < closestDistance) {
      closestDistance = distance;
      closestLine = line;
    }

    // If we're inside a line, we found it
    if (distance === 0) {
      break;
    }
  }

  // Find the character offset within the line
  if (closestLine.spans.length === 0) {
    return 0;
  }

  // Check if x is before the first span
  const firstSpan = closestLine.spans[0];
  if (x <= firstSpan.x) {
    return firstSpan.startOffset;
  }

  // Search through spans
  for (const span of closestLine.spans) {
    const font = resolveFontSpec(span.runProperties, defaultRunProperties);
    const spanEndX = span.x + measureTextWidthPx(span.text, font);

    if (x <= spanEndX) {
      // x is within this span - binary search for character position
      return span.startOffset + findCharOffsetInSpan(span, x, font);
    }
  }

  // x is after all spans - return end of last span
  const lastSpan = closestLine.spans[closestLine.spans.length - 1];
  return lastSpan.endOffset;
}

/**
 * Binary search to find the character offset within a span for a given x-coordinate.
 */
function findCharOffsetInSpan(
  span: SpanLayout,
  targetX: number,
  font: FontSpec,
): number {
  const text = span.text;
  if (text.length === 0) {
    return 0;
  }

  // Convert targetX to be relative to span start
  const relativeX = targetX - span.x;
  if (relativeX <= 0) {
    return 0;
  }

  // Binary search for the character
  let low = 0;
  let high = text.length;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    const width = measureTextWidthPx(text.slice(0, mid + 1), font);

    if (width < relativeX) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  // Determine which side of the character the click is closer to
  const prevWidth = low > 0 ? measureTextWidthPx(text.slice(0, low), font) : 0;
  const nextWidth = measureTextWidthPx(text.slice(0, low + 1), font);

  // Return the closer boundary
  return Math.abs(relativeX - prevWidth) <= Math.abs(nextWidth - relativeX)
    ? low
    : Math.min(low + 1, text.length);
}

// =============================================================================
// Component
// =============================================================================

export function DocxTextOverlay({
  paragraph,
  bounds,
  selectionStart,
  selectionEnd,
  styles,
}: DocxTextOverlayProps): ReactNode {
  const layout = useMemo(
    () => layoutParagraphText(paragraph, bounds, styles),
    [paragraph, bounds, styles],
  );

  const defaultRunProperties = styles?.docDefaults?.rPrDefault?.rPr;
  const selectionRects = useMemo(
    () => computeSelectionRects(layout, selectionStart, selectionEnd, defaultRunProperties),
    [layout, selectionStart, selectionEnd, defaultRunProperties],
  );

  return (
    <svg
      data-testid="docx-text-overlay"
      width={bounds.width}
      height={bounds.height}
      viewBox={`0 0 ${Math.max(0, bounds.width)} ${Math.max(0, bounds.height)}`}
      style={{
        position: "absolute",
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {selectionRects.map((rect, i) => (
        <rect key={i} x={rect.x} y={rect.y} width={rect.width} height={rect.height} fill={SELECTION_FILL} />
      ))}

      {layout.lines.flatMap((line, li) =>
        line.spans.map((span, si) => (
          <text
            key={`${li}-${si}`}
            x={span.x}
            y={line.y}
            style={computeRunSvgStyles(span.runProperties, defaultRunProperties)}
            xmlSpace="preserve"
          >
            {span.text}
          </text>
        )),
      )}
    </svg>
  );
}
