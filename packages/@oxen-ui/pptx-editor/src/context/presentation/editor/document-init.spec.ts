/**
 * @file Document initialization tests
 */

import { px } from "@oxen/ooxml/domain/units";
import type { Slide } from "@oxen/pptx/domain";
import {
  createDocumentFromPresentation,
  createEmptyDocument,
} from "./document-init";

function createEmptySlide(): Slide {
  return { shapes: [] };
}

describe("createDocumentFromPresentation", () => {
  it("should create document with slides", () => {
    const presentation = {
      slideSize: { width: px(1920), height: px(1080) },
    };
    const slides = [createEmptySlide(), createEmptySlide()];

    const doc = createDocumentFromPresentation(
      presentation,
      slides,
      px(1920),
      px(1080)
    );

    expect(doc.slides).toHaveLength(2);
    expect(doc.slides[0].id).toBe("1");
    expect(doc.slides[1].id).toBe("2");
    expect(doc.slideWidth).toBe(px(1920));
    expect(doc.slideHeight).toBe(px(1080));
  });
});

describe("createEmptyDocument", () => {
  it("should create document with one empty slide", () => {
    const doc = createEmptyDocument(px(800), px(600));

    expect(doc.slides).toHaveLength(1);
    expect(doc.slides[0].id).toBe("1");
    expect(doc.slides[0].slide.shapes).toHaveLength(0);
    expect(doc.slideWidth).toBe(px(800));
    expect(doc.slideHeight).toBe(px(600));
  });
});
