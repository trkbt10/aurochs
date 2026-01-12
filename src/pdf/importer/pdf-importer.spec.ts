import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { px } from "../../ooxml/domain/units";
import { importPdf, importPdfFromFile, importPdfFromUrl, PdfImportError } from "./pdf-importer";

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

async function createPdfBytes(pages: readonly { readonly width: number; readonly height: number }[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  for (const p of pages) {
    pdf.addPage([p.width, p.height]);
  }

  return await pdf.save();
}

async function createPdfBytesWithContent(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();

  const page = pdf.addPage([200, 200]);
  page.drawRectangle({
    x: 10,
    y: 10,
    width: 50,
    height: 40,
    borderWidth: 1,
    borderColor: rgb(0, 0, 0),
    color: rgb(1, 0, 0),
  });

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  page.drawText("Hello", { x: 10, y: 180, size: 12, font });

  return await pdf.save();
}

describe("pdf-importer", () => {
  it("imports from ArrayBuffer successfully", async () => {
    const bytes = await createPdfBytes([{ width: 200, height: 200 }] as const);
    const result = await importPdf(toArrayBuffer(bytes));

    expect(result.pageCount).toBe(1);
    expect(result.document.slides).toHaveLength(1);
    expect(result.pageStats).toHaveLength(1);
  });

  it("imports from File successfully", async () => {
    const bytes = await createPdfBytes([{ width: 200, height: 200 }] as const);
    const file = new File([toArrayBuffer(bytes)], "test.pdf", { type: "application/pdf" });
    const result = await importPdfFromFile(file);

    expect(result.pageCount).toBe(1);
    expect(result.document.slides).toHaveLength(1);
  });

  it("imports from URL successfully", async () => {
    const bytes = await createPdfBytes([{ width: 200, height: 200 }] as const);
    const base64 = Buffer.from(bytes).toString("base64");
    const url = `data:application/pdf;base64,${base64}`;

    const result = await importPdfFromUrl(url);
    expect(result.pageCount).toBe(1);
    expect(result.document.slides).toHaveLength(1);
  });

  it("respects pages option (1-based)", async () => {
    const bytes = await createPdfBytes([
      { width: 200, height: 200 },
      { width: 200, height: 200 },
      { width: 200, height: 200 },
    ] as const);

    const result = await importPdf(bytes, { pages: [2, 3] } as const);

    expect(result.pageCount).toBe(2);
    expect(result.document.slides).toHaveLength(2);
    expect(result.pageStats.map((s) => s.pageNumber)).toEqual([2, 3]);
  });

  it("sets slide size when provided", async () => {
    const bytes = await createPdfBytes([{ width: 1600, height: 900 }] as const);
    const result = await importPdf(bytes, {
      slideSize: { width: px(111), height: px(222) },
    });

    expect(result.document.slideWidth).toBe(px(111));
    expect(result.document.slideHeight).toBe(px(222));
    expect(result.document.presentation.slideSize).toEqual({ width: px(111), height: px(222) });
  });

  it("collects page stats correctly", async () => {
    const bytes = await createPdfBytesWithContent();
    const result = await importPdf(bytes, {
      slideSize: { width: px(200), height: px(200) },
      addPageNumbers: true,
      setWhiteBackground: true,
    });

    expect(result.pageCount).toBe(1);
    expect(result.pageStats).toHaveLength(1);

    const stats = result.pageStats[0];
    expect(stats).toEqual({
      pageNumber: 1,
      shapeCount: 3,
      pathCount: 1,
      textCount: 1,
      imageCount: 0,
    });
  });

  it("wraps parse errors as PdfImportError", async () => {
    const invalid = new Uint8Array([0x00, 0x01, 0x02]);

    await expect(importPdf(invalid)).rejects.toMatchObject({
      name: "PdfImportError",
      code: "INVALID_PDF",
    } satisfies Partial<PdfImportError>);
  });
});
