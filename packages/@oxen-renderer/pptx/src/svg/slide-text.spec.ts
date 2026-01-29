/**
 * @file SVG slide text rendering tests
 */

import type { Paragraph, RunProperties, TextBody } from "@oxen-office/pptx/domain/text";
import { px, pt } from "@oxen-office/ooxml/domain/units";
import { createEmptyCoreRenderContext } from "../render-context";
import { createDefsCollector } from "./slide-utils";
import { renderTextSvg } from "./slide-text";

function createTextBody(overrides: Partial<TextBody> = {}): TextBody {
  return {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: {
        left: px(10),
        top: px(5),
        right: px(10),
        bottom: px(5),
      },
    },
    paragraphs: [],
    ...overrides,
  };
}

function createParagraph(text: string, props: Partial<RunProperties> = {}): Paragraph {
  return {
    properties: {
      level: 0,
      alignment: "left",
    },
    runs: [
      {
        type: "text",
        text,
        properties: {
          fontSize: pt(18),
          fontFamily: "LatinFont",
          ...props,
        },
      },
    ],
  };
}

describe("renderTextSvg", () => {
  it("uses a font-family fallback list for font substitution", () => {
    const paragraph = createParagraph("Hello", {
      fontFamily: "LatinFont",
      fontFamilyEastAsian: "EastAsianFont",
      fontFamilyComplexScript: "ComplexFont",
      fontFamilySymbol: "SymbolFont",
    });
    const body = createTextBody({ paragraphs: [paragraph] });
    const ctx = createEmptyCoreRenderContext();
    const defsCollector = createDefsCollector();

    const svg = renderTextSvg(body, ctx, 400, 200, defsCollector);

    expect(svg).toContain(
      'font-family="LatinFont, EastAsianFont, ComplexFont, SymbolFont"',
    );
  });
});
