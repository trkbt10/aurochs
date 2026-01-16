import { describe, expect, it } from "vitest";
import { parsePdfNative } from "./pdf-parser.native";

function buildMinimalPdfWithExtGStateAlpha(args: {
  readonly ca: number;
  readonly CA: number;
}): Uint8Array {
  const contentStream = "q /GS1 gs 0 0 10 10 re f Q\n";
  const contentLength = new TextEncoder().encode(contentStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 100 100] " +
      "/Resources << /ExtGState << /GS1 4 0 R >> >> " +
      "/Contents 5 0 R >>",
    4: `<< /Type /ExtGState /ca ${args.ca} /CA ${args.CA} >>`,
    5: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5];
  const parts: string[] = [header];
  const offsets: number[] = [0];

  let cursor = header.length;
  for (const n of order) {
    offsets[n] = cursor;
    const body = `${n} 0 obj\n${objects[n]}\nendobj\n`;
    parts.push(body);
    cursor += body.length;
  }

  const xrefStart = cursor;
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

describe("ExtGState alpha (native)", () => {
  it("applies /ca and /CA via gs operator to parsed elements", async () => {
    const bytes = buildMinimalPdfWithExtGStateAlpha({ ca: 0.5, CA: 0.25 });
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");
    expect(paths).toHaveLength(1);
    const path = paths[0]!;
    if (path.type !== "path") throw new Error("Expected path");
    expect(path.graphicsState.fillAlpha).toBeCloseTo(0.5);
    expect(path.graphicsState.strokeAlpha).toBeCloseTo(0.25);
  });
});

