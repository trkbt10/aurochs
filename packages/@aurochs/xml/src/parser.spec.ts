/**
 * @file Tests for XML parser with actual PPTX files
 *
 * These tests verify that the XML parser correctly handles real PPTX content
 * from fixtures/extracted/2411-Performance_Up/
 *
 * @see ECMA-376 Part 1 for PresentationML specification
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseXml } from "./parser";
import { getChild, getChildren, getTextContent, isXmlElement, isXmlText } from "./ast";
import type { XmlElement, XmlDocument } from "./ast";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE_PATH = path.resolve(__dirname, "../../../../fixtures/extracted/2411-Performance_Up/ppt/slides");

/**
 * Helper to read and parse a slide XML file
 */
function parseSlide(slideNumber: number): XmlDocument {
  const path = `${FIXTURE_PATH}/slide${slideNumber}.xml`;
  const xml = readFileSync(path, "utf-8");
  return parseXml(xml);
}

/**
 * Find elements matching a predicate.
 * When using a type guard, returns properly typed array.
 */
function findElements<T extends XmlElement>(
  node: XmlElement | XmlDocument,
  predicate: (el: XmlElement) => el is T,
): T[];
function findElements(
  node: XmlElement | XmlDocument,
  predicate: (el: XmlElement) => boolean,
): XmlElement[];
function findElements(
  node: XmlElement | XmlDocument,
  predicate: (el: XmlElement) => boolean,
): XmlElement[] {
  const results: XmlElement[] = [];

  function traverse(n: XmlElement | XmlDocument): void {
    if (isXmlElement(n)) {
      if (predicate(n)) {
        results.push(n);
      }
    }
    const children = "children" in n ? n.children : [];
    for (const child of children) {
      if (isXmlElement(child)) {
        traverse(child);
      }
    }
  }

  traverse(node);
  return results;
}

/**
 * Find element by name recursively
 */
function findByName(node: XmlElement | XmlDocument, name: string): XmlElement[] {
  return findElements(node, (el) => el.name === name);
}

describe("XML Parser with actual PPTX files", () => {
  describe("slide1.xml - Basic text structure", () => {
    it("parses slide root element correctly", () => {
      const doc = parseSlide(1);

      // Document should have children
      expect(doc.children.length).toBeGreaterThan(0);

      // Find root p:sld element
      const sld = doc.children.find((c): c is XmlElement => {
        if (!isXmlElement(c)) {
          return false;
        }
        return c.name === "p:sld";
      });
      expect(sld).toBeDefined();
      expect(sld?.type).toBe("element");
      expect(sld?.name).toBe("p:sld");
    });

    it("parses text run (a:r) with text content (a:t)", () => {
      const doc = parseSlide(1);

      // Find all a:t elements (text containers)
      const textElements = findByName(doc, "a:t");
      expect(textElements.length).toBeGreaterThan(0);

      // Each a:t should have text children
      const firstText = textElements[0];
      expect(firstText.children.length).toBeGreaterThan(0);

      // Text content should be XmlText node
      const textNode = firstText.children[0];
      expect(isXmlText(textNode)).toBe(true);
      if (isXmlText(textNode)) {
        expect(typeof textNode.value).toBe("string");
        expect(textNode.value.length).toBeGreaterThan(0);
      }
    });

    it("extracts text content correctly with getTextContent", () => {
      const doc = parseSlide(1);

      const textElements = findByName(doc, "a:t");
      const texts = textElements.map((el) => getTextContent(el));

      // Should contain "Apache Performance Tuning"
      expect(texts.some((t) => t.includes("Apache Performance Tuning"))).toBe(true);
      // Should contain "Part 1: Scaling Up"
      expect(texts.some((t) => t.includes("Part 1: Scaling Up"))).toBe(true);
    });

    it("parses run properties (a:rPr) with attributes", () => {
      const doc = parseSlide(1);

      const rPrs = findByName(doc, "a:rPr");
      expect(rPrs.length).toBeGreaterThan(0);

      // First rPr should have lang attribute
      const firstRPr = rPrs[0];
      expect(firstRPr.attrs).toBeDefined();
      expect(firstRPr.attrs.lang).toBe("en-US");
    });

    it("parses shape transform (a:xfrm) with position and size", () => {
      const doc = parseSlide(1);

      const xfrms = findByName(doc, "a:xfrm");
      expect(xfrms.length).toBeGreaterThan(0);

      // Find xfrm with non-zero values
      const xfrmWithValues = xfrms.find((xfrm) => {
        const off = getChild(xfrm, "a:off");
        if (!off) {
          return false;
        }
        return off.attrs.x !== "0" || off.attrs.y !== "0";
      });

      if (xfrmWithValues) {
        const off = getChild(xfrmWithValues, "a:off");
        const ext = getChild(xfrmWithValues, "a:ext");

        expect(off).toBeDefined();
        expect(ext).toBeDefined();

        // Offset should have x, y as strings (EMU values)
        expect(typeof off?.attrs.x).toBe("string");
        expect(typeof off?.attrs.y).toBe("string");

        // Extent should have cx, cy as strings (EMU values)
        expect(typeof ext?.attrs.cx).toBe("string");
        expect(typeof ext?.attrs.cy).toBe("string");
      }
    });
  });

  describe("slide2.xml - Text alignment", () => {
    it("parses paragraph properties (a:pPr) with alignment", () => {
      const doc = parseSlide(2);

      // Find a:pPr elements with algn attribute
      const pPrs = findElements(doc, (el) => {
        if (el.name !== "a:pPr") {
          return false;
        }
        return "algn" in el.attrs;
      });

      expect(pPrs.length).toBeGreaterThan(0);

      // Should have center alignment
      const centerAligned = pPrs.find((pPr) => pPr.attrs.algn === "ctr");
      expect(centerAligned).toBeDefined();
      expect(centerAligned?.attrs.algn).toBe("ctr");
    });

    it("correctly associates alignment with text content", () => {
      const doc = parseSlide(2);

      // Find paragraphs (a:p) that contain centered text
      const paragraphs = findByName(doc, "a:p");

      const centeredParagraphs = paragraphs.filter((p) => {
        const pPr = getChild(p, "a:pPr");
        if (!pPr) {
          return false;
        }
        return pPr.attrs.algn === "ctr";
      });

      expect(centeredParagraphs.length).toBeGreaterThan(0);

      // Get text from centered paragraphs
      const centeredTexts = centeredParagraphs.flatMap((p) => {
        const runs = getChildren(p, "a:r");
        return runs.flatMap((r) => {
          const t = getChild(r, "a:t");
          if (!t) {
            return [];
          }
          return [getTextContent(t)];
        });
      });

      expect(centeredTexts.length).toBeGreaterThan(0);
    });
  });

  describe("slide10.xml - Picture elements", () => {
    it("parses picture element (p:pic) structure", () => {
      const doc = parseSlide(10);

      const pics = findByName(doc, "p:pic");
      expect(pics.length).toBeGreaterThan(0);

      const pic = pics[0];

      // Should have nvPicPr (non-visual properties)
      const nvPicPr = getChild(pic, "p:nvPicPr");
      expect(nvPicPr).toBeDefined();

      // Should have blipFill (image reference)
      const blipFill = getChild(pic, "p:blipFill");
      expect(blipFill).toBeDefined();

      // Should have spPr (shape properties with position)
      const spPr = getChild(pic, "p:spPr");
      expect(spPr).toBeDefined();
    });

    it("parses blip element with relationship reference", () => {
      const doc = parseSlide(10);

      const blips = findByName(doc, "a:blip");
      expect(blips.length).toBeGreaterThan(0);

      const blip = blips[0];

      // Should have r:embed attribute referencing the image
      expect(blip.attrs["r:embed"]).toBeDefined();
      expect(blip.attrs["r:embed"]).toMatch(/^rId\d+$/);
    });

    it("parses picture position and size", () => {
      const doc = parseSlide(10);

      const pics = findByName(doc, "p:pic");
      const pic = pics[0];
      const spPr = getChild(pic, "p:spPr");
      const xfrm = spPr ? getChild(spPr, "a:xfrm") : undefined;

      expect(xfrm).toBeDefined();

      if (xfrm) {
        const off = getChild(xfrm, "a:off");
        const ext = getChild(xfrm, "a:ext");

        expect(off).toBeDefined();
        expect(ext).toBeDefined();

        // Position values should be numeric strings (EMU)
        expect(Number(off?.attrs.x)).toBeGreaterThan(0);
        expect(Number(off?.attrs.y)).toBeGreaterThan(0);

        // Size values should be numeric strings (EMU)
        expect(Number(ext?.attrs.cx)).toBeGreaterThan(0);
        expect(Number(ext?.attrs.cy)).toBeGreaterThan(0);
      }
    });
  });

  describe("Type safety verification", () => {
    it("XmlElement has required properties", () => {
      const doc = parseSlide(1);

      const elements = findByName(doc, "a:t");
      const el = elements[0];

      // XmlElement must have these properties (not optional)
      expect(el.type).toBe("element");
      expect(typeof el.name).toBe("string");
      expect(el.attrs).toBeDefined();
      expect(Array.isArray(el.children)).toBe(true);
    });

    it("XmlText has required properties", () => {
      const doc = parseSlide(1);

      const textElements = findByName(doc, "a:t");
      const textChildren = textElements[0].children.filter(isXmlText);

      expect(textChildren.length).toBeGreaterThan(0);

      const textNode = textChildren[0];

      // XmlText must have these properties
      expect(textNode.type).toBe("text");
      expect(typeof textNode.value).toBe("string");
    });

    it("attrs is always Record<string, string>", () => {
      const doc = parseSlide(1);

      const allElements = findElements(doc, () => true);

      for (const el of allElements) {
        expect(typeof el.attrs).toBe("object");
        for (const [key, value] of Object.entries(el.attrs)) {
          expect(typeof key).toBe("string");
          expect(typeof value).toBe("string");
        }
      }
    });
  });
});
