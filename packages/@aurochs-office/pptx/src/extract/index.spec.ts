/**
 * @file PPTX extract API tests
 */

import type { XmlDocument, XmlElement } from "@aurochs/xml";
import type { Presentation, Slide as ApiSlide } from "../app/types";
import { extractSlideSegments } from "./index";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal XML element.
 */
function createElement(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return {
    type: "element",
    name,
    attrs,
    children,
  };
}

/**
 * Create a text element (a:t).
 */
function createTextElement(text: string): XmlElement {
  return {
    type: "element",
    name: "a:t",
    attrs: {},
    children: [{ type: "text", value: text }],
  };
}

/**
 * Create a run element (a:r) with text.
 */
function createRunElement(text: string): XmlElement {
  return createElement("a:r", {}, [createTextElement(text)]);
}

/**
 * Create a paragraph element (a:p) with text.
 */
function createParagraphElement(text: string): XmlElement {
  return createElement("a:p", {}, [createRunElement(text)]);
}

/**
 * Create a text body element (p:txBody) with paragraphs.
 */
function createTextBodyElement(paragraphs: string[]): XmlElement {
  return createElement(
    "p:txBody",
    {},
    paragraphs.map(createParagraphElement)
  );
}

/**
 * Create nvPr element with optional placeholder.
 */
function createNvPrElement(placeholderType?: string): XmlElement {
  if (placeholderType) {
    return createElement("p:nvPr", {}, [createElement("p:ph", { type: placeholderType })]);
  }
  return createElement("p:nvPr", {});
}

/**
 * Create a shape element (p:sp) with text and optional placeholder type.
 */
function createShapeElement(text: string, placeholderType?: string): XmlElement {
  const nvSpPr = createElement("p:nvSpPr", {}, [
    createElement("p:cNvPr", { id: "1", name: "Shape" }),
    createElement("p:cNvSpPr", {}),
    createNvPrElement(placeholderType),
  ]);

  return createElement("p:sp", {}, [nvSpPr, createElement("p:spPr", {}), createTextBodyElement([text])]);
}

/**
 * Create a shape tree element (p:spTree) with shapes.
 */
function createShapeTreeElement(shapes: XmlElement[]): XmlElement {
  return createElement("p:spTree", {}, [createElement("p:nvGrpSpPr", {}), createElement("p:grpSpPr", {}), ...shapes]);
}

/**
 * Create a slide XML document.
 */
function createSlideXml(shapes: XmlElement[]): XmlDocument {
  const cSld = createElement("p:cSld", {}, [createShapeTreeElement(shapes)]);
  const sld = createElement("p:sld", {}, [cSld]);
  return { children: [sld] };
}

/**
 * Create a mock IndexTables.
 */
function createMockIndexTables(): ApiSlide["layoutTables"] {
  return { idTable: {}, idxTable: new Map(), typeTable: {} };
}

/**
 * Create a mock ResourceMap.
 */
function createMockResourceMap(): ApiSlide["relationships"] {
  return {
    getTarget: () => undefined,
    getType: () => undefined,
    getTargetByType: () => undefined,
    getAllTargetsByType: () => [],
  };
}

/**
 * Create a mock API slide.
 */
function createApiSlide(number: number, content: XmlDocument): ApiSlide {
  return {
    number,
    filename: `slide${number}`,
    content,
    layout: null,
    layoutTables: createMockIndexTables(),
    master: null,
    masterTables: createMockIndexTables(),
    masterTextStyles: undefined,
    theme: null,
    relationships: createMockResourceMap(),
    layoutRelationships: createMockResourceMap(),
    masterRelationships: createMockResourceMap(),
    themeRelationships: createMockResourceMap(),
    diagram: null,
    diagramRelationships: createMockResourceMap(),
    timing: undefined,
    transition: undefined,
    themeOverrides: [],
    zip: {} as ApiSlide["zip"],
    defaultTextStyle: null,
    tableStyles: null,
    slideSize: { width: 960 as ApiSlide["slideSize"]["width"], height: 540 as ApiSlide["slideSize"]["height"] },
    renderOptions: {} as ApiSlide["renderOptions"],
  };
}

/**
 * Create a mock presentation.
 */
function createPresentation(slides: ApiSlide[]): Presentation {
  return {
    size: { width: 960 as ApiSlide["slideSize"]["width"], height: 540 as ApiSlide["slideSize"]["height"] },
    count: slides.length,
    thumbnail: null,
    appVersion: null,
    defaultTextStyle: null,
    tableStyles: null,
    list: () => slides.map((s) => ({ number: s.number, filename: s.filename })),
    getSlide: (n: number) => slides[n - 1],
    *slides() {
      yield* slides;
    },
  };
}

// =============================================================================
// extractSlideSegments Tests
// =============================================================================

describe("extractSlideSegments", () => {
  it("returns empty segments for empty presentation", () => {
    const presentation = createPresentation([]);
    const result = extractSlideSegments(presentation);

    expect(result.segments).toHaveLength(0);
    expect(result.totalText).toBe("");
    expect(result.sourceLength).toBe(0);
  });

  it("extracts text from single slide", () => {
    const slideXml = createSlideXml([createShapeElement("Hello World")]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].type).toBe("slide");
    expect(result.segments[0].text).toBe("Hello World");
    expect(result.segments[0].metadata.slideNumber).toBe(1);
  });

  it("extracts title from title placeholder", () => {
    const slideXml = createSlideXml([
      createShapeElement("My Title", "title"),
      createShapeElement("Body content"),
    ]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].metadata.slideTitle).toBe("My Title");
  });

  it("extracts title from ctrTitle placeholder", () => {
    const slideXml = createSlideXml([createShapeElement("Centered Title", "ctrTitle")]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].metadata.slideTitle).toBe("Centered Title");
  });

  it("extracts text from multiple slides", () => {
    const slide1Xml = createSlideXml([createShapeElement("Slide 1 Content")]);
    const slide2Xml = createSlideXml([createShapeElement("Slide 2 Content")]);
    const slide1 = createApiSlide(1, slide1Xml);
    const slide2 = createApiSlide(2, slide2Xml);
    const presentation = createPresentation([slide1, slide2]);

    const result = extractSlideSegments(presentation);

    expect(result.segments).toHaveLength(2);
    expect(result.segments[0].metadata.slideNumber).toBe(1);
    expect(result.segments[1].metadata.slideNumber).toBe(2);
  });

  it("counts shapes with text", () => {
    const slideXml = createSlideXml([
      createShapeElement("Shape 1"),
      createShapeElement("Shape 2"),
      createShapeElement("Shape 3"),
    ]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].metadata.shapeCount).toBe(3);
  });

  it("assigns correct segment IDs", () => {
    const slide1Xml = createSlideXml([createShapeElement("A")]);
    const slide2Xml = createSlideXml([createShapeElement("B")]);
    const slide1 = createApiSlide(1, slide1Xml);
    const slide2 = createApiSlide(2, slide2Xml);
    const presentation = createPresentation([slide1, slide2]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].id).toBe("slide-1");
    expect(result.segments[1].id).toBe("slide-2");
  });

  it("calculates correct source ranges", () => {
    const slide1Xml = createSlideXml([createShapeElement("ABC")]); // 3 chars
    const slide2Xml = createSlideXml([createShapeElement("DEFGH")]); // 5 chars
    const slide1 = createApiSlide(1, slide1Xml);
    const slide2 = createApiSlide(2, slide2Xml);
    const presentation = createPresentation([slide1, slide2]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].sourceRange.start).toBe(0);
    expect(result.segments[0].sourceRange.end).toBe(3);
    expect(result.segments[1].sourceRange.start).toBe(4); // 3 + 1 (separator)
    expect(result.segments[1].sourceRange.end).toBe(9); // 4 + 5
  });

  it("joins text from multiple shapes with newlines", () => {
    const slideXml = createSlideXml([createShapeElement("Line 1"), createShapeElement("Line 2")]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments[0].text).toBe("Line 1\nLine 2");
  });

  it("joins all slides in totalText", () => {
    const slide1Xml = createSlideXml([createShapeElement("Slide 1")]);
    const slide2Xml = createSlideXml([createShapeElement("Slide 2")]);
    const slide1 = createApiSlide(1, slide1Xml);
    const slide2 = createApiSlide(2, slide2Xml);
    const presentation = createPresentation([slide1, slide2]);

    const result = extractSlideSegments(presentation);

    expect(result.totalText).toBe("Slide 1\nSlide 2");
    expect(result.sourceLength).toBe(15);
  });

  it("handles slides with no text shapes", () => {
    // Create a slide with an empty shape tree
    const slideXml = createSlideXml([]);
    const slide = createApiSlide(1, slideXml);
    const presentation = createPresentation([slide]);

    const result = extractSlideSegments(presentation);

    expect(result.segments).toHaveLength(1);
    expect(result.segments[0].text).toBe("");
    expect(result.segments[0].metadata.shapeCount).toBe(0);
    expect(result.segments[0].metadata.slideTitle).toBeUndefined();
  });
});
