import { readFileSync } from "node:fs";
import { parsePdfNative } from "./pdf-parser.native";

describe("parsePdfNative", () => {
  it("parses simple-rect.pdf into paths", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/simple-rect.pdf"));
    const doc = await parsePdfNative(bytes);
    expect(doc.pages).toHaveLength(1);

    const page = doc.pages[0]!;
    const paths = page.elements.filter((e) => e.type === "path");
    expect(paths.length).toBeGreaterThan(0);
  });

  it("parses text-content.pdf into text elements", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/text-content.pdf"));
    const doc = await parsePdfNative(bytes);
    const texts = doc.pages[0]!.elements.filter((e) => e.type === "text");
    expect(texts.length).toBeGreaterThan(0);
    expect(texts.some((t) => t.type === "text" && t.text.includes("Hello World"))).toBe(true);
  });

  it("extracts CCITT image from ccitt-group4.pdf", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/ccitt-group4.pdf"));
    const doc = await parsePdfNative(bytes);
    const images = doc.pages[0]!.elements.filter((e) => e.type === "image");
    expect(images.length).toBe(1);
    const img = images[0];
    if (img?.type === "image") {
      expect(img.width).toBe(64);
      expect(img.height).toBe(64);
    }
  });

  it("extracts embedded fonts from cjk-test.pdf", async () => {
    const bytes = new Uint8Array(readFileSync("spec/fixtures/pdf/cjk-test.pdf"));
    const doc = await parsePdfNative(bytes);
    expect(doc.embeddedFonts?.length).toBeGreaterThan(0);
    expect(doc.embeddedFonts?.some((f) => f.fontFamily.includes("Hiragino"))).toBe(true);
  }, 30_000);
});
