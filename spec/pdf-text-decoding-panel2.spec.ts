/**
 * @file Regression test: text decoding for panel2.pdf (Japan1 CID fonts without ToUnicode)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { parsePdf, type PdfText } from "@oxen/pdf";

const PDF_PATH = path.resolve("fixtures/samples/panel2.pdf");

describe("PDF text decoding (panel2.pdf)", () => {
  it("decodes Japan1 Type0 text without mojibake", async () => {
    const bytes = fs.readFileSync(PDF_PATH);
    const doc = await parsePdf(bytes, { pages: [1] });

    const page = doc.pages[0];
    if (!page) {
      throw new Error("Expected at least 1 page");
    }

    const texts = page.elements.filter((e): e is PdfText => e.type === "text");
    expect(texts.length).toBeGreaterThan(0);

    const japan1Texts = texts.filter((t) => t.cidOrdering === "Japan1");
    expect(japan1Texts.length).toBeGreaterThan(0);

    // No raw-byte artifacts (e.g. "\u0000C") or replacement characters should remain after decoding.
    expect(japan1Texts.every((t) => !t.text.includes("\u0000"))).toBe(true);
    expect(japan1Texts.every((t) => !t.text.includes("\uFFFD"))).toBe(true);

    // No half-width kana should appear for Japan1 text after decoding.
    expect(japan1Texts.some((t) => /[\uFF61-\uFF9F]/u.test(t.text))).toBe(false);

    // Spot-check long / multi-block content (the bunko.jp paragraph + tagline).
    const bucketed = new Map<number, PdfText[]>();
    for (const t of japan1Texts) {
      const y = Math.round((t.y as number) * 2); // 0.5pt bucket
      const list = bucketed.get(y) ?? [];
      list.push(t);
      bucketed.set(y, list);
    }

    const lineYs = [...bucketed.keys()].sort((a, b) => b - a);
    const lines = lineYs.map((y) => {
      const items = bucketed.get(y) ?? [];
      const sorted = items.slice().sort((a, b) => (a.x as number) - (b.x as number));
      return sorted.map((t) => t.text).join("");
    });

    const normalized = lines.join("\n").replace(/\s+/g, "");

    expect(normalized).toContain(
      "bunko.jp（大文庫）は、世界中のパブリックドメイン作品を収集・翻訳し、日本語で読みやすく公開するオンライン文庫です。",
    );
    expect(normalized).toContain("世界の物語を、日本語でひらく。");
  });
});
