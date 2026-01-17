/**
 * @file Font extraction and web compatibility test
 *
 * Verifies that PDF embedded fonts are properly extracted and repaired
 * for web rendering (cmap, OS/2, name, post tables added).
 */
import * as fs from "node:fs";
import * as path from "node:path";
import { importPdf } from "./pdf-importer";
import { getTableTags, extractTrueTypeMetrics, normalizeMetricsTo1000 } from "../domain/font";

describe("PDF embedded font extraction", () => {
  it("should extract fonts with all required web tables", async () => {
    const pdfPath = path.resolve("fixtures/samples/k-resource-dl.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("k-resource-dl.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    // Verify fonts are extracted
    expect(document.embeddedFonts).toBeDefined();
    expect(document.embeddedFonts!.length).toBeGreaterThan(0);

    // Required tables for web fonts (OTS sanitizer requirements)
    const requiredTables = ["cmap", "head", "hhea", "hmtx", "maxp", "name", "OS/2", "post"];

    for (const font of document.embeddedFonts!) {
      const tables = getTableTags(font.data);

      // Check all required tables are present
      for (const required of requiredTables) {
        expect(tables).toContain(required);
      }

      // Verify TrueType structure
      expect(tables).toContain("glyf");
      expect(tables).toContain("loca");
    }
  });

  it("should match font families between @font-face and text elements", async () => {
    const pdfPath = path.resolve("fixtures/samples/k-resource-dl.pdf");
    if (!fs.existsSync(pdfPath)) {
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    // Collect font families from embedded fonts
    const embeddedFontFamilies = new Set(
      document.embeddedFonts?.map((f) => f.fontFamily) ?? []
    );

    // Collect font families used in text shapes
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

    // All used fonts should have matching embedded fonts
    for (const fontFamily of usedFontFamilies) {
      expect(embeddedFontFamilies.has(fontFamily)).toBe(true);
    }
  });

  it("should generate valid @font-face CSS", async () => {
    const pdfPath = path.resolve("fixtures/samples/k-resource-dl.pdf");
    if (!fs.existsSync(pdfPath)) {
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    expect(document.embeddedFontCss).toBeDefined();

    // Verify @font-face structure
    const fontFaceRegex = /@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g;
    const cssMatches: string[] = [];
    let match;
    while ((match = fontFaceRegex.exec(document.embeddedFontCss!)) !== null) {
      cssMatches.push(match[1]);
    }

    // Each embedded font should have a @font-face rule
    expect(cssMatches.length).toBe(document.embeddedFonts!.length);

    for (const font of document.embeddedFonts!) {
      expect(cssMatches).toContain(font.fontFamily);
    }
  });

  it("should extract font metrics from hhea table", async () => {
    const pdfPath = path.resolve("fixtures/samples/k-resource-dl.pdf");
    if (!fs.existsSync(pdfPath)) {
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const data = new Uint8Array(buffer);
    const result = await importPdf(data);
    const { document } = result;

    // Verify embedded fonts have metrics
    expect(document.embeddedFonts).toBeDefined();
    expect(document.embeddedFonts!.length).toBeGreaterThan(0);

    // Check that we can extract metrics from each TrueType font
    for (const font of document.embeddedFonts!) {
      if (font.format !== "truetype") {continue;}

      const rawMetrics = extractTrueTypeMetrics(font.data);
      expect(rawMetrics).not.toBeNull();

      if (rawMetrics) {
        // unitsPerEm should be a standard value (typically 1000 or 2048)
        expect(rawMetrics.unitsPerEm).toBeGreaterThan(0);
        expect(rawMetrics.unitsPerEm).toBeLessThanOrEqual(16384);

        // Ascender should be positive
        expect(rawMetrics.ascender).toBeGreaterThan(0);

        // Descender should be negative or zero
        expect(rawMetrics.descender).toBeLessThanOrEqual(0);

        // Normalized metrics should be within reasonable bounds
        const normalized = normalizeMetricsTo1000(rawMetrics);
        expect(normalized.ascender).toBeGreaterThan(0);
        expect(normalized.ascender).toBeLessThan(1500); // Reasonable upper bound
        expect(normalized.descender).toBeLessThanOrEqual(0);
        expect(normalized.descender).toBeGreaterThan(-500); // Reasonable lower bound
      }
    }
  });
});
