/**
 * @file DOCX Editor Clipboard State
 *
 * Manages clipboard content for copy/cut/paste operations.
 */

import type { DocxParagraph, DocxParagraphContent } from "@oxen/docx/domain/paragraph";
import type { DocxTable, DocxTableRow, DocxTableCell } from "@oxen/docx/domain/table";
import type { DocxRun, DocxRunContent } from "@oxen/docx/domain/run";

// =============================================================================
// Types
// =============================================================================

/**
 * Clipboard content containing paragraphs.
 */
export type ParagraphClipboardContent = {
  readonly type: "paragraphs";
  /** Copied paragraphs */
  readonly paragraphs: readonly DocxParagraph[];
  /** Whether this was a cut operation (for visual feedback) */
  readonly isCut: boolean;
};

/**
 * Clipboard content containing table.
 */
export type TableClipboardContent = {
  readonly type: "table";
  /** Copied table */
  readonly table: DocxTable;
  /** Whether this was a cut operation */
  readonly isCut: boolean;
};

/**
 * Clipboard content containing text runs (inline content).
 */
export type TextClipboardContent = {
  readonly type: "text";
  /** Copied runs (may span multiple paragraphs) */
  readonly runs: readonly DocxRun[];
  /** Plain text representation */
  readonly plainText: string;
  /** Whether this was a cut operation */
  readonly isCut: boolean;
};

/**
 * Combined clipboard content type.
 */
export type DocxClipboardContent =
  | ParagraphClipboardContent
  | TableClipboardContent
  | TextClipboardContent;

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create paragraph clipboard content.
 */
export function createParagraphClipboard(
  paragraphs: readonly DocxParagraph[],
  isCut: boolean = false,
): ParagraphClipboardContent {
  return {
    type: "paragraphs",
    paragraphs,
    isCut,
  };
}

/**
 * Create table clipboard content.
 */
export function createTableClipboard(
  table: DocxTable,
  isCut: boolean = false,
): TableClipboardContent {
  return {
    type: "table",
    table,
    isCut,
  };
}

/**
 * Create text clipboard content.
 */
export function createTextClipboard(
  runs: readonly DocxRun[],
  plainText: string,
  isCut: boolean = false,
): TextClipboardContent {
  return {
    type: "text",
    runs,
    plainText,
    isCut,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Check if clipboard content is paragraphs.
 */
export function isParagraphClipboard(
  content: DocxClipboardContent,
): content is ParagraphClipboardContent {
  return content.type === "paragraphs";
}

/**
 * Check if clipboard content is table.
 */
export function isTableClipboard(
  content: DocxClipboardContent,
): content is TableClipboardContent {
  return content.type === "table";
}

/**
 * Check if clipboard content is text.
 */
export function isTextClipboard(
  content: DocxClipboardContent,
): content is TextClipboardContent {
  return content.type === "text";
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Get plain text from clipboard content.
 */
export function getClipboardPlainText(content: DocxClipboardContent): string {
  switch (content.type) {
    case "text":
      return content.plainText;
    case "paragraphs":
      return extractPlainTextFromParagraphs(content.paragraphs);
    case "table":
      return extractPlainTextFromTable(content.table);
  }
}

/**
 * Extract plain text from paragraphs.
 */
function extractPlainTextFromParagraphs(paragraphs: readonly DocxParagraph[]): string {
  return paragraphs
    .map((p: DocxParagraph) => {
      const runs = p.content.filter((c: DocxParagraphContent): c is DocxRun => c.type === "run");
      return extractPlainTextFromRuns(runs);
    })
    .join("\n");
}

/**
 * Extract plain text from runs.
 */
function extractPlainTextFromRuns(runs: readonly DocxRun[]): string {
  return runs
    .flatMap((run: DocxRun) =>
      run.content
        .filter((c: DocxRunContent): c is DocxRunContent & { type: "text" } => c.type === "text")
        .map((c) => c.value),
    )
    .join("");
}

/**
 * Extract plain text from table.
 */
function extractPlainTextFromTable(table: DocxTable): string {
  return table.rows
    .map((row: DocxTableRow) =>
      row.cells
        .map((cell: DocxTableCell) =>
          cell.content
            .filter((c): c is DocxParagraph => c.type === "paragraph")
            .map((p: DocxParagraph) => {
              const runs = p.content.filter((c: DocxParagraphContent): c is DocxRun => c.type === "run");
              return extractPlainTextFromRuns(runs);
            })
            .join("\n"),
        )
        .join("\t"),
    )
    .join("\n");
}

/**
 * Mark clipboard content as cut.
 */
export function markAsCut(content: DocxClipboardContent): DocxClipboardContent {
  return {
    ...content,
    isCut: true,
  };
}

/**
 * Mark clipboard content as copy (not cut).
 */
export function markAsCopy(content: DocxClipboardContent): DocxClipboardContent {
  return {
    ...content,
    isCut: false,
  };
}
