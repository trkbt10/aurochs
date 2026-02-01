/**
 * @file Text extraction utilities for DOCX documents
 *
 * Pure domain utilities for extracting plain text from domain objects.
 * These operate only on domain types and have no I/O dependencies.
 */

import type { DocxDocument, DocxBlockContent, DocxBody } from "./document";
import type { DocxParagraph, DocxParagraphContent } from "./paragraph";
import type { DocxRun, DocxRunContent } from "./run";

/**
 * Extract text from a run content item.
 */
export function extractTextFromRunContent(content: DocxRunContent): string {
  switch (content.type) {
    case "text":
      return content.value;
    case "tab":
      return "\t";
    case "break":
      return content.breakType === "page" ? "\n\n" : "\n";
    default:
      return "";
  }
}

/**
 * Extract text from a run.
 */
export function extractTextFromRun(run: DocxRun): string {
  return run.content.map(extractTextFromRunContent).join("");
}

/**
 * Extract text from a paragraph content item.
 */
export function extractTextFromParagraphContent(content: DocxParagraphContent): string {
  switch (content.type) {
    case "run":
      return extractTextFromRun(content);
    case "hyperlink":
      return content.content.map(extractTextFromRun).join("");
    default:
      return "";
  }
}

/**
 * Extract text from a paragraph.
 */
export function extractTextFromParagraph(paragraph: DocxParagraph): string {
  return paragraph.content.map(extractTextFromParagraphContent).join("");
}

/**
 * Extract text from a block content item.
 */
export function extractTextFromBlockContent(content: DocxBlockContent): string {
  switch (content.type) {
    case "paragraph":
      return extractTextFromParagraph(content);
    case "table":
      return content.rows
        .map((row) =>
          row.cells
            .map((cell) =>
              cell.content
                .filter((c): c is DocxParagraph => c.type === "paragraph")
                .map(extractTextFromParagraph)
                .join(" "),
            )
            .join("\t"),
        )
        .join("\n");
    default:
      return "";
  }
}

/**
 * Extract all text from a document body.
 */
export function extractTextFromBody(body: DocxBody): string {
  return body.content.map(extractTextFromBlockContent).join("\n");
}

/**
 * Extract all text from a document.
 */
export function extractTextFromDocument(doc: DocxDocument): string {
  return extractTextFromBody(doc.body);
}
