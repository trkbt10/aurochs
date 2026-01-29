/**
 * @file Regression test: text decoding for KJ00006456532.pdf (Japan1 CID fonts)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parsePdf, type PdfText } from "@oxen/pdf";

const PDF_PATH = path.resolve("fixtures/samples/KJ00006456532.pdf");

describe("PDF text decoding (KJ00006456532.pdf)", () => {
  it("decodes Japan1 CID text without replacement characters", async () => {
    const bytes = fs.readFileSync(PDF_PATH);
    const doc = await parsePdf(bytes, { pages: [1], encryption: { mode: "ignore" } });

    const page = doc.pages[0];
    if (!page) {
      throw new Error("Expected at least 1 page");
    }

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    expect(texts.length).toBeGreaterThan(0);

    // This fixture contains Japan1 CID fonts.
    const japan1Texts = texts.filter((t) => t.cidOrdering === "Japan1");
    expect(japan1Texts.length).toBeGreaterThan(0);

    // No U+FFFD indicates CID→Unicode mapping is working.
    expect(japan1Texts.some((t) => t.text.includes("\uFFFD"))).toBe(false);

    const all = japan1Texts.map((t) => t.text).join("").replace(/\s+/g, "");
    expect(all).toContain("芥川龍之介");
    expect(all).toContain("将軍");
    expect(all).toContain("改造");
  });
});
