/**
 * @file Tests for font reference parsing
 *
 * Verifies that a:fontRef elements with color children are correctly parsed.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef)
 */

import { parseXml, isXmlElement, getChild, getAttr } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import { parseColorFromParent } from "./graphics/color-parser";
import { parseFontCollectionIndex } from "./primitive";

/**
 * Parse XML string to element
 */
function xml(str: string): XmlElement {
  const doc = parseXml(str);
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  throw new Error("No root element found");
}

/**
 * Simulated parseFontReference to verify the logic
 * (actual function is not exported)
 */
function testParseFontReference(element: XmlElement | undefined) {
  if (!element) {return undefined;}

  const idx = parseFontCollectionIndex(getAttr(element, "idx"));
  if (!idx || idx === "none") {return undefined;}

  const parsedColor = parseColorFromParent(element);
  const color = parsedColor ? { type: "solidFill" as const, color: parsedColor } : undefined;

  return { index: idx, color };
}

function expectColorSpecValue(
  result: ReturnType<typeof testParseFontReference>,
  type: "scheme" | "srgb",
  value: string,
): void {
  const spec = result?.color?.color?.spec;
  if (!spec || spec.type !== type) {
    throw new Error(`Expected ${type} color spec`);
  }
  expect(spec.value).toBe(value);
}

describe("parseFontReference", () => {
  describe("a:fontRef with a:schemeClr child", () => {
    it("parses a:fontRef with minor index and lt1 scheme color", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" idx="minor">
          <a:schemeClr val="lt1"/>
        </a:fontRef>
      `);

      const result = testParseFontReference(fontRef);

      expect(result).toBeDefined();
      expect(result?.index).toBe("minor");
      expect(result?.color).toBeDefined();
      expect(result?.color?.type).toBe("solidFill");
      expect(result?.color?.color?.spec?.type).toBe("scheme");
      expectColorSpecValue(result, "scheme", "lt1");
    });

    it("parses a:fontRef with major index and accent1 scheme color", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" idx="major">
          <a:schemeClr val="accent1"/>
        </a:fontRef>
      `);

      const result = testParseFontReference(fontRef);

      expect(result).toBeDefined();
      expect(result?.index).toBe("major");
      expect(result?.color?.color?.spec?.type).toBe("scheme");
      expectColorSpecValue(result, "scheme", "accent1");
    });

    it("parses a:fontRef with srgbClr color", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" idx="minor">
          <a:srgbClr val="FF0000"/>
        </a:fontRef>
      `);

      const result = testParseFontReference(fontRef);

      expect(result).toBeDefined();
      expect(result?.color?.color?.spec?.type).toBe("srgb");
      expectColorSpecValue(result, "srgb", "FF0000");
    });

    it("returns undefined for fontRef without index", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:schemeClr val="lt1"/>
        </a:fontRef>
      `);

      const result = testParseFontReference(fontRef);
      expect(result).toBeUndefined();
    });

    it("returns fontRef without color when no color child present", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" idx="minor"/>
      `);

      const result = testParseFontReference(fontRef);

      expect(result).toBeDefined();
      expect(result?.index).toBe("minor");
      expect(result?.color).toBeUndefined();
    });

    it("returns undefined for idx=none", () => {
      const fontRef = xml(`
        <a:fontRef xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" idx="none">
          <a:schemeClr val="lt1"/>
        </a:fontRef>
      `);

      const result = testParseFontReference(fontRef);
      expect(result).toBeUndefined();
    });
  });

  describe("p:style containing a:fontRef", () => {
    it("extracts a:fontRef from p:style element", () => {
      const style = xml(`
        <p:style xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lnRef idx="2">
            <a:schemeClr val="accent1">
              <a:shade val="50000"/>
            </a:schemeClr>
          </a:lnRef>
          <a:fillRef idx="1">
            <a:schemeClr val="accent1"/>
          </a:fillRef>
          <a:effectRef idx="0">
            <a:schemeClr val="accent1"/>
          </a:effectRef>
          <a:fontRef idx="minor">
            <a:schemeClr val="lt1"/>
          </a:fontRef>
        </p:style>
      `);

      const fontRefEl = getChild(style, "a:fontRef");
      expect(fontRefEl).toBeDefined();

      const result = testParseFontReference(fontRefEl);

      expect(result).toBeDefined();
      expect(result?.index).toBe("minor");
      expect(result?.color?.type).toBe("solidFill");
      expect(result?.color?.color?.spec?.type).toBe("scheme");
      expectColorSpecValue(result, "scheme", "lt1");
    });
  });
});
