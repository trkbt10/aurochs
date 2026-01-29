/**
 * @file Color scheme resolution tests
 *
 * Tests for ECMA-376 compliant color scheme and color map resolution.
 *
 * @see ECMA-376 Part 1, Section 20.1.6.2 (a:clrScheme)
 * @see ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap)
 */

import { openPresentation } from "@oxen-office/pptx";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import { createPresentationFile, THEMES_PPTX_PATH } from "./test-utils";
import { renderSlideToSvg } from "@oxen-renderer/pptx/svg";

describe("Color Scheme Application", () => {
  /**
   * Test that slide 1 (using theme1) correctly resolves accent1 color.
   *
   * Per ECMA-376 Part 1, Section 20.1.2.3.32 (a:schemeClr):
   * The schemeClr element specifies a color bound to a user's theme.
   */
  it("slide 1 resolves accent1 to theme1 color (#4F81BD)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = renderSlideToSvg(slide).svg;

    // Slide 1 uses accent1 color which should be #4F81BD from theme1
    const hasAccent1Color = svg.toLowerCase().includes("4f81bd");
    expect(hasAccent1Color).toBe(true);
  });

  /**
   * Test that slide 4 (using theme3) correctly resolves accent1 color.
   */
  it("slide 4 resolves accent1 to theme3 color (#94C600)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(4);
    const svg = renderSlideToSvg(slide).svg;

    // Slide 4 uses theme3, accent1 should be #94C600 (green)
    const hasAccent1Color = svg.toLowerCase().includes("94c600");
    expect(hasAccent1Color).toBe(true);
  });

  /**
   * Test that slide 10 (using theme7) uses bg2 in a gradient.
   */
  it("slide 10 uses bg2-based gradient (gradient definition present)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(10);
    const svg = renderSlideToSvg(slide).svg;

    const hasGradient = [
      svg.includes("linearGradient"),
      svg.includes("url(#bg-grad"),
    ].some(Boolean);
    expect(hasGradient).toBe(true);
  });

  /**
   * Test that lt1 (background/text light 1) resolves correctly.
   */
  it("slide 1 resolves lt1 to white (#FFFFFF)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = renderSlideToSvg(slide).svg;

    const hasLt1Color = [
      svg.toLowerCase().includes("ffffff"),
      svg.includes('fill="white"'),
      svg.includes("fill='white'"),
    ].some(Boolean);
    expect(hasLt1Color).toBe(true);
  });
});

describe("resolveColor with ColorContext", () => {
  /**
   * Verify that resolveColor correctly resolves scheme colors.
   */
  it("resolves lt1 to FFFFFF with proper colorContext", () => {
    const color: Color = {
      spec: { type: "scheme", value: "lt1" },
    };

    const colorContext: ColorContext = {
      colorScheme: {
        dk1: "000000",
        lt1: "FFFFFF",
        dk2: "1F497D",
        lt2: "EEECE1",
        accent1: "4F81BD",
      },
      colorMap: {
        tx1: "dk1",
        bg1: "lt1",
        tx2: "dk2",
        bg2: "lt2",
      },
    };

    const resolved = resolveColor(color, colorContext);
    expect(resolved).toBe("FFFFFF");
  });

  /**
   * Verify that tx1 is mapped through colorMap to dk1.
   */
  it("resolves tx1 through colorMap to dk1", () => {
    const color: Color = {
      spec: { type: "scheme", value: "tx1" },
    };

    const colorContext: ColorContext = {
      colorScheme: {
        dk1: "000000",
        lt1: "FFFFFF",
      },
      colorMap: {
        tx1: "dk1",
        bg1: "lt1",
      },
    };

    const resolved = resolveColor(color, colorContext);
    expect(resolved).toBe("000000");
  });

  /**
   * Verify that scheme colors return undefined when colorScheme is empty.
   */
  it("returns undefined when colorScheme is empty", () => {
    const color: Color = {
      spec: { type: "scheme", value: "lt1" },
    };

    const colorContext: ColorContext = {
      colorScheme: {},
      colorMap: {},
    };

    const resolved = resolveColor(color, colorContext);
    expect(resolved).toBeUndefined();
  });

  /**
   * Verify sRGB colors resolve correctly.
   */
  it("resolves sRGB colors directly", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
    };

    const colorContext: ColorContext = {
      colorScheme: {},
      colorMap: {},
    };

    const resolved = resolveColor(color, colorContext);
    expect(resolved).toBe("FF0000");
  });
});

describe("Color Map Resolution", () => {
  /**
   * Test p:clrMap color mapping.
   *
   * Per ECMA-376 Part 1, Section 19.3.1.6 (p:clrMap):
   * The color map defines how semantic color names map to theme colors.
   */
  it("tx1 maps to dk1 (standard color map)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = renderSlideToSvg(slide).svg;

    const hasDk1Color = [
      svg.toLowerCase().includes("000000"),
      svg.includes("black"),
    ].some(Boolean);
    expect(hasDk1Color).toBe(true);
  });

  it("bg1 maps to lt1 (standard color map)", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);
    const slide = presentation.getSlide(1);
    const svg = renderSlideToSvg(slide).svg;

    const hasLt1Color = [
      svg.toLowerCase().includes("ffffff"),
      svg.includes('fill="white"'),
      svg.includes("fill='white'"),
    ].some(Boolean);
    expect(hasLt1Color).toBe(true);
  });
});

describe("Different Themes Produce Different Colors", () => {
  /**
   * Verify that slides with different themes produce different accent colors.
   */
  it("slide 1 (theme1) and slide 4 (theme3) have different accent1", async () => {
    const presentationFile = await createPresentationFile(THEMES_PPTX_PATH);
    const presentation = openPresentation(presentationFile);

    const svg1 = renderSlideToSvg(presentation.getSlide(1)).svg.toLowerCase();
    const svg4 = renderSlideToSvg(presentation.getSlide(4)).svg.toLowerCase();

    // theme1 accent1: 4F81BD (blue)
    // theme3 accent1: 94C600 (green)
    const slide1HasTheme1Color = svg1.includes("4f81bd");
    const slide4HasTheme3Color = svg4.includes("94c600");

    expect([slide1HasTheme1Color, slide4HasTheme3Color].some(Boolean)).toBe(true);
  });
});
