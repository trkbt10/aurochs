/**
 * @file SVG Text Renderer
 *
 * Renders layout results as SVG elements.
 * Shared implementation for PPTX and DOCX text rendering.
 */

import type { ReactNode, CSSProperties } from "react";
import type { Pixels, Points } from "../../ooxml/domain/units";
import type {
  LayoutResult,
  LayoutLine,
  PositionedSpan,
  BulletConfig,
  FontAlignment,
  SelectionRect,
  CursorCoordinates,
} from "../types";
import { PT_TO_PX } from "../measurer";
import { getAscenderRatio } from "../../text/font-metrics";

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

// =============================================================================
// Span Rendering
// =============================================================================

/**
 * Render an inline image span.
 */
function renderInlineImage(
  span: PositionedSpan,
  x: number,
  lineY: number,
  key: string,
): ReactNode {
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
 */
function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  dominantBaseline: string | undefined,
  key: string,
): ReactNode {
  // Handle inline images
  if (span.inlineImage !== undefined) {
    return renderInlineImage(span, x, lineY, key);
  }

  const fontSizePx = fontSizeToPixels(span.fontSize);
  const bounds = getTextVisualBounds(lineY as Pixels, span.fontSize, span.fontFamily);
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
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

  // Build text props
  const textProps: Record<string, string | number | undefined> = {
    x,
    y: applyVerticalAlign(lineY, fontSizePx as number, span.verticalAlign),
    fontSize: `${fontSizePx as number}px`,
    fontFamily: buildFontFamily(span),
    dominantBaseline,
    xmlSpace: "preserve",
  };

  // Handle fill
  if (span.textFill !== undefined) {
    if (span.textFill.type === "solid") {
      textProps.fill = span.textFill.color;
    }
  } else {
    textProps.fill = span.color;
  }

  // Font styling
  if (span.fontWeight !== 400) {
    textProps.fontWeight = span.fontWeight;
  }
  if (span.fontStyle !== "normal") {
    textProps.fontStyle = span.fontStyle;
  }
  if (span.textDecoration !== undefined) {
    textProps.textDecoration = span.textDecoration;
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

  elements.push(
    <text key={`text-${key}`} {...textProps}>
      {textContent}
    </text>,
  );

  return <g key={`span-${key}`}>{elements}</g>;
}

// =============================================================================
// Line Rendering
// =============================================================================

/**
 * Render a line of text with all its spans.
 */
function renderLine(
  line: LayoutLine,
  fontAlignment: FontAlignment,
  paragraphIndex: number,
  lineIndex: number,
): ReactNode[] {
  const elements: ReactNode[] = [];
  let cursorX = line.x as number;
  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  for (let spanIndex = 0; spanIndex < line.spans.length; spanIndex++) {
    const span = line.spans[spanIndex];
    if (span.text.length === 0) {
      continue;
    }

    const key = `p${paragraphIndex}-l${lineIndex}-s${spanIndex}`;
    const element = renderSpan(span, cursorX, line.y as number, dominantBaseline, key);
    elements.push(element);
    cursorX += (span.width as number) + (span.dx as number);
  }

  return elements;
}

// =============================================================================
// Bullet Rendering
// =============================================================================

/**
 * Render a bullet (text or image) for a paragraph.
 */
function renderBullet(
  bullet: BulletConfig,
  bulletX: number,
  bulletY: number,
  key: string,
): ReactNode {
  const bulletFontSizePx = fontSizeToPixels(bullet.fontSize);
  const bulletBounds = getTextVisualBounds(bulletY as Pixels, bullet.fontSize, bullet.fontFamily);

  if (bullet.imageUrl !== undefined) {
    const imageSize = bulletFontSizePx as number;
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

  const style: CSSProperties = isBlinking
    ? { animation: "cursor-blink 1s step-end infinite" }
    : {};

  return (
    <line
      className="cursor-caret"
      x1={coords.x as number}
      y1={coords.y as number}
      x2={coords.x as number}
      y2={(coords.y as number) + (coords.height as number)}
      stroke={cursorColor}
      strokeWidth={1}
      style={style}
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

/**
 * Renders text from LayoutResult as SVG elements.
 */
export function TextOverlay({
  layoutResult,
  selection,
  cursor,
  showCursor = true,
}: TextOverlayProps): ReactNode {
  const elements: ReactNode[] = [];

  // Render selection first (behind text)
  if (selection !== undefined && selection.length > 0) {
    elements.push(
      <g key="selection">{renderSelectionRects(selection)}</g>,
    );
  }

  // Render paragraphs
  for (let paragraphIndex = 0; paragraphIndex < layoutResult.paragraphs.length; paragraphIndex++) {
    const para = layoutResult.paragraphs[paragraphIndex];

    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const firstLine = para.lines[0];
      const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
      const bulletY = firstLine.y as number;

      elements.push(renderBullet(para.bullet, bulletX, bulletY, `p${paragraphIndex}`));
    }

    // Render lines
    for (let lineIndex = 0; lineIndex < para.lines.length; lineIndex++) {
      const line = para.lines[lineIndex];
      const lineElements = renderLine(line, para.fontAlignment, paragraphIndex, lineIndex);
      elements.push(...lineElements);
    }
  }

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
