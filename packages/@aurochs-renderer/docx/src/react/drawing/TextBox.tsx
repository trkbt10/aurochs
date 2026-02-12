/**
 * @file TextBox Component for DOCX Shapes
 *
 * Renders text box content (wps:txbx) within WordprocessingML shapes.
 * Handles paragraph and run content with basic styling.
 *
 * @see ECMA-376 Part 1, Section 20.4.2.24 (txbxContent)
 */

import { memo, useMemo } from "react";
import type { DocxTextBoxContent, DocxBodyProperties } from "@aurochs-office/docx/domain/drawing";
import type { DocxParagraph, DocxParagraphContent } from "@aurochs-office/docx/domain/paragraph";
import type { DocxRun, DocxRunContent } from "@aurochs-office/docx/domain/run";
import { emuToPx } from "@aurochs-office/docx/domain/ecma376-defaults";

// =============================================================================
// Types
// =============================================================================

/**
 * Props for TextBox component.
 */
export type TextBoxProps = {
  /** Text box content */
  readonly content: DocxTextBoxContent;
  /** Body properties (layout constraints) */
  readonly bodyPr?: DocxBodyProperties;
  /** Container width in pixels */
  readonly width: number;
  /** Container height in pixels */
  readonly height: number;
  /** Unique ID prefix for clip paths */
  readonly idPrefix?: string;
};

/**
 * Extracted text span with styling.
 */
type TextSpan = {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly fontSize?: number;
  readonly color?: string;
};

/**
 * Extracted paragraph with text spans.
 */
type ExtractedParagraph = {
  readonly spans: readonly TextSpan[];
  readonly alignment?: "left" | "center" | "right" | "justify";
};

// =============================================================================
// Helpers
// =============================================================================

/**
 * Default insets in EMUs (ECMA-376 default is 91440 EMUs = 0.1 inch).
 */
const DEFAULT_INSET = 91440;

/**
 * Extract text from run content.
 */
function extractTextFromRunContent(content: readonly DocxRunContent[]): string {
  return content
    .map((item) => {
      if (item.type === "text") {
        return item.value;
      }
      if (item.type === "tab") {
        return "\t";
      }
      if (item.type === "break") {
        return "\n";
      }
      return "";
    })
    .join("");
}

/**
 * Extract text spans from paragraph content.
 */
function extractSpansFromParagraph(content: readonly DocxParagraphContent[]): TextSpan[] {
  const spans: TextSpan[] = [];

  for (const item of content) {
    if (item.type === "run") {
      const run = item as DocxRun;
      const text = extractTextFromRunContent(run.content);
      if (text.length > 0) {
        const props = run.properties;
        // Extract color value from DocxColor object
        const colorVal = props?.color?.val;
        spans.push({
          text,
          bold: props?.b,
          italic: props?.i,
          fontSize: props?.sz !== undefined ? (props.sz as number) / 2 : undefined, // half-points to points
          color: colorVal,
        });
      }
    }
  }

  return spans;
}

/**
 * Extract paragraphs from text box content.
 */
function extractParagraphs(content: DocxTextBoxContent): ExtractedParagraph[] {
  return content.content.map((para: DocxParagraph) => ({
    spans: extractSpansFromParagraph(para.content),
    alignment: para.properties?.jc as ExtractedParagraph["alignment"],
  }));
}

/**
 * Convert insets from EMUs to pixels.
 */
function getInsets(bodyPr?: DocxBodyProperties) {
  return {
    left: emuToPx((bodyPr?.lIns ?? DEFAULT_INSET) as number) as number,
    top: emuToPx((bodyPr?.tIns ?? DEFAULT_INSET) as number) as number,
    right: emuToPx((bodyPr?.rIns ?? DEFAULT_INSET) as number) as number,
    bottom: emuToPx((bodyPr?.bIns ?? DEFAULT_INSET) as number) as number,
  };
}

/**
 * Get vertical alignment Y position.
 */
function getVerticalPosition(params: {
  anchor?: DocxBodyProperties["anchor"];
  contentHeight: number;
  containerHeight: number;
  topInset: number;
  bottomInset: number;
}): number {
  const { anchor, contentHeight, containerHeight, topInset, bottomInset } = params;
  const availableHeight = containerHeight - topInset - bottomInset;

  switch (anchor) {
    case "ctr":
      return topInset + (availableHeight - contentHeight) / 2;
    case "b":
      return containerHeight - bottomInset - contentHeight;
    case "t":
    default:
      return topInset;
  }
}

/**
 * SVG text-anchor values.
 */
type SvgTextAnchor = "start" | "middle" | "end" | "inherit";

/**
 * Get text anchor for alignment.
 */
function getTextAnchor(alignment?: ExtractedParagraph["alignment"]): SvgTextAnchor {
  switch (alignment) {
    case "center":
      return "middle";
    case "right":
      return "end";
    default:
      return "start";
  }
}

/**
 * Get X position for alignment.
 */
function getXPosition(alignment: ExtractedParagraph["alignment"] | undefined, left: number, width: number): number {
  switch (alignment) {
    case "center":
      return left + width / 2;
    case "right":
      return left + width;
    default:
      return left;
  }
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders text box content as SVG text elements.
 */
function TextBoxBase({ content, bodyPr, width, height, idPrefix }: TextBoxProps) {
  // Extract paragraphs
  const paragraphs = useMemo(() => extractParagraphs(content), [content]);

  // Compute insets
  const insets = useMemo(() => getInsets(bodyPr), [bodyPr]);

  // Compute text area dimensions
  const textWidth = Math.max(0, width - insets.left - insets.right);

  // Default font size
  const defaultFontSize = 11; // 11pt default
  const lineHeight = 1.2;

  // Compute content height (rough estimate)
  const contentHeight = useMemo(() => {
    return paragraphs.reduce((total, para) => {
      const maxFontSize = para.spans.reduce((max, span) => Math.max(max, span.fontSize ?? defaultFontSize), 0);
      return total + maxFontSize * lineHeight;
    }, 0);
  }, [paragraphs]);

  // Compute starting Y position based on vertical anchor
  const startY = useMemo(
    () =>
      getVerticalPosition({
        anchor: bodyPr?.anchor,
        contentHeight,
        containerHeight: height,
        topInset: insets.top,
        bottomInset: insets.bottom,
      }),
    [bodyPr?.anchor, contentHeight, height, insets.top, insets.bottom],
  );

  // Generate clip ID
  const clipId = `${idPrefix ?? "txbx"}-clip`;

  // Handle vertical text
  const isVertical = bodyPr?.vert !== undefined && bodyPr.vert !== "horz";

  return (
    <g data-element-type="textbox" clipPath={`url(#${clipId})`}>
      {/* Clip path definition */}
      <defs>
        <clipPath id={clipId}>
          <rect x={insets.left} y={insets.top} width={textWidth} height={height - insets.top - insets.bottom} />
        </clipPath>
      </defs>

      {/* Render paragraphs */}
      {paragraphs.map((para, paraIndex) => {
        // Compute Y position by summing heights of preceding paragraphs
        const currentY = paragraphs.slice(0, paraIndex).reduce((y, prevPara) => {
          const maxFontSize = prevPara.spans.reduce((max, span) => Math.max(max, span.fontSize ?? defaultFontSize), 0);
          return y + maxFontSize * lineHeight;
        }, startY);

        const paraMaxFontSize = para.spans.reduce((max, span) => Math.max(max, span.fontSize ?? defaultFontSize), 0);
        const textAnchor = getTextAnchor(para.alignment);
        const xPos = getXPosition(para.alignment, insets.left, textWidth);

        return (
          <text
            key={paraIndex}
            x={xPos}
            y={currentY + paraMaxFontSize * 0.8} // Baseline adjustment
            textAnchor={textAnchor}
            dominantBaseline="auto"
            style={isVertical ? { writingMode: "vertical-rl" } : undefined}
          >
            {para.spans.map((span, spanIndex) => (
              <tspan
                key={spanIndex}
                fontWeight={span.bold === true ? "bold" : undefined}
                fontStyle={span.italic === true ? "italic" : undefined}
                fontSize={span.fontSize ?? defaultFontSize}
                fill={span.color !== undefined ? `#${span.color}` : "#000000"}
              >
                {span.text}
              </tspan>
            ))}
          </text>
        );
      })}
    </g>
  );
}

/**
 * Memoized TextBox component.
 */
export const TextBox = memo(TextBoxBase);
