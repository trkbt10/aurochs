/**
 * @file src/pdf/parser/soft-mask-text-raster.native.spec.ts
 */

import { createDefaultGraphicsState, type PdfSoftMask } from "../../domain";
import type { ParsedText, TextRun } from "../operator";
import type { FontMappings } from "../../domain/font";
import { rasterizeSoftMaskedText } from "./soft-mask-text-raster.native";
import { parsePdfNative } from "../core/pdf-parser.native";

function buildMinimalPdfWithPerPixelLuminositySoftMaskAndText(args: {
  readonly maskGrayByte: number;
  readonly text: string;
  readonly fillRgb: readonly [number, number, number];
}): Uint8Array {
  const { maskGrayByte, text, fillRgb } = args;
  const header = "%PDF-1.4\n";

  const maskHex = [maskGrayByte, maskGrayByte, maskGrayByte]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const maskImageStream = `${maskHex}>`;
  const maskImageLength = maskImageStream.length;

  const maskFormContent = "q\n1 0 0 1 0 0 cm\n/Im1 Do\nQ\n";
  const maskFormLength = maskFormContent.length;

  const contentStream =
    "q\n" +
    "/GS1 gs\n" +
    `${fillRgb[0]} ${fillRgb[1]} ${fillRgb[2]} rg\n` +
    "BT\n" +
    "/F1 10 Tf\n" +
    "0 0 Td\n" +
    `(${text.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)")}) Tj\n` +
    "ET\n" +
    "Q\n";
  const contentLength = contentStream.length;

  const objects: Record<number, string> = {
    1: "<< /Type /Catalog /Pages 2 0 R >>",
    2: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    3:
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] " +
      "/Resources << " +
      "/ExtGState << /GS1 4 0 R >> " +
      "/Font << /F1 9 0 R >> " +
      ">> " +
      "/Contents 8 0 R >>",
    4: "<< /Type /ExtGState /ca 1 /CA 1 /SMask 5 0 R >>",
    5: "<< /S /Luminosity /G 6 0 R >>",
    6:
      "<< /Type /XObject /Subtype /Form /FormType 1 /BBox [0 0 1 1] " +
      "/Group << /S /Transparency /CS /DeviceRGB >> " +
      "/Resources << /XObject << /Im1 7 0 R >> >> " +
      `/Length ${maskFormLength} >>\n` +
      `stream\n${maskFormContent}endstream`,
    7:
      "<< /Type /XObject /Subtype /Image /Width 1 /Height 1 " +
      "/BitsPerComponent 8 /ColorSpace /DeviceRGB /Filter /ASCIIHexDecode " +
      `/Length ${maskImageLength} >>\n` +
      `stream\n${maskImageStream}\nendstream`,
    8: `<< /Length ${contentLength} >>\nstream\n${contentStream}endstream`,
    9: "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  };

  const order = [1, 2, 3, 4, 5, 6, 7, 8, 9];
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

describe("soft mask text rasterization (native)", () => {
  it("rasterizes a soft-masked text bbox into an image (unit)", () => {
    const softMask: PdfSoftMask = {
      kind: "Alpha",
      width: 1,
      height: 1,
      alpha: new Uint8Array([200]),
      bbox: [0, 0, 1, 1],
      matrix: [1, 0, 0, 1, 0, 0] as const,
    };

    const gs = {
      ...createDefaultGraphicsState(),
      ctm: [1, 0, 0, 1, 0, 0] as const,
      fillColor: { colorSpace: "DeviceRGB", components: [1, 0, 0] } as const,
      fillAlpha: 1,
      softMaskAlpha: 1,
      softMask,
      textRenderingMode: 0 as const,
    };

    const run: TextRun = {
      text: "A",
      textMatrix: [1, 0, 0, 1, 0, 0] as const,
      x: 0,
      y: 0,
      fontSize: 10,
      fontName: "/F1",
      endX: 1,
      effectiveFontSize: 10,
      textRise: 0,
      charSpacing: 0,
      wordSpacing: 0,
      horizontalScaling: 100,
      graphicsState: gs,
    };

    const parsed: ParsedText = {
      type: "text",
      runs: [run],
      graphicsState: gs,
    };

    const fontMappings: FontMappings = new Map();
    const image = rasterizeSoftMaskedText(parsed, fontMappings);
    expect(image).not.toBeNull();
    if (!image || image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([200]);
    expect(image.graphicsState.softMask).toBeUndefined();
    expect(image.graphicsState.softMaskAlpha).toBe(1);
  });

  it("parses a per-pixel /SMask and preserves masked text via rasterization (integration)", async () => {
    const bytes = buildMinimalPdfWithPerPixelLuminositySoftMaskAndText({
      maskGrayByte: 0x80,
      text: "A",
      fillRgb: [1, 0, 0] as const,
    });
    const doc = await parsePdfNative(bytes);

    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    const texts = doc.pages[0]!.elements.filter((e) => e.type === "text");

    expect(texts).toHaveLength(0);
    expect(images).toHaveLength(1);

    const image = images[0]!;
    if (image.type !== "image") {throw new Error("Expected image");}

    expect(image.width).toBe(1);
    expect(image.height).toBe(1);
    expect(Array.from(image.data)).toEqual([255, 0, 0]);
    expect(Array.from(image.alpha ?? [])).toEqual([128]);
  });
});
