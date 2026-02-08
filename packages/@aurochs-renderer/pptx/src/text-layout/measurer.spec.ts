/**
 * @file Text measurer tests
 */

import { estimateTextWidth, measureSpan, measureSpans, estimateBulletWidth } from "./measurer";
import type { LayoutSpan } from "./types";
import { px, pt } from "@aurochs-office/drawing-ml/domain/units";

describe("estimateTextWidth", () => {
  test("measures empty string as zero width", () => {
    const width = estimateTextWidth({ text: "", fontSize: pt(18), letterSpacing: px(0), fontFamily: "Arial" });
    expect(width as number).toBe(0);
  });

  test("measures single character", () => {
    const width = estimateTextWidth({ text: "A", fontSize: pt(18), letterSpacing: px(0), fontFamily: "Arial" });
    expect(width as number).toBeGreaterThan(0);
  });

  test("longer text has greater width", () => {
    const short = estimateTextWidth({ text: "A", fontSize: pt(18), letterSpacing: px(0), fontFamily: "Arial" });
    const long = estimateTextWidth({ text: "AAAA", fontSize: pt(18), letterSpacing: px(0), fontFamily: "Arial" });
    expect(long as number).toBeGreaterThan(short as number);
  });

  test("larger font size produces greater width", () => {
    const small = estimateTextWidth({ text: "Test", fontSize: pt(12), letterSpacing: px(0), fontFamily: "Arial" });
    const large = estimateTextWidth({ text: "Test", fontSize: pt(24), letterSpacing: px(0), fontFamily: "Arial" });
    expect(large as number).toBeGreaterThan(small as number);
  });

  test("letter spacing adds to width", () => {
    const noSpacing = estimateTextWidth({ text: "Test", fontSize: pt(18), letterSpacing: px(0), fontFamily: "Arial" });
    const withSpacing = estimateTextWidth({
      text: "Test",
      fontSize: pt(18),
      letterSpacing: px(5),
      fontFamily: "Arial",
    });
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
    effects: undefined,
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
        effects: undefined,
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
        effects: undefined,
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
