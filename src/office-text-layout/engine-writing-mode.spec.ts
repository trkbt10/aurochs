/**
 * @file Tests for Writing Mode Support in Layout Engine
 *
 * Tests that the layout engine correctly handles writingMode
 * and passes it through to layout results.
 */

import { px, pt, pct } from "../ooxml/domain/units";
import { layoutTextBody, layoutDocument } from "./engine";
import type { LayoutInput, LayoutParagraphInput, TextBoxConfig } from "./types";

// =============================================================================
// Test Data Helpers
// =============================================================================

function createTestTextBox(overrides?: Partial<TextBoxConfig>): TextBoxConfig {
  return {
    width: px(500),
    height: px(300),
    insetLeft: px(0),
    insetRight: px(0),
    insetTop: px(0),
    insetBottom: px(0),
    anchor: "top",
    anchorCenter: false,
    wrapMode: "wrap",
    autoFit: { type: "normal", fontScale: pct(100), lineSpaceReduction: pct(0) },
    horzOverflow: "clip",
    vertOverflow: "clip",
    spcFirstLastPara: true,
    ...overrides,
  };
}

function createTestParagraph(text: string): LayoutParagraphInput {
  return {
    spans: [
      {
        text,
        fontSize: pt(12),
        fontFamily: "Arial",
        fontFamilyEastAsian: undefined,
        fontFamilyComplexScript: undefined,
        fontWeight: 400,
        fontStyle: "normal",
        textDecoration: undefined,
        color: "#000000",
        verticalAlign: "baseline",
        letterSpacing: px(0),
        breakType: "none",
        direction: "ltr",
        highlightColor: undefined,
        textTransform: undefined,
        linkId: undefined,
        linkTooltip: undefined,
        textOutline: undefined,
        textFill: undefined,
        kerning: undefined,
      },
    ],
    alignment: "left",
    marginLeft: px(0),
    marginRight: px(0),
    indent: px(0),
    spaceBefore: pt(0),
    spaceAfter: pt(0),
    lineSpacing: undefined,
    bullet: undefined,
    fontAlignment: "auto",
    defaultTabSize: px(48),
    tabStops: [],
    eaLineBreak: true,
    latinLineBreak: false,
    hangingPunctuation: false,
    endParaFontSize: pt(12),
  };
}

// =============================================================================
// layoutTextBody Writing Mode Tests
// =============================================================================

describe("layoutTextBody with writingMode", () => {
  it("defaults to horizontal-tb when writingMode is not specified", () => {
    const input: LayoutInput = {
      textBox: createTestTextBox(),
      paragraphs: [createTestParagraph("Hello")],
    };

    const result = layoutTextBody(input);
    expect(result.writingMode).toBe("horizontal-tb");
  });

  it("passes horizontal-tb writingMode through to result", () => {
    const input: LayoutInput = {
      textBox: createTestTextBox({ writingMode: "horizontal-tb" }),
      paragraphs: [createTestParagraph("Hello")],
    };

    const result = layoutTextBody(input);
    expect(result.writingMode).toBe("horizontal-tb");
  });

  it("passes vertical-rl writingMode through to result", () => {
    const input: LayoutInput = {
      textBox: createTestTextBox({ writingMode: "vertical-rl" }),
      paragraphs: [createTestParagraph("Hello")],
    };

    const result = layoutTextBody(input);
    expect(result.writingMode).toBe("vertical-rl");
  });

  it("passes vertical-lr writingMode through to result", () => {
    const input: LayoutInput = {
      textBox: createTestTextBox({ writingMode: "vertical-lr" }),
      paragraphs: [createTestParagraph("Hello")],
    };

    const result = layoutTextBody(input);
    expect(result.writingMode).toBe("vertical-lr");
  });

  it("uses content height as inline size for vertical text", () => {
    // For vertical text, inline direction is vertical (height)
    // A tall, narrow box should allow longer lines in vertical mode
    const tallBox = createTestTextBox({
      width: px(100),
      height: px(500),
      writingMode: "vertical-rl",
    });

    const input: LayoutInput = {
      textBox: tallBox,
      paragraphs: [createTestParagraph("This is a test")],
    };

    const result = layoutTextBody(input);
    expect(result.writingMode).toBe("vertical-rl");
    // The layout should use the height (500px) as inline size
    // so text should fit on fewer lines than in horizontal mode with 100px width
  });
});

// =============================================================================
// layoutDocument Writing Mode Tests
// =============================================================================

describe("layoutDocument with writingMode", () => {
  it("defaults to horizontal-tb when options not specified", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const result = layoutDocument(paragraphs, px(500));
    expect(result.writingMode).toBe("horizontal-tb");
  });

  it("defaults to horizontal-tb when options is a function", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const measureFn = (para: LayoutParagraphInput) => ({
      spans: para.spans.map((span) => ({
        ...span,
        width: px(50),
        height: px(16),
        baseFontSize: span.fontSize,
        dx: px(0),
      })),
    });
    const result = layoutDocument(paragraphs, px(500), measureFn);
    expect(result.writingMode).toBe("horizontal-tb");
  });

  it("passes writingMode through options object", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const result = layoutDocument(paragraphs, px(500), { writingMode: "vertical-rl" });
    expect(result.writingMode).toBe("vertical-rl");
  });

  it("passes horizontal-tb writingMode through options", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const result = layoutDocument(paragraphs, px(500), { writingMode: "horizontal-tb" });
    expect(result.writingMode).toBe("horizontal-tb");
  });

  it("passes vertical-lr writingMode through options", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const result = layoutDocument(paragraphs, px(500), { writingMode: "vertical-lr" });
    expect(result.writingMode).toBe("vertical-lr");
  });

  it("supports both measureParagraph and writingMode in options", () => {
    const paragraphs = [createTestParagraph("Hello")];
    const measureFn = (para: LayoutParagraphInput) => ({
      spans: para.spans.map((span) => ({
        ...span,
        width: px(50),
        height: px(16),
        baseFontSize: span.fontSize,
        dx: px(0),
      })),
    });
    const result = layoutDocument(paragraphs, px(500), {
      measureParagraph: measureFn,
      writingMode: "vertical-rl",
    });
    expect(result.writingMode).toBe("vertical-rl");
  });
});
