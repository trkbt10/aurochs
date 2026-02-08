/**
 * @file list command - list sections with summary
 */

import { twipsToPoints, type DocxBlockContent, type DocxParagraph, type Twips } from "@aurochs-office/docx";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadDocument } from "./loader";
import { extractTextFromParagraph } from "@aurochs-office/docx/domain/text-utils";

export type SectionListItem = {
  readonly number: number;
  readonly paragraphCount: number;
  readonly tableCount: number;
  readonly pageWidth?: number;
  readonly pageHeight?: number;
  readonly orientation?: "portrait" | "landscape";
  readonly columns?: number;
  readonly firstParagraphText?: string;
};

export type ListData = {
  readonly sections: readonly SectionListItem[];
};

type SectionContent = {
  readonly content: DocxBlockContent[];
  readonly sectPr:
    | { pgSz?: { w: Twips; h: Twips; orient?: "portrait" | "landscape" }; cols?: { num?: number } }
    | undefined;
};

function splitIntoSections(body: {
  content: readonly DocxBlockContent[];
  sectPr?: SectionContent["sectPr"];
}): SectionContent[] {
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

function getFirstParagraphText(content: readonly DocxBlockContent[]): string | undefined {
  const firstParagraph = content.find((c): c is DocxParagraph => c.type === "paragraph");
  if (!firstParagraph) {
    return undefined;
  }
  const text = extractTextFromParagraph(firstParagraph).trim();
  if (!text) {
    return undefined;
  }
  return text.length > 50 ? `${text.slice(0, 47)}...` : text;
}

/**
 * List sections in a DOCX file with summary information.
 */
export async function runList(filePath: string): Promise<Result<ListData>> {
  try {
    const doc = await loadDocument(filePath);

    const sections = splitIntoSections(doc.body);
    const items: SectionListItem[] = sections.map((section, index) => {
      const paragraphCount = section.content.filter((c) => c.type === "paragraph").length;
      const tableCount = section.content.filter((c) => c.type === "table").length;
      const sectPr = section.sectPr;

      const item: SectionListItem = {
        number: index + 1,
        paragraphCount,
        tableCount,
      };

      if (sectPr?.pgSz) {
        return {
          ...item,
          pageWidth: twipsToPoints(sectPr.pgSz.w),
          pageHeight: twipsToPoints(sectPr.pgSz.h),
          orientation: sectPr.pgSz.orient,
        };
      }

      if (sectPr?.cols?.num) {
        return { ...item, columns: sectPr.cols.num };
      }

      const firstParagraphText = getFirstParagraphText(section.content);
      if (firstParagraphText) {
        return { ...item, firstParagraphText };
      }

      return item;
    });

    return success({ sections: items });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
