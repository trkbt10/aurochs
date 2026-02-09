/**
 * @file Shared document file loader (supports both .docx and .doc)
 */

import * as fs from "node:fs/promises";
import { extname } from "node:path";
import { loadDocx, type DocxDocument } from "@aurochs-office/docx";

/**
 * Load a document file (.docx or .doc).
 * For .doc files, converts to DOCX in-memory first, then loads through the normal DOCX path.
 */
export async function loadDocument(filePath: string): Promise<DocxDocument> {
  const buffer = await fs.readFile(filePath);
  if (extname(filePath).toLowerCase() === ".doc") {
    // eslint-disable-next-line no-restricted-syntax -- lazy import to avoid loading .doc converter unless needed
    const { convert } = await import("@aurochs-converters/doc-to-docx");
    const { data } = await convert(new Uint8Array(buffer));
    return loadDocx(data);
  }
  return loadDocx(buffer);
}
