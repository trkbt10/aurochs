/**
 * @file Style reference (fontRef, fillRef) tests
 *
 * Tests for ECMA-376 compliant a:fontRef and a:fillRef resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.11 (a:fillRef)
 * @see ECMA-376 Part 1, Section 20.1.4.1.17 (a:fontRef)
 */

import { loadPptxFile } from "../../scripts/lib/pptx-loader";
import { openPresentation } from "../../src/pptx";
import { parseSlide } from "../../src/pptx/parser/slide/slide-parser";
import { resolveColor } from "../../src/pptx/render/core/drawing-ml";
import { parseXml, getByPath } from "../../src/xml";
import { createParseContext } from "../../src/pptx/parser/context";
import { createSlideRenderContext } from "../../src/pptx/render/core/slide-context";
import type { ZipFile } from "../../src/pptx/domain";
import {
  createPlaceholderTable,
  createColorMap,
} from "../../src/pptx/parser/slide/resource-adapters";
import { parseRelationships } from "../../src/pptx/opc";
import { parseTheme, parseColorScheme, parseMasterTextStyles } from "../../src/pptx/parser/drawing-ml";
import { renderSlideSvgIntegrated } from "../../src/pptx/app/slide-render";
import type { SpShape, Color, Pixels } from "../../src/pptx/domain";
import { createPresentationFile, THEMES_PPTX_PATH } from "./test-utils";

describe("a:fontRef schemeClr application", () => {
  /**
   * Verify that a:fontRef schemeClr is correctly applied to text.
   */
  it("slide 1 rectangle text uses lt1 (white) from a:fontRef", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    const textPattern = /<text[^>]*fill="([^"]*)"[^>]*>([^<]*(?:Fill:|Text:)[^<]*)<\/text>/gi;
    const matches = [...svg.matchAll(textPattern)];

    expect(matches.length).toBeGreaterThan(0);

    for (const match of matches) {
      const fillColor = match[1].toLowerCase();
      expect(fillColor).not.toBe("#000000");
      expect([fillColor === "#ffffff", fillColor === "white"].some(Boolean)).toBe(true);
    }
  });

  /**
   * Diagnostic test: Verify that the raw XML contains a:fontRef with a:schemeClr
   */
  it("slide 1 XML contains a:fontRef with a:schemeClr lt1", async () => {
    const { cache } = await loadPptxFile(THEMES_PPTX_PATH);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    expect(slideXml).toBeDefined();

    expect(slideXml).toContain("a:fontRef");
    expect(slideXml).toContain("a:schemeClr");
    expect(slideXml).toContain('val="lt1"');

    const allShapes = slideXml?.match(/<p:sp>[\s\S]*?<\/p:sp>/g) ?? [];
    const targetShape = allShapes.find((s) => s.includes("Fill: RGB"));
    expect(targetShape).toBeDefined();
    expect(targetShape).toContain("p:style");
    expect(targetShape).toContain("a:fontRef");

    const styleInShape = targetShape?.match(/<p:style>[\s\S]*?<\/p:style>/);
    expect(styleInShape?.[0]).toContain('a:fontRef idx="minor"');
    expect(styleInShape?.[0]).toContain('a:schemeClr val="lt1"');
  });

  /**
   * Verify that parseColorScheme correctly extracts lt1 from theme.
   */
  it("parseColorScheme extracts lt1 from theme", async () => {
    const { cache } = await loadPptxFile(THEMES_PPTX_PATH);
    const themeXmlStr = cache.get("ppt/theme/theme1.xml")?.text;
    expect(themeXmlStr).toBeDefined();

    const themeDoc = parseXml(themeXmlStr!);
    const colorScheme = parseColorScheme(themeDoc);

    expect(colorScheme["lt1"]).toBe("FFFFFF");
    expect(colorScheme["dk1"]).toBe("000000");
    expect(colorScheme["accent1"]).toBe("4F81BD");
  });

  /**
   * Verify that createParseContext correctly includes lt1 in colorScheme.
   */
  it("createParseContext includes lt1 in colorScheme", async () => {
    const { cache } = await loadPptxFile(THEMES_PPTX_PATH);
    const themeXmlStr = cache.get("ppt/theme/theme1.xml")?.text;
    const masterXmlStr = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;
    expect(themeXmlStr).toBeDefined();
    expect(masterXmlStr).toBeDefined();

    const themeDoc = parseXml(themeXmlStr!);
    const masterDoc = parseXml(masterXmlStr!);
    const theme = parseTheme(themeDoc);

    const slide = {
      content: parseXml("<p:sld></p:sld>"),
      resources: parseRelationships(null),
      colorMapOverride: undefined,
    };
    const layout = {
      placeholders: createPlaceholderTable({ idTable: {}, idxTable: new Map(), typeTable: {} }),
      resources: parseRelationships(null),
      content: undefined,
    };

    const masterClrMap = getByPath(masterDoc, ["p:sldMaster", "p:clrMap"]);

    const master = {
      textStyles: { titleStyle: undefined, bodyStyle: undefined, otherStyle: undefined },
      placeholders: createPlaceholderTable({ idTable: {}, idxTable: new Map(), typeTable: {} }),
      colorMap: createColorMap(masterClrMap),
      resources: parseRelationships(null),
      content: undefined,
    };

    const presentation = {
      theme,
      defaultTextStyle: null,
      zip: { file: () => null } as ZipFile,
      renderOptions: { dialect: "powerpoint" as const },
    };

    const ctx = createSlideRenderContext(
      slide as Parameters<typeof createSlideRenderContext>[0],
      layout as Parameters<typeof createSlideRenderContext>[1],
      master as Parameters<typeof createSlideRenderContext>[2],
      presentation as Parameters<typeof createSlideRenderContext>[3],
    );

    const colorContext = createParseContext(ctx).colorContext;

    expect(colorContext.colorScheme["lt1"]).toBe("FFFFFF");
    expect(colorContext.colorScheme["dk1"]).toBe("000000");
    expect(colorContext.colorScheme["accent1"]).toBe("4F81BD");

    const testColor: Color = {
      spec: { type: "scheme", value: "lt1" },
    };
    const resolvedColor = resolveColor(testColor, colorContext);
    expect(resolvedColor).toBe("FFFFFF");
  });

  /**
   * End-to-end test: text color resolves through full render path
   */
  it("end-to-end: text color resolves through full render path", async () => {
    const { cache } = await loadPptxFile(THEMES_PPTX_PATH);

    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    const themeXml = cache.get("ppt/theme/theme1.xml")?.text;
    const masterXml = cache.get("ppt/slideMasters/slideMaster1.xml")?.text;
    const layoutXml = cache.get("ppt/slideLayouts/slideLayout1.xml")?.text;

    expect(slideXml).toBeDefined();
    expect(themeXml).toBeDefined();
    expect(masterXml).toBeDefined();
    expect(layoutXml).toBeDefined();

    const slideDoc = parseXml(slideXml!);
    const themeDoc = parseXml(themeXml!);
    const masterDoc = parseXml(masterXml!);
    const layoutDoc = parseXml(layoutXml!);

    const theme = parseTheme(themeDoc);

    const slide = {
      content: getByPath(slideDoc, ["p:sld"]),
      resources: parseRelationships(null),
      colorMapOverride: undefined,
    };

    const layout = {
      placeholders: createPlaceholderTable({ idTable: {}, idxTable: new Map(), typeTable: {} }),
      resources: parseRelationships(null),
      content: getByPath(layoutDoc, ["p:sldLayout"]),
    };

    const masterClrMap = getByPath(masterDoc, ["p:sldMaster", "p:clrMap"]);
    const masterTxStyles = getByPath(masterDoc, ["p:sldMaster", "p:txStyles"]);

    const master = {
      textStyles: parseMasterTextStyles(masterTxStyles),
      placeholders: createPlaceholderTable({ idTable: {}, idxTable: new Map(), typeTable: {} }),
      colorMap: createColorMap(masterClrMap),
      resources: parseRelationships(null),
      content: getByPath(masterDoc, ["p:sldMaster"]),
    };

    const presentation = {
      theme,
      defaultTextStyle: null,
      zip: { file: () => null } as ZipFile,
      renderOptions: { dialect: "powerpoint" as const },
    };

    const slideRenderCtx = createSlideRenderContext(
      slide as Parameters<typeof createSlideRenderContext>[0],
      layout as Parameters<typeof createSlideRenderContext>[1],
      master as Parameters<typeof createSlideRenderContext>[2],
      presentation as Parameters<typeof createSlideRenderContext>[3],
    );

    const result = renderSlideSvgIntegrated(slideDoc, slideRenderCtx, { width: 960 as Pixels, height: 540 as Pixels });
    const hasWhiteTextFill = result.svg.toLowerCase().includes('fill="#ffffff"');

    expect(hasWhiteTextFill).toBe(true);
  });

  /**
   * Verify that parseSlide correctly extracts shapeFontReferenceColor
   */
  it("parseSlide extracts fontReference.color from shape style", async () => {
    const { cache } = await loadPptxFile(THEMES_PPTX_PATH);
    const slideXml = cache.get("ppt/slides/slide1.xml")?.text;
    expect(slideXml).toBeDefined();

    const xmlDoc = parseXml(slideXml!);
    const slide = parseSlide(xmlDoc, undefined);
    expect(slide).toBeDefined();

    const isSpShapeWithFontRef = (s: { type: string; style?: { fontReference?: unknown } }): s is SpShape => {
      if (s.type !== "sp") {
        return false;
      }
      if (s.style?.fontReference === undefined) {
        return false;
      }
      return true;
    };
    const shapesWithFontRef = slide!.shapes.filter(isSpShapeWithFontRef);

    expect(shapesWithFontRef.length).toBeGreaterThan(0);

    const hasTargetText = (s: SpShape): boolean => {
      const paragraphs = s.textBody?.paragraphs;
      if (!paragraphs) {
        return false;
      }
      return paragraphs.some((p) => {
        return p.runs.some((r) => {
          if (r.type !== "text") {
            return false;
          }
          return r.text?.includes("Fill: RGB") === true;
        });
      });
    };
    const targetShape = slide!.shapes.find((s): s is SpShape => {
      if (s.type !== "sp") {
        return false;
      }
      return hasTargetText(s as SpShape);
    });

    expect(targetShape).toBeDefined();
    expect(targetShape?.style?.fontReference).toBeDefined();
    expect(targetShape?.style?.fontReference?.color).toBeDefined();
    expect(targetShape?.style?.fontReference?.color?.type).toBe("solidFill");
  });

  /**
   * Slide 4 uses theme3 with different colors.
   */
  it("slide 4 rectangle text uses lt1 (white) from theme3", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(4);
    const svg = slide.renderSVG();

    const hasWhiteText = [
      svg.includes('fill="#FFFFFF"'),
      svg.includes("fill='#FFFFFF'"),
      svg.includes('fill="white"'),
      svg.toLowerCase().includes('fill="#ffffff"'),
    ].some(Boolean);

    expect(hasWhiteText).toBe(true);
  });
});

describe("a:fillRef schemeClr application", () => {
  /**
   * Test that a:fillRef schemeClr is correctly applied to shape fills.
   */
  it("slide 1 rectangle has accent1 fill (#4F81BD)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = slide.renderSVG();

    const hasAccent1Fill = svg.toLowerCase().includes("4f81bd");
    expect(hasAccent1Fill).toBe(true);
  });

  /**
   * Slide 4 uses theme3 with accent1 = 94C600 (green)
   */
  it("slide 4 rectangle has theme3 accent1 fill (#94C600)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(4);
    const svg = slide.renderSVG();

    const hasAccent1Fill = svg.toLowerCase().includes("94c600");
    expect(hasAccent1Fill).toBe(true);
  });
});
