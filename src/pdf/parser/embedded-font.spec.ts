/**
 * @file Test embedded font extraction from PDF
 *
 * PDF fonts can be embedded in the document (ISO 32000-1 Section 9.9).
 * - FontFile: Type 1 font program
 * - FontFile2: TrueType font program
 * - FontFile3: CFF/OpenType font program
 *
 * This test investigates what font data pdf-lib exposes.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  PDFDocument,
  PDFDict,
  PDFName,
  PDFRef,
  PDFStream,
  PDFArray,
  decodePDFRawStream,
} from "pdf-lib";

describe("Embedded font investigation (pdf-lib)", () => {
  it("should investigate font dictionary structure in CJK PDF", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    console.log("\n=== PDF Font Dictionary Investigation ===\n");

    const pages = pdfDoc.getPages();
    const page = pages[0];
    const pageNode = page.node;

    // Get Resources dictionary
    const resources = pageNode.get(PDFName.of("Resources"));
    if (!resources) {
      console.log("No Resources dictionary found");
      expect(false).toBe(true);
      return;
    }

    console.log("Resources type:", resources.constructor.name);

    // Resolve if it's a reference
    const resourcesDict = resources instanceof PDFRef
      ? pdfDoc.context.lookup(resources) as PDFDict
      : resources as PDFDict;

    // Get Font dictionary
    const fonts = resourcesDict.get(PDFName.of("Font"));
    if (!fonts) {
      console.log("No Font dictionary found");
      expect(false).toBe(true);
      return;
    }

    const fontsDict = fonts instanceof PDFRef
      ? pdfDoc.context.lookup(fonts) as PDFDict
      : fonts as PDFDict;

    console.log("Fonts type:", fontsDict.constructor.name);

    // Iterate over fonts
    const fontEntries = fontsDict.entries();
    for (const [fontName, fontRef] of fontEntries) {
      console.log(`\nFont: ${fontName.toString()}`);

      const fontDict = fontRef instanceof PDFRef
        ? pdfDoc.context.lookup(fontRef) as PDFDict
        : fontRef as PDFDict;

      // Get font type
      const type = fontDict.get(PDFName.of("Type"));
      const subtype = fontDict.get(PDFName.of("Subtype"));
      const baseFont = fontDict.get(PDFName.of("BaseFont"));

      console.log("  Type:", type?.toString());
      console.log("  Subtype:", subtype?.toString());
      console.log("  BaseFont:", baseFont?.toString());

      // For Type0 (CID fonts), check DescendantFonts
      if (subtype?.toString() === "/Type0") {
        const descendantFonts = fontDict.get(PDFName.of("DescendantFonts"));
        if (descendantFonts) {
          const dfArray = descendantFonts instanceof PDFRef
            ? pdfDoc.context.lookup(descendantFonts) as PDFArray
            : descendantFonts as PDFArray;

          const cidFontRef = dfArray.get(0);
          const cidFontDict = cidFontRef instanceof PDFRef
            ? pdfDoc.context.lookup(cidFontRef) as PDFDict
            : cidFontRef as PDFDict;

          console.log("  CIDFont Subtype:", cidFontDict.get(PDFName.of("Subtype"))?.toString());

          // Get FontDescriptor
          const fontDescriptor = cidFontDict.get(PDFName.of("FontDescriptor"));
          if (fontDescriptor) {
            const fdDict = fontDescriptor instanceof PDFRef
              ? pdfDoc.context.lookup(fontDescriptor) as PDFDict
              : fontDescriptor as PDFDict;

            console.log("  FontDescriptor keys:", fdDict.entries().map(([k]) => k.toString()));

            // Check for embedded font data
            const fontFile = fdDict.get(PDFName.of("FontFile"));
            const fontFile2 = fdDict.get(PDFName.of("FontFile2"));
            const fontFile3 = fdDict.get(PDFName.of("FontFile3"));

            console.log("  FontFile (Type1):", fontFile ? "present" : "none");
            console.log("  FontFile2 (TrueType):", fontFile2 ? "present" : "none");
            console.log("  FontFile3 (CFF/OpenType):", fontFile3 ? "present" : "none");

            // If font is embedded, get the stream data
            const embeddedFont = fontFile3 || fontFile2 || fontFile;
            if (embeddedFont) {
              try {
                const stream = embeddedFont instanceof PDFRef
                  ? pdfDoc.context.lookup(embeddedFont) as PDFStream
                  : embeddedFont as PDFStream;

                if (stream && "getContents" in stream) {
                  const contents = stream.getContents();
                  console.log("  Embedded font data size:", contents.length, "bytes");

                  // Get stream dictionary for subtype
                  const streamDict = stream.dict;
                  const streamSubtype = streamDict.get(PDFName.of("Subtype"));
                  console.log("  Stream Subtype:", streamSubtype?.toString());
                }
              } catch (e) {
                console.log("  Error reading font stream:", e);
              }
            }
          }
        }
      } else {
        // Simple font - check FontDescriptor directly
        const fontDescriptor = fontDict.get(PDFName.of("FontDescriptor"));
        if (fontDescriptor) {
          const fdDict = fontDescriptor instanceof PDFRef
            ? pdfDoc.context.lookup(fontDescriptor) as PDFDict
            : fontDescriptor as PDFDict;

          const fontFile = fdDict.get(PDFName.of("FontFile"));
          const fontFile2 = fdDict.get(PDFName.of("FontFile2"));
          const fontFile3 = fdDict.get(PDFName.of("FontFile3"));

          console.log("  FontFile:", fontFile ? "present" : "none");
          console.log("  FontFile2:", fontFile2 ? "present" : "none");
          console.log("  FontFile3:", fontFile3 ? "present" : "none");
        }
      }
    }

    expect(true).toBe(true);
  });

  it("should extract embedded font data if available", async () => {
    const pdfPath = path.resolve("spec/fixtures/pdf/cjk-test.pdf");
    if (!fs.existsSync(pdfPath)) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const buffer = fs.readFileSync(pdfPath);
    const pdfDoc = await PDFDocument.load(buffer, {
      ignoreEncryption: true,
      updateMetadata: false,
    });

    console.log("\n=== Embedded Font Data Extraction ===\n");

    // Helper to get embedded font data
    const embeddedFonts: Array<{
      name: string;
      subtype: string;
      data: Uint8Array;
    }> = [];

    const pages = pdfDoc.getPages();
    for (const page of pages) {
      const resources = page.node.get(PDFName.of("Resources"));
      if (!resources) continue;

      const resourcesDict = resources instanceof PDFRef
        ? pdfDoc.context.lookup(resources) as PDFDict
        : resources as PDFDict;

      const fonts = resourcesDict.get(PDFName.of("Font"));
      if (!fonts) continue;

      const fontsDict = fonts instanceof PDFRef
        ? pdfDoc.context.lookup(fonts) as PDFDict
        : fonts as PDFDict;

      for (const [fontNamePdf, fontRef] of fontsDict.entries()) {
        const fontDict = fontRef instanceof PDFRef
          ? pdfDoc.context.lookup(fontRef) as PDFDict
          : fontRef as PDFDict;

        const subtype = fontDict.get(PDFName.of("Subtype"))?.toString();
        const baseFont = fontDict.get(PDFName.of("BaseFont"))?.toString() ?? fontNamePdf.toString();

        // Get FontDescriptor (handle Type0 vs simple fonts)
        let fontDescriptor: PDFDict | null = null;

        if (subtype === "/Type0") {
          const descendantFonts = fontDict.get(PDFName.of("DescendantFonts"));
          if (descendantFonts) {
            const dfArray = descendantFonts instanceof PDFRef
              ? pdfDoc.context.lookup(descendantFonts) as PDFArray
              : descendantFonts as PDFArray;
            const cidFontRef = dfArray.get(0);
            const cidFontDict = cidFontRef instanceof PDFRef
              ? pdfDoc.context.lookup(cidFontRef) as PDFDict
              : cidFontRef as PDFDict;
            const fdRef = cidFontDict.get(PDFName.of("FontDescriptor"));
            if (fdRef) {
              fontDescriptor = fdRef instanceof PDFRef
                ? pdfDoc.context.lookup(fdRef) as PDFDict
                : fdRef as PDFDict;
            }
          }
        } else {
          const fdRef = fontDict.get(PDFName.of("FontDescriptor"));
          if (fdRef) {
            fontDescriptor = fdRef instanceof PDFRef
              ? pdfDoc.context.lookup(fdRef) as PDFDict
              : fdRef as PDFDict;
          }
        }

        if (!fontDescriptor) continue;

        // Check for embedded font
        const fontFile3 = fontDescriptor.get(PDFName.of("FontFile3"));
        const fontFile2 = fontDescriptor.get(PDFName.of("FontFile2"));
        const fontFile = fontDescriptor.get(PDFName.of("FontFile"));
        const embeddedRef = fontFile3 || fontFile2 || fontFile;

        if (embeddedRef) {
          try {
            const stream = embeddedRef instanceof PDFRef
              ? pdfDoc.context.lookup(embeddedRef) as PDFStream
              : embeddedRef as PDFStream;

            if (stream && "getContents" in stream) {
              const contents = stream.getContents();
              const streamSubtype = stream.dict.get(PDFName.of("Subtype"))?.toString() ?? "unknown";

              embeddedFonts.push({
                name: baseFont,
                subtype: streamSubtype,
                data: contents,
              });

              console.log(`Found embedded font: ${baseFont}`);
              console.log(`  Subtype: ${streamSubtype}`);
              console.log(`  Size: ${contents.length} bytes`);
            }
          } catch (e) {
            console.log(`Error extracting font ${baseFont}:`, e);
          }
        }
      }
    }

    console.log(`\nTotal embedded fonts found: ${embeddedFonts.length}`);

    // This test documents current state - fonts may or may not be embedded
    expect(true).toBe(true);
  });
});
