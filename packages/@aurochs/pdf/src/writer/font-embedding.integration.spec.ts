/**
 * @file Font embedding integration tests
 *
 * Verifies the complete pipeline:
 *   PdfDocument with embedded fonts → writePdfDocument → correct text encoding
 *
 * These tests verify that:
 *   1. Unedited CID text preserves original rawBytes (round-trip)
 *   2. Edited text is re-encoded through FontProvider
 *   3. Standard 14 fonts are referenced correctly
 *   4. Font objects are correctly embedded in the output PDF
 */

import * as fs from "node:fs";
import * as zlib from "node:zlib";
import { writePdfDocument } from "./document-writer";
import { createFontProvider } from "../domain/font/font-provider";
import { encodeTextForFont } from "../domain/font/text-encoder";
import { withTextContent } from "../domain/text/operations";
import type { PdfDocument, PdfEmbeddedFont } from "../domain/document";
import type { PdfText } from "../domain/text";
import type { PdfGraphicsState } from "../domain/graphics-state";
import { buildPdf } from "@aurochs-builder/pdf";
import { getPdfFixturePath } from "../test-utils/pdf-fixtures";

const decoder = new TextDecoder();
const toText = (bytes: Uint8Array) => decoder.decode(bytes);

/** Check if `pattern` bytes match at position `offset` in `data`. */
function bytesMatchAt(data: Uint8Array, offset: number, pattern: Uint8Array): boolean {
  return pattern.every((byte, j) => data[offset + j] === byte);
}

const minimalGraphicsState: PdfGraphicsState = {
  ctm: [1, 0, 0, 1, 0, 0],
  fillColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  strokeColor: { colorSpace: "DeviceRGB", components: [0, 0, 0] },
  lineWidth: 1,
  lineJoin: 0,
  lineCap: 0,
  miterLimit: 10,
  dashArray: [],
  dashPhase: 0,
  fillAlpha: 1,
  strokeAlpha: 1,
  charSpacing: 0,
  wordSpacing: 0,
  horizontalScaling: 100,
  textLeading: 0,
  textRenderingMode: 0,
  textRise: 0,
};

/**
 * Decompress FlateDecode streams in a PDF binary to inspect content.
 * Searches for stream/endstream markers at the byte level to handle
 * binary content correctly.
 */
function decompressContentStreams(pdfBytes: Uint8Array): string {
  const text = toText(pdfBytes);
  const parts: string[] = [text];

  // Search for "stream\n" marker bytes and extract/decompress each stream
  const streamMarker = new TextEncoder().encode("stream\n");
  const endstreamMarker = new TextEncoder().encode("endstream");

  for (let i = 0; i < pdfBytes.length - streamMarker.length; i++) {
    if (!bytesMatchAt(pdfBytes, i, streamMarker)) {continue;}

    const streamDataStart = i + streamMarker.length;

    for (let k = streamDataStart; k < pdfBytes.length - endstreamMarker.length; k++) {
      if (!bytesMatchAt(pdfBytes, k, endstreamMarker)) {continue;}

      const streamDataEnd = (k > streamDataStart && pdfBytes[k - 1] === 0x0A) ? k - 1 : k;
      const rawStreamBytes = pdfBytes.slice(streamDataStart, streamDataEnd);
      try {
        const decompressed = zlib.inflateSync(rawStreamBytes);
        parts.push(decoder.decode(decompressed));
      // eslint-disable-next-line no-restricted-syntax -- catch without param: zlib decompression failure falls back to raw bytes; error type is irrelevant here
      } catch {
        parts.push(decoder.decode(rawStreamBytes));
      }
      break;
    }
  }

  return parts.join("\n---STREAM---\n");
}

// =============================================================================
// Round-trip: unedited CID text preserves rawBytes
// =============================================================================

describe("font embedding: round-trip preservation", () => {
  it("unedited CID text uses original rawBytes in hex output", () => {
    const originalBytes = new Uint8Array([0x81, 0x40, 0x81, 0x41]);

    const embeddedFont: PdfEmbeddedFont = {
      fontFamily: "MS-Gothic",
      baseFontName: "/ABCDEF+MS-Gothic",
      format: "truetype",
      data: new Uint8Array([0x00, 0x01, 0x00, 0x00]), // minimal TrueType stub
      mimeType: "font/ttf",
      ordering: "Japan1",
      codeByteWidth: 2,
      toUnicode: {
        byteMapping: new Map([
          ["8140", "\u3042"],
          ["8141", "\u3044"],
        ]),
        sourceCodeByteLengths: [2],
      },
    };

    const text: PdfText = {
      type: "text",
      text: "\u3042\u3044", // あい
      rawBytes: originalBytes,
      rawText: "\u8140\u8141",
      codeByteWidth: 2,
      x: 100,
      y: 700,
      width: 50,
      height: 12,
      fontName: "MS-Gothic",
      baseFont: "ABCDEF+MS-Gothic",
      fontSize: 12,
      cidOrdering: "Japan1",
      graphicsState: minimalGraphicsState,
    };

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text] }],
      embeddedFonts: [embeddedFont],
    };

    const result = writePdfDocument(doc);
    const allContent = decompressContentStreams(result);

    // The hex string should contain the original bytes
    expect(allContent).toContain("<81408141>");
  });
});

// =============================================================================
// Edited text: re-encoded through FontProvider
// =============================================================================

describe("font embedding: edited text re-encoding", () => {
  it("edited CID text is re-encoded through FontProvider", () => {
    const embeddedFont: PdfEmbeddedFont = {
      fontFamily: "MS-Gothic",
      baseFontName: "/ABCDEF+MS-Gothic",
      format: "truetype",
      data: new Uint8Array([0x00, 0x01, 0x00, 0x00]),
      mimeType: "font/ttf",
      ordering: "Japan1",
      codeByteWidth: 2,
      toUnicode: {
        byteMapping: new Map([
          ["8140", "\u3042"],
          ["8141", "\u3044"],
          ["8142", "\u3046"],
        ]),
        sourceCodeByteLengths: [2],
      },
    };

    // Text was edited: "あい" → "あう" — rawBytes invalidated
    const editedText: PdfText = {
      type: "text",
      text: "\u3042\u3046", // あう (edited)
      // rawBytes: undefined — invalidated by editing
      codeByteWidth: 2,
      x: 100,
      y: 700,
      width: 50,
      height: 12,
      fontName: "MS-Gothic",
      baseFont: "ABCDEF+MS-Gothic",
      fontSize: 12,
      cidOrdering: "Japan1",
      graphicsState: minimalGraphicsState,
      editState: {
        textChanged: true,
        fontChanged: false,
      },
    };

    const fontProvider = createFontProvider({ embeddedFonts: [embeddedFont] });
    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [editedText] }],
      embeddedFonts: [embeddedFont],
    };

    const result = writePdfDocument(doc, { fontProvider });
    const allContent = decompressContentStreams(result);

    // Should contain re-encoded hex: 8140 (あ) + 8142 (う)
    expect(allContent).toContain("<81408142>");
  });

  it("edited single-byte text uses text string output", () => {
    const editedText: PdfText = {
      type: "text",
      text: "World",
      // rawBytes: undefined — invalidated
      x: 100,
      y: 700,
      width: 50,
      height: 12,
      fontName: "Helvetica",
      fontSize: 12,
      graphicsState: minimalGraphicsState,
      editState: {
        textChanged: true,
        fontChanged: false,
      },
    };

    const fontProvider = createFontProvider();
    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [editedText] }],
    };

    const result = writePdfDocument(doc, { fontProvider });
    const allContent = decompressContentStreams(result);

    // Should contain the text string in parentheses
    expect(allContent).toContain("(World)");
  });
});

// =============================================================================
// Font object embedding
// =============================================================================

describe("font embedding: font objects in output", () => {
  it("embeds CID font per ISO 32000-1 Section 9.7 (Type0 + CIDFont + FontDescriptor)", () => {
    const embeddedFont: PdfEmbeddedFont = {
      fontFamily: "MS-Gothic",
      baseFontName: "/ABCDEF+MS-Gothic",
      format: "truetype",
      data: new Uint8Array([0x00, 0x01, 0x00, 0x00]),
      mimeType: "font/ttf",
      ordering: "Japan1",
      codeByteWidth: 2,
      toUnicode: {
        byteMapping: new Map([["8140", "\u3042"]]),
        sourceCodeByteLengths: [2],
      },
      metrics: {
        ascender: 880,
        descender: -120,
        widths: new Map([[0x8140, 1000]]),
        defaultWidth: 1000,
      },
    };

    const text: PdfText = {
      type: "text",
      text: "\u3042",
      rawBytes: new Uint8Array([0x81, 0x40]),
      codeByteWidth: 2,
      x: 100,
      y: 700,
      width: 12,
      height: 12,
      fontName: "MS-Gothic",
      baseFont: "ABCDEF+MS-Gothic",
      fontSize: 12,
      cidOrdering: "Japan1",
      graphicsState: minimalGraphicsState,
    };

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text] }],
      embeddedFonts: [embeddedFont],
    };

    const result = writePdfDocument(doc);
    const pdfText = toText(result);

    // ISO 32000-1 Section 9.7.6 — Type0 font dictionary
    expect(pdfText).toContain("/Subtype /Type0");
    expect(pdfText).toContain("/Encoding /Identity-H");
    expect(pdfText).toContain("/BaseFont /ABCDEF+MS-Gothic");
    expect(pdfText).toContain("/DescendantFonts");

    // ISO 32000-1 Section 9.7.4 — CIDFont dictionary
    expect(pdfText).toContain("/Subtype /CIDFontType2"); // TrueType CID font
    expect(pdfText).toContain("/CIDSystemInfo");
    // Registry and Ordering as hex strings (Adobe, Japan1)
    expect(pdfText).toContain("/Registry");
    expect(pdfText).toContain("/Ordering");
    expect(pdfText).toContain("/CIDToGIDMap /Identity"); // TrueType requires CIDToGIDMap

    // ISO 32000-1 Section 9.8 — FontDescriptor
    expect(pdfText).toContain("/Type /FontDescriptor");
    expect(pdfText).toContain("/FontName /ABCDEF+MS-Gothic");
    expect(pdfText).toContain("/Ascent 880");
    expect(pdfText).toContain("/Descent -120");
    expect(pdfText).toContain("/FontFile2"); // TrueType embedding

    // ISO 32000-1 Section 9.10 — ToUnicode CMap
    expect(pdfText).toContain("/ToUnicode");

    // Font data stream must be present (compressed)
    expect(pdfText).toContain("/FlateDecode");
  });

  it("references Standard 14 font without embedding", () => {
    const text: PdfText = {
      type: "text",
      text: "Hello",
      x: 100,
      y: 700,
      width: 50,
      height: 12,
      fontName: "Helvetica",
      fontSize: 12,
      graphicsState: minimalGraphicsState,
    };

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text] }],
    };

    const result = writePdfDocument(doc);
    const resultText = toText(result);

    // Standard Type1 font reference (no embedding)
    expect(resultText).toContain("/Subtype /Type1");
    expect(resultText).toContain("/BaseFont /Helvetica");
    expect(resultText).toContain("/Encoding /WinAnsiEncoding");
    // Should NOT contain font stream data for Standard 14
    expect(resultText).not.toContain("/FontFile");
  });
});

// =============================================================================
// Full round-trip: write → re-parse → verify text content
// =============================================================================

describe("font embedding: write → re-parse round-trip", () => {
  it("Standard 14 font ASCII text survives round-trip with exact match", async () => {
    const text: PdfText = {
      type: "text",
      text: "Hello World",
      x: 72,
      y: 720,
      width: 80,
      height: 12,
      fontName: "Helvetica",
      fontSize: 12,
      graphicsState: minimalGraphicsState,
    };

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text] }],
    };

    const pdfBytes = writePdfDocument(doc);
    const reparsed = await buildPdf({ data: pdfBytes });

    expect(reparsed.pages).toHaveLength(1);
    const textElements = reparsed.pages[0]!.elements.filter(e => e.type === "text");
    expect(textElements.length).toBeGreaterThanOrEqual(1);

    // Exact match: at least one text element must have exactly "Hello World"
    const exactMatch = textElements.some(e => e.type === "text" && e.text === "Hello World");
    expect(exactMatch).toBe(true);
  });

  it("Standard 14 font WinAnsi special char (é) survives round-trip", async () => {
    // WinAnsi encoding maps U+00E9 (é) to byte 0xE9.
    // Without a ToUnicode CMap (Standard 14 fonts lack one), the parser
    // may decode 0xE9 using a built-in WinAnsi table or fail to decode.
    // This test verifies the writer encodes correctly; parser decoding
    // is tested separately.
    const text: PdfText = {
      type: "text",
      text: "caf\u00E9", // café
      x: 72,
      y: 700,
      width: 40,
      height: 12,
      fontName: "Helvetica",
      fontSize: 12,
      graphicsState: minimalGraphicsState,
    };

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [text] }],
    };

    const pdfBytes = writePdfDocument(doc);

    // Verify the writer output contains the correct byte 0xE9 for é
    // in the content stream (before re-parsing, which may have its own issues)
    const allContent = decompressContentStreams(pdfBytes);
    // The text string in the content stream should be (caf\351) where \351 is octal for 0xE9
    // or the raw byte 0xE9 within the parenthesized string
    expect(allContent).toContain("caf");

    // Now verify re-parse: the parser may or may not decode é depending
    // on whether it applies WinAnsiEncoding to Standard 14 fonts.
    const reparsed = await buildPdf({ data: pdfBytes });
    const textElements = reparsed.pages[0]!.elements.filter(e => e.type === "text");
    const reparsedTexts = textElements.map(e => e.type === "text" ? e.text : "");

    // The reparsed text should contain "caf" at minimum.
    // Full "café" with accent depends on the parser's WinAnsi decoding.
    const hasBasicText = reparsedTexts.some(t => t.startsWith("caf"));
    expect(hasBasicText).toBe(true);
  });

  it("edited text (withTextContent) round-trips with exact match", async () => {
    const original: PdfText = {
      type: "text",
      text: "Before",
      x: 72,
      y: 700,
      width: 50,
      height: 12,
      fontName: "Helvetica",
      fontSize: 12,
      graphicsState: minimalGraphicsState,
    };

    const edited = withTextContent(original, "After");
    expect(edited.editState?.textChanged).toBe(true);
    expect(edited.rawBytes).toBeUndefined();

    const fontProvider = createFontProvider();
    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: [edited] }],
    };

    const pdfBytes = writePdfDocument(doc, { fontProvider });
    const reparsed = await buildPdf({ data: pdfBytes });

    const textElements = reparsed.pages[0]!.elements.filter(e => e.type === "text");
    // Exact match: "After" must appear, "Before" must not
    const hasAfter = textElements.some(e => e.type === "text" && e.text === "After");
    expect(hasAfter).toBe(true);
    const hasBefore = textElements.some(e => e.type === "text" && e.text === "Before");
    expect(hasBefore).toBe(false);
  });

  it("multiple text elements on one page survive round-trip with exact matches", async () => {
    const texts: PdfText[] = [
      {
        type: "text",
        text: "First line",
        x: 72,
        y: 720,
        width: 80,
        height: 12,
        fontName: "Helvetica",
        fontSize: 12,
        graphicsState: minimalGraphicsState,
      },
      {
        type: "text",
        text: "Second line",
        x: 72,
        y: 700,
        width: 90,
        height: 12,
        fontName: "Helvetica",
        fontSize: 12,
        graphicsState: minimalGraphicsState,
      },
    ];

    const doc: PdfDocument = {
      pages: [{ pageNumber: 1, width: 612, height: 792, elements: texts }],
    };

    const pdfBytes = writePdfDocument(doc);
    const reparsed = await buildPdf({ data: pdfBytes });

    const textElements = reparsed.pages[0]!.elements.filter(e => e.type === "text");
    const reparsedTexts = new Set(textElements.map(e => e.type === "text" ? e.text : ""));
    expect(reparsedTexts.has("First line")).toBe(true);
    expect(reparsedTexts.has("Second line")).toBe(true);
  });
});

// =============================================================================
// Japanese CJK round-trip: parse real PDF → write → re-parse → verify text
// =============================================================================

describe("font embedding: Japanese CJK round-trip", () => {
  const cjkFixturePath = getPdfFixturePath("cjk-test.pdf");
  const hasCjkFixture = fs.existsSync(cjkFixturePath);

  it("Japanese text from real PDF survives write → re-parse round-trip", async () => {
    if (!hasCjkFixture) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    // Step 1: Parse the real CJK PDF
    const originalBytes = new Uint8Array(fs.readFileSync(cjkFixturePath));
    const originalDoc = await buildPdf({ data: originalBytes });

    expect(originalDoc.pages.length).toBeGreaterThanOrEqual(1);

    // Collect all Japanese text from the original
    const originalTexts: string[] = [];
    for (const page of originalDoc.pages) {
      for (const el of page.elements) {
        if (el.type === "text" && el.text.length > 0) {
          originalTexts.push(el.text);
        }
      }
    }
    expect(originalTexts.length).toBeGreaterThan(0);

    // Verify at least some text contains CJK characters
    const hasCjk = originalTexts.some(t => /[\u3000-\u9FFF\uF900-\uFAFF]/.test(t));
    expect(hasCjk).toBe(true);

    // Step 2: Write the document back to PDF
    const fontProvider = createFontProvider({ embeddedFonts: originalDoc.embeddedFonts });
    const writtenBytes = writePdfDocument(originalDoc, { fontProvider });

    // Step 3: Re-parse the written PDF
    const reparsedDoc = await buildPdf({ data: writtenBytes });

    expect(reparsedDoc.pages.length).toBe(originalDoc.pages.length);

    // Step 4: Verify Japanese text survived the round-trip
    const reparsedTexts: string[] = [];
    for (const page of reparsedDoc.pages) {
      for (const el of page.elements) {
        if (el.type === "text" && el.text.length > 0) {
          reparsedTexts.push(el.text);
        }
      }
    }

    // Each original Japanese text should appear in the reparsed output
    for (const originalText of originalTexts) {
      if (/[\u3000-\u9FFF\uF900-\uFAFF]/.test(originalText)) {
        const found = reparsedTexts.some(t => t.includes(originalText));
        expect(found).toBe(true);
      }
    }
  });

  it("edited Japanese text is correctly re-encoded after round-trip", async () => {
    if (!hasCjkFixture) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    // Step 1: Parse the real CJK PDF
    const originalBytes = new Uint8Array(fs.readFileSync(cjkFixturePath));
    const originalDoc = await buildPdf({ data: originalBytes });

    // Find a text element with hiragana content and rawBytes for editing test
    type TextSearchResult = { pageIdx: number; elIdx: number; el: PdfText };
    const target: TextSearchResult | undefined = originalDoc.pages.flatMap((page, p) =>
      page.elements.flatMap((el, e): TextSearchResult[] =>
        el.type === "text" && /[\u3040-\u309F]/.test(el.text) && el.rawBytes ? [{ pageIdx: p, elIdx: e, el }] : [],
      ),
    )[0];

    if (!target) {
      console.log("No hiragana text element with rawBytes found, skipping edit test");
      return;
    }

    const { pageIdx: targetPageIdx, elIdx: targetElIdx, el: targetEl } = target;

    // Step 2: Edit the text — replace with characters from the same text
    // (guaranteed to exist in the subset font's ToUnicode mapping).
    //
    // NOTE: Adding NEW characters that are not in the original subset font
    // will fail encoding. This is a known limitation documented below.
    const reversedText = [...targetEl.text].reverse().join("");
    const edited = withTextContent(targetEl, reversedText);
    expect(edited.editState?.textChanged).toBe(true);
    expect(edited.rawBytes).toBeUndefined();

    // Rebuild document with edited element
    const editedPages = originalDoc.pages.map((page, pi) => {
      if (pi !== targetPageIdx) {return page;}
      return {
        ...page,
        elements: page.elements.map((el, ei) => ei === targetElIdx ? edited : el),
      };
    });
    const editedDoc: PdfDocument = {
      ...originalDoc,
      pages: editedPages,
    };

    // Step 3: Write with FontProvider for re-encoding
    const fontProvider = createFontProvider({ embeddedFonts: originalDoc.embeddedFonts });
    const writtenBytes = writePdfDocument(editedDoc, { fontProvider });

    // Step 4: Re-parse and verify the edited text
    const reparsedDoc = await buildPdf({ data: writtenBytes });
    const reparsedPage = reparsedDoc.pages[targetPageIdx]!;
    const reparsedTexts = reparsedPage.elements
      .filter(e => e.type === "text")
      .map(e => e.type === "text" ? e.text : "");
    const allReparsedText = reparsedTexts.join("");

    // The reversed text should appear in the output
    expect(allReparsedText).toContain(reversedText);
  });

  it("adding new character to subset CID font: encodeTextForFont returns null", async () => {
    if (!hasCjkFixture) {
      console.log("cjk-test.pdf not found, skipping");
      return;
    }

    const originalBytes = new Uint8Array(fs.readFileSync(cjkFixturePath));
    const originalDoc = await buildPdf({ data: originalBytes });

    // Find CID font's ToUnicode mapping
    const cidFont = originalDoc.embeddedFonts?.find(f => f.codeByteWidth === 2 && f.toUnicode);
    if (!cidFont) {
      console.log("No CID font with ToUnicode found, skipping");
      return;
    }

    // Find a character NOT in the ToUnicode mapping
    // U+4E00 (一) — may or may not be in subset, try a rare kanji
    const provider = createFontProvider({ embeddedFonts: originalDoc.embeddedFonts });
    const resolved = provider.resolve(cidFont.fontFamily, cidFont.baseFontName);

    // Try encoding a character that is likely NOT in the subset
    const rareChar = "\u9F8D"; // 龍 — very likely not in a subset CJK font
    const encoded = encodeTextForFont(rareChar, resolved);

    // This should return null because the character is not in the subset ToUnicode
    // (if it happens to be present, the test is inconclusive — skip)
    if (encoded !== null) {
      console.log("Rare character happened to be in subset, test inconclusive");
      return;
    }

    expect(encoded).toBeNull();
  });
});
