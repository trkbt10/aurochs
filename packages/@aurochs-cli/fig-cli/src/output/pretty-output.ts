/**
 * @file Pretty output formatters for fig-cli
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { PreviewData } from "../commands/preview";

/** Format info output for human-readable CLI display. */
export function formatInfoPretty(data: InfoData): string {
  return [
    `Pages: ${data.pageCount}`,
    `Nodes: ${data.nodeCount}`,
    `Blobs: ${data.blobCount}`,
    `Images: ${data.imageCount}`,
  ].join("\n");
}

/** Format page list output for human-readable CLI display. */
export function formatListPretty(data: ListData): string {
  if (data.pages.length === 0) {
    return "No pages found";
  }

  return data.pages
    .map((page) => {
      const typeSummary = Object.entries(page.nodeTypeCounts)
        .map(([type, count]) => `${type}: ${count}`)
        .join(", ");
      return `#${page.number} "${page.name}" (${page.childCount} children) [${typeSummary}]`;
    })
    .join("\n");
}

/** Format page detail output for human-readable CLI display. */
export function formatShowPretty(data: ShowData): string {
  const lines = [
    `Page ${data.pageNumber}: "${data.name}"`,
    `Nodes: ${data.nodes.length}`,
    "",
  ];

  for (const node of data.nodes) {
    const size = `${Math.round(node.width)}x${Math.round(node.height)}`;
    const pos = `(${Math.round(node.x)}, ${Math.round(node.y)})`;
    const name = node.name ? ` "${node.name}"` : "";
    const text = node.textPreview ? ` text="${node.textPreview}"` : "";
    const children = node.childCount > 0 ? ` children=${node.childCount}` : "";
    lines.push(`[${node.index}] ${node.type}${name} ${pos} ${size}${text}${children}`);
  }

  return lines.join("\n");
}

/** Format extracted text output for human-readable CLI display. */
export function formatExtractPretty(data: ExtractData): string {
  if (data.pages.length === 0) {
    return "No pages found";
  }

  return data.pages
    .map((page) => {
      const header = `--- Page ${page.number}: "${page.name}" (${page.textItemCount} text items) ---`;
      const body = page.text.length > 0 ? page.text : "(empty)";
      return `${header}\n${body}`;
    })
    .join("\n\n");
}

/** Format preview output for human-readable CLI display. */
export function formatPreviewPretty(data: PreviewData): string {
  const lines: string[] = [];

  for (let index = 0; index < data.pages.length; index += 1) {
    const page = data.pages[index]!;
    if (index > 0) {
      lines.push("");
    }
    if (data.pages.length > 1) {
      lines.push(`<!-- Page ${page.number}: ${page.name} -->`);
    }
    lines.push(page.svg);
  }

  return lines.join("\n");
}
