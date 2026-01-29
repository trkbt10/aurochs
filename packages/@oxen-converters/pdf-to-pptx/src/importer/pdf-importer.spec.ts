/**
 * @file src/pdf/importer/pdf-importer.spec.ts
 */

import { existsSync, readFileSync } from "node:fs";
import { px } from "@oxen-office/ooxml/domain/units";
import { importPdf, importPdfFromFile, importPdfFromUrl, PdfImportError } from "./pdf-importer";
import { buildSimplePdfBytes } from "../test-utils/simple-pdf";
import { getSampleFixturePath } from "../test-utils/pdf-fixtures";

function createConsoleWarnSpy(): Readonly<{
  readonly calls: readonly ReadonlyArray<unknown>[];
  readonly restore: () => void;
}> {
  const calls: ReadonlyArray<unknown>[] = [];
  const original = console.warn;

  console.warn = (...args: unknown[]) => {
    calls.push(args);
  };

  const restore = (): void => {
    console.warn = original;
  };

  return { calls, restore };
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  if (bytes.buffer instanceof ArrayBuffer) {
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  }
  const out = new Uint8Array(bytes.byteLength);
  out.set(bytes);
  return out.buffer;
}

async function createPdfBytes(pages: readonly { readonly width: number; readonly height: number }[]): Promise<Uint8Array> {
  return buildSimplePdfBytes({
    pages: pages.map((p) => ({ width: p.width, height: p.height })),
    info: { title: "test.pdf" },
  });
}

async function createPdfBytesWithContent(): Promise<Uint8Array> {
  const content = [
    "0 0 0 RG",
    "1 0 0 rg",
    "1 w",
    "10 10 50 40 re",
    "B",
    "BT",
    "/F1 12 Tf",
    "10 180 Td",
    "(Hello) Tj",
    "ET",
  ].join("\n");

  return buildSimplePdfBytes({
    pages: [
      {
        width: 200,
        height: 200,
        content,
        includeHelvetica: true,
      },
    ],
    info: { title: "test.pdf" },
  });
}

async function createPdfBytesWithTableLikeText(): Promise<Uint8Array> {
  const fontSize = 12;
  const left = 20;
  const colGap = 90;
  const top = 170;
  const rowGap = 14;

  const lines: string[] = [
    "0 0 0 rg",
  ];

  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 3; col++) {
      const x = left + col * colGap;
      const y = top - row * rowGap;
      const text = `R${row}C${col}`;
      lines.push(
        "BT",
        `/F1 ${fontSize} Tf`,
        `1 0 0 1 ${x} ${y} Tm`,
        `(${text}) Tj`,
        "ET",
      );
    }
  }

  return buildSimplePdfBytes({
    pages: [
      {
        width: 400,
        height: 240,
        content: lines.join("\n"),
        includeHelvetica: true,
      },
    ],
    info: { title: "table-like.pdf" },
  });
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

  (existsSync(getSampleFixturePath("000459554.pdf")) ? it : it.skip)(
    "rejects encrypted PDFs with ENCRYPTED_PDF",
    async () => {
      const bytes = new Uint8Array(readFileSync(getSampleFixturePath("000459554.pdf")));

      await expect(importPdf(bytes)).rejects.toBeInstanceOf(PdfImportError);
      await expect(importPdf(bytes)).rejects.toMatchObject({ code: "ENCRYPTED_PDF" });
    },
    30_000,
  );

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

  it("defaults to text-only grouping (no table conversion)", async () => {
    const bytes = await createPdfBytesWithTableLikeText();

    const result = await importPdf(bytes, {
      slideSize: { width: px(400), height: px(240) },
    });

    const shapes = result.document.slides[0]?.slide.shapes ?? [];
    expect(shapes.some((s) => s.type === "graphicFrame")).toBe(false);
  });

  it("can enable full grouping (table conversion) explicitly", async () => {
    const bytes = await createPdfBytesWithTableLikeText();

    const result = await importPdf(bytes, {
      slideSize: { width: px(400), height: px(240) },
      grouping: {
        preset: "full",
        text: {
          type: "spatial",
          options: {
            enableColumnSeparation: false,
            enablePageColumnDetection: false,
            // Keep rows intact (avoid splitting per cell); table inference will segment cells.
            horizontalGapRatio: 1_000,
          },
        },
      },
    });

    const shapes = result.document.slides[0]?.slide.shapes ?? [];
    expect(shapes.some((s) => s.type === "graphicFrame")).toBe(true);
  });

  it("wraps parse errors as PdfImportError", async () => {
    const invalid = new Uint8Array([0x00, 0x01, 0x02]);

    await expect(importPdf(invalid)).rejects.toMatchObject({
      name: "PdfImportError",
      code: "INVALID_PDF",
    } satisfies Partial<PdfImportError>);
  });

  it("uses a data URL-based ResourceResolver", async () => {
    const bytes = await createPdfBytes([{ width: 200, height: 200 }] as const);
    const result = await importPdf(bytes);
    const resolver = result.document.resources;

    const dataUrl = "data:image/png;base64,AAAA";
    expect(resolver.resolve(dataUrl)).toBe(dataUrl);
    expect(resolver.getMimeType(dataUrl)).toBe("image/png");

    const warnSpy = createConsoleWarnSpy();
    expect(resolver.resolve("file:///tmp/image.png")).toBeUndefined();
    expect(warnSpy.calls).toHaveLength(1);
    warnSpy.restore();

    expect(resolver.getMimeType("file:///tmp/image.png")).toBeUndefined();
    expect(resolver.getFilePath("file:///tmp/image.png")).toBeUndefined();
    expect(resolver.readFile("/tmp/image.png")).toBeNull();
  });
});
