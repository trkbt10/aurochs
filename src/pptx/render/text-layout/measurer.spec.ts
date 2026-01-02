/**
 * @file Text measurer tests
 */

import { estimateTextWidth, measureSpan, measureSpans, estimateBulletWidth } from "./measurer";
import type { LayoutSpan } from "./types";
import { px, pt } from "../../domain/types";

describe("estimateTextWidth", () => {
  test("measures empty string as zero width", () => {
    const width = estimateTextWidth("", pt(18), px(0), "Arial");
    expect(width as number).toBe(0);
  });

  test("measures single character", () => {
    const width = estimateTextWidth("A", pt(18), px(0), "Arial");
    expect(width as number).toBeGreaterThan(0);
  });

  test("longer text has greater width", () => {
    const short = estimateTextWidth("A", pt(18), px(0), "Arial");
    const long = estimateTextWidth("AAAA", pt(18), px(0), "Arial");
    expect(long as number).toBeGreaterThan(short as number);
  });

  test("larger font size produces greater width", () => {
    const small = estimateTextWidth("Test", pt(12), px(0), "Arial");
    const large = estimateTextWidth("Test", pt(24), px(0), "Arial");
    expect(large as number).toBeGreaterThan(small as number);
  });

  test("letter spacing adds to width", () => {
    const noSpacing = estimateTextWidth("Test", pt(18), px(0), "Arial");
    const withSpacing = estimateTextWidth("Test", pt(18), px(5), "Arial");
    expect(withSpacing as number).toBeGreaterThan(noSpacing as number);
  });
});

describe("measureSpan", () => {
  const createSpan = (text: string, isBreak = false): LayoutSpan => ({
    text,
    fontSize: pt(18),
    fontFamily: "Arial",
    fontFamilyEastAsian: undefined,
    fontFamilyComplexScript: undefined,
    fontFamilySymbol: undefined,
    fontWeight: 400,
    fontStyle: "normal",
    textDecoration: undefined,
    color: "#000000",
    verticalAlign: "baseline",
    letterSpacing: px(0),
    isBreak,
    direction: "ltr",
    highlightColor: undefined,
    textTransform: undefined,
    linkId: undefined,
    linkTooltip: undefined,
    mouseOverLinkId: undefined,
    mouseOverLinkTooltip: undefined,
    bookmark: undefined,
    textOutline: undefined,
    textFill: undefined,
    kerning: undefined,
    underlineColor: undefined,
  });

  test("measures regular span", () => {
    const span = createSpan("Hello");
    const measured = measureSpan(span);
    expect(measured.width as number).toBeGreaterThan(0);
    expect(measured.text).toBe("Hello");
  });

  test("break span has zero width", () => {
    const span = createSpan("", true);
    const measured = measureSpan(span);
    expect(measured.width as number).toBe(0);
  });
});

describe("measureSpans", () => {
  test("measures array of spans", () => {
    const spans: LayoutSpan[] = [
      {
        text: "Hello",
        fontSize: pt(18),
        fontFamily: "Arial",
        fontFamilyEastAsian: undefined,
        fontFamilyComplexScript: undefined,
        fontFamilySymbol: undefined,
        fontWeight: 400,
        fontStyle: "normal",
        textDecoration: undefined,
        color: "#000000",
        verticalAlign: "baseline",
        letterSpacing: px(0),
        isBreak: false,
        direction: "ltr",
        highlightColor: undefined,
        textTransform: undefined,
        linkId: undefined,
        linkTooltip: undefined,
        mouseOverLinkId: undefined,
        mouseOverLinkTooltip: undefined,
        bookmark: undefined,
        textOutline: undefined,
        textFill: undefined,
        kerning: undefined,
        underlineColor: undefined,
      },
      {
        text: " World",
        fontSize: pt(18),
        fontFamily: "Arial",
        fontFamilyEastAsian: undefined,
        fontFamilyComplexScript: undefined,
        fontFamilySymbol: undefined,
        fontWeight: 400,
        fontStyle: "normal",
        textDecoration: undefined,
        color: "#000000",
        verticalAlign: "baseline",
        letterSpacing: px(0),
        isBreak: false,
        direction: "ltr",
        highlightColor: undefined,
        textTransform: undefined,
        linkId: undefined,
        linkTooltip: undefined,
        mouseOverLinkId: undefined,
        mouseOverLinkTooltip: undefined,
        bookmark: undefined,
        textOutline: undefined,
        textFill: undefined,
        kerning: undefined,
        underlineColor: undefined,
      },
    ];

    const measured = measureSpans(spans);
    expect(measured).toHaveLength(2);
    expect(measured[0].width as number).toBeGreaterThan(0);
    expect(measured[1].width as number).toBeGreaterThan(0);
  });
});

describe("estimateBulletWidth", () => {
  test("estimates bullet with space width", () => {
    const width = estimateBulletWidth("\u2022", pt(18), "Arial");
    expect(width as number).toBeGreaterThan(0);
  });
});
