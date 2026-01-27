/**
 * @file src/pdf/parser/pattern-shading-fill.native.spec.ts
 */

import { parsePdf } from "../core/pdf-parser";

function buildMinimalPdfWithShadingPattern(args: {
  readonly content: string;
  readonly patternDict: string;
}): Uint8Array {
  const contentStream = `${args.content}\n`;
  const contentLength = new TextEncoder().encode(contentStream).length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 10 10] " +
      "/Resources << /Pattern << /P1 5 0 R >> >> " +
      "/Contents 4 0 R >>",
    4: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    5: args.patternDict,
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

function rgbAt(image: { data: Uint8Array; width: number }, row: number, col: number): readonly [number, number, number] {
  const idx = row * image.width + col;
  const o = idx * 3;
  return [image.data[o] ?? 0, image.data[o + 1] ?? 0, image.data[o + 2] ?? 0] as const;
}

describe("PatternType 2 (shading pattern) fill (native)", () => {
  it("rasterizes a shading-pattern fill and applies path coverage as alpha", async () => {
    const bytes = buildMinimalPdfWithShadingPattern({
      content: "/Pattern cs /P1 scn 0 0 m 10 0 l 0 10 l h f",
      patternDict:
        "<< /Type /Pattern /PatternType 2 /Matrix [1 0 0 1 0 0] " +
        "/Shading << /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 10 0] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/Extend [true true] >> >>",
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}
    expect(image.width).toBe(10);
    expect(image.height).toBe(10);

    // Inside triangle at (0.5,0.5) → mostly red.
    expect(rgbAt(image, 9, 0)).toEqual([242, 0, 13]);
    expect(image.alpha?.[9 * image.width + 0]).toBe(255);

    // Outside triangle at (9.5,9.5) → transparent.
    expect(image.alpha?.[0 * image.width + 9]).toBe(0);
  });

  it("preserves pattern across q/Q (fill state) and clears it when a solid color is set", async () => {
    const bytes = buildMinimalPdfWithShadingPattern({
      content:
        "/Pattern cs /P1 scn " +
        "q 0.2 g 0 0 10 10 re f Q " +
        "0 0 m 10 0 l 0 10 l h f",
      patternDict:
        "<< /Type /Pattern /PatternType 2 /Matrix [1 0 0 1 0 0] " +
        "/Shading << /ShadingType 2 /ColorSpace /DeviceRGB /Coords [0 0 10 0] " +
        "/Function << /FunctionType 2 /Domain [0 1] /C0 [1 0 0] /C1 [0 0 1] /N 1 >> " +
        "/Extend [true true] >> >>",
    });

    const doc = await parsePdf(bytes, { shadingMaxSize: 10 });
    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    const paths = doc.pages[0]!.elements.filter((e) => e.type === "path");

    expect(paths).toHaveLength(1);
    expect(images).toHaveLength(1);
  });
});
