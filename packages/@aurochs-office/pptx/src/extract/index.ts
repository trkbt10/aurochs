/**
 * @file High-level content extraction API for PPTX
 *
 * Provides structured extraction of text content from presentations.
 */

import type { ContentSegment, ExtractionResult } from "@aurochs-office/ooxml";
import type { Presentation } from "../app/types";
import type { Shape, PlaceholderType } from "../domain/shape";
import { parseSlide } from "../parser/slide/slide-parser";
import { extractTextFromShape } from "../domain/text-utils";

/**
 * Slide segment with PPTX-specific metadata.
 */
export type SlideSegment = ContentSegment<"slide"> & {
  readonly metadata: {
    /** 1-based slide number */
    readonly slideNumber: number;
    /** Title extracted from title placeholder, if present */
    readonly slideTitle?: string;
    /** Number of shapes with text on this slide */
    readonly shapeCount: number;
  };
};

/**
 * Result of slide extraction.
 */
export type SlideExtractionResult = ExtractionResult<"slide"> & {
  readonly segments: readonly SlideSegment[];
};

/**
 * Title placeholder types.
 */
const TITLE_PLACEHOLDERS: readonly PlaceholderType[] = ["title", "ctrTitle"];

/**
 * Check if a shape is a title placeholder.
 */
function isTitleShape(shape: Shape): boolean {
  if (shape.type !== "sp") {
    return false;
  }
  const placeholderType = shape.placeholder?.type;
  return placeholderType !== undefined && TITLE_PLACEHOLDERS.includes(placeholderType);
}

/**
 * Extract title from shapes.
 */
function extractSlideTitle(shapes: readonly Shape[]): string | undefined {
  for (const shape of shapes) {
    if (isTitleShape(shape)) {
      const text = extractTextFromShape(shape).trim();
      if (text) {
        return text;
      }
    }
    // Check group shapes recursively
    if (shape.type === "grpSp") {
      const title = extractSlideTitle(shape.children);
      if (title) {
        return title;
      }
    }
  }
  return undefined;
}

/**
 * Collect all text from shapes.
 */
function collectAllText(shapes: readonly Shape[]): { texts: readonly string[]; shapeCount: number } {
  return shapes.reduce<{ texts: readonly string[]; shapeCount: number }>(
    (acc, shape) => {
      const text = extractTextFromShape(shape).trim();
      const childResult = shape.type === "grpSp" ? collectAllText(shape.children) : { texts: [], shapeCount: 0 };

      return {
        texts: [...acc.texts, ...(text ? [text] : []), ...childResult.texts],
        shapeCount: acc.shapeCount + (text ? 1 : 0) + childResult.shapeCount,
      };
    },
    { texts: [], shapeCount: 0 }
  );
}

/**
 * Extract content segments from a presentation.
 *
 * Returns one segment per slide containing the slide's text content.
 *
 * @example
 * ```typescript
 * import { openPresentation } from "aurochs/pptx/parser";
 * import { extractSlideSegments } from "aurochs/pptx/extract";
 *
 * const presentation = openPresentation(pptxFile);
 * const result = extractSlideSegments(presentation);
 *
 * for (const segment of result.segments) {
 *   console.log(`Slide ${segment.metadata.slideNumber}: ${segment.text}`);
 *   if (segment.metadata.slideTitle) {
 *     console.log(`  Title: ${segment.metadata.slideTitle}`);
 *   }
 * }
 * ```
 */
export function extractSlideSegments(presentation: Presentation): SlideExtractionResult {
  const slidesArray = Array.from(presentation.slides());

  const { segments } = slidesArray.reduce<{ segments: SlideSegment[]; offset: number }>(
    (acc, apiSlide) => {
      // Parse slide content to get domain shapes
      const domainSlide = parseSlide(apiSlide.content);
      const shapes = domainSlide?.shapes ?? [];

      // Extract title from title placeholder
      const slideTitle = extractSlideTitle(shapes);

      // Collect all text from shapes
      const { texts, shapeCount } = collectAllText(shapes);
      const text = texts.join("\n");

      const start = acc.offset;
      const end = acc.offset + text.length;

      return {
        segments: [
          ...acc.segments,
          {
            id: `slide-${apiSlide.number}`,
            type: "slide" as const,
            text,
            sourceRange: { start, end },
            metadata: {
              slideNumber: apiSlide.number,
              slideTitle,
              shapeCount,
            },
          },
        ],
        offset: end + 1, // +1 for segment separator
      };
    },
    { segments: [], offset: 0 }
  );

  const totalText = segments.map((s) => s.text).join("\n");

  return {
    segments,
    totalText,
    sourceLength: totalText.length,
  };
}
