/**
 * @file Types for PDF Mermaid rendering
 *
 * Represents extracted text elements from PDF pages in a format suitable for
 * Markdown rendering. Coordinates use the PDF coordinate system (bottom-left origin,
 * Y increases upward).
 */

export type MermaidPdfTextItem = {
  /** Decoded Unicode text. */
  readonly text: string;
  /** X coordinate of left edge in PDF points. */
  readonly x: number;
  /** Y coordinate of bottom edge in PDF points (bottom-left origin). */
  readonly y: number;
  /** Bounding box width in PDF points. */
  readonly width: number;
  /** Bounding box height in PDF points. */
  readonly height: number;
  /** Font size in PDF points. */
  readonly fontSize: number;
  /** Whether the text is bold. */
  readonly isBold?: boolean;
  /** Whether the text is italic. */
  readonly isItalic?: boolean;
};

export type MermaidPdfPage = {
  /** 1-indexed page number. */
  readonly pageNumber: number;
  /** Page width in PDF points. */
  readonly width: number;
  /** Page height in PDF points. */
  readonly height: number;
  /** Text items on this page, in document order. */
  readonly textItems: readonly MermaidPdfTextItem[];
};

export type PdfMermaidParams = {
  readonly pages: readonly MermaidPdfPage[];
};
