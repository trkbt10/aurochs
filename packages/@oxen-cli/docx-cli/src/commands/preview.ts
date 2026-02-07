/**
 * @file preview command - ASCII art visualization of document content
 */

import { type DocxBlockContent, type DocxParagraph, type DocxTable } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadDocument } from "./loader";
import { renderDocxAscii, type AsciiDocBlock, type AsciiParagraph, type AsciiTable } from "@oxen-renderer/docx/ascii";

// =============================================================================
// Types
// =============================================================================

export type PreviewSection = {
  readonly number: number;
  readonly ascii: string;
  readonly blocks: readonly AsciiDocBlock[];
  readonly paragraphCount: number;
  readonly tableCount: number;
};

export type PreviewData = {
  readonly sections: readonly PreviewSection[];
};

export type PreviewOptions = { readonly width: number };

// =============================================================================
// Section Splitting
// =============================================================================

type SectionContent = {
  readonly content: DocxBlockContent[];
};

function splitIntoSections(body: { content: readonly DocxBlockContent[] }): SectionContent[] {
  const sections: SectionContent[] = [];
  const currentContent: DocxBlockContent[] = [];

  for (const block of body.content) {
    if (block.type === "sectionBreak") {
      sections.push({ content: [...currentContent] });
      currentContent.length = 0;
    } else {
      currentContent.push(block);
    }
  }

  sections.push({ content: currentContent });
  return sections;
}

// =============================================================================
// Block Conversion
// =============================================================================

function extractParagraphText(para: DocxParagraph): string {
  return para.content
    .map((c) => {
      if (c.type === "run") {
        return c.content
          .map((rc) => (rc.type === "text" ? rc.value : ""))
          .join("");
      }
      return "";
    })
    .join("");
}

function getHeadingLevel(para: DocxParagraph): number | undefined {
  const props = para.properties;
  if (!props) {
    return undefined;
  }
  // outlineLvl property
  if ("outlineLvl" in props && typeof props.outlineLvl === "number") {
    return props.outlineLvl;
  }
  // Detect from style name
  const style = props.pStyle;
  if (style) {
    const match = style.match(/^Heading(\d+)$/i);
    if (match) {
      return parseInt(match[1]!, 10) - 1;
    }
  }
  return undefined;
}

function convertParagraph(para: DocxParagraph): AsciiParagraph {
  const text = extractParagraphText(para);
  const headingLevel = getHeadingLevel(para);
  const props = para.properties;

  let numbering: AsciiParagraph["numbering"] | undefined;
  if (props && "numPr" in props && props.numPr) {
    const numPr = props.numPr as { numId?: number; ilvl?: number };
    numbering = { numId: numPr.numId ?? 0, level: numPr.ilvl ?? 0 };
  }

  return {
    type: "paragraph",
    style: props?.pStyle,
    headingLevel,
    numbering,
    text,
  };
}

function extractCellText(cell: DocxTable["rows"][number]["cells"][number]): string {
  return cell.content
    .filter((c): c is DocxParagraph => c.type === "paragraph")
    .map(extractParagraphText)
    .join("\n");
}

function convertTable(table: DocxTable): AsciiTable {
  return {
    type: "table",
    rows: table.rows.map((row) => ({
      cells: row.cells.map((cell) => ({ text: extractCellText(cell) })),
    })),
  };
}

function convertBlock(block: DocxBlockContent): AsciiDocBlock | undefined {
  switch (block.type) {
    case "paragraph":
      return convertParagraph(block);
    case "table":
      return convertTable(block);
    default:
      return undefined;
  }
}

// =============================================================================
// Command
// =============================================================================

/**
 * Generate an ASCII preview of one or all sections in a DOCX file.
 */
export async function runPreview(
  filePath: string,
  sectionNumber: number | undefined,
  options: PreviewOptions,
): Promise<Result<PreviewData>> {
  try {
    const doc = await loadDocument(filePath);

    const sections = splitIntoSections(doc.body);

    if (sectionNumber !== undefined && (sectionNumber < 1 || sectionNumber > sections.length)) {
      return error(
        "SECTION_NOT_FOUND",
        `Section ${sectionNumber} not found. Valid range: 1-${sections.length}`,
      );
    }

    const start = sectionNumber ?? 1;
    const end = sectionNumber ?? sections.length;
    const results: PreviewSection[] = [];

    for (let i = start; i <= end; i++) {
      const section = sections[i - 1]!;
      const blocks: AsciiDocBlock[] = [];
      let paragraphCount = 0;
      let tableCount = 0;

      for (const block of section.content) {
        const converted = convertBlock(block);
        if (converted) {
          blocks.push(converted);
          if (converted.type === "paragraph") {
            paragraphCount++;
          } else {
            tableCount++;
          }
        }
      }

      const ascii = renderDocxAscii({ blocks, width: options.width });

      results.push({
        number: i,
        ascii,
        blocks,
        paragraphCount,
        tableCount,
      });
    }

    return success({ sections: results });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
