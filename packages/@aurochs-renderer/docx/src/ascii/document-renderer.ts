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
    switch (block.type) {
      case "paragraph": sections.push(renderParagraphAscii(block, width).join("\n")); break;
      case "table": sections.push(renderDocxTableAscii(block, width)); break;
      default: break;
    }
  }

  return sections.join("\n\n");
}
