import { readFileSync } from "node:fs";
import { getPdfFixturePath } from "@aurochs/pdf/test-utils/pdf-fixtures";
import { buildPdfDocumentForRender, renderPdfSourcePageToSvg, renderPdfSourceToSvgs } from "./pipeline";

describe("@aurochs-renderer/pdf pipeline", () => {
  it("builds PdfDocument and renders all pages from PDF bytes", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));

    const document = await buildPdfDocumentForRender({ data: bytes });
    expect(document.pages).toHaveLength(1);

    const svgs = await renderPdfSourceToSvgs({ data: bytes });
    expect(svgs).toHaveLength(1);
    expect(svgs[0]).toContain("<svg");
    expect(svgs[0]).toContain("<path");
  });

  it("renders a specific 1-indexed page", async () => {
    const bytes = new Uint8Array(readFileSync(getPdfFixturePath("simple-rect.pdf")));

    const page1 = await renderPdfSourcePageToSvg({ data: bytes, pageNumber: 1 });
    expect(page1).toContain("<svg");

    await expect(renderPdfSourcePageToSvg({ data: bytes, pageNumber: 99 })).rejects.toThrow("out of range");
  });
});
