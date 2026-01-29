/**
 * @file SVG Text Renderer
 *
 * Renders layout results as SVG elements.
 * Shared implementation for PPTX and DOCX text rendering.
 */

import type { ReactNode, CSSProperties } from "react";
import type { Pixels, Points } from "@oxen-office/ooxml/domain/units";
import type {
  LayoutResult,
  LayoutLine,
  PositionedSpan,
  BulletConfig,
  FontAlignment,
  SelectionRect,
  CursorCoordinates,
  WritingMode,
} from "../types";
import { getAscenderRatio, PT_TO_PX } from "@oxen/glyph";
import { isVertical } from "../writing-mode";

const DEFAULT_HYPERLINK_COLOR = "#0563C1";

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Convert font size from points to pixels.
 */
function fontSizeToPixels(fontSizePt: Points): Pixels {
  return ((fontSizePt as number) * PT_TO_PX) as Pixels;
}

/**
 * Calculate visual bounds for text at a position.
 */
function getTextVisualBounds(
  baselineY: Pixels,
  fontSizePt: Points,
  fontFamily?: string,
): { topY: Pixels; height: Pixels } {
  const fontSizePx = fontSizeToPixels(fontSizePt);
  const ascenderHeight = (fontSizePx as number) * getAscenderRatio(fontFamily);

  return {
    topY: ((baselineY as number) - ascenderHeight) as Pixels,
    height: fontSizePx,
  };
}

/**
 * Build CSS font-family string from span properties.
 */
function buildFontFamily(span: PositionedSpan): string {
  const families = [span.fontFamily];

  if (span.fontFamilyEastAsian !== undefined) {
    families.push(span.fontFamilyEastAsian);
  }

  if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
    families.push(span.fontFamilyComplexScript);
  }

  return families.join(", ");
}

/**
 * Apply text transform (uppercase/lowercase) to text.
 */
function applyTextTransform(
  text: string,
  transform: "none" | "uppercase" | "lowercase" | undefined,
): string {
  if (transform === "uppercase") {
    return text.toUpperCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  return text;
}

/**
 * Apply vertical alignment offset for super/subscript.
 */
function applyVerticalAlign(
  lineY: number,
  fontSizePx: number,
  verticalAlign: "baseline" | "superscript" | "subscript",
): number {
  const VERTICAL_OFFSET_MULTIPLIER = 0.3;
  if (verticalAlign === "superscript") {
    return lineY - fontSizePx * VERTICAL_OFFSET_MULTIPLIER;
  }
  if (verticalAlign === "subscript") {
    return lineY + fontSizePx * VERTICAL_OFFSET_MULTIPLIER;
  }
  return lineY;
}

/**
 * Convert font alignment to SVG dominant-baseline.
 */
function toSvgDominantBaseline(fontAlignment: FontAlignment): string | undefined {
  switch (fontAlignment) {
    case "top":
      return "text-top";
    case "center":
      return "central";
    case "bottom":
      return "text-bottom";
    default:
      return undefined;
  }
}

function toOptionalStyle(style: CSSProperties): CSSProperties | undefined {
  if (Object.keys(style).length === 0) {
    return undefined;
  }
  return style;
}

function getSpanTextStyle(span: PositionedSpan, isVerticalMode: boolean, writingMode: WritingMode): CSSProperties | undefined {
  const style: CSSProperties = {};
  if (span.linkId !== undefined) {
    style.cursor = "pointer";
  }
  if (isVerticalMode) {
    style.writingMode = writingMode;
    style.textOrientation = "mixed";
  }
  return toOptionalStyle(style);
}

/**
 * Get text decoration value with hyperlink underline if applicable.
 * Hyperlinks should always show underline unless explicitly removed.
 */
function getTextDecorationWithHyperlink(
  span: PositionedSpan,
): string | undefined {
  if (span.linkId !== undefined) {
    // Hyperlink: add underline if not already present
    if (span.textDecoration !== undefined) {
      // Check if underline is already in the decoration
      if (!span.textDecoration.includes("underline")) {
        return `${span.textDecoration} underline`;
      }
      return span.textDecoration;
    }
    return "underline";
  }
  return span.textDecoration;
}

/**
 * Get text color for a span, applying hyperlink color if applicable.
 */
function getTextColor(span: PositionedSpan): string {
  if (span.linkId !== undefined) {
    // Use hyperlink color
    return DEFAULT_HYPERLINK_COLOR;
  }
  return span.color;
}

// =============================================================================
// Span Rendering
// =============================================================================

/**
 * Render an inline image span.
 */
function renderInlineImage(
  ...args: readonly [span: PositionedSpan, x: number, lineY: number, key: string]
): ReactNode {
  const [span, x, lineY, key] = args;
  const image = span.inlineImage;
  if (image === undefined) {
    return null;
  }

  // Calculate Y position - align bottom of image with baseline
  const imageY = lineY - (image.height as number);

  return (
    <g key={`img-${key}`}>
      <image
        key={`img-elem-${key}`}
        x={x}
        y={imageY}
        width={image.width as number}
        height={image.height as number}
        href={image.src}
        preserveAspectRatio="none"
      >
        {image.alt !== undefined && <title>{image.alt}</title>}
      </image>
    </g>
  );
}

/**
 * Render a single text span with all its styling.
 *
 * For vertical text (ECMA-376 tbRl/tbLrV):
 * - Coordinates are already transformed by page-flow
 * - Apply CSS writing-mode for proper character orientation
 * - CJK characters remain upright, Latin characters rotate
 */
function renderSpan(
  ...args: readonly [
    span: PositionedSpan,
    x: number,
    lineY: number,
    dominantBaseline: string | undefined,
    key: string,
    writingMode?: WritingMode,
  ]
): ReactNode {
  const [span, x, lineY, dominantBaseline, key, writingMode = "horizontal-tb"] =
    args;
  // Handle inline images
  if (span.inlineImage !== undefined) {
    return renderInlineImage(span, x, lineY, key);
  }

  const fontSizePx = fontSizeToPixels(span.fontSize);
  const isVerticalMode = isVertical(writingMode);
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
    if (isVerticalMode) {
      // Vertical mode: highlight extends horizontally (column width) and vertically (text extent)
      elements.push(
        <rect
          key={`hl-${key}`}
          x={x}
          y={lineY}
          width={fontSizePx as number}
          height={span.width as number}
          fill={span.highlightColor}
        />,
      );
    } else {
      const bounds = getTextVisualBounds(lineY as Pixels, span.fontSize, span.fontFamily);
      elements.push(
        <rect
          key={`hl-${key}`}
          x={x}
          y={bounds.topY as number}
          width={span.width as number}
          height={fontSizePx as number}
          fill={span.highlightColor}
        />,
      );
    }
  }

  // Build text props
  const textProps: Record<string, string | number | undefined> = {
    fontSize: `${fontSizePx as number}px`,
    fontFamily: buildFontFamily(span),
    xmlSpace: "preserve",
  };

  // Handle fill (with hyperlink color support)
  if (span.textFill !== undefined) {
    if (span.textFill.type === "solid") {
      textProps.fill = span.textFill.color;
    }
  } else {
    textProps.fill = getTextColor(span);
  }

  // Font styling
  if (span.fontWeight !== 400) {
    textProps.fontWeight = span.fontWeight;
  }
  if (span.fontStyle !== "normal") {
    textProps.fontStyle = span.fontStyle;
  }
  // Apply text decoration with hyperlink underline support
  const textDecoration = getTextDecorationWithHyperlink(span);
  if (textDecoration !== undefined) {
    textProps.textDecoration = textDecoration;
  }
  if (span.letterSpacing !== undefined && (span.letterSpacing as number) !== 0) {
    textProps.letterSpacing = `${span.letterSpacing}px`;
  }
  if (span.kerning !== undefined) {
    const fontSize = span.fontSize as number;
    textProps.fontKerning = fontSize >= (span.kerning as number) ? "normal" : "none";
  }
  if (span.direction === "rtl") {
    textProps.direction = "rtl";
    textProps.unicodeBidi = "bidi-override";
  }
  if (span.textOutline !== undefined) {
    textProps.stroke = span.textOutline.color;
    textProps.strokeWidth = span.textOutline.width;
    textProps.strokeLinecap = span.textOutline.cap;
    textProps.strokeLinejoin = span.textOutline.join;
    textProps.paintOrder = "stroke fill";
  }

  // Apply text transform
  const textContent = applyTextTransform(span.text, span.textTransform);

  // Add hyperlink attributes
  const isHyperlink = span.linkId !== undefined;
  if (isHyperlink) {
    textProps["data-link-id"] = span.linkId;
    if (span.linkTooltip !== undefined) {
      textProps["data-link-tooltip"] = span.linkTooltip;
    }
  }

  // For vertical mode, apply CSS writing-mode and text-orientation
  if (isVerticalMode) {
    // Position for vertical text: x is the right edge of the column
    textProps.x = x + (fontSizePx as number);
    textProps.y = lineY;
    textProps.dominantBaseline = "text-before-edge";
  } else {
    textProps.x = x;
    textProps.y = applyVerticalAlign(lineY, fontSizePx as number, span.verticalAlign);
    textProps.dominantBaseline = dominantBaseline;
  }

  const textStyle = getSpanTextStyle(span, isVerticalMode, writingMode);
  elements.push(
    <text key={`text-${key}`} {...textProps} style={textStyle}>
      {textContent}
      {isHyperlink && span.linkTooltip !== undefined && <title>{span.linkTooltip}</title>}
    </text>,
  );

  return <g key={`span-${key}`}>{elements}</g>;
}

// =============================================================================
// Line Rendering
// =============================================================================

/**
 * Render a line of text with all its spans.
 *
 * For vertical mode:
 * - line.x = column X position (left edge of column)
 * - line.y = inline start Y position
 * - Spans advance along Y axis (inline direction)
 */
function renderLine(
  ...args: readonly [
    line: LayoutLine,
    fontAlignment: FontAlignment,
    paragraphIndex: number,
    lineIndex: number,
    writingMode?: WritingMode,
  ]
): ReactNode[] {
  const [
    line,
    fontAlignment,
    paragraphIndex,
    lineIndex,
    writingMode = "horizontal-tb",
  ] = args;
  const dominantBaseline = toSvgDominantBaseline(fontAlignment);
  const isVerticalMode = isVertical(writingMode);

  const baseX = line.x as number;
  const baseY = line.y as number;
  const fixedPos = isVerticalMode ? baseX : baseY;

  const state = line.spans.reduce(
    (acc, span, spanIndex) => {
      if (span.text.length === 0) {
        return acc;
      }

      const key = `p${paragraphIndex}-l${lineIndex}-s${spanIndex}`;
      const x = isVerticalMode ? fixedPos : acc.cursor;
      const y = isVerticalMode ? acc.cursor : fixedPos;
      acc.elements.push(renderSpan(span, x, y, dominantBaseline, key, writingMode));
      // In vertical mode, span.width is the inline extent (height in physical space)
      acc.cursor += (span.width as number) + (span.dx as number);
      return acc;
    },
    { cursor: isVerticalMode ? baseY : baseX, elements: [] as ReactNode[] },
  );

  return state.elements;
}

// =============================================================================
// Bullet Rendering
// =============================================================================

/**
 * Render a bullet (text or image) for a paragraph.
 */
function renderBullet(
  ...args: readonly [
    bullet: BulletConfig,
    bulletX: number,
    bulletY: number,
    key: string,
    writingMode?: WritingMode,
  ]
): ReactNode {
  const [bullet, bulletX, bulletY, key, writingMode = "horizontal-tb"] = args;
  const bulletFontSizePx = fontSizeToPixels(bullet.fontSize);
  const bulletBounds = getTextVisualBounds(bulletY as Pixels, bullet.fontSize, bullet.fontFamily);
  const isVerticalMode = isVertical(writingMode);

  if (bullet.imageUrl !== undefined) {
    const imageSize = bulletFontSizePx as number;
    if (isVerticalMode) {
      return (
        <image
          key={`bullet-${key}`}
          href={bullet.imageUrl}
          x={bulletX}
          y={bulletY}
          width={imageSize}
          height={imageSize}
          preserveAspectRatio="xMidYMid meet"
        />
      );
    }
    return (
      <image
        key={`bullet-${key}`}
        href={bullet.imageUrl}
        x={bulletX}
        y={bulletBounds.topY as number}
        width={imageSize}
        height={imageSize}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  if (isVerticalMode) {
    const bulletStyle: CSSProperties = {
      writingMode,
      textOrientation: "mixed",
    };
    return (
      <text
        key={`bullet-${key}`}
        x={bulletX + (bulletFontSizePx as number)}
        y={bulletY}
        fontSize={`${bulletFontSizePx as number}px`}
        fill={bullet.color}
        fontFamily={bullet.fontFamily}
        dominantBaseline="text-before-edge"
        style={bulletStyle}
      >
        {bullet.char}
      </text>
    );
  }

  return (
    <text
      key={`bullet-${key}`}
      x={bulletX}
      y={bulletY}
      fontSize={`${bulletFontSizePx as number}px`}
      fill={bullet.color}
      fontFamily={bullet.fontFamily}
    >
      {bullet.char}
    </text>
  );
}

// =============================================================================
// Selection Rendering
// =============================================================================

/**
 * Render selection highlight rectangles.
 */
export function renderSelectionRects(
  rects: readonly SelectionRect[],
  selectionColor = "rgba(59, 130, 246, 0.3)",
): ReactNode {
  if (rects.length === 0) {
    return null;
  }

  return (
    <g className="selection-highlights">
      {rects.map((rect, index) => (
        <rect
          key={`sel-${index}`}
          x={rect.x as number}
          y={rect.y as number}
          width={rect.width as number}
          height={rect.height as number}
          fill={selectionColor}
        />
      ))}
    </g>
  );
}

// =============================================================================
// Cursor Rendering
// =============================================================================

/**
 * Render cursor caret.
 */
export function renderCursor(
  coords: CursorCoordinates | undefined,
  cursorColor = "#000000",
  isBlinking = true,
): ReactNode {
  if (coords === undefined) {
    return null;
  }

  const style: CSSProperties = {};
  if (isBlinking) {
    style.animation = "cursor-blink 1s step-end infinite";
  }
  const cursorStyle = toOptionalStyle(style);

  return (
    <line
      className="cursor-caret"
      x1={coords.x as number}
      y1={coords.y as number}
      x2={coords.x as number}
      y2={(coords.y as number) + (coords.height as number)}
      stroke={cursorColor}
      strokeWidth={1}
      style={cursorStyle}
    />
  );
}

// =============================================================================
// Text Overlay Component
// =============================================================================

export type TextOverlayProps = {
  readonly layoutResult: LayoutResult;
  readonly selection?: readonly SelectionRect[];
  readonly cursor?: CursorCoordinates;
  readonly showCursor?: boolean;
};

function getBulletPosition(
  firstLine: LayoutLine,
  bulletWidth: Pixels,
  isVerticalMode: boolean,
): { bulletX: number; bulletY: number } {
  if (isVerticalMode) {
    return {
      bulletX: firstLine.x as number,
      bulletY: (firstLine.y as number) - (bulletWidth as number),
    };
  }
  return {
    bulletX: (firstLine.x as number) - (bulletWidth as number),
    bulletY: firstLine.y as number,
  };
}

/**
 * Renders text from LayoutResult as SVG elements.
 *
 * Supports both horizontal (lrTb) and vertical (tbRl, tbLrV) writing modes
 * as specified in ECMA-376-1:2016 Section 17.18.93.
 */
export function TextOverlay({
  layoutResult,
  selection,
  cursor,
  showCursor = true,
}: TextOverlayProps): ReactNode {
  const elements: ReactNode[] = [];
  const writingMode = layoutResult.writingMode;
  const isVerticalMode = isVertical(writingMode);

  // Render selection first (behind text)
  if (selection !== undefined && selection.length > 0) {
    elements.push(
      <g key="selection">{renderSelectionRects(selection)}</g>,
    );
  }

  // Render paragraphs
  layoutResult.paragraphs.forEach((para, paragraphIndex) => {

    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const firstLine = para.lines[0];

      // Bullet position depends on writing mode:
      // - Horizontal: bullet is to the LEFT of the line (X - bulletWidth)
      // - Vertical: bullet is ABOVE the line (Y - bulletWidth)
      const { bulletX, bulletY } = getBulletPosition(firstLine, para.bulletWidth, isVerticalMode);

      elements.push(renderBullet(para.bullet, bulletX, bulletY, `p${paragraphIndex}`, writingMode));
    }

    // Render lines
    para.lines.forEach((line, lineIndex) => {
      const lineElements = renderLine(line, para.fontAlignment, paragraphIndex, lineIndex, writingMode);
      elements.push(...lineElements);
    });
  });

  // Render cursor last (on top)
  if (showCursor && cursor !== undefined) {
    elements.push(<g key="cursor">{renderCursor(cursor)}</g>);
  }

  return <>{elements}</>;
}

// =============================================================================
// CSS for cursor animation
// =============================================================================

/**
 * CSS string for cursor blinking animation.
 * Include this in a <style> tag or CSS file.
 */
export const CURSOR_ANIMATION_CSS = `
@keyframes cursor-blink {
  0%, 50% { opacity: 1; }
  50.01%, 100% { opacity: 0; }
}
`;
