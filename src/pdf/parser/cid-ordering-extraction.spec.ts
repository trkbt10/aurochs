/**
 * @file Test CIDOrdering extraction from actual PDF files
 *
 * Tests PDF spec-based CID ordering extraction (ISO 32000-1 Section 9.7.3).
 * CIDSystemInfo dictionary contains Ordering string that identifies character collection.
 *
 * ## CID Orderings in Practice
 *
 * - **Adobe Character Collections** (Japan1, GB1, CNS1, Korea1):
 *   Traditional Adobe tools use these. CIDOrdering provides script type.
 *
 * - **Identity-H/V**:
 *   Modern tools (weasyprint, etc.) use this. Ordering is "Identity" which
 *   does not indicate script type. ToUnicode CMap provides character mapping.
 *
 * Per PDF spec, both approaches are valid. Only Adobe character collection
 * orderings can be used for script type detection.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { px } from "../../ooxml/domain/units";
import { parsePdf } from "./pdf-parser";
import { convertTextToShape } from "../converter/text-to-shapes";
import type { PdfText } from "../domain";
import { createDefaultGraphicsState } from "../domain";
import { buildSimplePdfBytes } from "../test-utils/simple-pdf";

describe("CIDOrdering extraction from real PDFs", () => {
  it("Identity-H encoded CJK PDF has Identity ordering (cjk-test.pdf)", async () => {
    // weasyprint creates PDFs with Identity-H encoding
    // CIDSystemInfo: Registry=Adobe, Ordering=Identity
    // This is valid per PDF spec but doesn't provide script type info
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      throw new Error("cjk-test.pdf not found - run weasyprint to create it");
    }

    const buffer = fs.readFileSync(pdfPath);
    const doc = await parsePdf(buffer);

    expect(doc.pages.length).toBeGreaterThan(0);

    const textElements = doc.pages[0].elements.filter((e): e is PdfText => e.type === "text");
    expect(textElements.length).toBeGreaterThan(0);

    // Identity-H fonts have Identity ordering (not Japan1/GB1/etc.)
    const identityElements = textElements.filter((e) => e.cidOrdering === "Identity");
    expect(identityElements.length).toBeGreaterThan(0);

    // Verify font names are CJK fonts (Hiragino, PingFang)
    const fontNames = textElements.map((e) => e.fontName);
    const hasCJKFont = fontNames.some(
      (name) => name.includes("Hiragino") || name.includes("PingFang")
    );
    expect(hasCJKFont).toBe(true);
  });

  it("Identity ordering triggers Unicode Script fallback (UAX #24)", async () => {
    // Identity-encoded CJK font (like from weasyprint)
    // Script type is detected from text content, not font name
    const pdfText = {
      type: "text" as const,
      text: "日本語テスト", // CJK text triggers eastAsian via UAX #24
      x: 0,
      y: 50,
      width: 60,
      height: 12,
      fontName: "ZRDQJE+SomeFont", // Font name is NOT used for script detection
      fontSize: 12,
      graphicsState: createDefaultGraphicsState(),
      cidOrdering: "Identity" as const, // Identity encoding - no script type info
    };

    const context = {
      pdfWidth: 100,
      pdfHeight: 100,
      slideWidth: px(200),
      slideHeight: px(200),
    };

    const shape = convertTextToShape(pdfText, context, "1");
    const run = shape.textBody?.paragraphs[0]?.runs[0];

    expect(run?.type).toBe("text");
    if (run?.type === "text") {
      // Unicode Script detection (UAX #24) detects CJK text → eastAsian
      expect(run.properties?.fontFamilyEastAsian).toBeDefined();
    }
  });

  it("standard fonts do not have CIDOrdering", async () => {
    const pdfBytes = buildSimplePdfBytes({
      pages: [
        {
          width: 200,
          height: 200,
          includeHelvetica: true,
          content: ["BT", "/F1 12 Tf", "10 180 Td", "(Test) Tj", "ET"].join("\n"),
        },
      ],
      info: { title: "standard-fonts.pdf" },
    });
    const doc = await parsePdf(pdfBytes);

    const textElements = doc.pages[0]?.elements.filter((e): e is PdfText => e.type === "text") ?? [];

    expect(textElements.length).toBeGreaterThan(0);
    // Standard fonts are not Type0/CID fonts, so no CIDOrdering
    expect(textElements[0]?.cidOrdering).toBeUndefined();
  });
});
