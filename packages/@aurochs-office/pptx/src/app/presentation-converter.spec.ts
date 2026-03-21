/**
 * @file Presentation converter tests
 *
 * Verifies that convertToPresentationDocument produces correct PresentationDocument,
 * specifically that fontScheme is always populated (required per ECMA-376 §20.1.6.10).
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadPptxFromBuffer } from "./pptx-loader";
import { convertToPresentationDocument } from "./presentation-converter";

const FIXTURES = resolve(__dirname, "../../../../../fixtures");

function loadFixture(relativePath: string): Uint8Array {
  return readFileSync(resolve(FIXTURES, relativePath));
}

describe("convertToPresentationDocument", () => {
  it("fontScheme is always defined (not undefined)", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.fontScheme).toBeDefined();
    expect(doc.fontScheme.majorFont).toBeDefined();
    expect(doc.fontScheme.minorFont).toBeDefined();
  });

  it("fontScheme has populated typefaces from real PPTX", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    // SampleShow.pptx has a theme with latin fonts
    expect(typeof doc.fontScheme.majorFont.latin).toBe("string");
    expect(typeof doc.fontScheme.minorFont.latin).toBe("string");
  });
});
