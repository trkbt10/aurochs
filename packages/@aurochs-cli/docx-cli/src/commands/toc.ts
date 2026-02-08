/**
 * @file toc command - display table of contents based on outline levels
 */

import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadDocument } from "./loader";
import type { DocxBlockContent } from "@aurochs-office/docx/domain/document";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import { extractTextFromBlockContent } from "@aurochs-office/docx/domain/text-utils";

// =============================================================================
// Types
// =============================================================================

export type TocEntryJson = {
  readonly level: number;
  readonly text: string;
  readonly style?: string;
};

export type TocData = {
  readonly count: number;
  readonly maxLevel: number;
  readonly entries: readonly TocEntryJson[];
};

// =============================================================================
// TOC Extraction
// =============================================================================

function extractTocFromParagraph(paragraph: DocxParagraph, entries: TocEntryJson[]): void {
  const outlineLvl = paragraph.properties?.outlineLvl;

  // Only include paragraphs with explicit outline level
  if (outlineLvl === undefined) {
    return;
  }

  const text = extractTextFromBlockContent(paragraph).trim();

  // Skip empty paragraphs
  if (!text) {
    return;
  }

  entries.push({
    level: outlineLvl,
    text,
    style: paragraph.properties?.pStyle,
  });
}

function extractTocFromContent(content: readonly DocxBlockContent[], entries: TocEntryJson[]): void {
  for (const block of content) {
    if (block.type === "paragraph") {
      extractTocFromParagraph(block, entries);
    }
    // Tables are not typically included in TOC
  }
}

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display table of contents based on outline levels from a DOCX file.
 */
export async function runToc(filePath: string, options: { maxLevel?: number } = {}): Promise<Result<TocData>> {
  try {
    const doc = await loadDocument(filePath);

    const entries: TocEntryJson[] = [];
    extractTocFromContent(doc.body.content, entries);

    // Filter by max level if specified
    const maxLevelFilter = options.maxLevel ?? 9;
    const filteredEntries = entries.filter((e) => e.level <= maxLevelFilter);

    // Calculate actual max level in document
    const maxLevel = filteredEntries.reduce((max, e) => Math.max(max, e.level), -1);

    return success({
      count: filteredEntries.length,
      maxLevel: maxLevel >= 0 ? maxLevel : 0,
      entries: filteredEntries,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
