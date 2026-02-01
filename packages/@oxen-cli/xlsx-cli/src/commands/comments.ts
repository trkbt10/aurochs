/**
 * @file comments command - display cell comments
 */

import { success, error, type Result } from "@oxen-cli/cli-core";
import { loadXlsxWorkbook } from "../utils/xlsx-loader";
import { indexToColumnLetter } from "@oxen-office/xlsx/domain/cell/address";

// =============================================================================
// Types
// =============================================================================

export type CommentItemJson = {
  readonly ref: string;
  readonly author?: string;
  readonly text: string;
};

export type SheetCommentsJson = {
  readonly sheetName: string;
  readonly comments: readonly CommentItemJson[];
};

export type CommentsData = {
  readonly totalCount: number;
  readonly sheets: readonly SheetCommentsJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display comments from an XLSX file.
 */
export async function runComments(
  filePath: string,
  options: { sheet?: string } = {}
): Promise<Result<CommentsData>> {
  try {
    const workbook = await loadXlsxWorkbook(filePath);

    const sheets: SheetCommentsJson[] = workbook.sheets
      .filter((sheet) => !options.sheet || sheet.name === options.sheet)
      .filter((sheet) => sheet.comments && sheet.comments.length > 0)
      .map((sheet) => ({
        sheetName: sheet.name,
        comments: sheet.comments!.map((comment) => {
          const col = indexToColumnLetter(comment.address.col);
          const ref = `${col}${comment.address.row}`;

          return {
            ref,
            ...(comment.author && { author: comment.author }),
            text: comment.text,
          };
        }),
      }));

    const totalCount = sheets.reduce((sum, s) => sum + s.comments.length, 0);

    return success({
      totalCount,
      sheets,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse XLSX: ${(err as Error).message}`);
  }
}
