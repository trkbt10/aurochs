/**
 * @file extract command - extract text from sections
 */

import type { DocxBlockContent } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadDocument } from "./loader";
import { extractTextFromBlockContent } from "@oxen-office/docx/domain/text-utils";

export type SectionTextItem = {
  readonly number: number;
  readonly text: string;
};

export type ExtractData = {
  readonly sections: readonly SectionTextItem[];
};

export type ExtractOptions = {
  readonly sections?: string; // Range like "1,3-5"
};

// =============================================================================
// Range Parsing
// =============================================================================

function parseRangePart(part: string, maxSection: number, result: number[]): void {
  if (part.includes("-")) {
    const [startStr, endStr] = part.split("-").map((s) => s.trim());
    const start = parseInt(startStr, 10);
    const end = parseInt(endStr, 10);
    if (Number.isNaN(start) || Number.isNaN(end)) {
      return;
    }
    for (let i = Math.max(1, start); i <= Math.min(maxSection, end); i++) {
      if (!result.includes(i)) {
        result.push(i);
      }
    }
  } else {
    const num = parseInt(part, 10);
    if (!Number.isNaN(num) && num >= 1 && num <= maxSection && !result.includes(num)) {
      result.push(num);
    }
  }
}

function parseSectionRange(range: string, maxSection: number): number[] {
  const result: number[] = [];
  const parts = range.split(",").map((s) => s.trim());

  for (const part of parts) {
    parseRangePart(part, maxSection, result);
  }

  return result.sort((a, b) => a - b);
}

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

  // Final section
  sections.push({ content: currentContent });

  return sections;
}

function getSectionNumbers(options: ExtractOptions, count: number): number[] {
  if (options.sections) {
    return parseSectionRange(options.sections, count);
  }
  return Array.from({ length: count }, (_, i) => i + 1);
}

/**
 * Extract text from sections in a DOCX file.
 */
export async function runExtract(filePath: string, options: ExtractOptions): Promise<Result<ExtractData>> {
  try {
    const doc = await loadDocument(filePath);

    const sections = splitIntoSections(doc.body);
    const sectionNumbers = getSectionNumbers(options, sections.length);

    const items: SectionTextItem[] = sectionNumbers.map((sectionNumber) => {
      const section = sections[sectionNumber - 1];
      const text = section.content.map(extractTextFromBlockContent).join("\n");

      return { number: sectionNumber, text };
    });

    return success({ sections: items });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
