/**
 * @file Shared presentation file loader (supports both .pptx and .ppt)
 */

import * as fs from "node:fs/promises";
import { extname } from "node:path";
import { loadPptxBundleFromBuffer, type PptxFileBundle } from "@aurochs-office/pptx/app/pptx-loader";
import { convert } from "@aurochs-converters/ppt-to-pptx";

/**
 * Load a presentation file (.pptx or .ppt).
 * For .ppt files, converts to PPTX in-memory first, then loads through the normal PPTX path.
 */
export async function loadPresentationBundle(filePath: string): Promise<PptxFileBundle> {
  const buffer = await fs.readFile(filePath);
  if (extname(filePath).toLowerCase() === ".ppt") {
    const { data } = convert(new Uint8Array(buffer));
    const pptxBuffer = await data.toArrayBuffer();
    return loadPptxBundleFromBuffer(pptxBuffer);
  }
  return loadPptxBundleFromBuffer(buffer);
}
