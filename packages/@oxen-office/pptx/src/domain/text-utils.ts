/**
 * @file Text extraction utilities for PPTX domain shapes
 *
 * Pure domain utilities for extracting plain text from domain objects.
 * These operate only on domain types and have no I/O dependencies.
 */

import type { TextBody, TextRun, Paragraph } from "./text";
import type { Shape } from "./shape";

/**
 * Extract plain text from a TextBody.
 *
 * Concatenates all paragraph text with newlines.
 */
export function extractTextFromBody(textBody: TextBody): string {
  return textBody.paragraphs.map(extractTextFromParagraph).join("\n");
}

/**
 * Extract plain text from a Paragraph.
 *
 * Concatenates all run text without separators.
 */
export function extractTextFromParagraph(paragraph: Paragraph): string {
  return paragraph.runs.map(extractTextFromRun).join("");
}

/**
 * Extract plain text from a TextRun.
 *
 * Handles text, break, and field run types.
 */
export function extractTextFromRun(run: TextRun): string {
  switch (run.type) {
    case "text":
      return run.text;
    case "break":
      return "\n";
    case "field":
      return run.text;
  }
}

/**
 * Extract plain text from a Shape.
 *
 * Handles sp shapes with textBody and grpSp shapes (recursively).
 * Returns empty string for shapes without text.
 */
export function extractTextFromShape(shape: Shape): string {
  if (shape.type === "sp" && shape.textBody) {
    return extractTextFromBody(shape.textBody);
  }
  if (shape.type === "grpSp") {
    return shape.children.map(extractTextFromShape).filter(Boolean).join("\n");
  }
  return "";
}
