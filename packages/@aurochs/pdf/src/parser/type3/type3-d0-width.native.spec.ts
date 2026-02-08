/**
 * @file Type3 width fallback (d0/d1) (native parser)
 */

import type { PdfPath } from "../../domain";
import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithType3D0Width(): Uint8Array {
  const pageContent = "BT /F1 10 Tf 0 0 Td (AA) Tj ET\n";
  const pageContentLen = new TextEncoder().encode(pageContent).length;

  // d0: wx=120 (glyph space), wy ignored. With FontMatrix a=0.01 => widthScale=10,
  // so width1000 = 1200 and dx points = 1200 * 10 / 1000 = 12.
  const charProcStream = "120 0 d0 0 0 100 100 re f\n";
  const charProcLen = new TextEncoder().encode(charProcStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 9 0 R >>",
    4:
      "<< /Type /Font /Subtype /Type3 /Name /F1 " +
      "/FontBBox [0 0 1000 1000] " +
      "/FontMatrix [0.01 0 0 0.01 0 0] " +
      "/CharProcs << /A 5 0 R >> " +
      "/Encoding << /Differences [65 /A] >> " +
      "/FirstChar 65 /LastChar 65 " +
      "/Resources << >> >>",
    5: `<< /Length ${charProcLen} >>\nstream\n${charProcStream}endstream`,
    9: `<< /Length ${pageContentLen} >>\nstream\n${pageContent}endstream`,
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

describe("Type3 width fallback (d0/d1) (native)", () => {
  it("uses d0 width for glyph placement when /Widths is missing", async () => {
    const bytes = buildMinimalPdfWithType3D0Width();
    const doc = await parsePdfNative(bytes);
    const page = doc.pages[0]!;

    const paths = page.elements.filter((e): e is PdfPath => e.type === "path");
    expect(paths).toHaveLength(2);

    // Each glyph draws a 10x10 rectangle (after 0.01*10 scaling).
    // Second glyph should be shifted by dx=12, so its rect is at x=[12..22].
    const firstMove = paths[0]!.operations[0];
    const secondMove = paths[1]!.operations[0];
    expect(firstMove).toEqual({ type: "moveTo", point: { x: 0, y: 0 } });
    expect(secondMove).toEqual({ type: "moveTo", point: { x: 12, y: 0 } });
  });
});
