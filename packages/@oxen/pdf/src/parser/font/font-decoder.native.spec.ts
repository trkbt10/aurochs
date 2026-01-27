/**
 * @file src/pdf/parser/font-decoder.native.spec.ts
 */

import { loadNativePdfDocument } from "../../native";
import { extractFontMappingsNative } from "./font-decoder.native";

function buildMinimalPdfWithType3Font(args: { readonly fontMatrixA: number; readonly widthGlyph: number }): Uint8Array {
  const contentStream = "BT /F1 10 Tf 0 0 Td (A) Tj ET\n";
  const contentLength = new TextEncoder().encode(contentStream).length;
  const charProcStream = "0 0 100 100 re f\n";
  const charProcLength = new TextEncoder().encode(charProcStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 9 0 R >>",
    4:
      "<< /Type /Font /Subtype /Type3 /Name /F1 " +
      "/FontBBox [0 0 1000 1000] " +
      `/FontMatrix [${args.fontMatrixA} 0 0 ${args.fontMatrixA} 0 0] ` +
      "/CharProcs << /A 5 0 R >> " +
      "/Encoding << /Differences [65 /A] >> " +
      "/FirstChar 65 /LastChar 65 " +
      `/Widths [${args.widthGlyph}] ` +
      "/Resources << >> >>",
    5: `<< /Length ${charProcLength} >>\nstream\n${charProcStream}endstream`,
    9: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5, 9];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  const cursor = { value: header.length };
  for (const n of order) {
    offsets[n] = cursor.value;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor.value += body.length;
  }

  const xrefStart = cursor.value;
  const size = Math.max(...order) + 1;
  const xrefLines: string[] = [];
  xrefLines.push("xref\n");
  xrefLines.push(`0 ${size}\n`);
  xrefLines.push("0000000000 65535 f \n");
  for (let i = 1; i < size; i += 1) {
    const off = offsets[i] ?? 0;
    xrefLines.push(`${String(off).padStart(10, "0")} 00000 n \n`);
  }
  const trailer = `trailer\n<< /Size ${size} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const pdfText = parts.join("") + xrefLines.join("") + trailer;
  return new TextEncoder().encode(pdfText);
}

describe("extractFontMappingsNative (Type3 widths)", () => {
  it("scales Type3 /Widths by /FontMatrix", () => {
    // With FontMatrix a=0.01, widths are in glyph space and must be scaled:
    // width1000 = widthGlyph * a * 1000 = widthGlyph * 10
    const bytes = buildMinimalPdfWithType3Font({ fontMatrixA: 0.01, widthGlyph: 100 });
    const doc = loadNativePdfDocument(bytes, { encryption: { mode: "reject" } });
    const page = doc.getPages()[0]!;

    const mappings = extractFontMappingsNative(page);
    const f1 = mappings.get("F1");
    expect(f1).toBeTruthy();
    expect(f1?.metrics.widths.get(65)).toBeCloseTo(1000);
  });
});
