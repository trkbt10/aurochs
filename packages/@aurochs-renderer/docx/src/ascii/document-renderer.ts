/**
 * @file Renders DOCX document blocks as ASCII text
 */

import type { DocxAsciiParams } from "./types";
import { renderParagraphAscii } from "./paragraph-renderer";
import { renderDocxTableAscii } from "./table-renderer";

/** Render all document blocks to ASCII text. */
export function renderDocxAscii(params: DocxAsciiParams): string {
  const { blocks, width } = params;
  const sections: string[] = [];

  for (const block of blocks) {
    if (block.type === "paragraph") {
      const lines = renderParagraphAscii(block, width);
      sections.push(lines.join("\n"));
    } else if (block.type === "table") {
      sections.push(renderDocxTableAscii(block, width));
    }
  }

  return sections.join("\n\n");
}
