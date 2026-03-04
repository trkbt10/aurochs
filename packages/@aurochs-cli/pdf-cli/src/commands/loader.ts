/**
 * @file Shared PDF binary loader
 */

import * as fs from "node:fs/promises";

/** Load PDF file bytes as Uint8Array. */
export async function loadPdfBinary(filePath: string): Promise<Uint8Array> {
  const buffer = await fs.readFile(filePath);
  return new Uint8Array(buffer);
}
