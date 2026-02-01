/**
 * @file styles command - display document styles
 */

import * as fs from "node:fs/promises";
import { loadDocx } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import type { DocxStyleType } from "@oxen-office/docx/domain/styles";

// =============================================================================
// Types
// =============================================================================

export type StyleItemJson = {
  readonly styleId: string;
  readonly type: DocxStyleType;
  readonly name?: string;
  readonly basedOn?: string;
  readonly next?: string;
  readonly link?: string;
  readonly default?: boolean;
  readonly customStyle?: boolean;
  readonly qFormat?: boolean;
  readonly semiHidden?: boolean;
  readonly uiPriority?: number;
};

export type StylesData = {
  readonly totalCount: number;
  readonly paragraphCount: number;
  readonly characterCount: number;
  readonly tableCount: number;
  readonly numberingCount: number;
  readonly styles: readonly StyleItemJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display styles from a DOCX file.
 */
export async function runStyles(
  filePath: string,
  options: { type?: string; all?: boolean } = {}
): Promise<Result<StylesData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const doc = await loadDocx(buffer);

    if (!doc.styles) {
      return success({
        totalCount: 0,
        paragraphCount: 0,
        characterCount: 0,
        tableCount: 0,
        numberingCount: 0,
        styles: [],
      });
    }

    // Validate type option if specified
    if (options.type) {
      const validTypes = ["paragraph", "character", "table", "numbering"];
      if (!validTypes.includes(options.type)) {
        return error("INVALID_ARGUMENT", `Invalid style type: ${options.type}. Must be one of: ${validTypes.join(", ")}`);
      }
    }

    // Filter styles by type and visibility
    const filteredStyles = doc.styles.style
      .filter((s) => !options.type || s.type === options.type)
      .filter((s) => options.all || !s.semiHidden);

    const styles: StyleItemJson[] = filteredStyles.map((style) => ({
      styleId: style.styleId as string,
      type: style.type,
      ...(style.name?.val && { name: style.name.val }),
      ...(style.basedOn?.val && { basedOn: style.basedOn.val as string }),
      ...(style.next?.val && { next: style.next.val as string }),
      ...(style.link?.val && { link: style.link.val as string }),
      ...(style.default && { default: true }),
      ...(style.customStyle && { customStyle: true }),
      ...(style.qFormat && { qFormat: true }),
      ...(style.semiHidden && { semiHidden: true }),
      ...(style.uiPriority?.val !== undefined && { uiPriority: style.uiPriority.val }),
    }));

    // Count by type
    const paragraphCount = doc.styles.style.filter((s) => s.type === "paragraph").length;
    const characterCount = doc.styles.style.filter((s) => s.type === "character").length;
    const tableCount = doc.styles.style.filter((s) => s.type === "table").length;
    const numberingCount = doc.styles.style.filter((s) => s.type === "numbering").length;

    return success({
      totalCount: doc.styles.style.length,
      paragraphCount,
      characterCount,
      tableCount,
      numberingCount,
      styles,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
