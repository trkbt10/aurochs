/**
 * @file src/pdf/parser/pdf-page-info.native.spec.ts
 */

import { readFileSync } from "node:fs";
import { getPdfPageCount, getPdfPageDimensions } from "./pdf-parser";
import { getPdfFixturePath } from "../../test-utils/pdf-fixtures";

describe("PDF page info (native loader)", () => {
  it("reads page count from xref-stream fixture", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("multi-page.pdf")));
    await expect(getPdfPageCount(bytes)).resolves.toBe(5);
  });

  it("reads page size from xref-stream fixture", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));
    await expect(getPdfPageDimensions(bytes, 1)).resolves.toMatchObject({ width: 612, height: 792 });
  });

  it("reads page size from xref-table fixture", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("ccitt-group4.pdf")));
    const size = await getPdfPageDimensions(bytes, 1);
    expect(size).not.toBeNull();
    expect(Math.round(size!.width)).toBe(15);
    expect(Math.round(size!.height)).toBe(15);
  });
});
