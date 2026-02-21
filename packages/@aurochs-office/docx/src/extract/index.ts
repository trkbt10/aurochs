/**
 * @file High-level content extraction API for DOCX
 *
 * Provides structured extraction of text content from Word documents.
 */

import type { ContentSegment, ExtractionResult } from "@aurochs-office/ooxml";
import type { DocxDocument, DocxBlockContent } from "../domain/document";
import type { DocxParagraph } from "../domain/paragraph";
import type { DocxTable } from "../domain/table";
import {
  extractTextFromParagraph,
  extractTextFromBlockContent,
} from "../domain/text-utils";

/**
 * DOCX segment types.
 */
export type DocxSegmentType = "paragraph" | "heading" | "table";

/**
 * DOCX segment with document-specific metadata.
 */
export type DocxSegment = ContentSegment<DocxSegmentType> & {
  readonly metadata: {
    /** Style ID applied to this content */
    readonly styleId?: string;
    /** Outline level (0-9) for headings */
    readonly outlineLevel?: number;
    /** Number of rows (for tables) */
    readonly rowCount?: number;
    /** Number of cells (for tables) */
    readonly cellCount?: number;
  };
};

/**
 * Result of DOCX content extraction.
 */
export type DocxExtractionResult = ExtractionResult<DocxSegmentType> & {
  readonly segments: readonly DocxSegment[];
};

/**
 * Check if a paragraph is a heading based on its outline level.
 */
function isHeading(paragraph: DocxParagraph): boolean {
  return paragraph.properties?.outlineLvl !== undefined;
}

/**
 * Count total cells in a table.
 */
function countCells(table: DocxTable): number {
  return table.rows.reduce((sum, row) => sum + row.cells.length, 0);
}

/**
 * Extract a segment from a block content item.
 */
function extractSegmentFromBlock(
  content: DocxBlockContent,
  index: number,
  offset: number
): DocxSegment | null {
  if (content.type === "paragraph") {
    const text = extractTextFromParagraph(content);
    if (!text.trim()) {
      return null;
    }

    const heading = isHeading(content);
    const type: DocxSegmentType = heading ? "heading" : "paragraph";

    return {
      id: `${type}-${index}`,
      type,
      text,
      sourceRange: { start: offset, end: offset + text.length },
      metadata: {
        styleId: content.properties?.pStyle,
        outlineLevel: content.properties?.outlineLvl,
      },
    };
  }

  if (content.type === "table") {
    const text = extractTextFromBlockContent(content);
    if (!text.trim()) {
      return null;
    }

    return {
      id: `table-${index}`,
      type: "table",
      text,
      sourceRange: { start: offset, end: offset + text.length },
      metadata: {
        rowCount: content.rows.length,
        cellCount: countCells(content),
      },
    };
  }

  // Skip section breaks
  return null;
}

/**
 * Extract content segments from a DOCX document.
 *
 * Returns segments for paragraphs, headings, and tables in document order.
 * Empty paragraphs are skipped.
 *
 * @example
 * ```typescript
 * import { loadDocx } from "aurochs/docx/parser";
 * import { extractDocxSegments } from "aurochs/docx/extract";
 *
 * const doc = await loadDocx(docxBuffer);
 * const result = extractDocxSegments(doc);
 *
 * for (const segment of result.segments) {
 *   if (segment.type === "heading") {
 *     console.log(`## ${segment.text} (Level ${(segment.metadata.outlineLevel ?? 0) + 1})`);
 *   } else if (segment.type === "paragraph") {
 *     console.log(segment.text);
 *   } else if (segment.type === "table") {
 *     console.log(`[Table: ${segment.metadata.rowCount} rows]`);
 *   }
 * }
 * ```
 */
export function extractDocxSegments(doc: DocxDocument): DocxExtractionResult {
  const { segments } = doc.body.content.reduce<{ segments: DocxSegment[]; offset: number }>(
    (acc, content, index) => {
      const segment = extractSegmentFromBlock(content, index, acc.offset);

      if (segment) {
        return {
          segments: [...acc.segments, segment],
          offset: segment.sourceRange.end + 1, // +1 for segment separator
        };
      }
      return acc;
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
