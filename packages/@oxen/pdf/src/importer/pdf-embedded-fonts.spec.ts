/**
 * @file Test for embedded font integration in PDF importer
 *
 * Tests that embedded fonts from PDF are extracted and included
 * in the import result for use in rendering.
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { importPdf } from "./pdf-importer";
import { getPdfFixturePath } from "../test-utils/pdf-fixtures";

describe("PDF import with embedded fonts", () => {
  it("should extract embedded fonts from CJK PDF", async () => {
    const pdfPath = getPdfFixturePath("cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);

    const result = await importPdf(data);

    // Check that embedded fonts are included
    expect(result.document.embeddedFonts).toBeDefined();
    expect(result.document.embeddedFonts?.length).toBeGreaterThan(0);

    // Log embedded fonts
    console.log("\nEmbedded fonts:");
    for (const font of result.document.embeddedFonts ?? []) {
      console.log(`  - ${font.fontFamily} (${font.format}, ${font.data.length} bytes)`);
    }
  });

  it("should include font CSS in document", async () => {
    const pdfPath = getPdfFixturePath("cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);

    const result = await importPdf(data);

    // Check that font CSS is generated
    expect(result.document.embeddedFontCss).toBeDefined();
    expect(result.document.embeddedFontCss).toContain("@font-face");
    // Font name is preserved from BaseFont (with hyphen)
    expect(result.document.embeddedFontCss).toContain("Hiragino-Sans");

    // Log CSS preview
    console.log("\nFont CSS (first 300 chars):");
    console.log(result.document.embeddedFontCss?.slice(0, 300) + "...");
  });

  it("should have matching font-family in shapes and embedded fonts", async () => {
    const pdfPath = getPdfFixturePath("cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);

    const result = await importPdf(data);
    const { document } = result;

    // Get all font families used in shapes
    const usedFontFamilies = new Set<string>();
    for (const slideWithId of document.slides) {
      for (const shape of slideWithId.slide.shapes) {
        if (shape.type === "sp" && shape.textBody) {
          for (const para of shape.textBody.paragraphs) {
            for (const run of para.runs) {
              if (run.type === "text" && run.properties?.fontFamily) {
                usedFontFamilies.add(run.properties.fontFamily);
              }
            }
          }
        }
      }
    }

    // Get embedded font families
    const embeddedFontFamilies = new Set(
      document.embeddedFonts?.map((f) => f.fontFamily) ?? []
    );

    console.log("\nUsed font families:", Array.from(usedFontFamilies));
    console.log("Embedded font families:", Array.from(embeddedFontFamilies));

    // Check that at least one used font is embedded
    const overlap = Array.from(usedFontFamilies).filter((f) =>
      embeddedFontFamilies.has(f)
    );
    expect(overlap.length).toBeGreaterThan(0);
  });
});
