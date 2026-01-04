/**
 * @file Text Rendering Primitives for React SVG Renderer
 *
 * Renders text content using the text-layout engine
 * and outputs React SVG elements.
 *
 * @see ECMA-376 Part 1, Section 21.1.2 (DrawingML - Text)
 */

import type { ReactNode } from "react";
import type { TextBody } from "../../../domain/text";
import type { LayoutResult, LayoutLine, PositionedSpan, LayoutParagraphResult } from "../../text-layout";
import { layoutTextBody, toLayoutInput } from "../../text-layout";
import { px, deg } from "../../../domain/types";
import { PT_TO_PX } from "../../../core/units/conversion";
import { useRenderContext } from "../context";
import { useSvgDefs } from "../hooks/useSvgDefs";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TextRenderer
 */
export type TextRendererProps = {
  /** Text body to render */
  readonly textBody: TextBody;
  /** Box width in pixels */
  readonly width: number;
  /** Box height in pixels */
  readonly height: number;
};

// =============================================================================
// Main Component
// =============================================================================

/**
 * Renders text content as React SVG elements.
 */
export function TextRenderer({ textBody, width, height }: TextRendererProps) {
  const { colorContext, fontScheme, options, resources } = useRenderContext();
  const { getNextId, addDef, hasDef } = useSvgDefs();

  if (textBody.paragraphs.length === 0) {
    return null;
  }

  // Convert TextBody to layout input
  const resourceResolver = (resourceId: string) => resources.resolve(resourceId);
  const layoutInput = toLayoutInput({
    body: textBody,
    width: px(width),
    height: px(height),
    colorContext,
    fontScheme,
    renderOptions: options,
    resourceResolver,
  });

  // Run the layout engine
  const layoutResult = layoutTextBody(layoutInput);

  // Render layout result
  const content = renderLayoutResult(layoutResult, getNextId, addDef, hasDef);

  // Get body rotation
  const bodyRotation = textBody.bodyProperties.rotation ?? deg(0);

  // Apply body rotation
  let wrappedContent = content;
  if (bodyRotation !== 0) {
    const centerX = width / 2;
    const centerY = height / 2;
    wrappedContent = (
      <g transform={`rotate(${bodyRotation}, ${centerX}, ${centerY})`}>
        {content}
      </g>
    );
  }

  // Apply overflow clip
  const horzOverflow = textBody.bodyProperties.overflow;
  const vertOverflow = textBody.bodyProperties.verticalOverflow ?? "overflow";
  if (horzOverflow === "clip" || vertOverflow === "clip") {
    const clipId = getNextId("text-clip");
    if (!hasDef(clipId)) {
      addDef(
        clipId,
        <clipPath id={clipId}>
          <rect x={0} y={0} width={width} height={height} />
        </clipPath>,
      );
    }
    wrappedContent = (
      <g clipPath={`url(#${clipId})`}>{wrappedContent}</g>
    );
  }

  // Apply force anti-alias
  if (textBody.bodyProperties.forceAntiAlias === true) {
    wrappedContent = (
      <g textRendering="geometricPrecision">{wrappedContent}</g>
    );
  }

  // Apply upright text
  const vertType = textBody.bodyProperties.verticalType;
  if (textBody.bodyProperties.upright === true && vertType !== "horz") {
    wrappedContent = (
      <g style={{ textOrientation: "upright", writingMode: "vertical-rl" }}>
        {wrappedContent}
      </g>
    );
  }

  return <>{wrappedContent}</>;
}

// =============================================================================
// Layout Result Rendering
// =============================================================================

/**
 * Render layout result to React elements
 */
function renderLayoutResult(
  layoutResult: LayoutResult,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode {
  const elements: ReactNode[] = [];
  let key = 0;

  for (const para of layoutResult.paragraphs) {
    // Render bullet if present
    if (para.bullet !== undefined && para.lines.length > 0) {
      const bulletElement = renderBullet(para, key++);
      if (bulletElement) {
        elements.push(bulletElement);
      }
    }

    // Render each line
    for (const line of para.lines) {
      const lineElements = renderLine(line, para.fontAlignment, key, getNextId, addDef, hasDef);
      elements.push(...lineElements);
      key += line.spans.length + 1;
    }
  }

  return <>{elements}</>;
}

/**
 * Render bullet
 */
function renderBullet(para: LayoutParagraphResult, key: number): ReactNode {
  if (para.bullet === undefined || para.lines.length === 0) {
    return null;
  }

  const firstLine = para.lines[0];
  const bulletX = (firstLine.x as number) - (para.bulletWidth as number);
  const bulletY = firstLine.y as number;
  const bulletFontSize = (para.bullet.fontSize as number) * PT_TO_PX;

  // Picture bullet
  if (para.bullet.imageUrl !== undefined) {
    const imageSize = bulletFontSize;
    const imageY = bulletY - imageSize * 0.8;
    return (
      <image
        key={`bullet-${key}`}
        href={para.bullet.imageUrl}
        x={bulletX}
        y={imageY}
        width={imageSize}
        height={imageSize}
        preserveAspectRatio="xMidYMid meet"
      />
    );
  }

  // Character bullet
  return (
    <text
      key={`bullet-${key}`}
      x={bulletX}
      y={bulletY}
      fontSize={`${bulletFontSize}px`}
      fill={para.bullet.color}
      fontFamily={para.bullet.fontFamily}
    >
      {para.bullet.char}
    </text>
  );
}

/**
 * Render a line to React elements
 */
function renderLine(
  line: LayoutLine,
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
  startKey: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode[] {
  const elements: ReactNode[] = [];
  let cursorX = line.x as number;
  let key = startKey;

  const dominantBaseline = toSvgDominantBaseline(fontAlignment);

  for (const span of line.spans) {
    if (span.text.length === 0) {
      continue;
    }

    const spanElement = renderSpan(
      span,
      cursorX,
      line.y as number,
      dominantBaseline,
      key++,
      getNextId,
      addDef,
      hasDef,
    );
    elements.push(spanElement);

    cursorX += (span.width as number) + (span.dx as number);
  }

  return elements;
}

/**
 * Render a single span
 */
function renderSpan(
  span: PositionedSpan,
  x: number,
  lineY: number,
  dominantBaseline: string | undefined,
  key: number,
  getNextId: (prefix: string) => string,
  addDef: (id: string, content: ReactNode) => void,
  hasDef: (id: string) => boolean,
): ReactNode {
  const fontSizePx = (span.fontSize as number) * PT_TO_PX;
  const elements: ReactNode[] = [];

  // Handle highlight background
  if (span.highlightColor !== undefined) {
    const spanWidth = span.width as number;
    elements.push(
      <rect
        key={`highlight-${key}`}
        x={x}
        y={lineY - fontSizePx * 0.8}
        width={spanWidth}
        height={fontSizePx}
        fill={span.highlightColor}
      />,
    );
  }

  // Build text props
  const textProps: Record<string, string | number | undefined> = {
    x,
    y: applyVerticalAlign(lineY, fontSizePx, span.verticalAlign),
    fontSize: `${fontSizePx}px`,
    fontFamily: buildFontFamily(span),
    dominantBaseline,
  };

  // Handle fill
  if (span.textFill !== undefined) {
    if (span.textFill.type === "gradient") {
      const gradId = getNextId("text-grad");
      if (!hasDef(gradId)) {
        addDef(gradId, createTextGradientDef(span.textFill, gradId));
      }
      textProps.fill = `url(#${gradId})`;
    } else if (span.textFill.type === "noFill") {
      textProps.fill = "none";
    } else {
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

  // Letter spacing
  if (span.letterSpacing !== undefined && (span.letterSpacing as number) !== 0) {
    textProps.letterSpacing = `${span.letterSpacing}px`;
  }

  // Kerning
  if (span.kerning !== undefined) {
    const fontSize = span.fontSize as number;
    textProps.fontKerning = fontSize >= (span.kerning as number) ? "normal" : "none";
  }

  // Direction
  if (span.direction === "rtl") {
    textProps.direction = "rtl";
    textProps.unicodeBidi = "bidi-override";
  }

  // Text outline
  if (span.textOutline !== undefined) {
    textProps.stroke = span.textOutline.color;
    textProps.strokeWidth = span.textOutline.width;
    textProps.strokeLinecap = span.textOutline.cap;
    textProps.strokeLinejoin = span.textOutline.join;
    textProps.paintOrder = "stroke fill";
  }

  // Apply text transform
  const textContent = applyTextTransform(span.text, span.textTransform);

  // Create text element
  const textElement = (
    <text key={`text-${key}`} {...textProps}>
      {textContent}
    </text>
  );

  // Wrap with link if needed
  if (span.linkId) {
    elements.push(
      <g
        key={`link-${key}`}
        style={{ cursor: "pointer" }}
        data-link-id={span.linkId}
      >
        {span.linkTooltip && <title>{span.linkTooltip}</title>}
        {textElement}
      </g>,
    );
  } else {
    elements.push(textElement);
  }

  return <>{elements}</>;
}

// =============================================================================
// Utility Functions
// =============================================================================

function toSvgDominantBaseline(
  fontAlignment: "auto" | "top" | "center" | "base" | "bottom",
): string | undefined {
  switch (fontAlignment) {
    case "top":
      return "text-top";
    case "center":
      return "central";
    case "bottom":
      return "text-bottom";
    case "auto":
    case "base":
    default:
      return undefined;
  }
}

function buildFontFamily(span: PositionedSpan): string {
  const families = [span.fontFamily];
  if (span.fontFamilyEastAsian !== undefined) {
    families.push(span.fontFamilyEastAsian);
  }
  if (span.fontFamilyComplexScript !== undefined && span.fontFamilyComplexScript !== span.fontFamily) {
    families.push(span.fontFamilyComplexScript);
  }
  if (span.fontFamilySymbol !== undefined && span.fontFamilySymbol !== span.fontFamily) {
    families.push(span.fontFamilySymbol);
  }
  return families.join(", ");
}

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

function applyVerticalAlign(
  lineY: number,
  fontSizePx: number,
  verticalAlign: "baseline" | "superscript" | "subscript",
): number {
  if (verticalAlign === "superscript") {
    return lineY - fontSizePx * 0.3;
  }
  if (verticalAlign === "subscript") {
    return lineY + fontSizePx * 0.3;
  }
  return lineY;
}

type TextGradientFill = {
  type: "gradient";
  stops: ReadonlyArray<{ color: string; position: number; alpha: number }>;
  angle: number;
};

function createTextGradientDef(fill: TextGradientFill, id: string): ReactNode {
  const stops = fill.stops.map((stop, index) => (
    <stop
      key={index}
      offset={`${stop.position}%`}
      stopColor={stop.color}
      stopOpacity={stop.alpha < 1 ? stop.alpha : undefined}
    />
  ));

  // Convert angle to SVG coordinates
  const rad = ((fill.angle - 90) * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(rad);
  const y1 = 50 - 50 * Math.sin(rad);
  const x2 = 50 + 50 * Math.cos(rad);
  const y2 = 50 + 50 * Math.sin(rad);

  return (
    <linearGradient
      id={id}
      x1={`${x1}%`}
      y1={`${y1}%`}
      x2={`${x2}%`}
      y2={`${y2}%`}
    >
      {stops}
    </linearGradient>
  );
}
