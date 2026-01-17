/**
 * @file src/pdf/native/document.spec.ts
 */

import { readFileSync } from "node:fs";
import { loadNativePdfDocument } from "./document";

function pad10(n: number): string {
  return String(n).padStart(10, "0");
}

function buildMinimalXrefTable(
  entries: ReadonlyArray<{ readonly obj: number; readonly offset: number; readonly gen: number }>,
  size: number,
): string {
  const byObj = new Map<number, { offset: number; gen: number }>(entries.map((e) => [e.obj, { offset: e.offset, gen: e.gen }]));
  const lines: string[] = ["xref", `0 ${size}`, "0000000000 65535 f "];
  for (let obj = 1; obj < size; obj += 1) {
    const e = byObj.get(obj);
    if (!e) {
      lines.push("0000000000 00000 f ");
      continue;
    }
    lines.push(`${pad10(e.offset)} ${String(e.gen).padStart(5, "0")} n `);
  }
  return `${lines.join("\n")}\n`;
}

function buildPdfWithSinglePage(options: {
  readonly mediaBox: readonly [number, number, number, number];
  readonly cropBox?: readonly [number, number, number, number];
  readonly rotate?: number;
  readonly userUnit?: number;
  readonly parentBoxes?: Readonly<{
    readonly BleedBox?: readonly [number, number, number, number];
    readonly TrimBox?: readonly [number, number, number, number];
    readonly ArtBox?: readonly [number, number, number, number];
  }>;
}): Uint8Array {
  const header = "%PDF-1.7\n";
  const obj1 = "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n";
  const parentBoxes = (() => {
    const p = options.parentBoxes;
    if (!p) {return "";}
    const parts: string[] = [];
    if (p.BleedBox) {parts.push(`/BleedBox [${p.BleedBox.join(" ")}]`);}
    if (p.TrimBox) {parts.push(`/TrimBox [${p.TrimBox.join(" ")}]`);}
    if (p.ArtBox) {parts.push(`/ArtBox [${p.ArtBox.join(" ")}]`);}
    return parts.length > 0 ? " " + parts.join(" ") : "";
  })();
  const obj2 = `2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R]${parentBoxes} >>\nendobj\n`;

  const mb = options.mediaBox.join(" ");
  const cb = options.cropBox ? ` /CropBox [${options.cropBox.join(" ")}]` : "";
  const rot = options.rotate != null ? ` /Rotate ${options.rotate}` : "";
  const uu = options.userUnit != null ? ` /UserUnit ${options.userUnit}` : "";
  const obj3 =
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [${mb}]${cb}${rot}${uu} /Contents 4 0 R >>\nendobj\n`;

  const obj4 = "4 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n";

  const offset1 = header.length;
  const offset2 = offset1 + obj1.length;
  const offset3 = offset2 + obj2.length;
  const offset4 = offset3 + obj3.length;

  const xrefOffset = offset4 + obj4.length;
  const xref = buildMinimalXrefTable(
    [
      { obj: 1, offset: offset1, gen: 0 },
      { obj: 2, offset: offset2, gen: 0 },
      { obj: 3, offset: offset3, gen: 0 },
      { obj: 4, offset: offset4, gen: 0 },
    ],
    5,
  );

  const trailer =
    "trailer\n" +
    "<< /Size 5 /Root 1 0 R >>\n" +
    "startxref\n" +
    `${xrefOffset}\n` +
    "%%EOF\n";

  return new Uint8Array([
    ...new TextEncoder().encode(header),
    ...new TextEncoder().encode(obj1),
    ...new TextEncoder().encode(obj2),
    ...new TextEncoder().encode(obj3),
    ...new TextEncoder().encode(obj4),
    ...new TextEncoder().encode(xref),
    ...new TextEncoder().encode(trailer),
  ]);
}

describe("NativePdfDocument", () => {
  it("loads pdf-lib fixtures (xref stream + objstm)", () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/simple-rect.pdf"));
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });

    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0];
    expect(page).toBeDefined();

    const size = page!.getSize();
    expect(Math.round(size.width)).toBe(612);
    expect(Math.round(size.height)).toBe(792);

    const contents = page!.getDecodedContentStreams();
    expect(contents.length).toBeGreaterThan(0);
    const contentText = new TextDecoder("latin1").decode(contents[0]);
    // pdf-lib output should contain path construction + painting operators.
    expect(contentText).toMatch(/\bm\b/);
    expect(contentText).toMatch(/\bB\b/);
  });

  it("loads xref-table fixtures", () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    expect(doc.getPageCount()).toBe(1);

    const page = doc.getPages()[0]!;
    const contents = page.getDecodedContentStreams();
    expect(contents.length).toBe(1);
    const contentText = new TextDecoder("latin1").decode(contents[0]);
    expect(contentText).toContain("/Im1");
    expect(contentText).toMatch(/\bDo\b/);
  });

  it("uses CropBox and Rotate to compute displayed page size", () => {
    const bytes = buildPdfWithSinglePage({
      mediaBox: [0, 0, 100, 200],
      cropBox: [0, 0, 50, 60],
      rotate: 90,
    });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    const size = doc.getPages()[0]!.getSize();
    expect(size.width).toBe(60);
    expect(size.height).toBe(50);
  });

  it("applies UserUnit scaling to page size", () => {
    const bytes = buildPdfWithSinglePage({
      mediaBox: [0, 0, 100, 200],
      userUnit: 2,
    });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    const size = doc.getPages()[0]!.getSize();
    expect(size.width).toBe(200);
    expect(size.height).toBe(400);
  });

  it("defaults BleedBox/TrimBox/ArtBox to CropBox (and CropBox to MediaBox)", () => {
    const bytes = buildPdfWithSinglePage({
      mediaBox: [0, 0, 100, 200],
      cropBox: [0, 0, 10, 20],
    });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    const page = doc.getPages()[0]!;
    expect(page.getBox("BleedBox")).toEqual([0, 0, 10, 20]);
    expect(page.getBox("TrimBox")).toEqual([0, 0, 10, 20]);
    expect(page.getBox("ArtBox")).toEqual([0, 0, 10, 20]);
  });

  it("inherits BleedBox/TrimBox/ArtBox from Pages node", () => {
    const bytes = buildPdfWithSinglePage({
      mediaBox: [0, 0, 100, 200],
      cropBox: [0, 0, 10, 20],
      parentBoxes: {
        BleedBox: [0, 0, 1, 2],
        TrimBox: [0, 0, 3, 4],
        ArtBox: [0, 0, 5, 6],
      },
    });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    const page = doc.getPages()[0]!;
    expect(page.getBox("BleedBox")).toEqual([0, 0, 1, 2]);
    expect(page.getBox("TrimBox")).toEqual([0, 0, 3, 4]);
    expect(page.getBox("ArtBox")).toEqual([0, 0, 5, 6]);
  });
});
