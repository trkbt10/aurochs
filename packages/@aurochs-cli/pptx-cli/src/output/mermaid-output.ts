/**
 * @file Mermaid output formatter for PPTX preview
 */

import type { PreviewData } from "../commands/preview";
import { renderSlideMermaid } from "@aurochs-renderer/pptx/mermaid";

/**
 * Format preview result as Mermaid / Markdown output.
 */
export function formatPreviewMermaid(data: PreviewData): string {
  const sections: string[] = [];

  for (const slide of data.slides) {
    const header = `## Slide ${slide.number}`;
    const mermaid = renderSlideMermaid({ shapes: slide.shapes, slideNumber: slide.number });
    sections.push(mermaid ? `${header}\n\n${mermaid}` : header);
  }

  return sections.join("\n\n");
}
