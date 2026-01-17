/**
 * @file Embedded font investigation (native loader)
 *
 * Keeps a lightweight diagnostic around how embedded fonts are represented
 * in real PDFs (e.g., Type0/CID fonts with FontFile3).
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { loadNativePdfDocument } from "../native";
import type { PdfDict, PdfObject, PdfName } from "../native";
import { extractEmbeddedFontsFromNativePages } from "../domain/font/font-extractor.native";

function asDict(obj: PdfObject | undefined): PdfDict | null {
  return obj?.type === "dict" ? obj : null;
}

function asName(obj: PdfObject | undefined): PdfName | null {
  return obj?.type === "name" ? obj : null;
}

function dictGet(dict: PdfDict, key: string): PdfObject | undefined {
  return dict.map.get(key);
}

describe("Embedded font investigation (native)", () => {
  it("inspects font dictionaries in cjk-test.pdf", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = loadNativePdfDocument(buffer, { encryption: { mode: "ignore" } });
    const page = pdfDoc.getPages()[0];
    if (!page) {return;}

    const resources = page.getResourcesDict();
    if (!resources) {
      console.log("No Resources dictionary found");
      expect(false).toBe(true);
      return;
    }

    const fontsDict = asDict(page.lookup(dictGet(resources, "Font")!));
    if (!fontsDict) {
      console.log("No Font dictionary found");
      expect(false).toBe(true);
      return;
    }

    for (const [fontName, fontRef] of fontsDict.map.entries()) {
      const fontDict = asDict(page.lookup(fontRef));
      if (!fontDict) {continue;}

      const subtypeObj = dictGet(fontDict, "Subtype");
      const baseFontObj = dictGet(fontDict, "BaseFont");
      const subtype = subtypeObj ? (asName(page.lookup(subtypeObj))?.value ?? null) : null;
      const baseFont = baseFontObj ? (asName(page.lookup(baseFontObj))?.value ?? null) : null;

      console.log(`Font resource: ${fontName}`);
      console.log(`  Subtype: ${subtype ?? "unknown"}`);
      console.log(`  BaseFont: ${baseFont ?? "unknown"}`);

      // Check for FontDescriptor presence (Type0 => DescendantFonts[0]/FontDescriptor)
      const hasFontDescriptor = Boolean(dictGet(fontDict, "FontDescriptor") || dictGet(fontDict, "DescendantFonts"));
      console.log(`  Has descriptor path: ${hasFontDescriptor}`);
    }

    expect(true).toBe(true);
  });

  it("extracts embedded fonts when available", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = loadNativePdfDocument(buffer, { encryption: { mode: "ignore" } });
    const fonts = extractEmbeddedFontsFromNativePages(pdfDoc.getPages());

    expect(fonts.length).toBeGreaterThan(0);
    expect(fonts.some((f) => f.fontFamily.includes("Hiragino") || f.fontFamily.includes("PingFang"))).toBe(true);
  }, 30_000);
});
