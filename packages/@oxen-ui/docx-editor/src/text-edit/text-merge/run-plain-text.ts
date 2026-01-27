/**
 * @file Run and paragraph plain text extraction
 *
 * Utilities for extracting plain text from DocxRun and DocxParagraph structures.
 */

import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxRun } from "@oxen/docx/domain/run";

// =============================================================================
// Run Plain Text
// =============================================================================

/**
 * Get plain text from a run.
 *
 * @param run - The run to extract text from
 * @returns Plain text content of the run
 */
export function getRunPlainText(run: DocxRun): string {
  return run.content
    .map((content) => {
      switch (content.type) {
        case "text":
          return content.value;
        case "tab":
          return "\t";
        case "break":
          return "\n";
        case "symbol":
          return "";
      }
    })
    .join("");
}

// =============================================================================
// Paragraph Plain Text
// =============================================================================

/**
 * Get plain text from a paragraph.
 *
 * @param paragraph - The paragraph to extract text from
 * @returns Plain text content of the paragraph
 */
export function getParagraphPlainText(paragraph: DocxParagraph): string {
  return paragraph.content.reduce((acc, content) => {
    if (content.type === "run") {
      return acc + getRunPlainText(content);
    }
    if (content.type === "hyperlink") {
      return acc + content.content.reduce((hypAcc, run) => hypAcc + getRunPlainText(run), "");
    }
    return acc;
  }, "");
}
