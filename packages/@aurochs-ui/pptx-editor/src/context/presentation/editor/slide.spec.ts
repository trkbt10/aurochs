/**
 * @file Slide operations tests
 */

/* eslint-disable no-restricted-syntax, @typescript-eslint/no-explicit-any, custom/no-as-outside-guard -- Test file uses flexible typing for mock data */

import { px } from "@aurochs-office/drawing-ml/domain/units";
import type { Slide } from "@aurochs-office/pptx/domain";
import type { PresentationDocument, SlideWithId } from "@aurochs-office/pptx/app";
import { generateSlideId, findSlideById, getSlideIndex, updateSlide, updateSlideEntry } from "./slide";

// NOTE: addSlide, duplicateSlide, deleteSlide, moveSlide require presentationFile
// and are tested in integration tests (spec/integration/export-slide-structure.spec.ts)

function createEmptySlide(): Slide {
  return { shapes: [] };
}

function createTestDocument(slideCount = 3): PresentationDocument {
  const slides: SlideWithId[] = Array.from({ length: slideCount }, (_, i) => ({
    id: String(i + 1),
    slide: createEmptySlide(),
  }));

  return {
    presentation: {
      slideSize: { width: px(960), height: px(540) },
    },
    slides,
    slideWidth: px(960),
    slideHeight: px(540),
    colorContext: { colorScheme: {}, colorMap: {} },
    resources: {
      getTarget: () => undefined,
      getType: () => undefined,
      resolve: () => undefined,
      getMimeType: () => undefined,
      getFilePath: () => undefined,
      readFile: () => null,
      getResourceByType: () => undefined,
    },
  };
}

describe("generateSlideId", () => {
  it("should generate next sequential ID", () => {
    const doc = createTestDocument(3);
    const newId = generateSlideId(doc);
    expect(newId).toBe("4");
  });

  it("should handle empty document", () => {
    const doc = createTestDocument(0);
    const newId = generateSlideId(doc);
    expect(newId).toBe("1");
  });

  it("should handle non-sequential IDs", () => {
    const baseDoc = createTestDocument(0);
    const doc = {
      ...baseDoc,
      slides: [
        { id: "5", slide: createEmptySlide() },
        { id: "2", slide: createEmptySlide() },
        { id: "10", slide: createEmptySlide() },
      ],
    };
    const newId = generateSlideId(doc);
    expect(newId).toBe("11");
  });
});

describe("findSlideById", () => {
  it("should find existing slide", () => {
    const doc = createTestDocument(3);
    const result = findSlideById(doc, "2");
    expect(result).toBeDefined();
    expect(result?.id).toBe("2");
  });

  it("should return undefined for non-existent slide", () => {
    const doc = createTestDocument(3);
    const result = findSlideById(doc, "999");
    expect(result).toBeUndefined();
  });
});

describe("getSlideIndex", () => {
  it("should return correct index", () => {
    const doc = createTestDocument(3);
    expect(getSlideIndex(doc, "1")).toBe(0);
    expect(getSlideIndex(doc, "2")).toBe(1);
    expect(getSlideIndex(doc, "3")).toBe(2);
  });

  it("should return -1 for non-existent slide", () => {
    const doc = createTestDocument(3);
    expect(getSlideIndex(doc, "999")).toBe(-1);
  });
});

describe("updateSlide", () => {
  it("should update specified slide", () => {
    const doc = createTestDocument(3);
    const newShape = { type: "sp" } as any;

    const result = updateSlide(doc, "2", (slide) => ({
      ...slide,
      shapes: [...slide.shapes, newShape],
    }));

    expect(result.slides[1].slide.shapes).toHaveLength(1);
    expect(result.slides[0].slide.shapes).toHaveLength(0);
    expect(result.slides[2].slide.shapes).toHaveLength(0);
  });

  it("should not mutate original document", () => {
    const doc = createTestDocument(3);

    updateSlide(doc, "2", (slide) => ({
      ...slide,
      shapes: [{ type: "sp" } as any],
    }));

    expect(doc.slides[1].slide.shapes).toHaveLength(0);
  });
});

describe("updateSlideEntry", () => {
  it("should update slide entry metadata", () => {
    const doc = createTestDocument(2);
    const result = updateSlideEntry(doc, "1", (slide) => ({
      ...slide,
      layoutPathOverride: "ppt/slideLayouts/slideLayout2.xml",
    }));

    expect(result.slides[0].layoutPathOverride).toBe("ppt/slideLayouts/slideLayout2.xml");
    expect(result.slides[1].layoutPathOverride).toBeUndefined();
  });

  it("should leave other slides unchanged", () => {
    const doc = createTestDocument(2);
    const result = updateSlideEntry(doc, "2", (slide) => ({
      ...slide,
      layoutPathOverride: "ppt/slideLayouts/slideLayout3.xml",
    }));

    expect(result.slides[0]).toBe(doc.slides[0]);
  });
});
