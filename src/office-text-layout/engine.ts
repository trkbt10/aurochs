/**
 * @file Text layout engine
 *
 * Main orchestrator for text layout.
 * Shared implementation for PPTX and DOCX text layout.
 */

import type {
  LayoutResult,
  LayoutInput,
  TextBoxConfig,
  LayoutParagraphResult,
  LayoutParagraphInput,
  MeasuredSpan,
  LayoutLine,
  PositionedSpan,
  AutoFitConfig,
  LayoutSpan,
  BulletConfig,
  LineSpacing,
  TextAlign,
} from "./types";
import type { Pixels, Points } from "../ooxml/domain/units";
import { px, pt, pct } from "../ooxml/domain/units";
import { measureSpans, estimateBulletWidth, PT_TO_PX } from "./measurer";
import { breakIntoLines, getLineWidth, DEFAULT_FONT_SIZE_PT } from "./line-breaker";
import { getAscenderRatio } from "../text/font-metrics";

// =============================================================================
// Text Box Utilities
// =============================================================================

/**
 * Get available content width within text box.
 */
function getContentWidth(textBox: TextBoxConfig): Pixels {
  const width = (textBox.width as number) - (textBox.insetLeft as number) - (textBox.insetRight as number);
  return px(Math.max(0, width));
}

/**
 * Get available content height within text box.
 */
function getContentHeight(textBox: TextBoxConfig): Pixels {
  const height = (textBox.height as number) - (textBox.insetTop as number) - (textBox.insetBottom as number);
  return px(Math.max(0, height));
}

/**
 * Calculate bullet width or return 0 if no bullet.
 */
function getBulletWidth(bullet: BulletConfig | undefined): number {
  if (bullet === undefined) {
    return 0;
  }
  return estimateBulletWidth(bullet.char, bullet.fontSize, bullet.fontFamily) as number;
}

/**
 * Get effective font size for a line, using endParaFontSize for empty paragraphs.
 */
function getLineFontSize(lineHeight: number, endParaFontSize: Points | undefined): Points {
  if (lineHeight > 0) {
    return pt(lineHeight);
  }
  return endParaFontSize ?? pt(DEFAULT_FONT_SIZE_PT);
}

/**
 * Scale bullet to new font size percentage.
 */
function scaleBullet(bullet: BulletConfig | undefined, fontScalePercent: number): BulletConfig | undefined {
  if (bullet === undefined) {
    return undefined;
  }
  return { ...bullet, fontSize: pt((bullet.fontSize as number) * (fontScalePercent / 100)) };
}

// =============================================================================
// Line Spacing Calculation
// =============================================================================

/**
 * Calculate line height based on line spacing configuration.
 */
function calculateLineHeight(baseFontSize: Points, lineSpacing: LineSpacing | undefined): number {
  const fontSizePx = (baseFontSize as number) * PT_TO_PX;

  if (lineSpacing === undefined) {
    // Default: single line spacing (100%)
    return fontSizePx;
  }

  if (lineSpacing.type === "percent") {
    const multiplier = (lineSpacing.value as number) / 100;
    return fontSizePx * multiplier;
  }

  // Points-based line spacing
  return (lineSpacing.value as number) * PT_TO_PX;
}

// =============================================================================
// Paragraph Layout
// =============================================================================

/**
 * Layout a single paragraph.
 */
function layoutParagraph(
  para: LayoutParagraphInput,
  contentWidth: Pixels,
  startY: number,
  measureParagraphFn: (paragraph: LayoutParagraphInput) => {
    readonly spans: readonly MeasuredSpan[];
    readonly bulletWidth?: Pixels;
  },
): { paragraph: LayoutParagraphResult; endY: number } {
  // Calculate margins
  const marginLeft = para.marginLeft as number;
  const marginRight = para.marginRight as number;
  const indent = para.indent as number;

  // Measure spans (and optional bullet width)
  const measuredParagraph = measureParagraphFn(para);
  const bulletWidth = measuredParagraph.bulletWidth ?? px(getBulletWidth(para.bullet));

  // Calculate available widths
  const firstLineWidth = px(
    (contentWidth as number) - marginLeft - marginRight - indent - (bulletWidth as number),
  );
  const nextLineWidth = px((contentWidth as number) - marginLeft - marginRight);

  // Measured spans
  const measuredSpans = measuredParagraph.spans;

  // Determine wrap mode
  const wrapMode = measuredSpans.length === 0 ? "none" : "wrap";

  // Break into lines
  const { lines: spanLines, lineHeights, pageBreaksAfter } = breakIntoLines(measuredSpans, firstLineWidth, nextLineWidth, wrapMode);

  // Add space before
  const layoutState = { currentY: startY + (para.spaceBefore as number) * PT_TO_PX };

  // Build layout lines
  const lines: LayoutLine[] = [];

  spanLines.forEach((lineSpans, index) => {
    const lineFontSize = getLineFontSize(lineHeights[index] as number, para.endParaFontSize);
    const lineHeight = calculateLineHeight(lineFontSize, para.lineSpacing);

    // Calculate baseline position using font ascender
    const fontSizePx = (lineFontSize as number) * PT_TO_PX;
    const fontAscenderRatio = lineSpans.length > 0 ? getAscenderRatio(lineSpans[0].fontFamily) : 0.8;
    const baseline = layoutState.currentY + fontSizePx * fontAscenderRatio;

    // Calculate x position based on alignment
    const lineWidth = getLineWidth(lineSpans);
    const availableWidth = index === 0 ? firstLineWidth : nextLineWidth;
    const lineIndent = index === 0 ? indent : 0;
    const lineBulletWidth = index === 0 ? (bulletWidth as number) : 0;
    const x = calculateLineX(
      para.alignment,
      marginLeft,
      lineWidth as number,
      availableWidth as number,
      lineIndent,
      lineBulletWidth,
    );

    // Convert spans to positioned spans (with justification if needed)
    const isLastLine = index === spanLines.length - 1;
    const positionedSpans = positionSpans(
      lineSpans,
      para.alignment,
      lineWidth as number,
      availableWidth as number,
      isLastLine,
    );

    const hasPageBreakAfter = pageBreaksAfter[index] ?? false;
    lines.push({
      spans: positionedSpans,
      x: px(x),
      y: px(baseline),
      width: lineWidth,
      height: px(lineHeight),
      pageBreakAfter: hasPageBreakAfter || undefined,
    });

    layoutState.currentY += lineHeight;
  });

  // Add space after
  layoutState.currentY += (para.spaceAfter as number) * PT_TO_PX;

  return {
    paragraph: {
      lines,
      alignment: para.alignment,
      bullet: para.bullet,
      bulletWidth,
      fontAlignment: para.fontAlignment,
    },
    endY: layoutState.currentY,
  };
}

/**
 * Calculate line X position based on alignment.
 */
function calculateLineX(
  alignment: TextAlign,
  marginLeft: number,
  lineWidth: number,
  availableWidth: number,
  indent: number,
  bulletWidth: number,
): number {
  // First line starts at marL + indent + bulletWidth
  const baseX = marginLeft + indent + bulletWidth;

  switch (alignment) {
    case "center":
      return baseX + (availableWidth - lineWidth) / 2;
    case "right":
      return baseX + availableWidth - lineWidth;
    case "justify":
    case "justifyLow":
    case "distributed":
    case "thaiDistributed":
      return baseX;
    case "left":
    default:
      return baseX;
  }
}

/**
 * Count word gaps in a line.
 * A word gap is a transition from space character to non-space character.
 */
function countWordGaps(spans: readonly MeasuredSpan[]): number {
  const fullText = spans.map((s) => s.text).join("");
  const matches = fullText.match(/\s+(?=\S)/g);
  return matches !== null ? matches.length : 0;
}

/**
 * Find word boundary positions (character indices where spaces end).
 * Returns an array of { spanIndex, charIndex } for each word boundary.
 */
function findWordBoundaries(
  spans: readonly MeasuredSpan[],
): Array<{ readonly spanIndex: number; readonly charIndex: number }> {
  const boundaries: Array<{ readonly spanIndex: number; readonly charIndex: number }> = [];
  const isSpace = (ch: string): boolean => /\s/.test(ch);

  // Track previous character state across spans
  const prevState = { wasSpace: false };

  spans.forEach((span, spanIndex) => {
    for (let i = 0; i < span.text.length; i++) {
      const ch = span.text[i];
      // Word boundary: previous was space, current is not
      if (prevState.wasSpace && !isSpace(ch)) {
        boundaries.push({ spanIndex, charIndex: i });
      }
      prevState.wasSpace = isSpace(ch);
    }
  });

  return boundaries;
}

/**
 * Convert measured spans to positioned spans with dx values.
 * For justify alignment, distributes extra space between words.
 *
 * @param spans - Measured spans to position
 * @param alignment - Text alignment
 * @param lineWidth - Natural width of the line
 * @param availableWidth - Available width to fill
 * @param isLastLine - Whether this is the last line of the paragraph
 */
function positionSpans(
  spans: readonly MeasuredSpan[],
  alignment: TextAlign,
  lineWidth: number,
  availableWidth: number,
  isLastLine: boolean,
): PositionedSpan[] {
  // Only apply justification for justify alignment on non-last lines
  const shouldJustify =
    (alignment === "justify" || alignment === "distributed") &&
    !isLastLine &&
    spans.length > 0;

  if (!shouldJustify) {
    return spans.map((span) => ({
      ...span,
      dx: px(0),
    }));
  }

  const extraSpace = availableWidth - lineWidth;

  // Don't justify if we need to shrink text (line is already wider than available)
  if (extraSpace <= 0) {
    return spans.map((span) => ({
      ...span,
      dx: px(0),
    }));
  }

  const wordGaps = countWordGaps(spans);

  // If no word gaps (single word or no spaces), can't justify
  if (wordGaps === 0) {
    return spans.map((span) => ({
      ...span,
      dx: px(0),
    }));
  }

  // Calculate extra space per word gap
  const extraPerGap = extraSpace / wordGaps;

  // Find word boundaries and assign extra spacing
  const boundaries = findWordBoundaries(spans);

  // Track cumulative extra space added
  const cumulativeExtra = { value: 0 };

  return spans.map((span, spanIndex) => {
    // Find all boundaries that start within this span
    const spanBoundaries = boundaries.filter((b) => b.spanIndex === spanIndex);

    if (spanBoundaries.length === 0) {
      return {
        ...span,
        dx: px(cumulativeExtra.value),
      };
    }

    // Add extra space for each word boundary in this span
    // The dx is the cumulative offset at the start of this span
    const startOffset = cumulativeExtra.value;
    cumulativeExtra.value += spanBoundaries.length * extraPerGap;

    return {
      ...span,
      dx: px(startOffset),
    };
  });
}

// =============================================================================
// Vertical Anchoring
// =============================================================================

/**
 * Calculate y offset based on vertical anchor.
 */
function calculateYOffset(totalHeight: number, textBox: TextBoxConfig): number {
  const contentHeight = getContentHeight(textBox) as number;
  const insetTop = textBox.insetTop as number;

  const rawOffset = getAnchorYOffset(textBox.anchor, insetTop, contentHeight, totalHeight);

  return Math.max(insetTop, rawOffset);
}

function getAnchorYOffset(
  anchor: TextBoxConfig["anchor"],
  insetTop: number,
  contentHeight: number,
  totalHeight: number,
): number {
  switch (anchor) {
    case "center":
      return insetTop + (contentHeight - totalHeight) / 2;
    case "bottom":
      return insetTop + contentHeight - totalHeight;
    case "top":
    default:
      return insetTop;
  }
}

/**
 * Calculate horizontal centering offset when anchorCenter is true.
 */
function calculateXCenterOffset(paragraphs: LayoutParagraphResult[], contentWidth: number): number {
  const maxLineWidth = paragraphs.reduce((maxWidth, para) => {
    return para.lines.reduce((lineMax, line) => {
      const lineWidth = line.width as number;
      return lineWidth > lineMax ? lineWidth : lineMax;
    }, maxWidth);
  }, 0);

  return Math.max(0, (contentWidth - maxLineWidth) / 2);
}

/**
 * Apply anchor offsets to all lines (vertical + horizontal centering).
 */
function applyAnchorOffsets(
  paragraphs: LayoutParagraphResult[],
  totalHeight: number,
  textBox: TextBoxConfig,
): { paragraphs: LayoutParagraphResult[]; yOffset: Pixels } {
  const yOffset = calculateYOffset(totalHeight, textBox);
  const insetLeft = textBox.insetLeft as number;
  const insetRight = textBox.insetRight as number;
  const contentWidth = (textBox.width as number) - insetLeft - insetRight;

  const xCenterOffset = textBox.anchorCenter ? calculateXCenterOffset(paragraphs, contentWidth) : 0;

  const adjustedParagraphs: LayoutParagraphResult[] = paragraphs.map((para) => ({
    ...para,
    lines: para.lines.map((line) => ({
      ...line,
      x: px((line.x as number) + insetLeft + xCenterOffset),
      y: px((line.y as number) + yOffset),
    })),
  }));

  return { paragraphs: adjustedParagraphs, yOffset: px(yOffset) };
}

// =============================================================================
// Auto-Fit Scaling
// =============================================================================

/**
 * Apply font scale to a span.
 */
function scaleSpanFontSize(span: LayoutSpan, fontScalePercent: number): LayoutSpan {
  const scaledFontSize = (span.fontSize as number) * (fontScalePercent / 100);
  return {
    ...span,
    fontSize: pt(scaledFontSize),
  };
}

/**
 * Apply font scale to a paragraph's spans and bullet.
 */
function scaleParagraphFonts(para: LayoutParagraphInput, fontScalePercent: number): LayoutParagraphInput {
  const scaledSpans = para.spans.map((span) => scaleSpanFontSize(span, fontScalePercent));
  return { ...para, spans: scaledSpans, bullet: scaleBullet(para.bullet, fontScalePercent) };
}

/**
 * Apply line space reduction to a paragraph.
 */
function reduceLineSpacing(para: LayoutParagraphInput, lineSpaceReductionPercent: number): LayoutParagraphInput {
  if (para.lineSpacing === undefined) {
    const adjustedPercent = 100 - lineSpaceReductionPercent;
    return {
      ...para,
      lineSpacing: {
        type: "percent" as const,
        value: pct(adjustedPercent),
      },
    };
  }

  if (para.lineSpacing.type === "percent") {
    const adjustedValue = (para.lineSpacing.value as number) * ((100 - lineSpaceReductionPercent) / 100);
    return {
      ...para,
      lineSpacing: {
        type: "percent" as const,
        value: pct(adjustedValue),
      },
    };
  }

  const adjustedValue = (para.lineSpacing.value as number) * ((100 - lineSpaceReductionPercent) / 100);
  return {
    ...para,
    lineSpacing: {
      type: "points" as const,
      value: pt(adjustedValue),
    },
  };
}

/**
 * Apply autoFit settings to paragraphs.
 */
function applyAutoFit(paragraphs: readonly LayoutParagraphInput[], autoFit: AutoFitConfig): LayoutParagraphInput[] {
  if (autoFit.type !== "normal") {
    return [...paragraphs];
  }

  const fontScalePercent = autoFit.fontScale as number;
  const lineSpaceReductionPercent = autoFit.lineSpaceReduction as number;

  return paragraphs.map((para) => {
    const scaled = fontScalePercent !== 100 ? scaleParagraphFonts(para, fontScalePercent) : para;
    return lineSpaceReductionPercent > 0 ? reduceLineSpacing(scaled, lineSpaceReductionPercent) : scaled;
  });
}

// =============================================================================
// Main Layout Function
// =============================================================================

/**
 * Layout text content within a text box.
 */
export function layoutTextBody(input: LayoutInput): LayoutResult {
  const { textBox, paragraphs: inputParagraphs, measureParagraph } = input;
  const measureParagraphFn = measureParagraph ?? ((para) => ({ spans: measureSpans(para.spans) }));

  // Apply auto-fit scaling if configured
  const scaledParagraphs = applyAutoFit(inputParagraphs, textBox.autoFit);

  // Apply spcFirstLastPara behavior
  const adjustedParagraphs = scaledParagraphs.map((para, index) => {
    const isFirst = index === 0;
    const isLast = index === scaledParagraphs.length - 1;

    if (!textBox.spcFirstLastPara) {
      return {
        ...para,
        spaceBefore: isFirst ? pt(0) : para.spaceBefore,
        spaceAfter: isLast ? pt(0) : para.spaceAfter,
      };
    }
    return para;
  });

  // Get available content width
  const contentWidth = getContentWidth(textBox);

  // Layout all paragraphs
  const layoutState = { currentY: 0 };
  const layoutedParagraphs: LayoutParagraphResult[] = [];

  adjustedParagraphs.forEach((para) => {
    const { paragraph, endY } = layoutParagraph(para, contentWidth, layoutState.currentY, measureParagraphFn);
    layoutedParagraphs.push(paragraph);
    layoutState.currentY = endY;
  });

  const totalHeight = layoutState.currentY;

  // Apply anchor offsets (vertical + horizontal centering)
  const { paragraphs: finalParagraphs, yOffset } = applyAnchorOffsets(layoutedParagraphs, totalHeight, textBox);

  return {
    paragraphs: finalParagraphs,
    totalHeight: px(totalHeight + (textBox.insetTop as number) + (textBox.insetBottom as number)),
    yOffset,
  };
}

// =============================================================================
// Document Layout (without text box constraints)
// =============================================================================

/**
 * Layout paragraphs for document flow (no text box constraints).
 * Used by DOCX for continuous document layout.
 */
export function layoutDocument(
  paragraphs: readonly LayoutParagraphInput[],
  contentWidth: Pixels,
  measureParagraph?: (paragraph: LayoutParagraphInput) => { readonly spans: readonly MeasuredSpan[] },
): { paragraphs: readonly LayoutParagraphResult[]; totalHeight: Pixels } {
  const measureFn = measureParagraph ?? ((para) => ({ spans: measureSpans(para.spans) }));

  const layoutState = { currentY: 0 };
  const layoutedParagraphs: LayoutParagraphResult[] = [];

  paragraphs.forEach((para) => {
    const { paragraph, endY } = layoutParagraph(para, contentWidth, layoutState.currentY, measureFn);
    layoutedParagraphs.push(paragraph);
    layoutState.currentY = endY;
  });

  return {
    paragraphs: layoutedParagraphs,
    totalHeight: px(layoutState.currentY),
  };
}
