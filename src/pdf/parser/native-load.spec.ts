import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadNativePdfDocumentForParser } from "./native-load";

describe("loadNativePdfDocumentForParser", () => {
  it("loads xref-table fixtures", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const doc = await loadNativePdfDocumentForParser(bytes, {
      purpose: "inspect",
      encryption: { mode: "ignore" },
      updateMetadata: false,
    });
    expect(doc.getPageCount()).toBe(1);
  });

  (existsSync("fixtures/samples/000459554.pdf") ? it : it.skip)(
    "rejects encrypted PDFs with ENCRYPTED_PDF",
    async () => {
      const bytes = new Uint8Array(readFileSync("fixtures/samples/000459554.pdf"));
      await expect(
        loadNativePdfDocumentForParser(bytes, {
          purpose: "parse",
          encryption: { mode: "reject" },
          updateMetadata: false,
        }),
      ).rejects.toMatchObject({ name: "PdfLoadError", code: "ENCRYPTED_PDF" });
    },
    30_000,
  );
});

