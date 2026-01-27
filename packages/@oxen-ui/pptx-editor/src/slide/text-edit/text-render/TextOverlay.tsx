/**
 * @file Text Overlay Component
 *
 * Renders text from LayoutResult as SVG elements for visual display.
 * Handles bullets, spans with styling, and IME composition display.
 */

import type { ReactNode } from "react";
import type { Pixels } from "@oxen/ooxml/domain/units";
import type {
  LayoutResult,
  LayoutLine,
  PositionedSpan,
} from "@oxen/pptx-render/text-layout";
import { fontSizeToPixels, getTextVisualBounds } from "./text-geometry";
import {
  applyTextTransform,
  applyVerticalAlign,
  buildFontFamily,
  toSvgDominantBaseline,
  createTextEffectsFilterDef,
} from "@oxen/pptx-render/react";
import type { CompositionState } from "../coordinator/types";

// =============================================================================
// Types
// =============================================================================

export type TextOverlayProps = {
  readonly layoutResult: LayoutResult;
  readonly composition: CompositionState;
  readonly cursorOffset: number;
};

// =============================================================================
// Span Rendering
// =============================================================================

/**
 * Render a single text span with all its styling.
 */
function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  dominantBaseline: string | undefined,
  key: number,
): ReactNode {
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
    if (span.textFill.type === "noFill") {
      textProps.fill = "none";
    } else if (span.textFill.type === "solid") {
      textProps.fill = span.textFill.color;
      if (span.textFill.alpha < 1) {
        textProps.fillOpacity = span.textFill.alpha;
      }
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

  if (span.effects !== undefined) {
    const effectsId = `text-effect-${key}`;
    elements.push(
      <defs key={`defs-${key}`}>
        {createTextEffectsFilterDef(span.effects, effectsId)}
      </defs>,
    );
    textProps.filter = `url(#${effectsId})`;
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
  fontAlignment: LayoutResult["paragraphs"][number]["fontAlignment"],
  startKey: number,
): ReactNode[] {
  const elements: ReactNode[] = [];
  // eslint-disable-next-line no-restricted-syntax -- accumulating position
  let cursorX = line.x as number;
  // eslint-disable-next-line no-restricted-syntax -- key generation
  let key = startKey;
  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  for (const span of line.spans) {
    if (span.text.length === 0) {
      continue;
    }

    const element = renderSpan(span, cursorX, line.y as number, dominantBaseline, key++);
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
  bullet: NonNullable<LayoutResult["paragraphs"][number]["bullet"]>,
  bulletX: number,
  bulletY: number,
  bulletWidth: number,
  key: number,
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
// Text Overlay Component
// =============================================================================

/**
 * Renders text from LayoutResult as SVG elements.
 */
export function TextOverlay({ layoutResult, composition }: TextOverlayProps) {
  const elements: ReactNode[] = [];
  // eslint-disable-next-line no-restricted-syntax -- key generation
  let key = 0;

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const firstLine = para.lines[0];
      const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
      const bulletY = firstLine.y as number;

      elements.push(
        renderBullet(para.bullet, bulletX, bulletY, para.bulletWidth as number, key++),
      );
    }

    // Render lines
    for (const line of para.lines) {
      const lineElements = renderLine(line, para.fontAlignment, key);
      elements.push(...lineElements);
      key += line.spans.length + 1;
    }
  }

  // Render IME composition underline
  if (composition.isComposing && composition.text) {
    // TODO: Calculate composition underline position
    // For now, composition text is included in currentText via textarea
  }

  return <>{elements}</>;
}
