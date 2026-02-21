/**
 * @file Common types for content extraction
 *
 * Shared types for extracting text segments from OOXML documents.
 * Used by PPTX, DOCX, and XLSX extraction APIs.
 */

/**
 * Type of content segment.
 *
 * - slide: PPTX slide
 * - paragraph: DOCX paragraph
 * - heading: DOCX heading (paragraph with outline level)
 * - cell: XLSX cell
 * - sheet: XLSX worksheet
 * - table: DOCX/XLSX table
 */
export type SegmentType = "slide" | "paragraph" | "heading" | "cell" | "sheet" | "table";

/**
 * A logical unit of content extracted from a document.
 *
 * @template T - The segment type
 */
export type ContentSegment<T extends SegmentType = SegmentType> = {
  /** Unique identifier for this segment within the document */
  readonly id: string;
  /** Plain text content of this segment */
  readonly text: string;
  /** Type of segment */
  readonly type: T;
  /** Position in the source document (character offsets) */
  readonly sourceRange: {
    readonly start: number;
    readonly end: number;
  };
  /** Format-specific metadata */
  readonly metadata: Record<string, unknown>;
};

/**
 * Result of content extraction from a document.
 *
 * @template T - The segment type(s) in this result
 */
export type ExtractionResult<T extends SegmentType = SegmentType> = {
  /** Extracted segments in document order */
  readonly segments: readonly ContentSegment<T>[];
  /** All text concatenated (segments joined with newlines) */
  readonly totalText: string;
  /** Total character count in original document */
  readonly sourceLength: number;
};
