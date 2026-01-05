/**
 * @file Chart text properties tests
 *
 * Tests for ECMA-376 compliant text property extraction from c:txPr.
 *
 * @see ECMA-376 Part 1, Section 21.2.2.217 (txPr)
 * @see ECMA-376 Part 1, Section 21.1.2.3.2 (a:defRPr)
 */

import {
  extractFontSize,
  extractBold,
  extractItalic,
  extractFontFamily,
  resolveTextStyle,
  toSvgTextAttributes,
  DEFAULT_CHART_FONT_SIZE,
  DEFAULT_CHART_FONT_FAMILY,
} from "./text-props";
import type { TextBody, Paragraph, ParagraphProperties, BodyProperties } from "../../../domain/text";
import { pt, px } from "../../../domain/types";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a minimal TextBody for testing
 */
function createTextBody(options: {
  defRPr?: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
  };
  firstRunProps?: {
    fontSize?: number;
    bold?: boolean;
    italic?: boolean;
    fontFamily?: string;
  };
}): TextBody {
  const bodyProperties: BodyProperties = {
    verticalType: "horz",
    wrapping: "none",
    anchor: "top",
    anchorCenter: false,
    overflow: "overflow",
    verticalOverflow: "overflow",
    autoFit: { type: "none" },
    insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
  };

  const defaultRunProperties = buildRunProperties(options.defRPr);
  const properties: ParagraphProperties = {
    level: 0,
    alignment: "left",
    defaultRunProperties,
  };

  const paragraph: Paragraph = {
    properties,
    runs: buildRuns(options.firstRunProps),
  };

  return {
    bodyProperties,
    paragraphs: [paragraph],
  };
}

function buildRunProperties(
  props: { fontSize?: number; bold?: boolean; italic?: boolean; fontFamily?: string } | undefined
): ParagraphProperties["defaultRunProperties"] {
  if (!props) {
    return undefined;
  }

  return {
    fontSize: props.fontSize === undefined ? undefined : pt(props.fontSize),
    bold: props.bold,
    italic: props.italic,
    fontFamily: props.fontFamily,
  };
}

function buildRuns(
  props: { fontSize?: number; bold?: boolean; italic?: boolean; fontFamily?: string } | undefined
): Paragraph["runs"] {
  if (!props) {
    return [];
  }

  return [
    {
      type: "text" as const,
      text: "Test",
      properties: buildRunProperties(props),
    },
  ];
}

// =============================================================================
// extractFontSize Tests
// =============================================================================

describe("extractFontSize - ECMA-376 21.1.2.3.9", () => {
  test("returns default font size when textProperties is undefined", () => {
    expect(extractFontSize(undefined)).toBe(DEFAULT_CHART_FONT_SIZE);
  });

  test("returns default font size when no paragraphs", () => {
    const textBody: TextBody = {
      bodyProperties: {
        verticalType: "horz",
        wrapping: "none",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        verticalOverflow: "overflow",
        autoFit: { type: "none" },
        insets: { left: px(0), top: px(0), right: px(0), bottom: px(0) },
      },
      paragraphs: [],
    };
    expect(extractFontSize(textBody)).toBe(DEFAULT_CHART_FONT_SIZE);
  });

  test("extracts font size from defRPr (priority 1)", () => {
    const textBody = createTextBody({
      defRPr: { fontSize: 14 },
      firstRunProps: { fontSize: 10 },
    });
    expect(extractFontSize(textBody)).toBe(pt(14));
  });

  test("extracts font size from first run when no defRPr (priority 2)", () => {
    const textBody = createTextBody({
      firstRunProps: { fontSize: 12 },
    });
    expect(extractFontSize(textBody)).toBe(pt(12));
  });

  test("returns default when neither defRPr nor run has fontSize", () => {
    const textBody = createTextBody({
      defRPr: { bold: true },
      firstRunProps: { italic: true },
    });
    expect(extractFontSize(textBody)).toBe(DEFAULT_CHART_FONT_SIZE);
  });
});

// =============================================================================
// extractBold Tests
// =============================================================================

describe("extractBold - ECMA-376 21.1.2.3.9", () => {
  test("returns false when textProperties is undefined", () => {
    expect(extractBold(undefined)).toBe(false);
  });

  test("extracts bold from defRPr (priority 1)", () => {
    const textBody = createTextBody({
      defRPr: { bold: true },
      firstRunProps: { bold: false },
    });
    expect(extractBold(textBody)).toBe(true);
  });

  test("extracts bold=false from defRPr when explicitly set", () => {
    const textBody = createTextBody({
      defRPr: { bold: false },
      firstRunProps: { bold: true },
    });
    expect(extractBold(textBody)).toBe(false);
  });

  test("extracts bold from first run when no defRPr (priority 2)", () => {
    const textBody = createTextBody({
      firstRunProps: { bold: true },
    });
    expect(extractBold(textBody)).toBe(true);
  });

  test("returns false (ECMA-376 default) when not specified", () => {
    const textBody = createTextBody({
      defRPr: { fontSize: 12 },
    });
    expect(extractBold(textBody)).toBe(false);
  });
});

// =============================================================================
// extractItalic Tests
// =============================================================================

describe("extractItalic - ECMA-376 21.1.2.3.9", () => {
  test("returns false when textProperties is undefined", () => {
    expect(extractItalic(undefined)).toBe(false);
  });

  test("extracts italic from defRPr (priority 1)", () => {
    const textBody = createTextBody({
      defRPr: { italic: true },
      firstRunProps: { italic: false },
    });
    expect(extractItalic(textBody)).toBe(true);
  });

  test("extracts italic from first run when no defRPr (priority 2)", () => {
    const textBody = createTextBody({
      firstRunProps: { italic: true },
    });
    expect(extractItalic(textBody)).toBe(true);
  });

  test("returns false (ECMA-376 default) when not specified", () => {
    const textBody = createTextBody({
      defRPr: { fontSize: 12 },
    });
    expect(extractItalic(textBody)).toBe(false);
  });
});

// =============================================================================
// extractFontFamily Tests
// =============================================================================

describe("extractFontFamily - ECMA-376 21.1.2.3.7", () => {
  test("returns default font family when textProperties is undefined", () => {
    expect(extractFontFamily(undefined)).toBe(DEFAULT_CHART_FONT_FAMILY);
  });

  test("extracts font family from defRPr (priority 1)", () => {
    const textBody = createTextBody({
      defRPr: { fontFamily: "Arial" },
      firstRunProps: { fontFamily: "Times New Roman" },
    });
    expect(extractFontFamily(textBody)).toBe("Arial");
  });

  test("extracts font family from first run when no defRPr (priority 2)", () => {
    const textBody = createTextBody({
      firstRunProps: { fontFamily: "Helvetica" },
    });
    expect(extractFontFamily(textBody)).toBe("Helvetica");
  });

  test("returns default when not specified", () => {
    const textBody = createTextBody({
      defRPr: { bold: true },
    });
    expect(extractFontFamily(textBody)).toBe(DEFAULT_CHART_FONT_FAMILY);
  });
});

// =============================================================================
// resolveTextStyle Tests
// =============================================================================

describe("resolveTextStyle - ECMA-376 21.2.2.217", () => {
  test("returns all defaults when textProperties is undefined", () => {
    const style = resolveTextStyle(undefined);
    expect(style.fontSize).toBe(DEFAULT_CHART_FONT_SIZE);
    expect(style.fontFamily).toBe(DEFAULT_CHART_FONT_FAMILY);
    expect(style.bold).toBe(false);
    expect(style.italic).toBe(false);
  });

  test("resolves all properties from defRPr", () => {
    const textBody = createTextBody({
      defRPr: {
        fontSize: 18,
        fontFamily: "Verdana",
        bold: true,
        italic: true,
      },
    });
    const style = resolveTextStyle(textBody);
    expect(style.fontSize).toBe(pt(18));
    expect(style.fontFamily).toBe("Verdana");
    expect(style.bold).toBe(true);
    expect(style.italic).toBe(true);
  });
});

// =============================================================================
// toSvgTextAttributes Tests
// =============================================================================

describe("toSvgTextAttributes", () => {
  test("generates basic SVG attributes", () => {
    const style = {
      fontSize: pt(12),
      fontFamily: "Arial",
      bold: false,
      italic: false,
    };
    const attrs = toSvgTextAttributes(style);
    expect(attrs).toContain('font-size="12"');
    expect(attrs).toContain('font-family="Arial"');
    expect(attrs).not.toContain("font-weight");
    expect(attrs).not.toContain("font-style");
  });

  test("includes font-weight for bold text", () => {
    const style = {
      fontSize: pt(12),
      fontFamily: "Arial",
      bold: true,
      italic: false,
    };
    const attrs = toSvgTextAttributes(style);
    expect(attrs).toContain('font-weight="bold"');
  });

  test("includes font-style for italic text", () => {
    const style = {
      fontSize: pt(12),
      fontFamily: "Arial",
      bold: false,
      italic: true,
    };
    const attrs = toSvgTextAttributes(style);
    expect(attrs).toContain('font-style="italic"');
  });

  test("includes both for bold and italic text", () => {
    const style = {
      fontSize: pt(14),
      fontFamily: "Georgia",
      bold: true,
      italic: true,
    };
    const attrs = toSvgTextAttributes(style);
    expect(attrs).toContain('font-size="14"');
    expect(attrs).toContain('font-family="Georgia"');
    expect(attrs).toContain('font-weight="bold"');
    expect(attrs).toContain('font-style="italic"');
  });
});
