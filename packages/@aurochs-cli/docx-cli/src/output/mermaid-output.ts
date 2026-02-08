/**
 * @file Mermaid output formatter for DOCX preview
 */

import type { PreviewData } from "../commands/preview";
import { renderDocxMermaid } from "@aurochs-renderer/docx/mermaid";

/**
 * Format preview result as Markdown output.
 */
export function formatPreviewMermaid(data: PreviewData): string {
  const sections: string[] = [];

  for (const section of data.sections) {
    const header = `## Section ${section.number}`;
    const mermaid = renderDocxMermaid({ blocks: section.blocks });
    sections.push(mermaid ? `${header}\n\n${mermaid}` : header);
  }

  return sections.join("\n\n");
}
