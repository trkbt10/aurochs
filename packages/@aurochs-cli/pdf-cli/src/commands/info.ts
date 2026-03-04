/**
 * @file info command - display PDF metadata
 */

import { getPdfPageCount, getPdfPageDimensions, parsePdfSource } from "@aurochs/pdf";
import { success, error, type Result } from "@aurochs-cli/cli-core";
import { loadPdfBinary } from "./loader";
import { getErrorCode, getErrorMessage } from "./error-info";

export type InfoData = {
  readonly pageCount: number;
  readonly firstPage?: {
    readonly width: number;
    readonly height: number;
  };
  readonly metadata: {
    readonly title?: string;
    readonly author?: string;
    readonly subject?: string;
  };
  readonly embeddedFontCount: number;
};

/** Get PDF metadata and basic document information. */
export async function runInfo(filePath: string): Promise<Result<InfoData>> {
  try {
    const data = await loadPdfBinary(filePath);
    const pageCount = await getPdfPageCount(data);

    const parsed = pageCount > 0 ? await parsePdfSource(data, { pages: [1] }) : await parsePdfSource(data);

    const firstSize = pageCount > 0 ? await getPdfPageDimensions(data, 1) : null;

    return success({
      pageCount,
      firstPage: firstSize ?? undefined,
      metadata: {
        title: parsed.metadata?.title,
        author: parsed.metadata?.author,
        subject: parsed.metadata?.subject,
      },
      embeddedFontCount: parsed.embeddedFonts?.length ?? 0,
    });
  } catch (caughtError) {
    if (getErrorCode(caughtError) === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse PDF: ${getErrorMessage(caughtError)}`);
  }
}
