/**
 * @file Pretty output formatters for pdf-cli
 */

import type { InfoData } from "../commands/info";
import type { ListData } from "../commands/list";
import type { ShowData } from "../commands/show";
import type { ExtractData } from "../commands/extract";
import type { BuildData } from "../commands/build";
import type { PreviewData } from "../commands/preview";

/** Format info output for human-readable CLI display. */
export function formatInfoPretty(data: InfoData): string {
  const lines = [`Pages: ${data.pageCount}`];

  if (data.firstPage) {
    lines.push(`First Page Size: ${data.firstPage.width}pt x ${data.firstPage.height}pt`);
  }

  lines.push(`Embedded Fonts: ${data.embeddedFontCount}`);

  if (data.metadata.title) {
    lines.push(`Title: ${data.metadata.title}`);
  }
  if (data.metadata.author) {
    lines.push(`Author: ${data.metadata.author}`);
  }
  if (data.metadata.subject) {
    lines.push(`Subject: ${data.metadata.subject}`);
  }

  return lines.join("\n");
}

/** Format page list output for human-readable CLI display. */
export function formatListPretty(data: ListData): string {
  if (data.pages.length === 0) {
    return "No pages found";
  }

  return data.pages
    .map(
      (page) =>
        `#${page.number} ${page.width}pt x ${page.height}pt ` +
        `(elements: ${page.elementCount}, text: ${page.textCount}, path: ${page.pathCount}, image: ${page.imageCount})`,
    )
    .join("\n");
}

function formatShowElement(element: ShowData["elements"][number]): string {
  if (element.type === "text") {
    const preview = element.text.length > 80 ? `${element.text.slice(0, 77)}...` : element.text;
    return [
      `[${element.index}] text "${preview}"`,
      `  bbox=(${element.x}, ${element.y}, ${element.width}, ${element.height})`,
      `  font=${element.fontName} size=${element.fontSize}`,
    ].join("\n");
  }
  if (element.type === "path") {
    return `[${element.index}] path ops=${element.operationCount} paint=${element.paintOp}`;
  }
  return `[${element.index}] image ${element.width}x${element.height} ${element.colorSpace} bytes=${element.bytes}`;
}

/** Format page detail output for human-readable CLI display. */
export function formatShowPretty(data: ShowData): string {
  const lines = [
    `Page ${data.pageNumber}`,
    `Size: ${data.width}pt x ${data.height}pt`,
    `Elements: ${data.elements.length}`,
    "",
  ];

  for (const element of data.elements) {
    lines.push(formatShowElement(element));
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
      const header = `--- Page ${page.number} (${page.textItemCount} text items) ---`;
      const body = page.text.length > 0 ? page.text : "(empty)";
      return `${header}\n${body}`;
    })
    .join("\n\n");
}

/** Format build output for human-readable CLI display. */
export function formatBuildPretty(data: BuildData): string {
  const lines = [
    `Input: ${data.inputPath}`,
    `Output: ${data.outputPath}`,
    `Pages: ${data.processedPages}`,
    `Text: ${data.textCount}`,
    `Paths: ${data.pathCount}`,
    `Images: ${data.imageCount}`,
  ];
  return lines.join("\n");
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
      lines.push(`<!-- Page ${page.number} -->`);
    }
    lines.push(page.svg);
  }

  return lines.join("\n");
}
