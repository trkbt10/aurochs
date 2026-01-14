/**
 * @file Text garbling diagnostic for panel2.pdf
 *
 * This diagnostic script analyzes the PDF import process to identify
 * why Japanese text is being garbled (mojibake).
 */

import { describe, it, expect } from "bun:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, PDFPage, PDFDict, PDFName, PDFRef, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { parsePdf } from "../../src/pdf/parser/pdf-parser";
import { extractFontMappings } from "../../src/pdf/parser/font-decoder";
import { decodeText } from "../../src/pdf/domain/font/text-decoder";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PDF_PATH = path.join(__dirname, "..", "..", "fixtures", "samples", "panel2.pdf");

describe("Text Garbling Diagnostic for panel2.pdf", () => {
  it("should analyze font information and ToUnicode mappings", async () => {
    console.log("\n=== TEXT GARBLING DIAGNOSTIC ===\n");

    const pdfBuffer = fs.readFileSync(PDF_PATH);
    console.log(`PDF file: ${PDF_PATH}`);
    console.log(`PDF size: ${pdfBuffer.length} bytes\n`);

    // Load PDF with pdf-lib
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const pages = pdfDoc.getPages();

    console.log(`Total pages: ${pages.length}\n`);

    // Analyze fonts on each page
    for (let pageIndex = 0; pageIndex < Math.min(pages.length, 2); pageIndex++) {
      console.log(`\n--- Page ${pageIndex + 1} ---\n`);
      const page = pages[pageIndex];

      // Extract font mappings
      const fontMappings = extractFontMappings(page);
      console.log(`Fonts found: ${fontMappings.size}`);

      for (const [fontName, fontInfo] of fontMappings.entries()) {
        console.log(`\nFont: ${fontName}`);
        console.log(`  BaseFont: ${fontInfo.baseFont ?? "N/A"}`);
        console.log(`  CodeByteWidth: ${fontInfo.codeByteWidth}`);
        console.log(`  ToUnicode mapping entries: ${fontInfo.mapping.size}`);
        console.log(`  CID Ordering: ${fontInfo.ordering ?? "N/A"}`);
        console.log(`  EncodingMap size: ${fontInfo.encodingMap?.size ?? "N/A"}`);
        console.log(`  Bold: ${fontInfo.isBold ?? false}, Italic: ${fontInfo.isItalic ?? false}`);

        // Sample some ToUnicode mappings
        if (fontInfo.mapping.size > 0) {
          console.log(`  Sample ToUnicode mappings:`);
          let count = 0;
          for (const [code, unicode] of fontInfo.mapping.entries()) {
            if (count >= 10) break;
            const hex = code.toString(16).padStart(fontInfo.codeByteWidth === 2 ? 4 : 2, "0");
            const unicodeHex = [...unicode].map(c => "U+" + c.codePointAt(0)?.toString(16).padStart(4, "0")).join(" ");
            console.log(`    <${hex}> -> "${unicode}" (${unicodeHex})`);
            count++;
          }

          // Check for Japanese character mappings (Hiragana U+3040-U+309F, Katakana U+30A0-U+30FF, Kanji U+4E00-U+9FFF)
          let hasHiragana = false;
          let hasKatakana = false;
          let hasKanji = false;

          for (const [code, unicode] of fontInfo.mapping.entries()) {
            for (const char of unicode) {
              const cp = char.codePointAt(0);
              if (cp !== undefined) {
                if (cp >= 0x3040 && cp <= 0x309F) hasHiragana = true;
                if (cp >= 0x30A0 && cp <= 0x30FF) hasKatakana = true;
                if (cp >= 0x4E00 && cp <= 0x9FFF) hasKanji = true;
              }
            }
          }

          console.log(`  Has Hiragana mappings: ${hasHiragana}`);
          console.log(`  Has Katakana mappings: ${hasKatakana}`);
          console.log(`  Has Kanji mappings: ${hasKanji}`);
        }
      }
    }

    // Parse PDF and extract text elements
    console.log("\n\n=== PARSED TEXT ELEMENTS ===\n");

    const parsed = await parsePdf(pdfBuffer, { pages: [1] });
    const page1 = parsed.pages[0];

    if (page1) {
      let textElementCount = 0;
      for (const element of page1.elements) {
        if (element.type === "text") {
          textElementCount++;
          console.log(`\nText Element ${textElementCount}:`);

          for (const run of element.runs) {
            // Show raw text bytes
            const rawBytes = [...run.text].map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
            console.log(`  Raw text (hex): ${rawBytes.slice(0, 100)}${rawBytes.length > 100 ? "..." : ""}`);
            console.log(`  Decoded text: "${run.text.slice(0, 50)}${run.text.length > 50 ? "..." : ""}"`);
            console.log(`  Font: ${run.fontName} (baseFont: ${run.baseFont ?? "N/A"})`);
            console.log(`  Position: (${run.x.toFixed(2)}, ${run.y.toFixed(2)})`);

            // Check for replacement characters (U+FFFD)
            const hasReplacementChars = run.text.includes("\uFFFD");
            if (hasReplacementChars) {
              console.log(`  WARNING: Contains replacement characters (U+FFFD) - indicates failed decoding`);
            }

            // Check for null bytes
            const hasNullBytes = run.text.includes("\u0000");
            if (hasNullBytes) {
              console.log(`  WARNING: Contains null bytes - indicates encoding issue`);
            }
          }

          if (textElementCount >= 20) {
            console.log("\n... (truncated, showing first 20 text elements)");
            break;
          }
        }
      }

      console.log(`\nTotal text elements on page 1: ${page1.elements.filter(e => e.type === "text").length}`);
    }

    console.log("\n=== DIAGNOSTIC COMPLETE ===\n");

    // This test always passes - it's for diagnostic output
    expect(true).toBe(true);
  });

  it("should check raw ToUnicode CMap content", async () => {
    console.log("\n=== RAW TOUNICODE CMAP ANALYSIS ===\n");

    const pdfBuffer = fs.readFileSync(PDF_PATH);
    const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
    const page = pdfDoc.getPages()[0];
    const context = page.node.context;

    // Get Resources dictionary
    const resourcesRef = page.node.Resources();
    if (!resourcesRef) {
      console.log("No resources found");
      return;
    }

    const resources = context.lookup(resourcesRef);
    if (!(resources instanceof PDFDict)) {
      console.log("Resources is not a dictionary");
      return;
    }

    // Get Font dictionary
    const fontRef = resources.get(PDFName.of("Font"));
    if (!fontRef) {
      console.log("No font dictionary found");
      return;
    }

    const fonts = fontRef instanceof PDFRef ? context.lookup(fontRef) : fontRef;
    if (!(fonts instanceof PDFDict)) {
      console.log("Font is not a dictionary");
      return;
    }

    // Iterate fonts and check ToUnicode
    for (const [name, ref] of fonts.entries()) {
      const fontName = name instanceof PDFName ? name.asString() : String(name);
      const cleanName = fontName.startsWith("/") ? fontName.slice(1) : fontName;

      const fontDict = ref instanceof PDFRef ? context.lookup(ref) : ref;
      if (!(fontDict instanceof PDFDict)) continue;

      // Check Subtype
      const subtype = fontDict.get(PDFName.of("Subtype"));
      const subtypeStr = subtype instanceof PDFName ? subtype.asString() : "unknown";

      console.log(`\nFont: ${cleanName} (${subtypeStr})`);

      // Get ToUnicode
      let toUnicodeRef = fontDict.get(PDFName.of("ToUnicode"));

      // For Type0, check DescendantFonts
      if (!toUnicodeRef && subtypeStr === "/Type0") {
        const descendantsRef = fontDict.get(PDFName.of("DescendantFonts"));
        if (descendantsRef) {
          const descendants = descendantsRef instanceof PDFRef
            ? context.lookup(descendantsRef)
            : descendantsRef;

          if (descendants && typeof descendants === "object" && "get" in descendants) {
            const arr = descendants as { get(i: number): unknown; size(): number };
            if (arr.size() > 0) {
              const firstRef = arr.get(0);
              const first = firstRef instanceof PDFRef ? context.lookup(firstRef) : firstRef;
              if (first instanceof PDFDict) {
                toUnicodeRef = first.get(PDFName.of("ToUnicode"));
              }
            }
          }
        }
      }

      if (!toUnicodeRef) {
        console.log("  No ToUnicode CMap found");
        continue;
      }

      const toUnicodeStream = toUnicodeRef instanceof PDFRef
        ? context.lookup(toUnicodeRef)
        : toUnicodeRef;

      if (!(toUnicodeStream instanceof PDFRawStream)) {
        console.log("  ToUnicode is not a stream");
        continue;
      }

      // Decode and display CMap content
      const decoded = decodePDFRawStream(toUnicodeStream);
      const cmapData = new TextDecoder("latin1").decode(decoded.decode());

      console.log(`  ToUnicode CMap length: ${cmapData.length} bytes`);

      // Count bfchar and bfrange entries
      const bfcharMatches = cmapData.match(/beginbfchar/gi);
      const bfrangeMatches = cmapData.match(/beginbfrange/gi);

      console.log(`  bfchar sections: ${bfcharMatches?.length ?? 0}`);
      console.log(`  bfrange sections: ${bfrangeMatches?.length ?? 0}`);

      // Check for large ranges that might be truncated
      const rangeRegex = /<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g;
      let rangeMatch;
      let largeRanges = 0;

      while ((rangeMatch = rangeRegex.exec(cmapData)) !== null) {
        const start = parseInt(rangeMatch[1], 16);
        const end = parseInt(rangeMatch[2], 16);
        const size = end - start + 1;
        if (size > 256) {
          largeRanges++;
          if (largeRanges <= 3) {
            console.log(`  LARGE RANGE: <${rangeMatch[1]}> to <${rangeMatch[2]}> (${size} entries)`);
          }
        }
      }

      if (largeRanges > 0) {
        console.log(`  Total large ranges (>256 entries): ${largeRanges}`);
        console.log(`  WARNING: These ranges may be truncated by BFRANGE_MAX_ENTRIES=256 limit!`);
      }

      // Show first few lines of CMap
      const lines = cmapData.split("\n").slice(0, 30);
      console.log("  First 30 lines of CMap:");
      for (const line of lines) {
        console.log(`    ${line}`);
      }
    }

    expect(true).toBe(true);
  });
});
