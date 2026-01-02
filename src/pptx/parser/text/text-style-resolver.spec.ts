/**
 * @file Text style resolver unit tests
 *
 * Tests for ECMA-376 style inheritance chain resolution.
 *
 * The inheritance chain (highest to lowest priority):
 * 1. Direct run properties (a:rPr)
 * 2. Local list style (a:lstStyle in shape's txBody)
 * 3. Layout placeholder style
 * 4. Master placeholder style
 * 5. Master text styles (p:txStyles)
 * 6. Default text style (presentation.xml)
 */

import { parseXml, isXmlElement } from "../../../xml/index";
import type { XmlElement } from "../../../xml/index";
import {
  resolveFontSize,
  resolveAlignment,
  resolveTextColor,
  resolveDefRPr,
  resolveFontFamily,
  resolveBulletStyle,
} from "./text-style-resolver";
import type { TextStyleContext, PlaceholderTables } from "../context";

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

/**
 * Create empty placeholder tables
 */
function emptyPlaceholderTables(): PlaceholderTables {
  return { byIdx: new Map(), byType: {} };
}

/**
 * Create a minimal TextStyleContext
 */
function createContext(overrides: Partial<TextStyleContext> = {}): TextStyleContext {
  return {
    placeholderType: undefined,
    placeholderIdx: undefined,
    layoutPlaceholders: emptyPlaceholderTables(),
    masterPlaceholders: emptyPlaceholderTables(),
    masterTextStyles: undefined,
    defaultTextStyle: undefined,
    ...overrides,
  };
}

/**
 * Create run properties element with font size
 */
function rPrWithSize(centipoints: number): XmlElement {
  return xml(`<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" sz="${centipoints}"/>`);
}

/**
 * Create list style element with font size at given level
 */
function lstStyleWithSize(level: number, centipoints: number): XmlElement {
  return xml(`
    <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:lvl${level}pPr>
        <a:defRPr sz="${centipoints}"/>
      </a:lvl${level}pPr>
    </a:lstStyle>
  `);
}

/**
 * Create placeholder shape with lstStyle
 */
function placeholderWithStyle(level: number, centipoints: number): XmlElement {
  return xml(`
    <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:txBody>
        <a:lstStyle>
          <a:lvl${level}pPr>
            <a:defRPr sz="${centipoints}"/>
          </a:lvl${level}pPr>
        </a:lstStyle>
      </p:txBody>
    </p:sp>
  `);
}

/**
 * Create master text style with font size at given level
 */
function masterStyleWithSize(level: number, centipoints: number): XmlElement {
  return xml(`
    <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                 xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <a:lvl${level}pPr>
        <a:defRPr sz="${centipoints}"/>
      </a:lvl${level}pPr>
    </p:bodyStyle>
  `);
}

// =============================================================================
// resolveFontSize Tests
// =============================================================================

describe("resolveFontSize", () => {
  describe("default behavior", () => {
    it("returns default 18pt when no context provided", () => {
      const result = resolveFontSize(undefined, undefined, 0, undefined);
      expect(result as number).toBe(18);
    });

    it("returns default when context has no styles", () => {
      const ctx = createContext();
      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(18);
    });
  });

  describe("direct run properties (priority 1)", () => {
    it("uses sz from direct rPr", () => {
      const rPr = rPrWithSize(2400); // 24 points
      const result = resolveFontSize(rPr, undefined, 0, undefined);
      expect(result as number).toBe(24);
    });

    it("direct rPr overrides local lstStyle", () => {
      const rPr = rPrWithSize(2400); // 24 points
      const lstStyle = lstStyleWithSize(1, 1800); // 18 points
      const result = resolveFontSize(rPr, lstStyle, 0, undefined);
      expect(result as number).toBe(24);
    });

    it("direct rPr overrides all inheritance levels", () => {
      const rPr = rPrWithSize(3600); // 36 points
      const lstStyle = lstStyleWithSize(1, 1800);

      const bodyPlaceholder = placeholderWithStyle(1, 2000);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: bodyPlaceholder } },
      });

      const result = resolveFontSize(rPr, lstStyle, 0, ctx);
      expect(result as number).toBe(36);
    });
  });

  describe("local list style (priority 2)", () => {
    it("uses sz from local lstStyle", () => {
      const lstStyle = lstStyleWithSize(1, 2000); // 20 points
      const result = resolveFontSize(undefined, lstStyle, 0, undefined);
      expect(result as number).toBe(20);
    });

    it("uses correct level from lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr><a:defRPr sz="1800"/></a:lvl1pPr>
          <a:lvl2pPr><a:defRPr sz="1600"/></a:lvl2pPr>
          <a:lvl3pPr><a:defRPr sz="1400"/></a:lvl3pPr>
        </a:lstStyle>
      `);

      // Level 0 -> lvl1pPr
      expect(resolveFontSize(undefined, lstStyle, 0, undefined) as number).toBe(18);
      // Level 1 -> lvl2pPr
      expect(resolveFontSize(undefined, lstStyle, 1, undefined) as number).toBe(16);
      // Level 2 -> lvl3pPr
      expect(resolveFontSize(undefined, lstStyle, 2, undefined) as number).toBe(14);
    });

    it("local lstStyle overrides layout placeholder", () => {
      const lstStyle = lstStyleWithSize(1, 2400); // 24 points

      const layoutPlaceholder = placeholderWithStyle(1, 1800);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
      });

      const result = resolveFontSize(undefined, lstStyle, 0, ctx);
      expect(result as number).toBe(24);
    });
  });

  describe("layout placeholder (priority 3)", () => {
    it("uses sz from layout placeholder", () => {
      const layoutPlaceholder = placeholderWithStyle(1, 2200); // 22 points
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(22);
    });

    it("layout placeholder overrides master placeholder", () => {
      const layoutPlaceholder = placeholderWithStyle(1, 2200);
      const masterPlaceholder = placeholderWithStyle(1, 2000);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
        masterPlaceholders: { byIdx: new Map(), byType: { body: masterPlaceholder } },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(22);
    });
  });

  describe("master placeholder (priority 4)", () => {
    it("uses sz from master placeholder", () => {
      const masterPlaceholder = placeholderWithStyle(1, 2100); // 21 points
      const ctx = createContext({
        placeholderType: "body",
        masterPlaceholders: { byIdx: new Map(), byType: { body: masterPlaceholder } },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(21);
    });
  });

  describe("master text styles (priority 5)", () => {
    it("uses sz from master bodyStyle for body placeholder", () => {
      const bodyStyle = masterStyleWithSize(1, 1900); // 19 points
      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(19);
    });

    it("uses sz from master titleStyle for title placeholder", () => {
      const titleStyle = masterStyleWithSize(1, 4400); // 44 points
      const ctx = createContext({
        placeholderType: "title",
        masterTextStyles: {
          titleStyle,
          bodyStyle: undefined,
          otherStyle: undefined,
        },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(44);
    });

    it("uses sz from master titleStyle for ctrTitle placeholder", () => {
      const titleStyle = masterStyleWithSize(1, 5400); // 54 points
      const ctx = createContext({
        placeholderType: "ctrTitle",
        masterTextStyles: {
          titleStyle,
          bodyStyle: undefined,
          otherStyle: undefined,
        },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(54);
    });

    it("uses sz from master otherStyle for sldNum placeholder", () => {
      const otherStyle = masterStyleWithSize(1, 1200); // 12 points
      const ctx = createContext({
        placeholderType: "sldNum",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: undefined,
          otherStyle,
        },
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(12);
    });
  });

  describe("default text style (priority 6)", () => {
    it("uses sz from defaultTextStyle", () => {
      const defaultTextStyle = xml(`
        <p:defaultTextStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr sz="1700"/>
          </a:lvl1pPr>
        </p:defaultTextStyle>
      `);
      const ctx = createContext({
        defaultTextStyle,
      });

      const result = resolveFontSize(undefined, undefined, 0, ctx);
      expect(result as number).toBe(17);
    });
  });
});

// =============================================================================
// resolveAlignment Tests
// =============================================================================

describe("resolveAlignment", () => {
  describe("default behavior", () => {
    it("returns left when no context provided", () => {
      const result = resolveAlignment(undefined, undefined, 0, undefined);
      expect(result).toBe("left");
    });
  });

  describe("direct alignment (priority 1)", () => {
    it("parses direct alignment value l -> left", () => {
      const result = resolveAlignment("l", undefined, 0, undefined);
      expect(result).toBe("left");
    });

    it("parses direct alignment value ctr -> center", () => {
      const result = resolveAlignment("ctr", undefined, 0, undefined);
      expect(result).toBe("center");
    });

    it("parses direct alignment value r -> right", () => {
      const result = resolveAlignment("r", undefined, 0, undefined);
      expect(result).toBe("right");
    });

    it("parses direct alignment value just -> justify", () => {
      const result = resolveAlignment("just", undefined, 0, undefined);
      expect(result).toBe("justify");
    });

    it("direct alignment overrides local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr algn="ctr"/>
        </a:lstStyle>
      `);

      const result = resolveAlignment("r", lstStyle, 0, undefined);
      expect(result).toBe("right");
    });
  });

  describe("local list style (priority 2)", () => {
    it("uses alignment from local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr algn="ctr"/>
        </a:lstStyle>
      `);

      const result = resolveAlignment(undefined, lstStyle, 0, undefined);
      expect(result).toBe("center");
    });

    it("uses correct level from lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr algn="l"/>
          <a:lvl2pPr algn="ctr"/>
          <a:lvl3pPr algn="r"/>
        </a:lstStyle>
      `);

      expect(resolveAlignment(undefined, lstStyle, 0, undefined)).toBe("left");
      expect(resolveAlignment(undefined, lstStyle, 1, undefined)).toBe("center");
      expect(resolveAlignment(undefined, lstStyle, 2, undefined)).toBe("right");
    });
  });

  describe("layout placeholder (priority 3)", () => {
    it("uses alignment from layout placeholder", () => {
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr algn="ctr"/>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
      });

      const result = resolveAlignment(undefined, undefined, 0, ctx);
      expect(result).toBe("center");
    });
  });

  describe("master text styles (priority 5)", () => {
    it("uses alignment from master bodyStyle", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr algn="just"/>
        </p:bodyStyle>
      `);
      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveAlignment(undefined, undefined, 0, ctx);
      expect(result).toBe("justify");
    });

    it("uses alignment from master titleStyle for title", () => {
      const titleStyle = xml(`
        <p:titleStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr algn="ctr"/>
        </p:titleStyle>
      `);
      const ctx = createContext({
        placeholderType: "title",
        masterTextStyles: {
          titleStyle,
          bodyStyle: undefined,
          otherStyle: undefined,
        },
      });

      const result = resolveAlignment(undefined, undefined, 0, ctx);
      expect(result).toBe("center");
    });
  });
});

// =============================================================================
// resolveTextColor Tests
// =============================================================================

describe("resolveTextColor", () => {
  describe("default behavior", () => {
    it("returns undefined when no context provided", () => {
      const result = resolveTextColor(undefined, undefined, 0, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("direct run properties (priority 1)", () => {
    it("uses color from direct rPr with srgbClr", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="FF0000"/>
          </a:solidFill>
        </a:rPr>
      `);

      const result = resolveTextColor(rPr, undefined, 0, undefined);
      expect(result?.spec.type).toBe("srgb");
      if (result?.spec.type === "srgb") {
        expect(result.spec.value).toBe("FF0000");
      }
    });

    it("uses color from direct rPr with schemeClr", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:schemeClr val="accent1"/>
          </a:solidFill>
        </a:rPr>
      `);

      const result = resolveTextColor(rPr, undefined, 0, undefined);
      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("accent1");
      }
    });

    it("direct rPr overrides local lstStyle", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="FF0000"/>
          </a:solidFill>
        </a:rPr>
      `);
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:solidFill>
                <a:srgbClr val="0000FF"/>
              </a:solidFill>
            </a:defRPr>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveTextColor(rPr, lstStyle, 0, undefined);
      if (result?.spec.type === "srgb") {
        expect(result.spec.value).toBe("FF0000");
      }
    });
  });

  describe("local list style (priority 2)", () => {
    it("uses color from local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:solidFill>
                <a:srgbClr val="00FF00"/>
              </a:solidFill>
            </a:defRPr>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveTextColor(undefined, lstStyle, 0, undefined);
      if (result?.spec.type === "srgb") {
        expect(result.spec.value).toBe("00FF00");
      }
    });
  });

  describe("master text styles (priority 5)", () => {
    it("uses color from master bodyStyle", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:solidFill>
                <a:schemeClr val="tx1"/>
              </a:solidFill>
            </a:defRPr>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);
      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveTextColor(undefined, undefined, 0, ctx);
      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("tx1");
      }
    });
  });

  describe("shape font reference color (priority 7)", () => {
    /**
     * Test that shapeFontReferenceColor is used as fallback.
     *
     * Per ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef):
     * The fontRef element may contain a color child element that specifies
     * the default text color for the shape's text body.
     */
    it("uses shapeFontReferenceColor when no other color specified", () => {
      const ctx = createContext({
        shapeFontReferenceColor: {
          spec: { type: "scheme", value: "lt1" },
        },
      });

      const result = resolveTextColor(undefined, undefined, 0, ctx);
      expect(result).toBeDefined();
      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("lt1");
      }
    });

    it("direct rPr color overrides shapeFontReferenceColor", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="FF0000"/>
          </a:solidFill>
        </a:rPr>
      `);
      const ctx = createContext({
        shapeFontReferenceColor: {
          spec: { type: "scheme", value: "lt1" },
        },
      });

      const result = resolveTextColor(rPr, undefined, 0, ctx);
      expect(result?.spec.type).toBe("srgb");
      if (result?.spec.type === "srgb") {
        expect(result.spec.value).toBe("FF0000");
      }
    });

    it("local lstStyle color overrides shapeFontReferenceColor", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:solidFill>
                <a:srgbClr val="00FF00"/>
              </a:solidFill>
            </a:defRPr>
          </a:lvl1pPr>
        </a:lstStyle>
      `);
      const ctx = createContext({
        shapeFontReferenceColor: {
          spec: { type: "scheme", value: "lt1" },
        },
      });

      const result = resolveTextColor(undefined, lstStyle, 0, ctx);
      expect(result?.spec.type).toBe("srgb");
      if (result?.spec.type === "srgb") {
        expect(result.spec.value).toBe("00FF00");
      }
    });
  });
});

// =============================================================================
// resolveDefRPr Tests
// =============================================================================

describe("resolveDefRPr", () => {
  describe("default behavior", () => {
    it("returns undefined when no context provided", () => {
      const result = resolveDefRPr(undefined, 0, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("local list style (priority 1)", () => {
    it("returns defRPr from local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr sz="1800" b="1"/>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveDefRPr(lstStyle, 0, undefined);
      expect(result).toBeDefined();
      expect(result?.attrs?.sz).toBe("1800");
      expect(result?.attrs?.b).toBe("1");
    });
  });

  describe("layout placeholder (priority 2)", () => {
    it("returns defRPr from layout placeholder", () => {
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:defRPr sz="2000"/>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
      });

      const result = resolveDefRPr(undefined, 0, ctx);
      expect(result).toBeDefined();
      expect(result?.attrs?.sz).toBe("2000");
    });
  });

  describe("master text styles (priority 4)", () => {
    it("returns defRPr from master bodyStyle", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr sz="1600" i="1"/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);
      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveDefRPr(undefined, 0, ctx);
      expect(result).toBeDefined();
      expect(result?.attrs?.sz).toBe("1600");
      expect(result?.attrs?.i).toBe("1");
    });
  });
});

// =============================================================================
// resolveFontFamily Tests
// =============================================================================

describe("resolveFontFamily", () => {
  describe("default behavior", () => {
    it("returns undefined when no context provided", () => {
      const result = resolveFontFamily(undefined, undefined, 0, undefined);
      expect(result).toBeUndefined();
    });
  });

  describe("direct run properties (priority 1)", () => {
    it("uses font from direct rPr with a:latin", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:latin typeface="Arial"/>
        </a:rPr>
      `);

      const result = resolveFontFamily(rPr, undefined, 0, undefined);
      expect(result?.latin).toBe("Arial");
    });

    it("uses font from direct rPr with a:ea", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ea typeface="MS Gothic"/>
        </a:rPr>
      `);

      const result = resolveFontFamily(rPr, undefined, 0, undefined);
      expect(result?.eastAsian).toBe("MS Gothic");
    });

    it("uses font from direct rPr with a:cs", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:cs typeface="Arial"/>
        </a:rPr>
      `);

      const result = resolveFontFamily(rPr, undefined, 0, undefined);
      expect(result?.complexScript).toBe("Arial");
    });

    it("uses font from direct rPr with a:sym", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:sym typeface="Wingdings"/>
        </a:rPr>
      `);

      const result = resolveFontFamily(rPr, undefined, 0, undefined);
      expect(result?.symbol).toBe("Wingdings");
    });

    it("returns all font families when multiple specified", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:latin typeface="Arial"/>
          <a:ea typeface="MS Gothic"/>
          <a:cs typeface="Tahoma"/>
        </a:rPr>
      `);

      const result = resolveFontFamily(rPr, undefined, 0, undefined);
      expect(result?.latin).toBe("Arial");
      expect(result?.eastAsian).toBe("MS Gothic");
      expect(result?.complexScript).toBe("Tahoma");
    });

    it("direct rPr overrides local lstStyle", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:latin typeface="Times New Roman"/>
        </a:rPr>
      `);
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:latin typeface="Arial"/>
            </a:defRPr>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveFontFamily(rPr, lstStyle, 0, undefined);
      expect(result?.latin).toBe("Times New Roman");
    });
  });

  describe("local list style (priority 2)", () => {
    it("uses font from local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:latin typeface="Calibri"/>
            </a:defRPr>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveFontFamily(undefined, lstStyle, 0, undefined);
      expect(result?.latin).toBe("Calibri");
    });

    it("uses correct level from lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr><a:latin typeface="Arial"/></a:defRPr>
          </a:lvl1pPr>
          <a:lvl2pPr>
            <a:defRPr><a:latin typeface="Times New Roman"/></a:defRPr>
          </a:lvl2pPr>
        </a:lstStyle>
      `);

      expect(resolveFontFamily(undefined, lstStyle, 0, undefined)?.latin).toBe("Arial");
      expect(resolveFontFamily(undefined, lstStyle, 1, undefined)?.latin).toBe("Times New Roman");
    });
  });

  describe("layout placeholder (priority 3)", () => {
    it("uses font from layout placeholder", () => {
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:defRPr>
                  <a:latin typeface="Georgia"/>
                </a:defRPr>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);
      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: { byIdx: new Map(), byType: { body: layoutPlaceholder } },
      });

      const result = resolveFontFamily(undefined, undefined, 0, ctx);
      expect(result?.latin).toBe("Georgia");
    });
  });

  describe("master text styles (priority 5)", () => {
    it("uses font from master bodyStyle", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:latin typeface="Verdana"/>
              <a:ea typeface="MS PGothic"/>
            </a:defRPr>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);
      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveFontFamily(undefined, undefined, 0, ctx);
      expect(result?.latin).toBe("Verdana");
      expect(result?.eastAsian).toBe("MS PGothic");
    });

    it("uses font from master titleStyle for title placeholder", () => {
      const titleStyle = xml(`
        <p:titleStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                      xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:latin typeface="Impact"/>
            </a:defRPr>
          </a:lvl1pPr>
        </p:titleStyle>
      `);
      const ctx = createContext({
        placeholderType: "title",
        masterTextStyles: {
          titleStyle,
          bodyStyle: undefined,
          otherStyle: undefined,
        },
      });

      const result = resolveFontFamily(undefined, undefined, 0, ctx);
      expect(result?.latin).toBe("Impact");
    });
  });

  describe("default text style (priority 6)", () => {
    it("uses font from defaultTextStyle", () => {
      const defaultTextStyle = xml(`
        <p:defaultTextStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                           xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:defRPr>
              <a:latin typeface="Consolas"/>
            </a:defRPr>
          </a:lvl1pPr>
        </p:defaultTextStyle>
      `);
      const ctx = createContext({
        defaultTextStyle,
      });

      const result = resolveFontFamily(undefined, undefined, 0, ctx);
      expect(result?.latin).toBe("Consolas");
    });
  });
});

// =============================================================================
// resolveBulletStyle Tests
// =============================================================================

describe("resolveBulletStyle", () => {
  describe("ECMA-376 21.1.2.4.3 - a:buChar (Character Bullet)", () => {
    it("resolves direct buChar from paragraph properties", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("•");
      }
    });

    it("resolves buChar with Wingdings character", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buFont typeface="Wingdings"/>
          <a:buChar char=""/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("char");
      expect(result?.font).toBe("Wingdings");
    });
  });

  describe("ECMA-376 21.1.2.4.1 - a:buAutoNum (Auto-Numbered Bullet)", () => {
    it("resolves arabicPeriod auto-numbering", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buAutoNum type="arabicPeriod" startAt="1"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("auto");
      if (result?.bullet.type === "auto") {
        expect(result.bullet.scheme).toBe("arabicPeriod");
        expect(result.bullet.startAt).toBe(1);
      }
    });

    it("resolves romanLcPeriod auto-numbering", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buAutoNum type="romanLcPeriod"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("auto");
      if (result?.bullet.type === "auto") {
        expect(result.bullet.scheme).toBe("romanLcPeriod");
        expect(result.bullet.startAt).toBeUndefined();
      }
    });
  });

  describe("ECMA-376 21.1.2.4.8 - a:buNone (No Bullet)", () => {
    it("resolves buNone", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buNone/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("none");
    });

    it("direct buNone overrides inherited buChar", () => {
      // Master style defines buChar
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buChar char="•"/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // Direct pPr with buNone
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buNone/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, ctx);

      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("none");
    });

    it("inherits buNone from layout via idx lookup (ECMA-376 19.3.1.36)", () => {
      // Simulates the slide27 case: layout has buNone but placeholder matches by idx only
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:nvSpPr>
            <p:cNvPr id="2" name="Content"/>
            <p:cNvSpPr/>
            <p:nvPr>
              <p:ph idx="1"/>
            </p:nvPr>
          </p:nvSpPr>
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:buNone/>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);

      // Master bodyStyle has buChar (bullet)
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buChar char="•"/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      // Context with idx-based lookup (no placeholderType, only idx)
      const ctx = createContext({
        placeholderType: undefined, // No type - must use idx lookup
        placeholderIdx: 1, // idx="1" (numeric per ECMA-376)
        layoutPlaceholders: {
          byIdx: new Map([[1, layoutPlaceholder]]),
          byType: {},
        },
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // No direct bullet in paragraph
      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      // Should inherit buNone from layout (via idx lookup), NOT buChar from master
      expect(result).toBeDefined();
      expect(result?.bullet.type).toBe("none");
    });
  });

  describe("ECMA-376 21.1.2.4.6 - a:buFont (Bullet Font)", () => {
    it("inherits buFont from master text styles", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buFont typeface="Wingdings"/>
            <a:buChar char=""/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // No direct bullet specification
      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result).toBeDefined();
      expect(result?.font).toBe("Wingdings");
      expect(result?.bullet.type).toBe("char");
    });

    it("direct buFont overrides inherited buFont", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buFont typeface="Wingdings"/>
            <a:buChar char=""/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // Direct pPr overrides font
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buFont typeface="Symbol"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, ctx);

      expect(result?.font).toBe("Symbol");
    });

    it("resolves buFontTx (font follows text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buFontTx/>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.fontFollowText).toBe(true);
      expect(result?.font).toBeUndefined();
    });
  });

  describe("ECMA-376 21.1.2.4.5 - a:buClr (Bullet Color)", () => {
    it("resolves srgbClr bullet color", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buClr>
            <a:srgbClr val="FF0000"/>
          </a:buClr>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.color?.spec.type).toBe("srgb");
      if (result?.color?.spec.type === "srgb") {
        expect(result.color.spec.value).toBe("FF0000");
      }
    });

    it("resolves schemeClr bullet color", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buClr>
            <a:schemeClr val="accent1"/>
          </a:buClr>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.color?.spec.type).toBe("scheme");
      if (result?.color?.spec.type === "scheme") {
        expect(result.color.spec.value).toBe("accent1");
      }
    });

    it("inherits buClr from master text styles", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buClr>
              <a:srgbClr val="00FF00"/>
            </a:buClr>
            <a:buChar char="•"/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result?.color?.spec.type).toBe("srgb");
      if (result?.color?.spec.type === "srgb") {
        expect(result.color.spec.value).toBe("00FF00");
      }
    });

    it("resolves buClrTx (color follows text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buClrTx/>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.colorFollowText).toBe(true);
      expect(result?.color).toBeUndefined();
    });
  });

  describe("ECMA-376 21.1.2.4.9-11 - Bullet Size (buSzPct, buSzPts, buSzTx)", () => {
    it("resolves buSzPct (percentage size)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buSzPct val="75000"/>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.sizePercent).toBeCloseTo(75, 1);
      expect(result?.sizePoints).toBeUndefined();
    });

    it("resolves buSzPts (point size)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buSzPts val="1200"/>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.sizePoints as number).toBeCloseTo(12, 1);
      expect(result?.sizePercent).toBeUndefined();
    });

    it("resolves buSzTx (size follows text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buSzTx/>
          <a:buChar char="•"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, undefined);

      expect(result?.sizeFollowText).toBe(true);
    });

    it("inherits buSzPct from master text styles", () => {
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buSzPct val="80000"/>
            <a:buChar char="•"/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result?.sizePercent).toBeCloseTo(80, 1);
    });
  });

  describe("Inheritance Chain", () => {
    it("follows ECMA-376 inheritance: direct > local > layout > master > masterStyles > default", () => {
      // Setup: masterTextStyles defines bullet with font "Wingdings"
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buFont typeface="Wingdings"/>
            <a:buClr>
              <a:srgbClr val="0000FF"/>
            </a:buClr>
            <a:buChar char=""/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // Direct pPr overrides only the character, inherits font and color from master
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="→"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, ctx);

      // Character from direct
      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("→");
      }
      // Font and color inherited from master
      expect(result?.font).toBe("Wingdings");
      expect(result?.color?.spec.type).toBe("srgb");
    });

    it("resolves bullet from local lstStyle", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buFont typeface="Symbol"/>
            <a:buChar char="▪"/>
          </a:lvl1pPr>
        </a:lstStyle>
      `);

      const result = resolveBulletStyle(undefined, lstStyle, 0, undefined);

      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("▪");
      }
      expect(result?.font).toBe("Symbol");
    });

    it("resolves bullet at different paragraph levels", () => {
      const lstStyle = xml(`
        <a:lstStyle xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buChar char="•"/>
          </a:lvl1pPr>
          <a:lvl2pPr>
            <a:buChar char="○"/>
          </a:lvl2pPr>
          <a:lvl3pPr>
            <a:buChar char="▪"/>
          </a:lvl3pPr>
        </a:lstStyle>
      `);

      const result1 = resolveBulletStyle(undefined, lstStyle, 0, undefined);
      const result2 = resolveBulletStyle(undefined, lstStyle, 1, undefined);
      const result3 = resolveBulletStyle(undefined, lstStyle, 2, undefined);

      expect(result1?.bullet.type).toBe("char");
      if (result1?.bullet.type === "char") {
        expect(result1.bullet.char).toBe("•");
      }

      expect(result2?.bullet.type).toBe("char");
      if (result2?.bullet.type === "char") {
        expect(result2.bullet.char).toBe("○");
      }

      expect(result3?.bullet.type).toBe("char");
      if (result3?.bullet.type === "char") {
        expect(result3.bullet.char).toBe("▪");
      }
    });

    it("returns undefined when no bullet defined in any source", () => {
      const result = resolveBulletStyle(undefined, undefined, 0, undefined);
      expect(result).toBeUndefined();
    });

    it("resolves bullet from layout placeholder", () => {
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:buFont typeface="ZapfDingbats"/>
                <a:buChar char="✓"/>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);

      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: {
          byIdx: new Map(),
          byType: { body: layoutPlaceholder },
        },
      });

      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("✓");
      }
      expect(result?.font).toBe("ZapfDingbats");
    });

    it("resolves bullet from master placeholder", () => {
      const masterPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:buSzPct val="90000"/>
                <a:buClr>
                  <a:srgbClr val="333333"/>
                </a:buClr>
                <a:buChar char="●"/>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);

      const ctx = createContext({
        placeholderType: "body",
        masterPlaceholders: {
          byIdx: new Map(),
          byType: { body: masterPlaceholder },
        },
      });

      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result?.bullet.type).toBe("char");
      expect(result?.sizePercent).toBeCloseTo(90, 1);
      expect(result?.color?.spec.type).toBe("srgb");
    });

    it("resolves bullet from default text style", () => {
      const defaultTextStyle = xml(`
        <p:defaultTextStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                            xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buChar char="–"/>
          </a:lvl1pPr>
        </p:defaultTextStyle>
      `);

      const ctx = createContext({
        defaultTextStyle: defaultTextStyle,
      });

      const result = resolveBulletStyle(undefined, undefined, 0, ctx);

      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("–");
      }
    });
  });

  describe("Mixed Properties Inheritance", () => {
    it("inherits different properties from different sources", () => {
      // Master provides font and color
      const bodyStyle = xml(`
        <p:bodyStyle xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                     xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lvl1pPr>
            <a:buFont typeface="Wingdings"/>
            <a:buClr>
              <a:srgbClr val="FF0000"/>
            </a:buClr>
            <a:buSzPct val="100000"/>
            <a:buChar char=""/>
          </a:lvl1pPr>
        </p:bodyStyle>
      `);

      // Layout provides size
      const layoutPlaceholder = xml(`
        <p:sp xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <p:txBody>
            <a:lstStyle>
              <a:lvl1pPr>
                <a:buSzPct val="75000"/>
              </a:lvl1pPr>
            </a:lstStyle>
          </p:txBody>
        </p:sp>
      `);

      const ctx = createContext({
        placeholderType: "body",
        layoutPlaceholders: {
          byIdx: new Map(),
          byType: { body: layoutPlaceholder },
        },
        masterTextStyles: {
          titleStyle: undefined,
          bodyStyle: bodyStyle,
          otherStyle: undefined,
        },
      });

      // Direct provides character
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="★"/>
        </a:pPr>
      `);

      const result = resolveBulletStyle(pPr, undefined, 0, ctx);

      // Character from direct
      expect(result?.bullet.type).toBe("char");
      if (result?.bullet.type === "char") {
        expect(result.bullet.char).toBe("★");
      }
      // Size from layout
      expect(result?.sizePercent).toBeCloseTo(75, 1);
      // Font and color from master
      expect(result?.font).toBe("Wingdings");
      expect(result?.color?.spec.type).toBe("srgb");
    });
  });
});
