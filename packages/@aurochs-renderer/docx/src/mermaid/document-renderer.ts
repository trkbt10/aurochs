/**
 * @file Render DOCX blocks as Markdown output
 */

import { renderMarkdownTable } from "@aurochs/mermaid";
import type { DocxMermaidParams, MermaidParagraph, MermaidTable } from "./types";

/** Render a paragraph as Markdown text. */
function renderParagraph(para: MermaidParagraph): string {
  const text = para.text.trim();

  if (!text) {
    return "";
  }

  // Heading
  if (para.headingLevel !== undefined) {
    const hashes = "#".repeat(Math.min(para.headingLevel + 1, 6));
    return `${hashes} ${text}`;
  }

  // Numbered list
  if (para.numbering) {
    const indent = "  ".repeat(para.numbering.level);
    return `${indent}1. ${text}`;
  }

  return text;
}

/** Render a table as a Markdown pipe-delimited table. */
function renderTable(table: MermaidTable): string {
  if (table.rows.length === 0) {
    return "";
  }

  const headers = table.rows[0]?.cells.map((c) => c.text) ?? [];
  const dataRows = table.rows.slice(1).map((r) => r.cells.map((c) => c.text));

  return renderMarkdownTable({ headers, rows: dataRows });
}

/** Render all document blocks to Markdown. */
export function renderDocxMermaid(params: DocxMermaidParams): string {
  const sections: string[] = [];

  for (const block of params.blocks) {
    if (block.type === "paragraph") {
      const rendered = renderParagraph(block);
      if (rendered) {
        sections.push(rendered);
      }
    } else if (block.type === "table") {
      const rendered = renderTable(block);
      if (rendered) {
        sections.push(rendered);
      }
    }
  }

  return sections.join("\n\n");
}
