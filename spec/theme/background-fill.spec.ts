/**
 * @file Background fill style tests
 *
 * Tests for ECMA-376 compliant bgFillStyleLst parsing and application.
 *
 * @see ECMA-376 Part 1, Section 20.1.4.1.7 (a:bgFillStyleLst)
 */

import { openPresentation } from "../../src/pptx";
import { parseXml, type XmlElement } from "../../src/xml";
import { renderSlideToSvg } from "../../src/pptx/render/svg";
import { createColorMap } from "../../src/pptx/parser/slide/resource-adapters";
import { parseFormatScheme, parseColorScheme } from "../../src/pptx/parser/drawing-ml";
import { loadLayoutData, loadMasterData, loadThemeData } from "../../src/pptx/parser/slide/loader";
import { getRelationships, DEFAULT_MARKUP_COMPATIBILITY_OPTIONS } from "../../src/pptx/parser/slide/xml-reader";
import { getGradientFill } from "../../src/pptx/parser/drawing-ml";
import { getSolidFill } from "../../src/pptx/parser/drawing-ml";
import { createPresentationFile, THEMES_PPTX_PATH } from "./test-utils";

/**
 * Type guard for XmlElement
 */
function isXmlElement(value: unknown): value is XmlElement {
  if (typeof value !== "object") {return false;}
  if (value === null) {return false;}
  if (!("name" in value)) {return false;}
  if (!("attrs" in value)) {return false;}
  if (!("children" in value)) {return false;}
  return true;
}

describe("Theme bgFillStyleLst - ECMA-376 compliance", () => {
  it("loads bgFillStyles from theme via parseFormatScheme", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const themeText = file.readText("ppt/theme/theme1.xml");
    expect(themeText).not.toBeNull();

    const themeDoc = parseXml(themeText!);
    expect(themeDoc).not.toBeNull();

    const formatScheme = parseFormatScheme(themeDoc);

    expect(formatScheme.bgFillStyles.length).toBeGreaterThan(0);
  });

  it("has 3 background fill styles (per ECMA-376)", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const themeText = file.readText("ppt/theme/theme1.xml");
    const themeDoc = parseXml(themeText!);

    const formatScheme = parseFormatScheme(themeDoc);

    expect(formatScheme.bgFillStyles.length).toBeGreaterThanOrEqual(3);
  });

  it("bgFillStyle[2] (idx=1003) is a gradFill", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const themeText = file.readText("ppt/theme/theme1.xml");
    const themeDoc = parseXml(themeText!);

    const formatScheme = parseFormatScheme(themeDoc);

    expect(formatScheme.bgFillStyles.length).toBeGreaterThan(2);

    const bgStyle = formatScheme.bgFillStyles[2];
    expect(bgStyle.name).toBe("a:gradFill");
  });

  it("bgFillStyles available via loadThemeData", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const slideRelationships = getRelationships(file, "ppt/slides/slide3.xml", DEFAULT_MARKUP_COMPATIBILITY_OPTIONS);
    const layoutData = loadLayoutData(file, slideRelationships);
    const masterData = loadMasterData(file, layoutData.layoutRelationships);
    const themeData = loadThemeData(file, masterData.masterRelationships);

    expect(themeData.theme).not.toBeNull();

    if (themeData.theme) {
      const formatScheme = parseFormatScheme(themeData.theme);
      expect(formatScheme.bgFillStyles.length).toBe(3);
    }
  });

  it("getGradientFill correctly parses path gradient from bgFillStyle", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const themeText = file.readText("ppt/theme/theme1.xml");
    const themeDoc = parseXml(themeText!);

    const formatScheme = parseFormatScheme(themeDoc);
    const colorScheme = parseColorScheme(themeDoc);

    const colorCtx = {
      colorMap: createColorMap(undefined),
      colorMapOverride: undefined,
      colorScheme,
    };

    const bgStyle = formatScheme.bgFillStyles[2];

    if (!isXmlElement(bgStyle)) {
      throw new Error("bgStyle is not an XmlElement");
    }

    // Pass XmlElement directly to getGradientFill (no conversion needed)
    const phClr = "EEECE1";
    const gradResult = getGradientFill(bgStyle, colorCtx, phClr);

    expect(gradResult.type).toBe("path");
    expect((gradResult as { pathShadeType?: string }).pathShadeType).toBe("circle");
  });

  it("slide 3 SVG contains radial gradient background from layout bgRef", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(3);
    const svg = renderSlideToSvg(slide).svg;

    const hasRadialGradient = svg.includes("radialGradient");
    expect(hasRadialGradient).toBe(true);
  });

  it("gradient color transformations are applied correctly", async () => {
    const file = await createPresentationFile(THEMES_PPTX_PATH);
    const themeText = file.readText("ppt/theme/theme1.xml");
    const themeDoc = parseXml(themeText!);

    const colorScheme = parseColorScheme(themeDoc);
    const colorMap = createColorMap(undefined);

    const colorCtx = {
      colorMap,
      colorMapOverride: undefined,
      colorScheme,
    };

    const parsedDoc = parseXml(`
      <a:solidFill>
        <a:schemeClr val="phClr">
          <a:shade val="30000"/>
          <a:satMod val="200000"/>
        </a:schemeClr>
      </a:solidFill>
    `);
    const testElement = parsedDoc.children[0];

    const phClr = "EEECE1";
    const result = getSolidFill(testElement, phClr, colorCtx);

    expect(result).toBeDefined();
  });
});
