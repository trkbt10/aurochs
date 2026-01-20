import JSZip from "jszip";
import { createGetZipTextFileContentFromBytes } from "./ooxml-zip";

describe("files/ooxml-zip", () => {
  it("returns a getFileContent function that reads text entries", async () => {
    const zip = new JSZip();
    zip.file("xl/workbook.xml", "<workbook/>");
    const bytes = await zip.generateAsync({ type: "uint8array" });

    const getFileContent = await createGetZipTextFileContentFromBytes(bytes);
    await expect(getFileContent("xl/workbook.xml")).resolves.toBe("<workbook/>");
    await expect(getFileContent("missing.xml")).resolves.toBeUndefined();
  });
});

