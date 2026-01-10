/**
 * @file Unit tests for app/index.ts (openPresentation)
 */

import { openPresentation } from "./index";
import {
  createFakePresentationFile,
  createMinimalFakePresentationFile,
  MINIMAL_CONTENT_TYPES,
  MINIMAL_PRESENTATION,
  MINIMAL_PRESENTATION_RELS,
  MINIMAL_SLIDE,
  MINIMAL_SLIDE_RELS,
  MINIMAL_LAYOUT,
  MINIMAL_LAYOUT_RELS,
  MINIMAL_MASTER,
  MINIMAL_MASTER_RELS,
  MINIMAL_THEME,
  APP_XML,
} from "./test-fixtures";

describe("openPresentation", () => {
  describe("basic properties", () => {
    it("should return correct slide count", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.count).toBe(2);
    });

    it("should return correct slide size", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      // 9144000 EMU * (1/914400) = 10 pixels (with SLIDE_FACTOR)
      // Using the formula: (cx * SLIDE_FACTOR) | 0
      expect(presentation.size.width).toBeGreaterThan(0);
      expect(presentation.size.height).toBeGreaterThan(0);
    });

    it("should return app version", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.appVersion).toBe(16);
    });

    it("should return null app version when app.xml is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        "ppt/_rels/presentation.xml.rels": MINIMAL_PRESENTATION_RELS,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
      });
      const presentation = openPresentation(file);
      expect(presentation.appVersion).toBeNull();
    });

    it("should return null thumbnail when not present", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.thumbnail).toBeNull();
    });

    it("should return thumbnail when present", () => {
      const thumbnailData = new ArrayBuffer(100);
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        "ppt/_rels/presentation.xml.rels": MINIMAL_PRESENTATION_RELS,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
        "docProps/app.xml": APP_XML,
        "docProps/thumbnail.jpeg": thumbnailData,
      });
      const presentation = openPresentation(file);
      expect(presentation.thumbnail).toBe(thumbnailData);
    });

    it("should return default text style when present", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(presentation.defaultTextStyle).not.toBeNull();
    });
  });

  describe("list method", () => {
    it("should list all slides without options", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list();
      expect(slides.length).toBe(2);
      expect(slides[0].number).toBe(1);
      expect(slides[0].filename).toBe("slide1");
      expect(slides[1].number).toBe(2);
      expect(slides[1].filename).toBe("slide2");
    });

    it("should respect offset option", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ offset: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(2);
    });

    it("should respect limit option", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ limit: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(1);
    });

    it("should respect both offset and limit options", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = presentation.list({ offset: 0, limit: 1 });
      expect(slides.length).toBe(1);
      expect(slides[0].number).toBe(1);
    });
  });

  describe("getSlide method", () => {
    it("should return slide by number", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.number).toBe(1);
      expect(slide.filename).toBe("slide1");
    });

    it("should throw for non-existent slide number", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      expect(() => presentation.getSlide(99)).toThrow("Slide 99 not found");
    });

    it("should return slide with content", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.content).not.toBeNull();
    });

    it("should return slide with layout", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.layout).not.toBeNull();
    });

    it("should return slide with master", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.master).not.toBeNull();
    });

    it("should return slide with theme", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.theme).not.toBeNull();
    });

    it("should return slide with relationships", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(slide.relationships).toBeDefined();
    });
  });

  describe("slides generator", () => {
    it("should iterate over all slides", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slides = [...presentation.slides()];
      expect(slides.length).toBe(2);
      expect(slides[0].number).toBe(1);
      expect(slides[1].number).toBe(2);
    });

    it("should yield slides lazily", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const iterator = presentation.slides();
      const first = iterator.next();
      expect(first.done).toBe(false);
      expect(first.value.number).toBe(1);
    });
  });

  describe("error cases", () => {
    it("should throw when Content_Types.xml is missing", () => {
      const file = createFakePresentationFile({});
      expect(() => openPresentation(file)).toThrow("Failed to read [Content_Types].xml");
    });

    it("should throw when slide file is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/presentation.xml": MINIMAL_PRESENTATION,
        "ppt/_rels/presentation.xml.rels": MINIMAL_PRESENTATION_RELS,
        // Missing slide files
      });
      const presentation = openPresentation(file);
      expect(() => presentation.getSlide(1)).toThrow("Failed to read slide");
    });

    it("should throw when presentation.xml is missing", () => {
      const file = createFakePresentationFile({
        "[Content_Types].xml": MINIMAL_CONTENT_TYPES,
        "ppt/slides/slide1.xml": MINIMAL_SLIDE,
        "ppt/slides/slide2.xml": MINIMAL_SLIDE,
        "ppt/slides/_rels/slide1.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slides/_rels/slide2.xml.rels": MINIMAL_SLIDE_RELS,
        "ppt/slideLayouts/slideLayout1.xml": MINIMAL_LAYOUT,
        "ppt/slideLayouts/_rels/slideLayout1.xml.rels": MINIMAL_LAYOUT_RELS,
        "ppt/slideMasters/slideMaster1.xml": MINIMAL_MASTER,
        "ppt/slideMasters/_rels/slideMaster1.xml.rels": MINIMAL_MASTER_RELS,
        "ppt/theme/theme1.xml": MINIMAL_THEME,
      });
      expect(() => openPresentation(file)).toThrow("Failed to read ppt/presentation.xml");
    });
  });

  describe("slide rendering", () => {
    it("should have renderHTML method", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(typeof slide.renderHTML).toBe("function");
    });

    it("should have renderSVG method", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      expect(typeof slide.renderSVG).toBe("function");
    });

    it("should render HTML without throwing", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      const html = slide.renderHTML();
      expect(typeof html).toBe("string");
      expect(html).toContain("<style>");
    });

    it("should render SVG without throwing", () => {
      const file = createMinimalFakePresentationFile();
      const presentation = openPresentation(file);
      const slide = presentation.getSlide(1);
      const svg = slide.renderSVG();
      expect(typeof svg).toBe("string");
      expect(svg).toContain("<svg");
    });
  });
});
