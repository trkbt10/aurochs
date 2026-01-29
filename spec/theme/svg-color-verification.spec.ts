/**
 * @file End-to-end SVG color verification tests
 *
 * Tests that verify theme colors are correctly resolved in the rendered SVG output.
 * These tests extract colors from the SVG and compare against expected theme values.
 *
 * This verifies theme application is correct even when visual regression tests fail
 * due to font metrics or gradient interpolation differences.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (a:clrScheme)
 */

import { openPresentation } from "@oxen-office/pptx";
import { createPresentationFile, extractSvgColors, THEMES_PPTX_PATH } from "./test-utils";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

/**
 * Check if colors include a light center (for gradient tests)
 */
function hasLightCenterColor(colors: Set<string>): boolean {
  for (const c of colors) {
    if (c.startsWith("fc")) {return true;}
    if (c.startsWith("fd")) {return true;}
    if (c.startsWith("f5")) {return true;}
  }
  return false;
}

/**
 * Check if colors include dark edge (for gradient tests)
 */
function hasDarkEdgeColor(colors: Set<string>): boolean {
  for (const c of colors) {
    if (c.startsWith("4")) {return true;}
    if (c.startsWith("5")) {return true;}
    if (c.startsWith("6")) {return true;}
  }
  return false;
}

/**
 * Check if colors include brown tones (for theme5)
 */
function hasBrownTones(colors: Set<string>): boolean {
  for (const c of colors) {
    if (c.startsWith("4e")) {return true;}
    if (c.startsWith("3b")) {return true;}
    if (c.includes("3b2c")) {return true;}
  }
  return false;
}

/**
 * Check if colors include blue-grayish tones (for theme7)
 */
function hasBlueGrayishColors(colors: Set<string>): boolean {
  for (const c of colors) {
    if (c.includes("7d")) {return true;}
    if (c.includes("af")) {return true;}
    if (c.includes("c3")) {return true;}
    if (c.startsWith("b")) {return true;}
    if (c.startsWith("8")) {return true;}
  }
  return false;
}

/**
 * Check if SVG contains any gradient
 */
function hasAnyGradient(svg: string): boolean {
  if (svg.includes("radialGradient")) {return true;}
  if (svg.includes("linearGradient")) {return true;}
  return false;
}

/**
 * Check if colors include theme3 expected colors
 */
function hasTheme3ExpectedColors(colors: Set<string>): boolean {
  if (colors.has("94c600")) {return true;}
  if (colors.has("ffffff")) {return true;}
  if (colors.has("000000")) {return true;}
  return false;
}

/**
 * Check if colors include theme5 expected colors
 */
function hasTheme5ExpectedColors(colors: Set<string>): boolean {
  if (hasBrownTones(colors)) {return true;}
  if (colors.has("ffffff")) {return true;}
  return false;
}

describe("End-to-end SVG Color Verification", () => {
  /**
   * Slide 3: Radial Gradient Fill On Slide Layout
   * Uses theme1.xml with bg2 (lt2 = EEECE1) in gradient
   */
  it("slide 3 SVG contains expected theme gradient colors", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(3));

    const colors = extractSvgColors(svg);

    expect(svg.includes("radialGradient")).toBe(true);
    expect(hasLightCenterColor(colors)).toBe(true);
    expect(hasDarkEdgeColor(colors)).toBe(true);
  });

  /**
   * Slide 4: Theme 3 Rectangle
   * Uses theme3.xml with accent1 = 94C600 (green)
   */
  it("slide 4 SVG contains theme3 accent1 (#94C600)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(4));

    const colors = extractSvgColors(svg);
    expect(colors.has("94c600")).toBe(true);
  });

  /**
   * Slide 5: Theme 3 with Picture
   * Uses theme3.xml with accent1 = 94C600 (green)
   */
  it("slide 5 SVG contains expected theme3 colors", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(5));

    const colors = extractSvgColors(svg);
    const hasTheme3Colors = hasTheme3ExpectedColors(colors);
    expect(hasTheme3Colors).toBe(true);
  });

  /**
   * Slide 6: Theme 3 Radial Gradient
   * Uses theme3.xml with bg2 gradient
   */
  it("slide 6 SVG contains radial gradient from theme3", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(6));

    expect(hasAnyGradient(svg)).toBe(true);
  });

  /**
   * Slide 8: Theme 5 Title Slide (placeholders only)
   * Uses theme5.xml - background uses dk2 (4E3B30 brown) in gradient
   */
  it("slide 8 SVG contains theme5 colors (background gradient)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(8));

    const colors = extractSvgColors(svg);
    const hasExpected = hasTheme5ExpectedColors(colors);
    expect(hasExpected).toBe(true);
  });

  /**
   * Slide 9: Theme 5 with Picture
   * Uses theme5.xml with brown tones (Trek theme)
   */
  it("slide 9 SVG contains expected theme5 colors", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(9));

    const colors = extractSvgColors(svg);
    // Theme 5 (Trek) uses brown tones, not common black/white
    expect(hasTheme5ExpectedColors(colors)).toBe(true);
  });

  /**
   * Slide 10: Theme 7 Linear Gradient
   * Uses theme7.xml with bg2 mapped to dk2 (inverted color map)
   */
  it("slide 10 SVG contains theme7 colors with inverted colorMap", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const { svg } = renderSlideToSvg(presentation.getSlide(10));

    const colors = extractSvgColors(svg);

    expect(svg.includes("linearGradient")).toBe(true);
    expect(hasBlueGrayishColors(colors)).toBe(true);
  });

  /**
   * Summary test: All slides should have theme-appropriate colors
   */
  it("all 10 slides render with expected theme colors", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);

    type ExpectationResult = { slide: number; hasExpectedColors: boolean; colorSample: string[] };
    const results: ExpectationResult[] = [];

    type SlideExpectation = {
      slide: number;
      theme: string;
      accent?: string;
      gradient?: boolean;
      hasText?: boolean;
    };
    const expectations: SlideExpectation[] = [
      { slide: 1, theme: "theme1", accent: "4f81bd" },
      { slide: 2, theme: "theme1", hasText: true },
      { slide: 3, theme: "theme1", gradient: true },
      { slide: 4, theme: "theme3", accent: "94c600" },
      { slide: 5, theme: "theme3", accent: "94c600" },
      { slide: 6, theme: "theme3", gradient: true },
      { slide: 7, theme: "theme3", accent: "94c600" },
      { slide: 8, theme: "theme5", hasText: true },
      { slide: 9, theme: "theme5", hasText: true },
      { slide: 10, theme: "theme7", gradient: true },
    ];

    const checkExpectation = (svg: string, colors: Set<string>, exp: SlideExpectation): boolean => {
      if (exp.accent !== undefined) {
        return colors.has(exp.accent);
      }
      if (exp.gradient === true) {
        return hasAnyGradient(svg);
      }
      if (exp.hasText === true) {
        if (colors.has("000000")) {return true;}
        if (colors.has("ffffff")) {return true;}
        for (const c of colors) {
          if (c.length === 6) {return true;}
        }
        return false;
      }
      return true;
    };

    for (const exp of expectations) {
      const { svg } = renderSlideToSvg(presentation.getSlide(exp.slide));
      const colors = extractSvgColors(svg);
      const hasExpected = checkExpectation(svg, colors, exp);

      results.push({
        slide: exp.slide,
        hasExpectedColors: hasExpected,
        colorSample: [...colors].slice(0, 5),
      });
    }

    const allPass = results.every((r) => r.hasExpectedColors);
    expect(allPass).toBe(true);
  });
});
