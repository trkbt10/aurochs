/**
 * @file Text span and line rendering
 *
 * Renders individual text spans with styling and effects.
 *
 * @see ECMA-376 Part 1, Section 21.1.2.3 (Text Run Properties)
 */

import type { ReactNode } from "react";
import type { LayoutLine, PositionedSpan } from "../../../text-layout";
import { PT_TO_PX } from "../../../../domain/unit-conversion";
import {
  createTextGradientDef,
  createTextPatternDef,
  createTextImageFillDef,
  createTextEffectsFilterDef,
} from "../../drawing-ml";
import {
  buildFontFamily,
  applyTextTransform,
  applyVerticalAlign,
  toSvgDominantBaseline,
} from "./text-utils";

// =============================================================================
// Types
// =============================================================================

/**
 * SVG defs management functions
 */
type DefsManager = {
  readonly getNextId: (prefix: string) => string;
  readonly addDef: (id: string, content: ReactNode) => void;
  readonly hasDef: (id: string) => boolean;
};

/**
 * Text element SVG props
 */
type TextProps = Record<string, string | number | undefined>;

// =============================================================================
// Constants
// =============================================================================

/**
 * Highlight background offset factor
 */
const HIGHLIGHT_OFFSET_FACTOR = 0.8;

// =============================================================================
// Fill Handling
// =============================================================================

/**
 * Apply text fill to SVG props.
 *
 * Handles: solid, gradient, pattern, image, noFill
 */
function applyTextFill(
  props: TextProps,
  span: PositionedSpan,
  defs: DefsManager,
): void {
  if (span.textFill === undefined) {
    props.fill = span.color;
    return;
  }

  switch (span.textFill.type) {
    case "gradient": {
      const gradId = defs.getNextId("text-grad");
      if (!defs.hasDef(gradId)) {
        defs.addDef(gradId, createTextGradientDef(span.textFill, gradId));
      }
      props.fill = `url(#${gradId})`;
      break;
    }
    case "pattern": {
      const patternId = defs.getNextId("text-patt");
      if (!defs.hasDef(patternId)) {
        defs.addDef(patternId, createTextPatternDef(span.textFill, patternId));
      }
      props.fill = `url(#${patternId})`;
      break;
    }
    case "image": {
      const imageId = defs.getNextId("text-img");
      if (!defs.hasDef(imageId)) {
        defs.addDef(imageId, createTextImageFillDef(span.textFill, imageId));
      }
      props.fill = `url(#${imageId})`;
      break;
    }
    case "noFill":
      props.fill = "none";
      break;
    case "solid":
      props.fill = span.textFill.color;
      if (span.textFill.alpha < 1) {
        props.fillOpacity = span.textFill.alpha;
      }
      break;
  }
}

/**
 * Apply font styling to SVG props.
 */
function applyFontStyling(props: TextProps, span: PositionedSpan): void {
  if (span.fontWeight !== 400) {
    props.fontWeight = span.fontWeight;
  }
  if (span.fontStyle !== "normal") {
    props.fontStyle = span.fontStyle;
  }
  if (span.textDecoration !== undefined) {
    props.textDecoration = span.textDecoration;
  }
}

/**
 * Apply letter spacing and kerning to SVG props.
 */
function applySpacing(props: TextProps, span: PositionedSpan): void {
  if (span.letterSpacing !== undefined && (span.letterSpacing as number) !== 0) {
    props.letterSpacing = `${span.letterSpacing}px`;
  }

  if (span.kerning !== undefined) {
    const fontSize = span.fontSize as number;
    props.fontKerning = fontSize >= (span.kerning as number) ? "normal" : "none";
  }
}

/**
 * Apply RTL direction to SVG props.
 */
function applyDirection(props: TextProps, span: PositionedSpan): void {
  if (span.direction === "rtl") {
    props.direction = "rtl";
    props.unicodeBidi = "bidi-override";
  }
}

/**
 * Apply text outline (stroke) to SVG props.
 */
function applyTextOutline(props: TextProps, span: PositionedSpan): void {
  if (span.textOutline === undefined) {
    return;
  }

  props.stroke = span.textOutline.color;
  props.strokeWidth = span.textOutline.width;
  props.strokeLinecap = span.textOutline.cap;
  props.strokeLinejoin = span.textOutline.join;
  props.paintOrder = "stroke fill";
}

// =============================================================================
// Span Rendering
// =============================================================================

/**
 * Render highlight background for span.
 */
function renderHighlight(
  x: number,
  lineY: number,
  fontSizePx: number,
  spanWidth: number,
  highlightColor: string,
  key: number,
): ReactNode {
  return (
    <rect
      key={`highlight-${key}`}
      x={x}
      y={lineY - fontSizePx * HIGHLIGHT_OFFSET_FACTOR}
      width={spanWidth}
      height={fontSizePx}
      fill={highlightColor}
    />
  );
}

/**
 * Wrap text element with link if present.
 */
function wrapWithLink(
  textElement: ReactNode,
  span: PositionedSpan,
  key: number,
): ReactNode {
  if (!span.linkId) {
    return textElement;
  }

  return (
    <g
      key={`link-${key}`}
      style={{ cursor: "pointer" }}
      data-link-id={span.linkId}
    >
      {span.linkTooltip && <title>{span.linkTooltip}</title>}
      {textElement}
    </g>
  );
}

/**
 * Render a single text span.
 *
 * @param span - Positioned span data
 * @param x - X coordinate
 * @param lineY - Line Y coordinate
 * @param dominantBaseline - SVG dominant-baseline value
 * @param key - React key
 * @param defs - SVG defs manager
 * @returns React elements for the span
 */
export function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  dominantBaseline: string | undefined,
  key: number,
  defs: DefsManager,
): ReactNode {
  const fontSizePx = (span.fontSize as number) * PT_TO_PX;
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
    elements.push(
      renderHighlight(x, lineY, fontSizePx, span.width as number, span.highlightColor, key),
    );
  }

  // Build text props
  const textProps: TextProps = {
    x,
    y: applyVerticalAlign(lineY, fontSizePx, span.verticalAlign),
    fontSize: `${fontSizePx}px`,
    fontFamily: buildFontFamily(span),
    dominantBaseline,
  };

  // Apply all styling
  applyTextFill(textProps, span, defs);
  applyFontStyling(textProps, span);
  applySpacing(textProps, span);
  applyDirection(textProps, span);
  applyTextOutline(textProps, span);

  // Handle text effects
  const effectsFilterUrl = getEffectsFilterUrl(span, defs);

  // Apply text transform
  const textContent = applyTextTransform(span.text, span.textTransform);

  // Create text element
  const textElement = (
    <text
      key={`text-${key}`}
      {...textProps}
      filter={effectsFilterUrl}
    >
      {textContent}
    </text>
  );

  // Wrap with link if needed
  elements.push(wrapWithLink(textElement, span, key));

  return <>{elements}</>;
}

/**
 * Get effects filter URL if effects are present.
 */
function getEffectsFilterUrl(span: PositionedSpan, defs: DefsManager): string | undefined {
  if (span.effects === undefined) {
    return undefined;
  }

  const effectsId = defs.getNextId("text-effect");
  if (!defs.hasDef(effectsId)) {
    defs.addDef(effectsId, createTextEffectsFilterDef(span.effects, effectsId));
  }
  return `url(#${effectsId})`;
}

// =============================================================================
// Line Rendering
// =============================================================================

/**
 * Render a text line with all its spans.
 *
 * @param line - Layout line data
 * @param fontAlignment - Font alignment for dominant-baseline
 * @param startKey - Starting React key
 * @param defs - SVG defs manager
 * @returns Array of React elements for the line
 */
export function renderLine(
  line: LayoutLine,
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
  startKey: number,
  defs: DefsManager,
): ReactNode[] {
  const elements: ReactNode[] = [];
  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  // Use reduce pattern to track cursor position (Rule 3 - avoid reassignment)
  const lineY = line.y as number;

  line.spans.reduce(
    (cursorX, span, index) => {
      if (span.text.length === 0) {
        return cursorX;
      }

      const key = startKey + index;
      const spanElement = renderSpan(span, cursorX, lineY, dominantBaseline, key, defs);
      elements.push(spanElement);

      return cursorX + (span.width as number) + (span.dx as number);
    },
    line.x as number,
  );

  return elements;
}
