import { readFileSync } from "node:fs";
import { getPdfPageCount, getPdfPageDimensions } from "./pdf-parser";

describe("PDF page info (native loader)", () => {
  it("reads page count from xref-stream fixture", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/multi-page.pdf"));
    await expect(getPdfPageCount(bytes)).resolves.toBe(5);
  });

  it("reads page size from xref-stream fixture", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/simple-rect.pdf"));
    await expect(getPdfPageDimensions(bytes, 1)).resolves.toMatchObject({ width: 612, height: 792 });
  });

  it("reads page size from xref-table fixture", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const size = await getPdfPageDimensions(bytes, 1);
    expect(size).not.toBeNull();
    expect(Math.round(size!.width)).toBe(15);
    expect(Math.round(size!.height)).toBe(15);
  });
});
