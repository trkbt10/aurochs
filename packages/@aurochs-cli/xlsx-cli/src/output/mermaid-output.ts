/**
 * @file Mermaid output formatter for XLSX preview
 */

import type { PreviewData } from "../commands/preview";
import { renderSheetMermaid } from "@aurochs-renderer/xlsx/mermaid";

/**
 * Format preview result as Markdown table output.
 */
export function formatPreviewMermaid(data: PreviewData): string {
  const sections: string[] = [];

  for (const sheet of data.sheets) {
    const header = `## ${sheet.name}`;
    const mermaid = renderSheetMermaid({
      name: sheet.name,
      rows: sheet.rows,
      columnCount: sheet.colCount,
    });
    sections.push(mermaid ? `${header}\n\n${mermaid}` : header);
  }

  return sections.join("\n\n");
}
