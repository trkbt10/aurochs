/**
 * @file TextBody to LayoutInput adapter tests
 *
 * Tests for converting domain TextBody objects to layout engine input format
 */

import { toTextBoxConfig, toLayoutInput } from "./adapter";
import type { TextBody, Paragraph, RunProperties, BulletStyle } from "../../domain/text";
import type { ColorContext } from "../../domain/resolution";
import type { Line, Fill } from "../../domain/color";
import { px, pt, deg, pct } from "../../domain/types";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal TextBody for testing
 */
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

/**
 * Default text box dimensions for testing
 */
const DEFAULT_WIDTH = px(200);
const DEFAULT_HEIGHT = px(100);

/**
 * Create default toTextBoxConfig options for testing
 */
function createTextBoxConfigOptions(body: TextBody, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT) {
  return { body, width, height };
}

/**
 * Create default toLayoutInput options for testing
 */
function createLayoutInputOptions(
  body: TextBody,
  colorContext = createColorContext(),
  options: {
    width?: typeof DEFAULT_WIDTH;
    height?: typeof DEFAULT_HEIGHT;
    fontScheme?: undefined;
    renderOptions?: undefined;
    resourceResolver?: (id: string) => string | undefined;
  } = {}
) {
  return {
    body,
    width: options.width ?? DEFAULT_WIDTH,
    height: options.height ?? DEFAULT_HEIGHT,
    colorContext,
    fontScheme: options.fontScheme,
    renderOptions: options.renderOptions,
    resourceResolver: options.resourceResolver,
  };
}

/**
 * Create a minimal ColorContext for testing
 */
function createColorContext(): ColorContext {
  return {
    colorScheme: {
      dk1: "000000",
      lt1: "FFFFFF",
      accent1: "4472C4",
      tx1: "000000",
    },
    colorMap: {
      tx1: "dk1",
      bg1: "lt1",
    },
  };
}

/**
 * Create a Line object with defaults for testing.
 * @see ECMA-376 Part 1, Section 20.1.2.2.24 (a:ln)
 */
function createLine(overrides: {
  fill: Fill;
  width?: ReturnType<typeof px>;
  cap?: Line["cap"];
  join?: Line["join"];
}): Line {
  return {
    width: overrides.width ?? px(1),
    fill: overrides.fill,
    cap: overrides.cap ?? "flat",
    join: overrides.join ?? "miter",
    compound: "sng",
    alignment: "ctr",
    dash: "solid",
  };
}

/**
 * Create a paragraph with text runs
 */
function createParagraph(text: string, props: Partial<RunProperties> = {}): Paragraph {
  return {
    properties: {
      level: 0,
      alignment: "left",
    },
    runs: [
      {
        type: "text" as const,
        text,
        properties: {
          fontSize: pt(18),
          fontFamily: "Arial",
          ...props,
        },
      },
    ],
  };
}

// =============================================================================
// toTextBoxConfig Tests
// =============================================================================

describe("toTextBoxConfig", () => {
  it("converts basic TextBody to TextBoxConfig", () => {
    const body = createTextBody();

    const result = toTextBoxConfig({ body, width: px(300), height: px(150) });

    expect(result.width as number).toBe(300);
    expect(result.height as number).toBe(150);
    expect(result.insetLeft as number).toBe(10);
    expect(result.insetTop as number).toBe(5);
    expect(result.insetRight as number).toBe(10);
    expect(result.insetBottom as number).toBe(5);
    expect(result.anchor).toBe("top");
    expect(result.wrapMode).toBe("wrap");
  });

  it("uses wrap mode none when wrapping is none", () => {
    const body = createTextBody({
      bodyProperties: {
        verticalType: "horz",
        wrapping: "none",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        autoFit: { type: "none" },
        insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
      },
    });
    const result = toTextBoxConfig(createTextBoxConfigOptions(body));

    expect(result.wrapMode).toBe("none");
  });

  it("preserves anchor value", () => {
    const testCases: Array<["top" | "center" | "bottom", "top" | "center" | "bottom"]> = [
      ["top", "top"],
      ["center", "center"],
      ["bottom", "bottom"],
    ];

    for (const [input, expected] of testCases) {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: input,
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "none" },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));
      expect(result.anchor).toBe(expected);
    }
  });

  it("preserves custom insets", () => {
    const body = createTextBody({
      bodyProperties: {
        verticalType: "horz",
        wrapping: "square",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        autoFit: { type: "none" },
        insets: {
          left: px(20),
          top: px(15),
          right: px(25),
          bottom: px(10),
        },
      },
    });

    const result = toTextBoxConfig(createTextBoxConfigOptions(body));

    expect(result.insetLeft as number).toBe(20);
    expect(result.insetTop as number).toBe(15);
    expect(result.insetRight as number).toBe(25);
    expect(result.insetBottom as number).toBe(10);
  });

  describe("autoFit conversion (ECMA-376 21.1.2.1.1-3)", () => {
    it("converts autoFit type 'none'", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "none" },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));

      expect(result.autoFit.type).toBe("none");
    });

    it("converts autoFit type 'shape'", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "shape" },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));

      expect(result.autoFit.type).toBe("shape");
    });

    it("converts autoFit type 'normal' with fontScale", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "normal", fontScale: pct(75) },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));

      expect(result.autoFit.type).toBe("normal");
      if (result.autoFit.type === "normal") {
        expect(result.autoFit.fontScale as number).toBe(75);
      }
    });

    it("converts autoFit type 'normal' with lineSpaceReduction", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "normal", lineSpaceReduction: pct(20) },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));

      expect(result.autoFit.type).toBe("normal");
      if (result.autoFit.type === "normal") {
        expect(result.autoFit.lineSpaceReduction as number).toBe(20);
      }
    });

    it("uses default values for omitted fontScale/lineSpaceReduction", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          autoFit: { type: "normal" },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));

      expect(result.autoFit.type).toBe("normal");
      if (result.autoFit.type === "normal") {
        expect(result.autoFit.fontScale as number).toBe(100); // Default 100%
        expect(result.autoFit.lineSpaceReduction as number).toBe(0); // Default 0%
      }
    });
  });

  describe("overflow conversion (ECMA-376 21.1.2.1.16, 21.1.2.1.42)", () => {
    it("preserves horzOverflow value", () => {
      const testCases: Array<["overflow" | "ellipsis" | "clip", "overflow" | "ellipsis" | "clip"]> = [
        ["overflow", "overflow"],
        ["clip", "clip"],
        ["ellipsis", "ellipsis"],
      ];

      for (const [input, expected] of testCases) {
        const body = createTextBody({
          bodyProperties: {
            verticalType: "horz",
            wrapping: "square",
            anchor: "top",
            anchorCenter: false,
            overflow: input,
            autoFit: { type: "none" },
            insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
          },
        });

        const result = toTextBoxConfig(createTextBoxConfigOptions(body));
        expect(result.horzOverflow).toBe(expected);
      }
    });

    it("preserves vertOverflow value", () => {
      const testCases: Array<["overflow" | "ellipsis" | "clip", "overflow" | "ellipsis" | "clip"]> = [
        ["overflow", "overflow"],
        ["clip", "clip"],
        ["ellipsis", "ellipsis"],
      ];

      for (const [input, expected] of testCases) {
        const body = createTextBody({
          bodyProperties: {
            verticalType: "horz",
            wrapping: "square",
            anchor: "top",
            anchorCenter: false,
            overflow: "overflow",
            verticalOverflow: input,
            autoFit: { type: "none" },
            insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
          },
        });

        const result = toTextBoxConfig(createTextBoxConfigOptions(body));
        expect(result.vertOverflow).toBe(expected);
      }
    });

    it("uses 'overflow' as default for vertOverflow when not specified", () => {
      const body = createTextBody({
        bodyProperties: {
          verticalType: "horz",
          wrapping: "square",
          anchor: "top",
          anchorCenter: false,
          overflow: "overflow",
          // verticalOverflow is undefined
          autoFit: { type: "none" },
          insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
        },
      });

      const result = toTextBoxConfig(createTextBoxConfigOptions(body));
      expect(result.vertOverflow).toBe("overflow");
    });
  });
});

// =============================================================================
// toLayoutInput Tests
// =============================================================================

describe("toLayoutInput", () => {
  it("converts empty TextBody", () => {
    const body = createTextBody();
    const colorContext = createColorContext();

    const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

    expect(result.textBox).toBeDefined();
    expect(result.paragraphs).toHaveLength(0);
  });

  it("converts TextBody with single paragraph", () => {
    const body = createTextBody({
      paragraphs: [createParagraph("Hello World")],
    });
    const colorContext = createColorContext();

    const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

    expect(result.paragraphs).toHaveLength(1);
    expect(result.paragraphs[0].spans).toHaveLength(1);
    expect(result.paragraphs[0].spans[0].text).toBe("Hello World");
  });

  it("converts TextBody with multiple paragraphs", () => {
    const body = createTextBody({
      paragraphs: [
        createParagraph("First paragraph"),
        createParagraph("Second paragraph"),
        createParagraph("Third paragraph"),
      ],
    });
    const colorContext = createColorContext();

    const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

    expect(result.paragraphs).toHaveLength(3);
    expect(result.paragraphs[0].spans[0].text).toBe("First paragraph");
    expect(result.paragraphs[1].spans[0].text).toBe("Second paragraph");
    expect(result.paragraphs[2].spans[0].text).toBe("Third paragraph");
  });

  describe("run properties conversion", () => {
    it("converts font size", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Text", { fontSize: pt(24) })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontSize as number).toBe(24);
    });

    it("converts font family", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Text", { fontFamily: "Times New Roman" })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontFamily).toBe("Times New Roman");
    });

    it("converts bold to fontWeight 700", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Bold text", { bold: true })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontWeight).toBe(700);
    });

    it("converts non-bold to fontWeight 400", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Normal text", { bold: false })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontWeight).toBe(400);
    });

    it("converts italic", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Italic text", { italic: true })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontStyle).toBe("italic");
    });

    it("converts underline to textDecoration", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Underlined", { underline: "sng" })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textDecoration).toBe("underline");
    });

    it("converts strikethrough to textDecoration", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Struck", { strike: "sngStrike" })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textDecoration).toBe("line-through");
    });

    it("converts both underline and strikethrough", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Both", { underline: "sng", strike: "sngStrike" })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textDecoration).toBe("underline line-through");
    });

    it("converts srgb color", () => {
      const body = createTextBody({
        paragraphs: [
          createParagraph("Red text", {
            color: { spec: { type: "srgb", value: "FF0000" } },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].color).toBe("#FF0000");
    });

    it("converts scheme color using colorContext", () => {
      const colorContext: ColorContext = {
        colorScheme: { accent1: "4472C4" },
        colorMap: {},
      };
      const body = createTextBody({
        paragraphs: [
          createParagraph("Themed text", {
            color: { spec: { type: "scheme", value: "accent1" } },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

      expect(result.paragraphs[0].spans[0].color).toBe("#4472C4");
    });

    /**
     * Color transform tests per ECMA-376 Part 1, Section 20.1.2.3.
     *
     * Color transforms modify the base color through operations like:
     * - lumMod: Luminance modulation (Section 20.1.2.3.19)
     * - lumOff: Luminance offset (Section 20.1.2.3.20)
     * - satMod: Saturation modulation (Section 20.1.2.3.27)
     * - shade: Shade - darkens color (Section 20.1.2.3.30)
     * - tint: Tint - lightens color (Section 20.1.2.3.35)
     *
     * @see ECMA-376 Part 1, Section 20.1.2.3
     */
    it("applies lumMod transform to scheme color (ECMA-376 20.1.2.3.19)", () => {
      // lumMod 50000 = 50% luminance (darken the color)
      const colorContext: ColorContext = {
        colorScheme: { lt2: "DEF5FA" }, // Light blue
        colorMap: { bg2: "lt2" },
      };
      const body = createTextBody({
        paragraphs: [
          createParagraph("Darkened text", {
            color: {
              spec: { type: "scheme", value: "bg2" },
              transform: { lumMod: pct(50) }, // 50% luminance
            },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

      // The result should be darker than the original #DEF5FA
      const color = result.paragraphs[0].spans[0].color;
      expect(color).not.toBe("#DEF5FA"); // Should be modified
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/); // Should be valid hex
    });

    it("applies lumMod 25% to make color very dark (ECMA-376 20.1.2.3.19)", () => {
      // This tests the exact scenario from the aascu.pptx file
      // <a:schemeClr val="bg2"><a:lumMod val="25000"/></a:schemeClr>
      const colorContext: ColorContext = {
        colorScheme: { lt2: "DEF5FA" }, // Light blue from aascu.pptx theme
        colorMap: { bg2: "lt2" },
      };
      const body = createTextBody({
        paragraphs: [
          createParagraph("Very dark text", {
            color: {
              spec: { type: "scheme", value: "bg2" },
              transform: { lumMod: pct(25) }, // 25% luminance = very dark
            },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body, colorContext));

      // Result should be a very dark color (luminance reduced to 25%)
      const color = result.paragraphs[0].spans[0].color;
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      // The R, G, B values should be low (dark color)
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      // With 25% luminance, the color should be quite dark
      expect(r).toBeLessThan(128);
      expect(g).toBeLessThan(128);
      expect(b).toBeLessThan(128);
    });

    it("applies shade transform to darken color (ECMA-376 20.1.2.3.30)", () => {
      const body = createTextBody({
        paragraphs: [
          createParagraph("Shaded text", {
            color: {
              spec: { type: "srgb", value: "4472C4" }, // Blue
              transform: { shade: pct(50) }, // 50% shade
            },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      const color = result.paragraphs[0].spans[0].color;
      expect(color).not.toBe("#4472C4"); // Should be modified
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("applies tint transform to lighten color (ECMA-376 20.1.2.3.35)", () => {
      const body = createTextBody({
        paragraphs: [
          createParagraph("Tinted text", {
            color: {
              spec: { type: "srgb", value: "4472C4" }, // Blue
              transform: { tint: pct(50) }, // 50% tint
            },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      const color = result.paragraphs[0].spans[0].color;
      expect(color).not.toBe("#4472C4"); // Should be modified
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("converts positive baseline to superscript", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Super", { baseline: 30000 })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].verticalAlign).toBe("superscript");
    });

    it("converts negative baseline to subscript", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Sub", { baseline: -25000 })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].verticalAlign).toBe("subscript");
    });

    it("converts caps=all to uppercase", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("caps", { caps: "all" })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textTransform).toBe("uppercase");
    });

    it("converts letter spacing", () => {
      const body = createTextBody({
        paragraphs: [createParagraph("Spaced", { spacing: px(5) })],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].letterSpacing as number).toBe(5);
    });

    it("converts hyperlink", () => {
      const body = createTextBody({
        paragraphs: [
          createParagraph("Link", {
            hyperlink: { id: "rId1", tooltip: "Click me" },
          }),
        ],
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].linkId).toBe("rId1");
      expect(result.paragraphs[0].spans[0].linkTooltip).toBe("Click me");
    });
  });

  describe("line break handling", () => {
    it("converts line break run", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left" },
        runs: [
          { type: "text", text: "Line 1", properties: { fontSize: pt(18) } },
          { type: "break", properties: { fontSize: pt(18) } },
          { type: "text", text: "Line 2", properties: { fontSize: pt(18) } },
        ],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans).toHaveLength(3);
      expect(result.paragraphs[0].spans[0].text).toBe("Line 1");
      expect(result.paragraphs[0].spans[0].isBreak).toBe(false);
      expect(result.paragraphs[0].spans[1].isBreak).toBe(true);
      expect(result.paragraphs[0].spans[2].text).toBe("Line 2");
    });
  });

  describe("paragraph properties conversion", () => {
    it("converts alignment", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "center" },
        runs: [{ type: "text", text: "Centered", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].alignment).toBe("center");
    });

    it("converts marginLeft", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", marginLeft: px(50) },
        runs: [{ type: "text", text: "Indented", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].marginLeft as number).toBe(50);
    });

    it("converts indent", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", indent: px(-20) },
        runs: [{ type: "text", text: "Hanging", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].indent as number).toBe(-20);
    });

    it("converts spaceBefore in points", () => {
      const paragraph: Paragraph = {
        properties: {
          level: 0,
          alignment: "left",
          spaceBefore: { type: "points", value: pt(12) },
        },
        runs: [{ type: "text", text: "Text", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spaceBefore as number).toBe(12);
    });

    it("converts spaceAfter in points", () => {
      const paragraph: Paragraph = {
        properties: {
          level: 0,
          alignment: "left",
          spaceAfter: { type: "points", value: pt(6) },
        },
        runs: [{ type: "text", text: "Text", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spaceAfter as number).toBe(6);
    });

    it("converts lineSpacing", () => {
      const paragraph: Paragraph = {
        properties: {
          level: 0,
          alignment: "left",
          lineSpacing: { type: "percent", value: pct(150) },
        },
        runs: [{ type: "text", text: "Text", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].lineSpacing).toBeDefined();
    });
  });

  describe("bullet conversion", () => {
    it("converts character bullet", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "char", char: "•" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet).toBeDefined();
      expect(result.paragraphs[0].bullet?.char).toBe("•");
    });

    it("converts bullet with custom size", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "char", char: "▪" },
        colorFollowText: false,
        sizePoints: pt(12),
        sizeFollowText: false,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.fontSize as number).toBe(12);
    });

    it("converts bullet with percentage size", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "char", char: "•" },
        colorFollowText: true,
        sizePercent: pct(75),
        sizeFollowText: false,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(20) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      // 20 * 0.75 = 15
      expect(result.paragraphs[0].bullet?.fontSize as number).toBeCloseTo(15, 1);
    });

    it("converts bullet with custom color", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "char", char: "•" },
        color: { spec: { type: "srgb", value: "FF0000" } },
        colorFollowText: false,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.color).toBe("#FF0000");
    });

    it("converts bullet with custom font", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "char", char: "" },
        font: "Wingdings",
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: false,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.fontFamily).toBe("Wingdings");
    });

    it("returns undefined bullet for buNone", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "none" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet).toBeUndefined();
    });

    it("returns undefined bullet for buBlip without resourceResolver", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "blip", resourceId: "rId1" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      // Without resourceResolver, picture bullet cannot be resolved
      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet).toBeUndefined();
    });

    it("returns picture bullet with imageUrl when resourceResolver is provided (ECMA-376 21.1.2.4.2)", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "blip", resourceId: "rId1" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left", bulletStyle },
        runs: [{ type: "text", text: "Item", properties: { fontSize: pt(18) } }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      // Mock resourceResolver
      const resourceResolver = (id: string) =>
        id === "rId1" ? "data:image/png;base64,iVBORw0KGgo..." : undefined;

      const result = toLayoutInput(createLayoutInputOptions(body, createColorContext(), { resourceResolver }));

      expect(result.paragraphs[0].bullet).toBeDefined();
      expect(result.paragraphs[0].bullet?.imageUrl).toBe("data:image/png;base64,iVBORw0KGgo...");
      expect(result.paragraphs[0].bullet?.char).toBe(""); // No character for picture bullets
    });
  });

  describe("default values", () => {
    it("uses default font size when not specified", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left" },
        runs: [{ type: "text", text: "No size", properties: undefined }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontSize as number).toBe(18); // DEFAULT_FONT_SIZE_PT
    });

    it("uses default font family when not specified", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left" },
        runs: [{ type: "text", text: "No font", properties: undefined }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].fontFamily).toBe("sans-serif");
    });

    it("uses black color when not specified", () => {
      const paragraph: Paragraph = {
        properties: { level: 0, alignment: "left" },
        runs: [{ type: "text", text: "No color", properties: undefined }],
      };
      const body = createTextBody({ paragraphs: [paragraph] });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].color).toBe("#000000");
    });
  });

  describe("auto-number bullets", () => {
    it("formats arabicPeriod as 1., 2., 3.", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "auto", scheme: "arabicPeriod", startAt: 1 },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "First", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "Second", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "Third", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.char).toBe("1.");
      expect(result.paragraphs[1].bullet?.char).toBe("2.");
      expect(result.paragraphs[2].bullet?.char).toBe("3.");
    });

    it("formats romanLcPeriod as i., ii., iii.", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "auto", scheme: "romanLcPeriod", startAt: 1 },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "First", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "Second", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.char).toBe("i.");
      expect(result.paragraphs[1].bullet?.char).toBe("ii.");
    });

    it("formats alphaUcPeriod as A., B., C.", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "auto", scheme: "alphaUcPeriod", startAt: 1 },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "First", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "Second", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.char).toBe("A.");
      expect(result.paragraphs[1].bullet?.char).toBe("B.");
    });

    it("respects startAt parameter", () => {
      const bulletStyle: BulletStyle = {
        bullet: { type: "auto", scheme: "arabicPeriod", startAt: 5 },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "First", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle },
          runs: [{ type: "text", text: "Second", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.char).toBe("5.");
      expect(result.paragraphs[1].bullet?.char).toBe("6.");
    });

    it("resets sequence when non-auto-numbered paragraph is encountered", () => {
      const autoStyle: BulletStyle = {
        bullet: { type: "auto", scheme: "arabicPeriod", startAt: 1 },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const charStyle: BulletStyle = {
        bullet: { type: "char", char: "•" },
        colorFollowText: true,
        sizeFollowText: true,
        fontFollowText: true,
      };
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", bulletStyle: autoStyle },
          runs: [{ type: "text", text: "First", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle: autoStyle },
          runs: [{ type: "text", text: "Second", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle: charStyle },
          runs: [{ type: "text", text: "Interruption", properties: { fontSize: pt(18) } }],
        },
        {
          properties: { level: 0, alignment: "left", bulletStyle: autoStyle },
          runs: [{ type: "text", text: "First again", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].bullet?.char).toBe("1.");
      expect(result.paragraphs[1].bullet?.char).toBe("2.");
      expect(result.paragraphs[2].bullet?.char).toBe("•");
      // After interruption, sequence resets
      expect(result.paragraphs[3].bullet?.char).toBe("1.");
    });
  });

  // ===========================================================================
  // Text Outline Conversion Tests
  // ===========================================================================

  describe("Text outline (a:ln) conversion - ECMA-376 20.1.2.2.24", () => {
    it("returns undefined textOutline when no outline specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "No outline", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textOutline).toBeUndefined();
    });

    it("converts solid fill outline to TextOutlineConfig", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Outlined",
            properties: {
              fontSize: pt(18),
              textOutline: createLine({
                width: px(2),
                fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
                cap: "round",
                join: "round",
              }),
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textOutline).toBeDefined();
      expect(result.paragraphs[0].spans[0].textOutline?.color).toBe("#FF0000");
      expect(result.paragraphs[0].spans[0].textOutline?.width).toBe(px(2));
      expect(result.paragraphs[0].spans[0].textOutline?.cap).toBe("round");
      expect(result.paragraphs[0].spans[0].textOutline?.join).toBe("round");
    });

    it("uses first stop color for gradient fill outline", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Gradient outline",
            properties: {
              fontSize: pt(18),
              textOutline: createLine({
                width: px(1),
                fill: {
                  type: "gradientFill",
                  stops: [
                    { position: pct(0), color: { spec: { type: "srgb", value: "00FF00" } } },
                    { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
                  ],
                  rotWithShape: false,
                },
                cap: "flat",
                join: "miter",
              }),
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textOutline).toBeDefined();
      // First gradient stop color should be used
      expect(result.paragraphs[0].spans[0].textOutline?.color).toBe("#00FF00");
      expect(result.paragraphs[0].spans[0].textOutline?.cap).toBe("butt");
      expect(result.paragraphs[0].spans[0].textOutline?.join).toBe("miter");
    });

    it("returns undefined for noFill outline", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "No fill outline",
            properties: {
              fontSize: pt(18),
              textOutline: createLine({
                width: px(1),
                fill: { type: "noFill" },
                cap: "flat",
                join: "miter",
              }),
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      // No stroke color means no outline
      expect(result.paragraphs[0].spans[0].textOutline).toBeUndefined();
    });

    it("maps cap values correctly (flat→butt, round→round, square→square)", () => {
      const capMappings: Array<{ input: "flat" | "round" | "square"; expected: "butt" | "round" | "square" }> = [
        { input: "flat", expected: "butt" },
        { input: "round", expected: "round" },
        { input: "square", expected: "square" },
      ];

      for (const { input, expected } of capMappings) {
        const paragraphs: Paragraph[] = [
          {
            properties: { level: 0, alignment: "left" },
            runs: [{
              type: "text",
              text: "Cap test",
              properties: {
                fontSize: pt(18),
                textOutline: createLine({
                  width: px(1),
                  fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
                  cap: input,
                  join: "miter",
                }),
              },
            }],
          },
        ];
        const body = createTextBody({ paragraphs });
        const result = toLayoutInput(createLayoutInputOptions(body));
        expect(result.paragraphs[0].spans[0].textOutline?.cap).toBe(expected);
      }
    });

    it("maps join values correctly (bevel→bevel, miter→miter, round→round)", () => {
      const joinMappings: Array<{ input: "bevel" | "miter" | "round"; expected: "bevel" | "miter" | "round" }> = [
        { input: "bevel", expected: "bevel" },
        { input: "miter", expected: "miter" },
        { input: "round", expected: "round" },
      ];

      for (const { input, expected } of joinMappings) {
        const paragraphs: Paragraph[] = [
          {
            properties: { level: 0, alignment: "left" },
            runs: [{
              type: "text",
              text: "Join test",
              properties: {
                fontSize: pt(18),
                textOutline: createLine({
                  width: px(1),
                  fill: { type: "solidFill", color: { spec: { type: "srgb", value: "000000" } } },
                  cap: "flat",
                  join: input,
                }),
              },
            }],
          },
        ];
        const body = createTextBody({ paragraphs });
        const result = toLayoutInput(createLayoutInputOptions(body));
        expect(result.paragraphs[0].spans[0].textOutline?.join).toBe(expected);
      }
    });
  });

  // ===========================================================================
  // Text Fill Conversion Tests
  // ===========================================================================

  describe("Text fill (gradFill) conversion - ECMA-376 20.1.8", () => {
    it("returns undefined textFill when no fill specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "No fill", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textFill).toBeUndefined();
    });

    it("converts solid fill to TextFillConfig with type solid", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Solid fill",
            properties: {
              fontSize: pt(18),
              fill: { type: "solidFill", color: { spec: { type: "srgb", value: "FF0000" } } },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textFill).toBeDefined();
      expect(result.paragraphs[0].spans[0].textFill?.type).toBe("solid");
      if (result.paragraphs[0].spans[0].textFill?.type === "solid") {
        expect(result.paragraphs[0].spans[0].textFill.color).toBe("#FF0000");
        expect(result.paragraphs[0].spans[0].textFill.alpha).toBe(1);
      }
    });

    it("converts gradient fill to TextFillConfig with type gradient", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Gradient fill",
            properties: {
              fontSize: pt(18),
              fill: {
                type: "gradientFill",
                stops: [
                  { position: pct(0), color: { spec: { type: "srgb", value: "FF0000" } } },
                  { position: pct(100), color: { spec: { type: "srgb", value: "0000FF" } } },
                ],
                linear: { angle: deg(90), scaled: false },
                rotWithShape: false,
              },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textFill).toBeDefined();
      expect(result.paragraphs[0].spans[0].textFill?.type).toBe("gradient");
      if (result.paragraphs[0].spans[0].textFill?.type === "gradient") {
        expect(result.paragraphs[0].spans[0].textFill.stops.length).toBe(2);
        expect(result.paragraphs[0].spans[0].textFill.stops[0].color).toBe("#FF0000");
        expect(result.paragraphs[0].spans[0].textFill.stops[1].color).toBe("#0000FF");
        expect(result.paragraphs[0].spans[0].textFill.angle).toBe(90);
        expect(result.paragraphs[0].spans[0].textFill.isRadial).toBe(false);
      }
    });

    it("handles solid fill with alpha transparency", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Alpha fill",
            properties: {
              fontSize: pt(18),
              fill: {
                type: "solidFill",
                color: {
                  spec: { type: "srgb", value: "FF0000" },
                  transform: { alpha: pct(50) }, // 50% opacity
                },
              },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textFill).toBeDefined();
      if (result.paragraphs[0].spans[0].textFill?.type === "solid") {
        expect(result.paragraphs[0].spans[0].textFill.alpha).toBe(0.5);
      }
    });

    it("returns noFill config for noFill (ECMA-376 20.1.8.44)", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "No fill",
            properties: {
              fontSize: pt(18),
              fill: { type: "noFill" },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].textFill).toBeDefined();
      expect(result.paragraphs[0].spans[0].textFill?.type).toBe("noFill");
    });
  });

  describe("fontAlignment conversion (ECMA-376 21.1.2.1.12)", () => {
    it("uses 'auto' as default when fontAlignment is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].fontAlignment).toBe("auto");
    });

    it("preserves fontAlignment value from paragraph properties", () => {
      const testCases: Array<["auto" | "top" | "center" | "base" | "bottom", string]> = [
        ["auto", "auto"],
        ["top", "top"],
        ["center", "center"],
        ["base", "base"],
        ["bottom", "bottom"],
      ];

      for (const [input, expected] of testCases) {
        const paragraphs: Paragraph[] = [
          {
            properties: { level: 0, alignment: "left", fontAlignment: input },
            runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
          },
        ];
        const body = createTextBody({ paragraphs });

        const result = toLayoutInput(createLayoutInputOptions(body));

        expect(result.paragraphs[0].fontAlignment).toBe(expected);
      }
    });
  });

  describe("kerning conversion (ECMA-376 21.1.2.3.9)", () => {
    it("sets kerning to undefined when kern attribute is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].kerning).toBeUndefined();
    });

    it("preserves kerning value from run properties", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(24), kerning: pt(12) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].kerning as number).toBe(12);
    });
  });

  describe("text direction (a:rtl) conversion (ECMA-376 21.1.2.3.12)", () => {
    it("uses 'ltr' as default when rtl attribute is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Hello", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].direction).toBe("ltr");
    });

    it("sets direction to 'rtl' when rtl attribute is true", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "مرحبا", properties: { fontSize: pt(18), rtl: true } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].direction).toBe("rtl");
    });

    it("sets direction to 'ltr' when rtl attribute is false", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Hello", properties: { fontSize: pt(18), rtl: false } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].direction).toBe("ltr");
    });
  });

  describe("body properties conversion (ECMA-376 21.1.2.1.2)", () => {
    it("converts compatLnSpc (compatible line spacing)", () => {
      const body = createTextBody({
        bodyProperties: {
          ...createTextBody().bodyProperties,
          compatibleLineSpacing: true,
        },
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.compatLnSpc).toBe(true);
    });

    it("converts forceAA (force anti-aliasing)", () => {
      const body = createTextBody({
        bodyProperties: {
          ...createTextBody().bodyProperties,
          forceAntiAlias: true,
        },
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.forceAA).toBe(true);
    });

    it("converts rtlCol (RTL column order)", () => {
      const body = createTextBody({
        bodyProperties: {
          ...createTextBody().bodyProperties,
          rtlColumns: true,
        },
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.rtlCol).toBe(true);
    });

    it("converts spcFirstLastPara (space first/last paragraph)", () => {
      const body = createTextBody({
        bodyProperties: {
          ...createTextBody().bodyProperties,
          spaceFirstLastPara: true,
        },
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.spcFirstLastPara).toBe(true);
    });

    it("converts upright (upright text in vertical layouts)", () => {
      const body = createTextBody({
        bodyProperties: {
          ...createTextBody().bodyProperties,
          upright: true,
        },
      });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.upright).toBe(true);
    });

    it("uses default false values when properties are not specified", () => {
      const body = createTextBody();

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.textBox.compatLnSpc).toBe(false);
      expect(result.textBox.forceAA).toBe(false);
      expect(result.textBox.rtlCol).toBe(false);
      expect(result.textBox.spcFirstLastPara).toBe(false);
      expect(result.textBox.upright).toBe(false);
    });
  });

  describe("paragraph properties conversion (ECMA-376 21.1.2.2.7)", () => {
    it("converts defaultTabSize", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", defaultTabSize: px(120) },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].defaultTabSize as number).toBe(120);
    });

    it("converts tabStops", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: {
            level: 0,
            alignment: "left",
            tabStops: [
              { position: px(100), alignment: "left" },
              { position: px(200), alignment: "center" },
            ],
          },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].tabStops).toHaveLength(2);
      expect(result.paragraphs[0].tabStops[0].position as number).toBe(100);
      expect(result.paragraphs[0].tabStops[0].alignment).toBe("left");
      expect(result.paragraphs[0].tabStops[1].position as number).toBe(200);
      expect(result.paragraphs[0].tabStops[1].alignment).toBe("center");
    });

    it("converts eaLineBreak", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", eaLineBreak: false },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].eaLineBreak).toBe(false);
    });

    it("converts latinLineBreak", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", latinLineBreak: true },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].latinLineBreak).toBe(true);
    });

    it("converts hangingPunctuation", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left", hangingPunctuation: false },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].hangingPunctuation).toBe(false);
    });

    it("uses default values when properties are not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].defaultTabSize as number).toBe(96); // 1 inch default
      expect(result.paragraphs[0].tabStops).toHaveLength(0);
      expect(result.paragraphs[0].eaLineBreak).toBe(true);
      expect(result.paragraphs[0].latinLineBreak).toBe(false);
      expect(result.paragraphs[0].hangingPunctuation).toBe(true);
    });
  });

  // ===========================================================================
  // Bookmark Conversion Tests
  // ===========================================================================

  describe("bookmark (bmk) conversion (ECMA-376 21.1.2.3.9)", () => {
    it("sets bookmark to undefined when bmk attribute is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].bookmark).toBeUndefined();
    });

    it("preserves bookmark value from run properties", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18), bookmark: "anchor1" } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].bookmark).toBe("anchor1");
    });
  });

  // ===========================================================================
  // Mouse-over Hyperlink Conversion Tests
  // ===========================================================================

  describe("mouse-over hyperlink (a:hlinkMouseOver) conversion (ECMA-376 21.1.2.3.6)", () => {
    it("sets mouseOverLinkId to undefined when hlinkMouseOver is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18) } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].mouseOverLinkId).toBeUndefined();
      expect(result.paragraphs[0].spans[0].mouseOverLinkTooltip).toBeUndefined();
    });

    it("preserves mouseOverLinkId and mouseOverLinkTooltip from run properties", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Hover me",
            properties: {
              fontSize: pt(18),
              hyperlinkMouseOver: { id: "rId2", tooltip: "Hover tooltip" },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].mouseOverLinkId).toBe("rId2");
      expect(result.paragraphs[0].spans[0].mouseOverLinkTooltip).toBe("Hover tooltip");
    });
  });

  // ===========================================================================
  // Underline Color Conversion Tests
  // ===========================================================================

  describe("underline color (a:uLn) conversion (ECMA-376 21.1.2.3.33)", () => {
    it("sets underlineColor to undefined when uLn color is not specified", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{ type: "text", text: "Test", properties: { fontSize: pt(18), underline: "sng" } }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].underlineColor).toBeUndefined();
    });

    it("resolves underlineColor from srgb color", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Underlined",
            properties: {
              fontSize: pt(18),
              underline: "sng",
              underlineColor: { spec: { type: "srgb", value: "FF0000" } },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].underlineColor).toBe("#FF0000");
    });

    it("resolves underlineColor from scheme color", () => {
      const paragraphs: Paragraph[] = [
        {
          properties: { level: 0, alignment: "left" },
          runs: [{
            type: "text",
            text: "Underlined",
            properties: {
              fontSize: pt(18),
              underline: "sng",
              underlineColor: { spec: { type: "scheme", value: "accent1" } },
            },
          }],
        },
      ];
      const body = createTextBody({ paragraphs });

      // Uses default colorContext which has accent1: "4472C4"
      const result = toLayoutInput(createLayoutInputOptions(body));

      expect(result.paragraphs[0].spans[0].underlineColor).toBe("#4472C4");
    });
  });
});
