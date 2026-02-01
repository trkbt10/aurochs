/**
 * @file headers-footers command - display headers and footers
 */

import * as fs from "node:fs/promises";
import { loadDocx } from "@oxen-office/docx";
import { success, error, type Result } from "@oxen-cli/cli-core";
import { extractTextFromBlockContent } from "@oxen-office/docx/domain/text-utils";

// =============================================================================
// Types
// =============================================================================

export type HeaderFooterItemJson = {
  readonly relId: string;
  readonly kind: "header" | "footer";
  readonly paragraphCount: number;
  readonly preview?: string;
};

export type HeadersFootersData = {
  readonly headerCount: number;
  readonly footerCount: number;
  readonly items: readonly HeaderFooterItemJson[];
};

// =============================================================================
// Command Implementation
// =============================================================================

/**
 * Display headers and footers from a DOCX file.
 */
export async function runHeadersFooters(filePath: string): Promise<Result<HeadersFootersData>> {
  try {
    const buffer = await fs.readFile(filePath);
    const doc = await loadDocx(buffer);

    const items: HeaderFooterItemJson[] = [];

    // Process headers
    if (doc.headers) {
      for (const [relId, header] of doc.headers) {
        const paragraphCount = header.content.filter((c) => c.type === "paragraph").length;
        const text = header.content
          .map((c) => extractTextFromBlockContent(c))
          .join(" ")
          .trim();
        const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text || undefined;

        items.push({
          relId: relId as string,
          kind: "header",
          paragraphCount,
          ...(preview && { preview }),
        });
      }
    }

    // Process footers
    if (doc.footers) {
      for (const [relId, footer] of doc.footers) {
        const paragraphCount = footer.content.filter((c) => c.type === "paragraph").length;
        const text = footer.content
          .map((c) => extractTextFromBlockContent(c))
          .join(" ")
          .trim();
        const preview = text.length > 80 ? `${text.slice(0, 77)}...` : text || undefined;

        items.push({
          relId: relId as string,
          kind: "footer",
          paragraphCount,
          ...(preview && { preview }),
        });
      }
    }

    const headerCount = items.filter((i) => i.kind === "header").length;
    const footerCount = items.filter((i) => i.kind === "footer").length;

    return success({
      headerCount,
      footerCount,
      items,
    });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return error("FILE_NOT_FOUND", `File not found: ${filePath}`);
    }
    return error("PARSE_ERROR", `Failed to parse DOCX: ${(err as Error).message}`);
  }
}
