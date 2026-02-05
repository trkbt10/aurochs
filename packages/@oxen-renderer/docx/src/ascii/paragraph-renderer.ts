/**
 * @file Renders a single DOCX paragraph as ASCII text
 */

import { wrapText } from "@oxen-renderer/drawing-ml/ascii";
import type { AsciiParagraph } from "./types";

/** Render a heading paragraph with # prefix. */
function renderHeading(para: AsciiParagraph, width: number): readonly string[] {
  const level = para.headingLevel ?? 0;
  const prefix = "#".repeat(level + 1) + " ";
  const text = prefix + para.text;
  return wrapText(text, width);
}

/** Render a numbered list item. */
function renderNumberedItem(para: AsciiParagraph, width: number): readonly string[] {
  const level = para.numbering?.level ?? 0;
  const indent = "  ".repeat(level);
  const prefix = `${indent}${para.numbering?.numId ?? 1}. `;
  const lines = wrapText(para.text, width - prefix.length);
  return lines.map((line, i) =>
    i === 0 ? prefix + line : " ".repeat(prefix.length) + line,
  );
}

/** Render a bulleted list item. */
function renderBulletItem(para: AsciiParagraph, width: number): readonly string[] {
  const level = para.numbering?.level ?? 0;
  const indent = "  ".repeat(level);
  const bullet = `${indent}\u2022 `;
  const lines = wrapText(para.text, width - bullet.length);
  return lines.map((line, i) =>
    i === 0 ? bullet + line : " ".repeat(bullet.length) + line,
  );
}

/** Render a regular paragraph with 2-space indent and word wrap. */
function renderPlainParagraph(text: string, width: number): readonly string[] {
  if (text.length === 0) {
    return [""];
  }
  const indent = "  ";
  const lines = wrapText(text, width - indent.length);
  return lines.map((line) => indent + line);
}

/** Render a paragraph block to ASCII lines. */
export function renderParagraphAscii(para: AsciiParagraph, width: number): readonly string[] {
  // Heading
  if (para.headingLevel !== undefined) {
    return renderHeading(para, width);
  }

  // Numbered list
  if (para.numbering) {
    // Heuristic: bullet vs numbered based on common numbering patterns
    // If numId is commonly used for bullets (we can't know for sure without numbering defs),
    // we'll render with numId format. CLI can provide a flag later.
    return renderNumberedItem(para, width);
  }

  // Check for bullet-style prefix in text
  if (para.text.startsWith("\u2022") || para.text.startsWith("-") || para.text.startsWith("*")) {
    return renderBulletItem({ ...para, text: para.text.replace(/^[\u2022\-*]\s*/, ""), numbering: { numId: 0, level: 0 } }, width);
  }

  return renderPlainParagraph(para.text, width);
}
