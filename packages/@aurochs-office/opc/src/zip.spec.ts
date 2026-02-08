/**
 * @file OOXML zip access helper tests
 */

import { createGetZipTextFileContentFromBytes } from "./zip";
import { createEmptyZipPackage } from "@aurochs/zip";

describe("opc/zip", () => {
  it("returns a getFileContent function that reads text entries", async () => {
    const pkg = createEmptyZipPackage();
    pkg.writeText("xl/workbook.xml", "<workbook/>");
    const bytes = new Uint8Array(await pkg.toArrayBuffer({ compressionLevel: 6 }));

    const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
    await expect(getFileContent("xl/workbook.xml")).resolves.toBe("<workbook/>");
    await expect(getFileContent("missing.xml")).resolves.toBeUndefined();
  });
});
