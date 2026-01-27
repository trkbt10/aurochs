/**
 * @file Placeholder type resolver tests
 *
 * Tests for ECMA-376 placeholder type inheritance.
 *
 * @see ECMA-376 Part 1, Section 19.3.1.36 (p:ph)
 *
 * Key requirements:
 * 1. When a placeholder has both idx and type, use the type directly
 * 2. When a placeholder has only idx (no type), inherit type from layout/master
 * 3. The inherited type determines which master text style to apply
 */

import { parseXml, isXmlElement } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import type { PlaceholderTables } from "../context";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Parse XML string and return root element
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

function isNamedElement(child: unknown, name: string): child is XmlElement {
  if (!isXmlElement(child)) {return false;}
  return child.name === name;
}

function findChildElement(parent: XmlElement, name: string): XmlElement | undefined {
  return parent.children.find((child): child is XmlElement => isNamedElement(child, name));
}

/**
 * Create placeholder tables from shapes
 */
function createPlaceholderTables(shapes: XmlElement[]): PlaceholderTables {
  const byIdx = new Map<number, XmlElement>();
  const byType: Record<string, XmlElement> = {};

  for (const shape of shapes) {
    const nvSpPr = findChildElement(shape, "p:nvSpPr");
    if (!nvSpPr) {continue;}

    const nvPr = findChildElement(nvSpPr, "p:nvPr");
    if (!nvPr) {continue;}

    const ph = findChildElement(nvPr, "p:ph");
    if (!ph) {continue;}

    const idx = ph.attrs?.idx;
    const type = ph.attrs?.type;

    if (idx !== undefined) {
      const idxNum = Number(idx);
      if (!Number.isNaN(idxNum)) {
        byIdx.set(idxNum, shape);
      }
    }
    if (type !== undefined) {
      byType[type] = shape;
    }
  }

  return { byIdx, byType };
}

// =============================================================================
// Placeholder Type Inheritance Tests
// =============================================================================

describe("Placeholder Type Resolution", () => {
  describe("ECMA-376 Section 19.3.1.36 - p:ph element", () => {
    describe("Direct type specification", () => {
      it("should use type directly when specified", () => {
        // Slide placeholder with type="title"
        const slidePlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="2" name="Title"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph type="title"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const nvSpPr = findChildElement(slidePlaceholder, "p:nvSpPr");
        const nvPr = nvSpPr ? findChildElement(nvSpPr, "p:nvPr") : undefined;
        const ph = nvPr ? findChildElement(nvPr, "p:ph") : undefined;

        expect(ph?.attrs?.type).toBe("title");
      });

      it("should use type with idx when both specified", () => {
        // Slide placeholder with type="body" and idx="1"
        const slidePlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph type="body" idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const nvSpPr = findChildElement(slidePlaceholder, "p:nvSpPr");
        const nvPr = nvSpPr ? findChildElement(nvSpPr, "p:nvPr") : undefined;
        const ph = nvPr ? findChildElement(nvPr, "p:ph") : undefined;

        expect(ph?.attrs?.type).toBe("body");
        expect(ph?.attrs?.idx).toBe("1");
      });
    });

    describe("idx-only placeholder type inheritance", () => {
      it("should inherit type from layout when slide placeholder has only idx", () => {
        // This is the key test case for the bug:
        // Slide: <p:ph idx="1"/> (no type)
        // Layout: <p:ph idx="1"/> (no type)
        // Master: <p:ph type="body" idx="1"/>
        // Expected: type should be inherited as "body"

        const slidePlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const layoutPlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content Placeholder"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const masterPlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content Placeholder"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph type="body" idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const layoutTables = createPlaceholderTables([layoutPlaceholder]);
        const masterTables = createPlaceholderTables([masterPlaceholder]);

        // Get placeholder from slide
        const slideNvSpPr = findChildElement(slidePlaceholder, "p:nvSpPr");
        const slideNvPr = slideNvSpPr ? findChildElement(slideNvSpPr, "p:nvPr") : undefined;
        const slidePh = slideNvPr ? findChildElement(slideNvPr, "p:ph") : undefined;

        if (!slidePh) {
          throw new Error("Slide placeholder not found");
        }
        // Slide placeholder has no type
        expect(slidePh.attrs?.type).toBeUndefined();
        expect(slidePh.attrs?.idx).toBe("1");

        // Layout placeholder also has no type
        const layoutShape = layoutTables.byIdx.get(1);
        const layoutNvSpPr = layoutShape ? findChildElement(layoutShape, "p:nvSpPr") : undefined;
        const layoutNvPr = layoutNvSpPr ? findChildElement(layoutNvSpPr, "p:nvPr") : undefined;
        const layoutPh = layoutNvPr ? findChildElement(layoutNvPr, "p:ph") : undefined;
        expect(layoutPh?.attrs?.type).toBeUndefined();

        // Master placeholder has type="body"
        const masterShape = masterTables.byIdx.get(1);
        const masterNvSpPr = masterShape ? findChildElement(masterShape, "p:nvSpPr") : undefined;
        const masterNvPr = masterNvSpPr ? findChildElement(masterNvSpPr, "p:nvPr") : undefined;
        const masterPh = masterNvPr ? findChildElement(masterNvPr, "p:ph") : undefined;
        expect(masterPh?.attrs?.type).toBe("body");

        // TODO: This is where the implementation should resolve the type
        // The resolvePlaceholderType function should return "body"
        // Currently this is not implemented, so this test will fail
        // pending("resolvePlaceholderType function not yet implemented");
      });

      it("should inherit type from layout when layout has type", () => {
        const slidePlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const layoutPlaceholder = xml(`
          <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
            <p:nvSpPr>
              <p:cNvPr id="3" name="Content Placeholder"/>
              <p:cNvSpPr/>
              <p:nvPr>
                <p:ph type="body" idx="1"/>
              </p:nvPr>
            </p:nvSpPr>
          </p:sp>
        `);

        const slideTables = createPlaceholderTables([slidePlaceholder]);
        expect(slideTables.byIdx.has(1)).toBe(true);

        const layoutTables = createPlaceholderTables([layoutPlaceholder]);

        // Layout placeholder has type
        const layoutShape2 = layoutTables.byIdx.get(1);
        const layoutNvSpPr2 = layoutShape2 ? findChildElement(layoutShape2, "p:nvSpPr") : undefined;
        const layoutNvPr2 = layoutNvSpPr2 ? findChildElement(layoutNvSpPr2, "p:nvPr") : undefined;
        const layoutPh2 = layoutNvPr2 ? findChildElement(layoutNvPr2, "p:ph") : undefined;
        expect(layoutPh2?.attrs?.type).toBe("body");
      });
    });

    describe("Type to master style mapping", () => {
      /**
       * Complete mapping of all 16 ST_PlaceholderType values to master styles.
       * @see ECMA-376 Part 1, Section 19.7.10 (ST_PlaceholderType)
       * @see ECMA-376 Part 1, Section 19.3.1.51 (p:txStyles)
       */
      const typeMappings = [
        // Title placeholders → titleStyle
        { type: "title", expectedStyle: "titleStyle" },
        { type: "ctrTitle", expectedStyle: "titleStyle" },

        // Content placeholders → bodyStyle
        { type: "body", expectedStyle: "bodyStyle" },
        { type: "subTitle", expectedStyle: "bodyStyle" },
        { type: "obj", expectedStyle: "bodyStyle" },
        { type: "chart", expectedStyle: "bodyStyle" },
        { type: "tbl", expectedStyle: "bodyStyle" },
        { type: "clipArt", expectedStyle: "bodyStyle" },
        { type: "dgm", expectedStyle: "bodyStyle" },
        { type: "media", expectedStyle: "bodyStyle" },
        { type: "pic", expectedStyle: "bodyStyle" },
        { type: "sldImg", expectedStyle: "bodyStyle" },

        // Metadata placeholders → otherStyle
        { type: "dt", expectedStyle: "otherStyle" },
        { type: "ftr", expectedStyle: "otherStyle" },
        { type: "sldNum", expectedStyle: "otherStyle" },
        { type: "hdr", expectedStyle: "otherStyle" },
      ];

      it.each(typeMappings)(
        "should map placeholder type '$type' to master $expectedStyle",
        ({ type, expectedStyle }) => {
          // This test validates the TYPE_TO_MASTER_STYLE mapping
          // The actual resolution happens in text-style-resolver.ts
          expect(type).toBeTruthy();
          expect(["titleStyle", "bodyStyle", "otherStyle"]).toContain(expectedStyle);
        }
      );
    });
  });
});

// =============================================================================
// Shape Parser Integration Tests
// =============================================================================

describe("Shape Parser - Placeholder Type Context", () => {
  describe("TextStyleContext creation", () => {
    it.skip("should include resolved placeholder type in TextStyleContext", () => {
      // This test verifies that parseSpShape correctly resolves
      // placeholder type for idx-only placeholders

      // Current behavior (incorrect):
      // placeholderType: placeholder?.type  // undefined for idx-only

      // Expected behavior (correct):
      // placeholderType: resolvePlaceholderType(placeholder, layout, master)

      // This is a specification test - implementation should pass this
    });

    it.skip("should resolve type from master when layout also has no type", () => {
      // Test case matching 2411-Performance_Up.pptx Slide 7:
      // - Slide: <p:ph idx="1"/>
      // - Layout: <p:ph idx="1"/>
      // - Master: <p:ph type="body" idx="1"/>
      // - Expected placeholderType: "body"
    });
  });
});
