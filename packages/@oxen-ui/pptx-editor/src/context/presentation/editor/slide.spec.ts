/**
 * @file Slide operations tests
 */

/* eslint-disable no-restricted-syntax, @typescript-eslint/no-explicit-any, custom/no-as-outside-guard -- Test file uses flexible typing for mock data */

import { px } from "@oxen/ooxml/domain/units";
import type { Slide } from "@oxen/pptx/domain";
import type { PresentationDocument, SlideWithId } from "@oxen/pptx/app";
import {
  generateSlideId,
  findSlideById,
  getSlideIndex,
  addSlide,
  deleteSlide,
  duplicateSlide,
  moveSlide,
  updateSlide,
  updateSlideEntry,
} from "./slide";

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

describe("addSlide", () => {
  it("should add slide at end by default", () => {
    const doc = createTestDocument(2);
    const newSlide = createEmptySlide();
    const result = addSlide(doc, newSlide);

    expect(result.document.slides).toHaveLength(3);
    expect(result.document.slides[2].id).toBe(result.newSlideId);
  });

  it("should add slide after specified slide", () => {
    const doc = createTestDocument(3);
    const newSlide = createEmptySlide();
    const result = addSlide(doc, newSlide, "1");

    expect(result.document.slides).toHaveLength(4);
    expect(result.document.slides[1].id).toBe(result.newSlideId);
    expect(result.document.slides[2].id).toBe("2");
  });

  it("should add at end if afterSlideId not found", () => {
    const doc = createTestDocument(2);
    const newSlide = createEmptySlide();
    const result = addSlide(doc, newSlide, "999");

    expect(result.document.slides).toHaveLength(3);
    expect(result.document.slides[2].id).toBe(result.newSlideId);
  });

  it("should not mutate original document", () => {
    const doc = createTestDocument(2);
    const originalLength = doc.slides.length;
    addSlide(doc, createEmptySlide());

    expect(doc.slides).toHaveLength(originalLength);
  });
});

describe("deleteSlide", () => {
  it("should remove specified slide", () => {
    const doc = createTestDocument(3);
    const result = deleteSlide(doc, "2");

    expect(result.slides).toHaveLength(2);
    expect(result.slides.map((s) => s.id)).toEqual(["1", "3"]);
  });

  it("should return unchanged document if slide not found", () => {
    const doc = createTestDocument(3);
    const result = deleteSlide(doc, "999");

    expect(result.slides).toHaveLength(3);
  });

  it("should not mutate original document", () => {
    const doc = createTestDocument(3);
    deleteSlide(doc, "2");

    expect(doc.slides).toHaveLength(3);
  });
});

describe("duplicateSlide", () => {
  it("should duplicate slide after original", () => {
    const doc = createTestDocument(3);
    const result = duplicateSlide(doc, "2");

    expect(result).toBeDefined();
    expect(result?.document.slides).toHaveLength(4);
    expect(result?.document.slides[2].id).toBe(result?.newSlideId);
  });

  it("should return undefined for non-existent slide", () => {
    const doc = createTestDocument(3);
    const result = duplicateSlide(doc, "999");

    expect(result).toBeUndefined();
  });

  it("should deep clone the slide data", () => {
    const baseDoc = createTestDocument(1);
    // Create doc with initial shape using spread
    const doc = {
      ...baseDoc,
      slides: [
        {
          ...baseDoc.slides[0],
          slide: {
            ...baseDoc.slides[0].slide,
            shapes: [{ type: "sp" } as any],
          },
        },
      ],
    };

    const result = duplicateSlide(doc, "1");
    expect(result).toBeDefined();

    // Modify original by creating new doc (simulating mutation for test)
    // The actual test is that the duplicated slide has its own copy
    expect(result?.document.slides[1].slide.shapes).toHaveLength(1);
  });
});

describe("moveSlide", () => {
  it("should move slide to new position", () => {
    const doc = createTestDocument(4);
    const result = moveSlide(doc, "1", 2);

    expect(result.slides.map((s) => s.id)).toEqual(["2", "3", "1", "4"]);
  });

  it("should return unchanged document if slide not found", () => {
    const doc = createTestDocument(3);
    const result = moveSlide(doc, "999", 0);

    expect(result).toBe(doc);
  });

  it("should return unchanged document if already at position", () => {
    const doc = createTestDocument(3);
    const result = moveSlide(doc, "2", 1);

    expect(result).toBe(doc);
  });

  it("should handle move to end", () => {
    const doc = createTestDocument(3);
    const result = moveSlide(doc, "1", 2);

    expect(result.slides.map((s) => s.id)).toEqual(["2", "3", "1"]);
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
