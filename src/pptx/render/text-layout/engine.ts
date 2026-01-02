/**
 * @file Text layout engine
 * Main orchestrator for text layout
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
} from "./types";
import type { Pixels, Points, TextAlign } from "../../domain/types";
import { px, pt, pct } from "../../domain/types";
import { measureSpans, estimateBulletWidth } from "./measurer";
import { breakIntoLines, getLineWidth } from "./line-breaker";
import { PT_TO_PX } from "../../core/units/conversion";
import { DEFAULT_FONT_SIZE_PT } from "../../core/ecma376/defaults";
import { getAscenderRatio } from "../../../text/font-metrics";
import type { RenderOptions } from "../core/types";
import { DEFAULT_RENDER_OPTIONS } from "../core/types";

// =============================================================================
// Text Box Utilities
// =============================================================================

/**
 * Get available content width within text box
 */
function getContentWidth(textBox: TextBoxConfig): Pixels {
  const width = (textBox.width as number) - (textBox.insetLeft as number) - (textBox.insetRight as number);
  return px(Math.max(0, width));
}

/**
 * Get available content height within text box
 */
function getContentHeight(textBox: TextBoxConfig): Pixels {
  const height = (textBox.height as number) - (textBox.insetTop as number) - (textBox.insetBottom as number);
  return px(Math.max(0, height));
}

/**
 * Calculate bullet width or return 0 if no bullet
 */
function getBulletWidth(bullet: BulletConfig | undefined): number {
  if (bullet === undefined) {
    return 0;
  }
  return estimateBulletWidth(bullet.char, bullet.fontSize, bullet.fontFamily) as number;
}

/**
 * Get effective font size for a line, using endParaFontSize for empty paragraphs
 * @see ECMA-376 Part 1, Section 21.1.2.2.3 (a:endParaRPr)
 */
function getLineFontSize(lineHeight: number, endParaFontSize: Points | undefined): Points {
  if (lineHeight > 0) {
    return pt(lineHeight);
  }
  return endParaFontSize ?? pt(DEFAULT_FONT_SIZE_PT);
}

/**
 * Scale bullet to new font size percentage
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
 *
 * Per ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc):
 * Line spacing can be specified as percentage of font size or absolute points.
 * Default is single spacing (100% = font size).
 *
 * When RenderOptions.lineSpacingMode is "compat", the line spacing
 * is adjusted by the libreofficeLineSpacingFactor (default 0.75) to match
 * LibreOffice's rendering behavior.
 *
 * @see ECMA-376 Part 1, 21.1.2.2.5
 * @see https://bugs.documentfoundation.org/show_bug.cgi?id=103476 - LibreOffice line spacing issues
 */
function calculateLineHeight(
  baseFontSize: Points,
  lineSpacing: LayoutParagraphInput["lineSpacing"],
  renderOptions: RenderOptions = DEFAULT_RENDER_OPTIONS,
): number {
  const fontSizePx = (baseFontSize as number) * PT_TO_PX;

  if (lineSpacing === undefined) {
    // Default: single line spacing (100%)
    // Apply LibreOffice correction factor if in libreofficeCompat mode
    const effectiveMultiplier = getEffectiveLineSpacing(1.0, renderOptions);
    return fontSizePx * effectiveMultiplier;
  }

  if (lineSpacing.type === "percent") {
    const baseMultiplier = (lineSpacing.value as number) / 100;
    // Apply LibreOffice correction factor if in libreofficeCompat mode
    const effectiveMultiplier = getEffectiveLineSpacing(baseMultiplier, renderOptions);
    return fontSizePx * effectiveMultiplier;
  }

  // Points-based line spacing
  // LibreOffice correction is also applied to point-based spacing
  // @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:spcPts)
  const baseLineHeight = (lineSpacing.value as number) * PT_TO_PX;
  const effectiveMultiplier = getEffectiveLineSpacing(1.0, renderOptions);
  return baseLineHeight * effectiveMultiplier;
}

function getEffectiveLineSpacing(baseMultiplier: number, renderOptions: RenderOptions): number {
  if (renderOptions.lineSpacingMode === "compat") {
    return baseMultiplier * renderOptions.libreofficeLineSpacingFactor;
  }
  return baseMultiplier;
}

// =============================================================================
// Paragraph Layout
// =============================================================================

/**
 * Layout a single paragraph
 */
function layoutParagraph(
  para: LayoutParagraphInput,
  contentWidth: Pixels,
  startY: number,
  renderOptions: RenderOptions = DEFAULT_RENDER_OPTIONS,
): { paragraph: LayoutParagraphResult; endY: number } {
  // Calculate margins
  const marginLeft = para.marginLeft as number;
  const marginRight = para.marginRight as number;
  const indent = para.indent as number;

  // Calculate bullet width if present
  const bulletWidth = getBulletWidth(para.bullet);

  // Calculate available widths
  const firstLineWidth = px(
    (contentWidth as number) - marginLeft - marginRight - indent - bulletWidth,
  );
  const nextLineWidth = px((contentWidth as number) - marginLeft - marginRight);

  // Measure spans
  const measuredSpans = measureSpans(para.spans);

  // Determine wrap mode
  const wrapMode = measuredSpans.length === 0 ? "none" : "wrap";

  // Break into lines
  const { lines: spanLines, lineHeights } = breakIntoLines(
    measuredSpans,
    firstLineWidth,
    nextLineWidth,
    wrapMode,
  );

  // Add space before
  const layoutState = { currentY: startY + (para.spaceBefore as number) * PT_TO_PX };

  // Build layout lines
  const lines: LayoutLine[] = [];

  spanLines.forEach((lineSpans, index) => {
    const lineFontSize = getLineFontSize(lineHeights[index] as number, para.endParaFontSize);
    const lineHeight = calculateLineHeight(lineFontSize, para.lineSpacing, renderOptions);

    // Calculate baseline position
    // Per ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc):
    // Line spacing defines the distance between lines, not the baseline position.
    // The baseline should be calculated from the font's ascender height,
    // which is based on fontSize, NOT lineHeight.
    //
    // For LibreOffice compatibility, use libreofficeAscenderOverride (typically 1.0)
    // instead of font-specific ascender ratios (typically 0.75 for Calibri).
    //
    // @see ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc)
    // @see ECMA-376 Part 1, Section 21.1.2.1.12 (fontAlgn)
    const fontSizePx = (lineFontSize as number) * PT_TO_PX;
    const fontAscenderRatio = lineSpans.length > 0 ? getAscenderRatio(lineSpans[0].fontFamily) : 0.8;
    const ascenderRatio = renderOptions.libreofficeAscenderOverride ?? fontAscenderRatio;
    const baseline = layoutState.currentY + fontSizePx * ascenderRatio;

    // Calculate x position based on alignment
    // ECMA-376: First line uses indent + bulletWidth, subsequent lines use marL only
    const lineWidth = getLineWidth(lineSpans);
    const availableWidth = index === 0 ? firstLineWidth : nextLineWidth;
    const lineIndent = index === 0 ? indent : 0;
    const lineBulletWidth = index === 0 ? bulletWidth : 0;
    const x = calculateLineX(para.alignment, marginLeft, lineWidth as number, availableWidth as number, lineIndent, lineBulletWidth);

    // Convert spans to positioned spans
    const positionedSpans = positionSpans(lineSpans);

    lines.push({
      spans: positionedSpans,
      x: px(x),
      y: px(baseline),
      width: lineWidth,
      height: px(lineHeight),
    });

    layoutState.currentY += lineHeight;
  });

  // Add space after
  currentY += (para.spaceAfter as number) * PT_TO_PX;

  return {
    paragraph: {
      lines,
      alignment: para.alignment,
      bullet: para.bullet,
      bulletWidth: px(bulletWidth),
      fontAlignment: para.fontAlignment,
    },
    endY: currentY,
  };
}

/**
 * Calculate line X position based on alignment.
 *
 * Per ECMA-376 21.1.2.2.7:
 * - marL: Left margin for the paragraph
 * - indent: First line indentation (can be negative for hanging indent)
 *
 * For first line with bullet (hanging indent):
 * - Bullet position = marL + indent
 * - Text position = marL + indent + bulletWidth
 *
 * For subsequent lines:
 * - Text position = marL
 */
function calculateLineX(
  alignment: TextAlign,
  marginLeft: number,
  lineWidth: number,
  availableWidth: number,
  indent: number,
  bulletWidth: number,
): number {
  // ECMA-376: First line starts at marL + indent + bulletWidth
  // indent can be negative (hanging indent), bulletWidth is added for text after bullet
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
      // For justified text, return start position (justification is handled differently)
      return baseX;
    case "left":
    default:
      return baseX;
  }
}

/**
 * Convert measured spans to positioned spans with dx values
 */
function positionSpans(spans: readonly MeasuredSpan[]): PositionedSpan[] {
  return spans.map((span) => ({
    ...span,
    dx: px(0), // dx will be calculated during SVG rendering for kerning
  }));
}

// =============================================================================
// Vertical Anchoring
// =============================================================================

/**
 * Calculate y offset based on vertical anchor
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
  totalHeight: number
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
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (anchorCtr attribute)
 */
function calculateXCenterOffset(
  paragraphs: LayoutParagraphResult[],
  contentWidth: number,
): number {
  // Find the maximum line width across all paragraphs
  const maxLineWidth = paragraphs.reduce((maxWidth, para) => {
    return para.lines.reduce((lineMax, line) => {
      const lineWidth = line.width as number;
      return lineWidth > lineMax ? lineWidth : lineMax;
    }, maxWidth);
  }, 0);

  // Center the content: offset = (availableWidth - contentWidth) / 2
  return Math.max(0, (contentWidth - maxLineWidth) / 2);
}

/**
 * Apply anchor offsets to all lines (vertical + horizontal centering).
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (anchor, anchorCtr attributes)
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

  // Calculate horizontal centering offset if anchorCenter is true
  const xCenterOffset = textBox.anchorCenter ? calculateXCenterOffset(paragraphs, contentWidth) : 0;

  // Apply offset to all lines
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
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:normAutofit fontScale)
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
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:normAutofit)
 */
function scaleParagraphFonts(
  para: LayoutParagraphInput,
  fontScalePercent: number,
): LayoutParagraphInput {
  const scaledSpans = para.spans.map((span) => scaleSpanFontSize(span, fontScalePercent));
  return { ...para, spans: scaledSpans, bullet: scaleBullet(para.bullet, fontScalePercent) };
}

/**
 * Apply line space reduction to a paragraph.
 *
 * Per ECMA-376 Part 1, Section 21.1.2.1.2:
 * lnSpcReduction specifies the percentage amount to reduce the line spacing.
 * A value of 20% would reduce line spacing by 20%.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:normAutofit lnSpcReduction)
 */
function reduceLineSpacing(
  para: LayoutParagraphInput,
  lineSpaceReductionPercent: number,
): LayoutParagraphInput {
  if (para.lineSpacing === undefined) {
    // No explicit line spacing; apply reduction to default 100%
    // Reduction of X% means result is (100 - X)%
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
    // Apply reduction to percentage-based line spacing
    // If lineSpacing is 120% and reduction is 20%, result is 120 * (100-20)/100 = 96%
    const adjustedValue = (para.lineSpacing.value as number) * ((100 - lineSpaceReductionPercent) / 100);
    return {
      ...para,
      lineSpacing: {
        type: "percent" as const,
        value: pct(adjustedValue),
      },
    };
  }

  // Points-based line spacing: reduce by percentage
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
 *
 * Per ECMA-376 Part 1, Section 21.1.2.1.2:
 * - fontScale: Percentage to scale all font sizes
 * - lnSpcReduction: Percentage to reduce line spacing
 *
 * @see ECMA-376 Part 1, Section 21.1.2.1.2 (a:normAutofit)
 */
function applyAutoFit(
  paragraphs: readonly LayoutParagraphInput[],
  autoFit: AutoFitConfig,
): LayoutParagraphInput[] {
  if (autoFit.type !== "normal") {
    // No scaling for 'none' or 'shape' types
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
 * Layout text content within a text box
 */
export function layoutTextBody(input: LayoutInput): LayoutResult {
  const { textBox, paragraphs: inputParagraphs, renderOptions } = input;
  const effectiveRenderOptions = renderOptions ?? DEFAULT_RENDER_OPTIONS;

  // Apply auto-fit scaling if configured
  const scaledParagraphs = applyAutoFit(inputParagraphs, textBox.autoFit);

  // Apply spcFirstLastPara behavior
  // Per ECMA-376 Part 1, Section 21.1.2.1.2:
  // When spcFirstLastPara is false (default), spaceBefore of the first paragraph
  // and spaceAfter of the last paragraph are suppressed.
  // @see ECMA-376 Part 1, Section 21.1.2.1.2 (spcFirstLastPara attribute)
  const adjustedParagraphs = scaledParagraphs.map((para, index) => {
    const isFirst = index === 0;
    const isLast = index === scaledParagraphs.length - 1;

    if (!textBox.spcFirstLastPara) {
      // Suppress first paragraph spaceBefore and last paragraph spaceAfter
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
    const { paragraph, endY } = layoutParagraph(para, contentWidth, layoutState.currentY, effectiveRenderOptions);
    layoutedParagraphs.push(paragraph);
    layoutState.currentY = endY;
  });

  const totalHeight = layoutState.currentY;

  // Apply anchor offsets (vertical + horizontal centering)
  const { paragraphs: finalParagraphs, yOffset } = applyAnchorOffsets(
    layoutedParagraphs,
    totalHeight,
    textBox,
  );

  return {
    paragraphs: finalParagraphs,
    totalHeight: px(totalHeight + (textBox.insetTop as number) + (textBox.insetBottom as number)),
    yOffset,
  };
}
