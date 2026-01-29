/**
 * @file Text layout engine tests
 */

import { layoutTextBody } from "./engine";
import type { LayoutInput, LayoutParagraphInput, LayoutSpan, TextBoxConfig, AutoFitConfig } from "./types";
import { px, pt, pct } from "@oxen-office/ooxml/domain/units";

describe("layoutTextBody", () => {
  /** Default autoFit configuration for tests */
  const defaultAutoFit: AutoFitConfig = { type: "none" };

  /** Create a TextBoxConfig with defaults */
  const createTextBox = (overrides: Partial<TextBoxConfig> = {}): TextBoxConfig => ({
    width: px(200),
    height: px(100),
    insetLeft: px(0),
    insetRight: px(0),
    insetTop: px(0),
    insetBottom: px(0),
    anchor: "top",
    anchorCenter: false,
    wrapMode: "wrap",
    autoFit: defaultAutoFit,
    horzOverflow: "overflow",
    vertOverflow: "overflow",
    verticalType: "horz",
    compatLnSpc: false,
    forceAA: false,
    rtlCol: false,
    spcFirstLastPara: false,
    upright: false,
    ...overrides,
  });

  const createSpan = (text: string, fontSize = 18): LayoutSpan => ({
    text,
    fontSize: pt(fontSize),
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
  });

  const createParagraph = (spans: LayoutSpan[]): LayoutParagraphInput => ({
    spans,
    alignment: "left",
    marginLeft: px(0),
    indent: px(0),
    marginRight: px(0),
    spaceBefore: pt(0),
    spaceAfter: pt(0),
    lineSpacing: undefined,
    bullet: undefined,
    fontAlignment: "auto",
    defaultTabSize: px(96),
    tabStops: [],
    eaLineBreak: true,
    latinLineBreak: false,
    hangingPunctuation: true,
  });

  test("layouts empty input", () => {
    const input: LayoutInput = {
      textBox: createTextBox({
        insetLeft: px(10),
        insetRight: px(10),
        insetTop: px(5),
        insetBottom: px(5),
      }),
      paragraphs: [],
    };

    const result = layoutTextBody(input);

    expect(result.paragraphs).toHaveLength(0);
    expect(result.totalHeight as number).toBeGreaterThanOrEqual(10); // insets
  });

  test("layouts single paragraph with single span", () => {
    const input: LayoutInput = {
      textBox: createTextBox({
        insetLeft: px(10),
        insetRight: px(10),
        insetTop: px(5),
        insetBottom: px(5),
      }),
      paragraphs: [createParagraph([createSpan("Hello")])],
    };

    const result = layoutTextBody(input);

    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].lines).toHaveLength(1);
    expect(result.paragraphs[0].lines[0].spans).toHaveLength(1);
    expect(result.paragraphs[0].lines[0].spans[0].text).toBe("Hello");
  });

  test("applies vertical anchor: center", () => {
    const input: LayoutInput = {
      textBox: createTextBox({ anchor: "center" }),
      paragraphs: [createParagraph([createSpan("Test")])],
    };

    const result = layoutTextBody(input);

    // Y offset should be calculated for center alignment
    expect(result.yOffset as number).toBeGreaterThan(0);
  });

  test("applies vertical anchor: bottom", () => {
    const input: LayoutInput = {
      textBox: createTextBox({ anchor: "bottom" }),
      paragraphs: [createParagraph([createSpan("Test")])],
    };

    const result = layoutTextBody(input);

    // Y offset should be calculated for bottom alignment
    expect(result.yOffset as number).toBeGreaterThan(0);
  });

  test("handles line breaks", () => {
    const breakSpan: LayoutSpan = {
      text: "",
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
      isBreak: true,
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
    };

    const input: LayoutInput = {
      textBox: createTextBox(),
      paragraphs: [createParagraph([createSpan("Line 1"), breakSpan, createSpan("Line 2")])],
    };

    const result = layoutTextBody(input);

    expect(result.paragraphs[0].lines.length).toBeGreaterThanOrEqual(2);
  });

  test("handles multiple paragraphs", () => {
    const input: LayoutInput = {
      textBox: createTextBox({ height: px(200) }),
      paragraphs: [createParagraph([createSpan("Paragraph 1")]), createParagraph([createSpan("Paragraph 2")])],
    };

    const result = layoutTextBody(input);

    expect(result.paragraphs).toHaveLength(2);
    // Second paragraph should be below the first
    const y1 = result.paragraphs[0].lines[0].y as number;
    const y2 = result.paragraphs[1].lines[0].y as number;
    expect(y2).toBeGreaterThan(y1);
  });

  test("applies space before and after", () => {
    const para1: LayoutParagraphInput = {
      ...createParagraph([createSpan("Para 1")]),
      spaceAfter: pt(10),
    };
    const para2: LayoutParagraphInput = {
      ...createParagraph([createSpan("Para 2")]),
      spaceBefore: pt(10),
    };

    const input: LayoutInput = {
      textBox: createTextBox({ height: px(200) }),
      paragraphs: [para1, para2],
    };

    const result = layoutTextBody(input);

    const y1 = result.paragraphs[0].lines[0].y as number;
    const y2 = result.paragraphs[1].lines[0].y as number;
    // Gap should be larger due to spacing
    expect(y2 - y1).toBeGreaterThan(20);
  });

  describe("bullet width calculation", () => {
    test("includes bulletWidth in layout result when bullet is present", () => {
      const paraWithBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Bullet item")]),
        bullet: {
          char: "•",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const input: LayoutInput = {
        textBox: createTextBox({
          insetLeft: px(10),
          insetRight: px(10),
          insetTop: px(5),
          insetBottom: px(5),
        }),
        paragraphs: [paraWithBullet],
      };

      const result = layoutTextBody(input);

      expect(result.paragraphs[0].bulletWidth).toBeDefined();
      expect(result.paragraphs[0].bulletWidth as number).toBeGreaterThan(0);
    });

    test("bulletWidth is 0 when no bullet is present", () => {
      const input: LayoutInput = {
        textBox: createTextBox({
          insetLeft: px(10),
          insetRight: px(10),
          insetTop: px(5),
          insetBottom: px(5),
        }),
        paragraphs: [createParagraph([createSpan("No bullet")])],
      };

      const result = layoutTextBody(input);

      expect(result.paragraphs[0].bulletWidth as number).toBe(0);
    });

    test("bulletWidth varies with bullet character length", () => {
      const shortBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Item")]),
        bullet: {
          char: "•",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const longBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Item")]),
        bullet: {
          char: "123.",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const inputShort: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [shortBullet],
      };

      const inputLong: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [longBullet],
      };

      const resultShort = layoutTextBody(inputShort);
      const resultLong = layoutTextBody(inputLong);

      // Longer bullet character should result in larger bulletWidth
      expect(resultLong.paragraphs[0].bulletWidth as number).toBeGreaterThan(
        resultShort.paragraphs[0].bulletWidth as number,
      );
    });

    test("bulletWidth considers font size", () => {
      const smallFont: LayoutParagraphInput = {
        ...createParagraph([createSpan("Item")]),
        bullet: {
          char: "•",
          fontSize: pt(12),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const largeFont: LayoutParagraphInput = {
        ...createParagraph([createSpan("Item")]),
        bullet: {
          char: "•",
          fontSize: pt(24),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const inputSmall: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [smallFont],
      };

      const inputLarge: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [largeFont],
      };

      const resultSmall = layoutTextBody(inputSmall);
      const resultLarge = layoutTextBody(inputLarge);

      // Larger font size should result in larger bulletWidth
      expect(resultLarge.paragraphs[0].bulletWidth as number).toBeGreaterThan(
        resultSmall.paragraphs[0].bulletWidth as number,
      );
    });
  });

  /**
   * ECMA-376 21.1.2.2.7 compliance tests for indent and bullet positioning.
   *
   * Per ECMA-376:
   * - marL: Left margin for the paragraph
   * - indent: First line indentation (can be negative for hanging indent)
   *
   * Hanging indent (indent < 0):
   * - Bullet position = marL + indent (to the left of marL)
   * - Text position = marL + indent + bulletWidth
   * - 2nd line onwards = marL
   */
  describe("ECMA-376 21.1.2.2.7 - indent and bullet positioning", () => {
    test("hanging indent: first line text starts at marL + indent + bulletWidth", () => {
      const marginLeft = 100;
      const hangingIndent = -50; // negative = hanging

      const paraWithBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Bullet item with hanging indent")]),
        marginLeft: px(marginLeft),
        indent: px(hangingIndent),
        bullet: {
          char: "•",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const input: LayoutInput = {
        textBox: createTextBox({ width: px(500), height: px(200) }),
        paragraphs: [paraWithBullet],
      };

      const result = layoutTextBody(input);
      const firstLine = result.paragraphs[0].lines[0];
      const bulletWidth = result.paragraphs[0].bulletWidth as number;

      // ECMA-376: Text position = marL + indent + bulletWidth
      const expectedTextX = marginLeft + hangingIndent + bulletWidth;
      expect(firstLine.x as number).toBeCloseTo(expectedTextX, 1);

      // Bullet position = marL + indent = firstLine.x - bulletWidth
      const bulletX = (firstLine.x as number) - bulletWidth;
      expect(bulletX).toBeCloseTo(marginLeft + hangingIndent, 1);
    });

    test("positive indent: first line text starts at marL + indent + bulletWidth", () => {
      const marginLeft = 50;
      const positiveIndent = 30;

      const paraWithBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Bullet item with positive indent")]),
        marginLeft: px(marginLeft),
        indent: px(positiveIndent),
        bullet: {
          char: "1.",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const input: LayoutInput = {
        textBox: createTextBox({ width: px(500), height: px(200) }),
        paragraphs: [paraWithBullet],
      };

      const result = layoutTextBody(input);
      const firstLine = result.paragraphs[0].lines[0];
      const bulletWidth = result.paragraphs[0].bulletWidth as number;

      // ECMA-376: Text position = marL + indent + bulletWidth
      const expectedTextX = marginLeft + positiveIndent + bulletWidth;
      expect(firstLine.x as number).toBeCloseTo(expectedTextX, 1);
    });

    test("second line starts at marL (no indent)", () => {
      const marginLeft = 100;
      const hangingIndent = -50;

      // Create long text that wraps to multiple lines
      const longText = "This is a very long text that should wrap to multiple lines when rendered in a narrow container";
      const paraWithBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan(longText, 18)]),
        marginLeft: px(marginLeft),
        indent: px(hangingIndent),
        bullet: {
          char: "•",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const input: LayoutInput = {
        textBox: createTextBox({ width: px(300), height: px(200) }),
        paragraphs: [paraWithBullet],
      };

      const result = layoutTextBody(input);

      // Should have multiple lines
      expect(result.paragraphs[0].lines.length).toBeGreaterThan(1);

      // ECMA-376: 2nd line onwards starts at marL (no indent, no bullet)
      const secondLine = result.paragraphs[0].lines[1];
      expect(secondLine.x as number).toBeCloseTo(marginLeft, 1);
    });

    test("without bullet: first line starts at marL + indent", () => {
      const marginLeft = 80;
      const indent = 40;

      const paraNoBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("No bullet, positive indent")]),
        marginLeft: px(marginLeft),
        indent: px(indent),
        bullet: undefined,
      };

      const input: LayoutInput = {
        textBox: createTextBox({ width: px(500), height: px(200) }),
        paragraphs: [paraNoBullet],
      };

      const result = layoutTextBody(input);
      const firstLine = result.paragraphs[0].lines[0];

      // No bullet: Text position = marL + indent (bulletWidth = 0)
      expect(firstLine.x as number).toBeCloseTo(marginLeft + indent, 1);
    });
  });

  /**
   * ECMA-376 21.1.2.1.2 compliance tests for normAutofit (text auto-fit).
   *
   * Per ECMA-376:
   * - fontScale: Scale factor for fonts (default 100%)
   * - lnSpcReduction: Line spacing reduction percentage (default 0%)
   */
  describe("ECMA-376 21.1.2.1.2 - normAutofit (text auto-fit)", () => {
    test("fontScale scales all font sizes proportionally", () => {
      const para = createParagraph([createSpan("Test text", 24)]);

      const inputNoScale: LayoutInput = {
        textBox: createTextBox({ autoFit: { type: "none" } }),
        paragraphs: [para],
      };

      const inputWithScale: LayoutInput = {
        textBox: createTextBox({
          autoFit: {
            type: "normal",
            fontScale: pct(50), // 50%
            lineSpaceReduction: pct(0),
          },
        }),
        paragraphs: [para],
      };

      const resultNoScale = layoutTextBody(inputNoScale);
      const resultWithScale = layoutTextBody(inputWithScale);

      // Scaled result should have smaller height due to smaller fonts
      expect(resultWithScale.totalHeight as number).toBeLessThan(resultNoScale.totalHeight as number);
    });

    test("lineSpaceReduction reduces line spacing", () => {
      // Create paragraph with explicit line spacing
      const para: LayoutParagraphInput = {
        ...createParagraph([createSpan("Line 1")]),
        lineSpacing: { type: "percent", value: pct(200) }, // 200%
      };

      const inputNoReduction: LayoutInput = {
        textBox: createTextBox({ autoFit: { type: "none" } }),
        paragraphs: [para],
      };

      const inputWithReduction: LayoutInput = {
        textBox: createTextBox({
          autoFit: {
            type: "normal",
            fontScale: pct(100),
            lineSpaceReduction: pct(50), // 50% reduction
          },
        }),
        paragraphs: [para],
      };

      const resultNoReduction = layoutTextBody(inputNoReduction);
      const resultWithReduction = layoutTextBody(inputWithReduction);

      // Line with reduction should be shorter
      expect(resultWithReduction.paragraphs[0].lines[0].height as number).toBeLessThan(
        resultNoReduction.paragraphs[0].lines[0].height as number,
      );
    });

    test("autoFit type 'none' does not modify font sizes", () => {
      const para = createParagraph([createSpan("Test", 18)]);

      const input: LayoutInput = {
        textBox: createTextBox({ autoFit: { type: "none" } }),
        paragraphs: [para],
      };

      const result = layoutTextBody(input);

      // Font size should remain 18pt
      expect(result.paragraphs[0].lines[0].spans[0].fontSize as number).toBe(18);
    });

    test("autoFit type 'shape' does not modify font sizes", () => {
      const para = createParagraph([createSpan("Test", 18)]);

      const input: LayoutInput = {
        textBox: createTextBox({ autoFit: { type: "shape" } }),
        paragraphs: [para],
      };

      const result = layoutTextBody(input);

      // Font size should remain 18pt (shape autofit is handled separately)
      expect(result.paragraphs[0].lines[0].spans[0].fontSize as number).toBe(18);
    });

    test("bullet font size is also scaled", () => {
      const paraWithBullet: LayoutParagraphInput = {
        ...createParagraph([createSpan("Bullet item")]),
        bullet: {
          char: "•",
          fontSize: pt(18),
          color: "#000000",
          fontFamily: "Arial",
        },
      };

      const inputNoScale: LayoutInput = {
        textBox: createTextBox({ autoFit: { type: "none" } }),
        paragraphs: [paraWithBullet],
      };

      const inputWithScale: LayoutInput = {
        textBox: createTextBox({
          autoFit: {
            type: "normal",
            fontScale: pct(50),
            lineSpaceReduction: pct(0),
          },
        }),
        paragraphs: [paraWithBullet],
      };

      const resultNoScale = layoutTextBody(inputNoScale);
      const resultWithScale = layoutTextBody(inputWithScale);

      // Bullet width should be smaller due to scaled font
      expect(resultWithScale.paragraphs[0].bulletWidth as number).toBeLessThan(
        resultNoScale.paragraphs[0].bulletWidth as number,
      );
    });
  });

  /**
   * ECMA-376 21.1.2.1.2 compliance tests for anchorCtr (horizontal centering).
   *
   * Per ECMA-376:
   * - anchorCtr centers text horizontally within the text body
   * - Works in conjunction with anchor (vertical positioning)
   */
  describe("anchorCenter (horizontal centering) - ECMA-376 21.1.2.1.2", () => {
    test("anchorCenter=false does not offset content horizontally", () => {
      const input: LayoutInput = {
        textBox: createTextBox({
          width: px(500),
          anchorCenter: false,
        }),
        paragraphs: [createParagraph([createSpan("Short text")])],
      };

      const result = layoutTextBody(input);
      const lineX = result.paragraphs[0].lines[0].x as number;

      // Without centering, line should start at left margin (0)
      expect(lineX).toBeCloseTo(0, 1);
    });

    test("anchorCenter=true centers content horizontally", () => {
      const input: LayoutInput = {
        textBox: createTextBox({
          width: px(500),
          anchorCenter: true,
        }),
        paragraphs: [createParagraph([createSpan("Short text")])],
      };

      const result = layoutTextBody(input);
      const lineX = result.paragraphs[0].lines[0].x as number;
      const lineWidth = result.paragraphs[0].lines[0].width as number;
      const contentWidth = 500; // textBox width

      // With centering, line should be offset to center the content
      // Expected offset = (contentWidth - lineWidth) / 2
      const expectedOffset = (contentWidth - lineWidth) / 2;
      expect(lineX).toBeCloseTo(expectedOffset, 1);
    });

    test("anchorCenter respects insets", () => {
      const insetLeft = 20;
      const insetRight = 20;
      const totalWidth = 500;
      const contentWidth = totalWidth - insetLeft - insetRight; // 460

      const input: LayoutInput = {
        textBox: createTextBox({
          width: px(totalWidth),
          insetLeft: px(insetLeft),
          insetRight: px(insetRight),
          anchorCenter: true,
        }),
        paragraphs: [createParagraph([createSpan("Text")])],
      };

      const result = layoutTextBody(input);
      const lineX = result.paragraphs[0].lines[0].x as number;
      const lineWidth = result.paragraphs[0].lines[0].width as number;

      // Centering should be within the content area, plus insetLeft
      const expectedOffset = insetLeft + (contentWidth - lineWidth) / 2;
      expect(lineX).toBeCloseTo(expectedOffset, 1);
    });

    test("anchorCenter works with vertical anchor=center", () => {
      const input: LayoutInput = {
        textBox: createTextBox({
          width: px(500),
          height: px(200),
          anchor: "center",
          anchorCenter: true,
        }),
        paragraphs: [createParagraph([createSpan("Centered")])],
      };

      const result = layoutTextBody(input);

      // Both horizontal and vertical centering should be applied
      const lineX = result.paragraphs[0].lines[0].x as number;
      const lineWidth = result.paragraphs[0].lines[0].width as number;
      const yOffset = result.yOffset as number;

      // X should be centered
      expect(lineX).toBeCloseTo((500 - lineWidth) / 2, 1);
      // Y offset should be positive (content is centered vertically)
      expect(yOffset).toBeGreaterThan(0);
    });
  });

  describe("ECMA-376 baseline calculation", () => {
    /**
     * Per ECMA-376 Part 1, Section 21.1.2.2.5 (a:lnSpc):
     * Baseline position should be calculated from font size × ascender ratio,
     * NOT from lineHeight × ascender ratio.
     *
     * When line spacing is 150%, the lineHeight increases but the baseline
     * within the line should remain at fontSize × ascender.
     */
    test("baseline uses fontSize, not lineHeight, when line spacing > 100%", () => {
      const fontSize = 24;
      const PT_TO_PX = 96 / 72;
      const fontSizePx = fontSize * PT_TO_PX;
      // Arial ascender ratio per font-metrics
      const expectedBaselineOffset = fontSizePx * 0.75;

      // 100% line spacing
      const input100: LayoutInput = {
        textBox: createTextBox({ insetTop: px(0) }),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(100) },
        }],
      };

      // 150% line spacing
      const input150: LayoutInput = {
        textBox: createTextBox({ insetTop: px(0) }),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(150) },
        }],
      };

      const result100 = layoutTextBody(input100);
      const result150 = layoutTextBody(input150);

      const baseline100 = result100.paragraphs[0].lines[0].y as number;
      const baseline150 = result150.paragraphs[0].lines[0].y as number;

      // Both should have the same baseline position (based on fontSize)
      // NOT scaled by line spacing
      expect(baseline100).toBeCloseTo(expectedBaselineOffset, 0);
      expect(baseline150).toBeCloseTo(expectedBaselineOffset, 0);
    });

    test("line height increases with line spacing but baseline stays constant", () => {
      const fontSize = 18;

      const input100: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(100) },
        }],
      };

      const input200: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(200) },
        }],
      };

      const result100 = layoutTextBody(input100);
      const result200 = layoutTextBody(input200);

      const height100 = result100.paragraphs[0].lines[0].height as number;
      const height200 = result200.paragraphs[0].lines[0].height as number;

      // 200% line spacing should have ~2x line height
      expect(height200).toBeCloseTo(height100 * 2, 1);
    });
  });

  describe("LibreOffice dialect compatibility", () => {
    /**
     * Per render-options.ts:
     * LibreOffice empirically renders ~75% of ECMA-376 line spacing.
     * When lineSpacingMode is "libreofficeCompat", apply 0.75 factor.
     */
    test("libreofficeCompat mode reduces line height by 0.75 factor", () => {
      const fontSize = 24;
      const PT_TO_PX = 96 / 72;
      const fontSizePx = fontSize * PT_TO_PX;

      // ECMA-376 mode (default)
      const inputEcma: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [createParagraph([createSpan("Test", fontSize)])],
        renderOptions: {
          dialect: "ecma376",
          lineSpacingMode: "fontSizeMultiplier",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      };

      // LibreOffice compatibility mode
      const inputLibreoffice: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [createParagraph([createSpan("Test", fontSize)])],
        renderOptions: {
          dialect: "libreoffice",
          lineSpacingMode: "libreofficeCompat",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      };

      const resultEcma = layoutTextBody(inputEcma);
      const resultLibreoffice = layoutTextBody(inputLibreoffice);

      const heightEcma = resultEcma.paragraphs[0].lines[0].height as number;
      const heightLibreoffice = resultLibreoffice.paragraphs[0].lines[0].height as number;

      // LibreOffice mode should have ~75% of ECMA-376 line height
      expect(heightLibreoffice).toBeCloseTo(heightEcma * 0.75, 1);
      expect(heightLibreoffice).toBeCloseTo(fontSizePx * 0.75, 1);
    });

    test("libreofficeCompat applies 0.75 factor to explicit line spacing", () => {
      const fontSize = 18;

      // 150% line spacing in ECMA-376 mode
      const inputEcma: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(150) },
        }],
        renderOptions: {
          dialect: "ecma376",
          lineSpacingMode: "fontSizeMultiplier",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      };

      // 150% line spacing in LibreOffice mode
      const inputLibreoffice: LayoutInput = {
        textBox: createTextBox(),
        paragraphs: [{
          ...createParagraph([createSpan("Test", fontSize)]),
          lineSpacing: { type: "percent", value: pct(150) },
        }],
        renderOptions: {
          dialect: "libreoffice",
          lineSpacingMode: "libreofficeCompat",
          baselineMode: "svgBaseline",
          libreofficeLineSpacingFactor: 0.75,
          tableScalingMode: "natural",
        },
      };

      const resultEcma = layoutTextBody(inputEcma);
      const resultLibreoffice = layoutTextBody(inputLibreoffice);

      const heightEcma = resultEcma.paragraphs[0].lines[0].height as number;
      const heightLibreoffice = resultLibreoffice.paragraphs[0].lines[0].height as number;

      // LibreOffice should be 0.75 of ECMA-376
      expect(heightLibreoffice).toBeCloseTo(heightEcma * 0.75, 1);
    });
  });
});
