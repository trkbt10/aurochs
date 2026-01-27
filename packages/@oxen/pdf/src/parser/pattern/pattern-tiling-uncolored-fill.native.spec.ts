/**
 * @file src/pdf/parser/pattern-tiling-uncolored-fill.native.spec.ts
 */

import { parsePdf } from "../core/pdf-parser";

function buildMinimalPdfWithTilingPattern(args: {
  readonly content: string;
  readonly patternStream: string;
  readonly paintType: 1 | 2;
}): Uint8Array {
  const contentStream = `${args.content}\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;
  const patternLength = new TextEncoder().encode(args.patternStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] " +
      "/Resources << /Pattern << /P1 5 0 R >> >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    5:
      `<< /Type /Pattern /PatternType 1 /PaintType ${args.paintType} /TilingType 1 ` +
      `/BBox [0 0 1 1] /XStep 2 /YStep 2 /Matrix [1 0 0 1 0 0] /Length ${patternLength} >>\n` +
      `stream\n${args.patternStream}\nendstream`,
  };

  const header = "%PDF-1.4\n";
  const order = [1, 2, 3, 4, 5];
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

  return new TextEncoder().encode(parts.join("") + xrefLines.join("") + trailer);
}

describe("PatternType 1 (tiling pattern) uncolored fill (native)", () => {
  it("rasterizes an uncolored tiling pattern (PaintType 2) using scn base color", async () => {
    const bytes = buildMinimalPdfWithTilingPattern({
      content: "[/Pattern /DeviceRGB] cs 0 1 0 /P1 scn 0 0 10 10 re f",
      // Uncolored pattern cell: paint a 1x1 square (color comes from scn base components).
      patternStream: "0 0 1 1 re f",
      paintType: 2,
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}
    expect(image.width).toBe(10);
    expect(image.height).toBe(10);

    const idxHit = 9 * image.width + 0; // row 9 ~ y=0.5, col 0 ~ x=0.5
    const idxGap = 9 * image.width + 1; // x=1.5 is outside cell bbox (gap)
    expect(image.data[idxHit * 3]).toBe(0);
    expect(image.data[idxHit * 3 + 1]).toBe(255);
    expect(image.data[idxHit * 3 + 2]).toBe(0);
    expect(image.alpha?.[idxHit]).toBe(255);
    expect(image.alpha?.[idxGap]).toBe(0);
  });
});
