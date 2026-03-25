/**
 * @file Presentation converter tests
 *
 * Verifies that convertToPresentationDocument produces correct PresentationDocument:
 * 1. fontScheme is always populated (required per ECMA-376 §20.1.6.10)
 * 2. theme SoT is populated from real PPTX
 * 3. Per-slide rendering context fields (colorContext, fontScheme, resolvedBackground, layoutShapes)
 *    are resolved at document creation time for each SlideWithId from the archive.
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

  it("theme SoT is populated from real PPTX", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.theme).toBeDefined();
    expect(doc.theme!.colorScheme).toBeDefined();
    expect(doc.theme!.fontScheme).toBeDefined();
    expect(doc.theme!.formatScheme).toBeDefined();
    // fontScheme from theme SoT matches the document-level fontScheme
    expect(doc.theme!.fontScheme.majorFont.latin).toBe(doc.fontScheme.majorFont.latin);
  });
});

// =============================================================================
// Per-slide rendering context tests
// =============================================================================

describe("convertToPresentationDocument per-slide rendering context", () => {
  it("each SlideWithId has colorContext defined for archive slides", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(0);
    for (const slideWithId of doc.slides) {
      expect(slideWithId.colorContext).toBeDefined();
      // colorScheme and colorMap are structural requirements of ColorContext
      expect(slideWithId.colorContext!.colorScheme).toBeDefined();
      expect(slideWithId.colorContext!.colorMap).toBeDefined();
    }
  });

  it("each SlideWithId has fontScheme defined for archive slides", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(0);
    for (const slideWithId of doc.slides) {
      expect(slideWithId.fontScheme).toBeDefined();
      // FontScheme requires majorFont and minorFont sub-objects
      expect(slideWithId.fontScheme!.majorFont).toBeDefined();
      expect(slideWithId.fontScheme!.minorFont).toBeDefined();
    }
  });

  it("each SlideWithId has layoutShapes as an array for archive slides", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(0);
    for (const slideWithId of doc.slides) {
      // layoutShapes is always an array (possibly empty) for archive slides
      expect(Array.isArray(slideWithId.layoutShapes)).toBe(true);
    }
  });

  it("resolvedBackground field exists on each SlideWithId (may be undefined)", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(0);
    for (const slideWithId of doc.slides) {
      // The property key must exist on the object (set by the converter),
      // even if its value is undefined (no background fill resolved).
      expect("resolvedBackground" in slideWithId).toBe(true);
    }
  });

  it("per-slide colorContext contains non-empty colorScheme from theme", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    // At least the first slide should have theme colors resolved
    const firstSlide = doc.slides[0];
    expect(firstSlide).toBeDefined();
    const colorScheme = firstSlide.colorContext!.colorScheme;
    // A real PPTX theme defines named colors (dk1, lt1, accent1, etc.)
    expect(Object.keys(colorScheme).length).toBeGreaterThan(0);
  });

  it("per-slide fontScheme has latin typefaces matching document-level fontScheme", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    // SampleShow.pptx uses a single theme across all slides,
    // so per-slide fontScheme should match document-level fontScheme.
    const firstSlide = doc.slides[0];
    expect(firstSlide.fontScheme!.majorFont.latin).toBe(doc.fontScheme.majorFont.latin);
    expect(firstSlide.fontScheme!.minorFont.latin).toBe(doc.fontScheme.minorFont.latin);
  });

  it("works with a multi-slide PPTX (all slides get rendering context)", async () => {
    // WithMaster.pptx has multiple slides sharing a master
    const buffer = loadFixture("poi-test-data/test-data/slideshow/WithMaster.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(1);
    for (const slideWithId of doc.slides) {
      expect(slideWithId.colorContext).toBeDefined();
      expect(slideWithId.fontScheme).toBeDefined();
      expect(Array.isArray(slideWithId.layoutShapes)).toBe(true);
      expect("resolvedBackground" in slideWithId).toBe(true);
    }
  });

  it("slide IDs are unique across all slides", async () => {
    const buffer = loadFixture("poi-test-data/test-data/slideshow/SampleShow.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    const ids = doc.slides.map((s) => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("backgrounds.pptx has resolvedBackground on at least one slide", async () => {
    // backgrounds.pptx is specifically about slide backgrounds
    const buffer = loadFixture("poi-test-data/test-data/slideshow/backgrounds.pptx");
    const loaded = await loadPptxFromBuffer(buffer);
    const doc = convertToPresentationDocument(loaded);

    expect(doc.slides.length).toBeGreaterThan(0);
    // At least one slide should have a resolved background fill
    const slidesWithBackground = doc.slides.filter(
      (s) => s.resolvedBackground !== undefined,
    );
    expect(slidesWithBackground.length).toBeGreaterThan(0);
  });
});
