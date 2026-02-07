/**
 * @file show command - display section content
 */

import { type DocxBlockContent, type DocxParagraph, type DocxTable } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadDocument } from "./loader";
import { serializeParagraph, type ParagraphJson } from "../serializers/paragraph-serializer";
import { serializeSection, type SectionJson } from "../serializers/section-serializer";

// =============================================================================
// JSON Types
// =============================================================================

export type TableCellJson = {
  readonly text: string;
};

export type TableRowJson = {
  readonly cells: readonly TableCellJson[];
};

export type TableJson = {
  readonly type: "table";
  readonly rows: readonly TableRowJson[];
  readonly rowCount: number;
  readonly colCount: number;
};

export type BlockContentJson = { type: "paragraph" } & ParagraphJson | TableJson;

export type ShowData = {
  readonly sectionNumber: number;
  readonly sectionProperties?: SectionJson;
  readonly content: readonly BlockContentJson[];
};

// =============================================================================
// Section Splitting
// =============================================================================

type SectionContent = {
  readonly content: DocxBlockContent[];
  readonly sectPr: Parameters<typeof serializeSection>[0] | undefined;
};

function splitIntoSections(body: { content: readonly DocxBlockContent[]; sectPr?: SectionContent["sectPr"] }): SectionContent[] {
  const sections: SectionContent[] = [];
  const currentContent: DocxBlockContent[] = [];

  for (const block of body.content) {
    if (block.type === "sectionBreak") {
      sections.push({
        content: [...currentContent],
        sectPr: block.sectPr,
      });
      currentContent.length = 0;
    } else {
      currentContent.push(block);
    }
  }

  // Final section
  sections.push({
    content: currentContent,
    sectPr: body.sectPr,
  });

  return sections;
}

// =============================================================================
// Serialization
// =============================================================================

function extractCellText(cell: DocxTable["rows"][number]["cells"][number]): string {
  return cell.content
    .filter((c): c is DocxParagraph => c.type === "paragraph")
    .map((p) => p.content.map((c) => (c.type === "run" ? c.content.map((rc) => (rc.type === "text" ? rc.value : "")).join("") : "")).join(""))
    .join("\n");
}

function serializeTable(table: DocxTable): TableJson {
  const rows: TableRowJson[] = table.rows.map((row) => ({
    cells: row.cells.map((cell) => ({ text: extractCellText(cell) })),
  }));

  return {
    type: "table",
    rows,
    rowCount: table.rows.length,
    colCount: table.rows[0]?.cells.length ?? 0,
  };
}

function serializeBlockContent(block: DocxBlockContent): BlockContentJson | undefined {
  switch (block.type) {
    case "paragraph":
      return { type: "paragraph", ...serializeParagraph(block) };
    case "table":
      return serializeTable(block);
    default:
      return undefined;
  }
}

/**
 * Display content of a specific section in a DOCX file.
 */
export async function runShow(filePath: string, sectionNumber: number): Promise<Result<ShowData>> {
  try {
    const doc = await loadDocument(filePath);

    const sections = splitIntoSections(doc.body);

    if (sectionNumber < 1 || sectionNumber > sections.length) {
      return error(
        "SECTION_NOT_FOUND",
        `Section ${sectionNumber} not found. Valid range: 1-${sections.length}`,
      );
    }

    const section = sections[sectionNumber - 1];
    const content = section.content
      .map(serializeBlockContent)
      .filter((c): c is BlockContentJson => c !== undefined);

    return success({
      sectionNumber,
      sectionProperties: section.sectPr ? serializeSection(section.sectPr) : undefined,
      content,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
