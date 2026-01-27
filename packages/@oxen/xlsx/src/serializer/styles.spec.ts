/**
 * @file StyleSheet Serializer Tests
 *
 * Tests for serializing XlsxStyleSheet types to XML elements.
 * Verifies element ordering and attribute serialization per ECMA-376 specification.
 *
 * @see ECMA-376 Part 4, Section 18.8.39 (styleSheet)
 */

import { serializeElement } from "@oxen/xml";
import type {
  XlsxStyleSheet,
  XlsxCellXf,
  XlsxCellStyle,
  XlsxAlignment,
  XlsxProtection,
} from "../domain/style/types";
import { createDefaultStyleSheet } from "../domain/style/types";
import { numFmtId, fontId, fillId, borderId } from "../domain/types";
import type { XlsxNumberFormat } from "../domain/style/number-format";
import {
  serializeAlignment,
  serializeProtection,
  serializeCellXf,
  serializeCellXfs,
  serializeCellStyleXfs,
  serializeCellStyle,
  serializeCellStyles,
  serializeStyleSheet,
} from "./styles";

// =============================================================================
// serializeAlignment Tests
// =============================================================================

describe("serializeAlignment", () => {
  it("should serialize empty alignment", () => {
    const alignment: XlsxAlignment = {};
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe("<alignment/>");
  });

  it("should serialize horizontal alignment", () => {
    const alignment: XlsxAlignment = { horizontal: "center" };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment horizontal="center"/>');
  });

  it("should serialize vertical alignment", () => {
    const alignment: XlsxAlignment = { vertical: "center" };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment vertical="center"/>');
  });

  it("should serialize horizontal and vertical alignment", () => {
    const alignment: XlsxAlignment = { horizontal: "left", vertical: "top" };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment horizontal="left" vertical="top"/>');
  });

  it("should serialize wrapText as 1 when true", () => {
    const alignment: XlsxAlignment = { wrapText: true };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment wrapText="1"/>');
  });

  it("should not serialize wrapText when false or undefined", () => {
    const alignment1: XlsxAlignment = { wrapText: false };
    const alignment2: XlsxAlignment = {};
    expect(serializeElement(serializeAlignment(alignment1))).toBe("<alignment/>");
    expect(serializeElement(serializeAlignment(alignment2))).toBe("<alignment/>");
  });

  it("should serialize shrinkToFit as 1 when true", () => {
    const alignment: XlsxAlignment = { shrinkToFit: true };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment shrinkToFit="1"/>');
  });

  it("should serialize textRotation", () => {
    const alignment: XlsxAlignment = { textRotation: 45 };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment textRotation="45"/>');
  });

  it("should serialize textRotation 255 for vertical text", () => {
    const alignment: XlsxAlignment = { textRotation: 255 };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment textRotation="255"/>');
  });

  it("should serialize indent", () => {
    const alignment: XlsxAlignment = { indent: 2 };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment indent="2"/>');
  });

  it("should serialize readingOrder", () => {
    const alignment: XlsxAlignment = { readingOrder: 1 };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toBe('<alignment readingOrder="1"/>');
  });

  it("should serialize all alignment properties", () => {
    const alignment: XlsxAlignment = {
      horizontal: "center",
      vertical: "center",
      textRotation: 45,
      wrapText: true,
      indent: 1,
      shrinkToFit: true,
      readingOrder: 2,
    };
    const result = serializeElement(serializeAlignment(alignment));
    expect(result).toContain('horizontal="center"');
    expect(result).toContain('vertical="center"');
    expect(result).toContain('textRotation="45"');
    expect(result).toContain('wrapText="1"');
    expect(result).toContain('indent="1"');
    expect(result).toContain('shrinkToFit="1"');
    expect(result).toContain('readingOrder="2"');
  });

  it("should serialize alignment attribute order correctly", () => {
    const alignment: XlsxAlignment = {
      horizontal: "center",
      vertical: "center",
      textRotation: 45,
      wrapText: true,
      indent: 1,
      shrinkToFit: true,
      readingOrder: 2,
    };
    const result = serializeElement(serializeAlignment(alignment));

    // Verify attribute order: horizontal, vertical, textRotation, wrapText, indent, shrinkToFit, readingOrder
    const horizontalIdx = result.indexOf("horizontal");
    const verticalIdx = result.indexOf("vertical");
    const textRotationIdx = result.indexOf("textRotation");
    const wrapTextIdx = result.indexOf("wrapText");
    const indentIdx = result.indexOf("indent");
    const shrinkToFitIdx = result.indexOf("shrinkToFit");
    const readingOrderIdx = result.indexOf("readingOrder");

    expect(horizontalIdx).toBeLessThan(verticalIdx);
    expect(verticalIdx).toBeLessThan(textRotationIdx);
    expect(textRotationIdx).toBeLessThan(wrapTextIdx);
    expect(wrapTextIdx).toBeLessThan(indentIdx);
    expect(indentIdx).toBeLessThan(shrinkToFitIdx);
    expect(shrinkToFitIdx).toBeLessThan(readingOrderIdx);
  });

  it("should serialize all horizontal alignment types", () => {
    const types = [
      "left",
      "center",
      "right",
      "fill",
      "justify",
      "centerContinuous",
      "distributed",
    ] as const;
    for (const type of types) {
      const alignment: XlsxAlignment = { horizontal: type };
      const result = serializeElement(serializeAlignment(alignment));
      expect(result).toBe(`<alignment horizontal="${type}"/>`);
    }
  });

  it("should serialize all vertical alignment types", () => {
    const types = ["top", "center", "bottom", "justify", "distributed"] as const;
    for (const type of types) {
      const alignment: XlsxAlignment = { vertical: type };
      const result = serializeElement(serializeAlignment(alignment));
      expect(result).toBe(`<alignment vertical="${type}"/>`);
    }
  });
});

// =============================================================================
// serializeProtection Tests
// =============================================================================

describe("serializeProtection", () => {
  it("should serialize empty protection", () => {
    const protection: XlsxProtection = {};
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe("<protection/>");
  });

  it("should serialize locked true", () => {
    const protection: XlsxProtection = { locked: true };
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe('<protection locked="1"/>');
  });

  it("should serialize locked false", () => {
    const protection: XlsxProtection = { locked: false };
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe('<protection locked="0"/>');
  });

  it("should serialize hidden true", () => {
    const protection: XlsxProtection = { hidden: true };
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe('<protection hidden="1"/>');
  });

  it("should serialize hidden false", () => {
    const protection: XlsxProtection = { hidden: false };
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe('<protection hidden="0"/>');
  });

  it("should serialize both locked and hidden", () => {
    const protection: XlsxProtection = { locked: true, hidden: false };
    const result = serializeElement(serializeProtection(protection));
    expect(result).toBe('<protection locked="1" hidden="0"/>');
  });
});

// =============================================================================
// serializeCellXf Tests
// =============================================================================

describe("serializeCellXf", () => {
  it("should serialize minimal cellXf with required attributes", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toBe('<xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>');
  });

  it("should serialize cellXf with xfId", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      xfId: 0,
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('xfId="0"');
  });

  it("should serialize applyFont when true", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(1),
      fillId: fillId(0),
      borderId: borderId(0),
      applyFont: true,
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('applyFont="1"');
  });

  it("should not serialize applyFont when false", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(1),
      fillId: fillId(0),
      borderId: borderId(0),
      applyFont: false,
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).not.toContain("applyFont");
  });

  it("should not serialize applyFont when undefined", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(1),
      fillId: fillId(0),
      borderId: borderId(0),
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).not.toContain("applyFont");
  });

  it("should serialize all apply* attributes when true", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(164),
      fontId: fontId(1),
      fillId: fillId(2),
      borderId: borderId(1),
      applyNumberFormat: true,
      applyFont: true,
      applyFill: true,
      applyBorder: true,
      applyAlignment: true,
      applyProtection: true,
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('applyNumberFormat="1"');
    expect(result).toContain('applyFont="1"');
    expect(result).toContain('applyFill="1"');
    expect(result).toContain('applyBorder="1"');
    expect(result).toContain('applyAlignment="1"');
    expect(result).toContain('applyProtection="1"');
  });

  it("should serialize cellXf with alignment child", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { horizontal: "center", vertical: "center" },
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('<alignment horizontal="center" vertical="center"/>');
  });

  it("should serialize cellXf with protection child", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      protection: { locked: true, hidden: false },
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('<protection locked="1" hidden="0"/>');
  });

  it("should serialize cellXf with both alignment and protection children", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { horizontal: "center" },
      protection: { locked: true },
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain("<alignment");
    expect(result).toContain("<protection");
    // Verify alignment comes before protection
    expect(result.indexOf("<alignment")).toBeLessThan(result.indexOf("<protection"));
  });

  it("should serialize cellXf attribute order correctly", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(164),
      fontId: fontId(1),
      fillId: fillId(2),
      borderId: borderId(1),
      xfId: 0,
      applyNumberFormat: true,
      applyFont: true,
      applyFill: true,
      applyBorder: true,
      applyAlignment: true,
      applyProtection: true,
    };
    const result = serializeElement(serializeCellXf(xf));

    // Verify attribute order
    const numFmtIdIdx = result.indexOf("numFmtId");
    const fontIdIdx = result.indexOf("fontId");
    const fillIdIdx = result.indexOf("fillId");
    const borderIdIdx = result.indexOf("borderId");
    const xfIdIdx = result.indexOf("xfId");
    const applyNumberFormatIdx = result.indexOf("applyNumberFormat");
    const applyFontIdx = result.indexOf("applyFont");
    const applyFillIdx = result.indexOf("applyFill");
    const applyBorderIdx = result.indexOf("applyBorder");
    const applyAlignmentIdx = result.indexOf("applyAlignment");
    const applyProtectionIdx = result.indexOf("applyProtection");

    expect(numFmtIdIdx).toBeLessThan(fontIdIdx);
    expect(fontIdIdx).toBeLessThan(fillIdIdx);
    expect(fillIdIdx).toBeLessThan(borderIdIdx);
    expect(borderIdIdx).toBeLessThan(xfIdIdx);
    expect(xfIdIdx).toBeLessThan(applyNumberFormatIdx);
    expect(applyNumberFormatIdx).toBeLessThan(applyFontIdx);
    expect(applyFontIdx).toBeLessThan(applyFillIdx);
    expect(applyFillIdx).toBeLessThan(applyBorderIdx);
    expect(applyBorderIdx).toBeLessThan(applyAlignmentIdx);
    expect(applyAlignmentIdx).toBeLessThan(applyProtectionIdx);
  });
});

// =============================================================================
// serializeCellXfs Tests
// =============================================================================

describe("serializeCellXfs", () => {
  it("should serialize empty cellXfs collection", () => {
    const result = serializeElement(serializeCellXfs([]));
    expect(result).toBe('<cellXfs count="0"/>');
  });

  it("should serialize single cellXf", () => {
    const cellXfs: XlsxCellXf[] = [
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
      },
    ];
    const result = serializeElement(serializeCellXfs(cellXfs));
    expect(result).toBe(
      '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellXfs>',
    );
  });

  it("should serialize multiple cellXfs", () => {
    const cellXfs: XlsxCellXf[] = [
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
      },
      {
        numFmtId: numFmtId(164),
        fontId: fontId(1),
        fillId: fillId(2),
        borderId: borderId(1),
        applyFont: true,
        applyFill: true,
      },
    ];
    const result = serializeElement(serializeCellXfs(cellXfs));
    expect(result).toContain('count="2"');
    expect(result).toContain('numFmtId="0"');
    expect(result).toContain('numFmtId="164"');
  });

  it("should preserve cellXf order", () => {
    const cellXfs: XlsxCellXf[] = [
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0) },
      { numFmtId: numFmtId(1), fontId: fontId(1), fillId: fillId(1), borderId: borderId(1) },
      { numFmtId: numFmtId(2), fontId: fontId(2), fillId: fillId(2), borderId: borderId(2) },
    ];
    const result = serializeElement(serializeCellXfs(cellXfs));

    const idx0 = result.indexOf('numFmtId="0"');
    const idx1 = result.indexOf('numFmtId="1"');
    const idx2 = result.indexOf('numFmtId="2"');

    expect(idx0).toBeLessThan(idx1);
    expect(idx1).toBeLessThan(idx2);
  });
});

// =============================================================================
// serializeCellStyleXfs Tests
// =============================================================================

describe("serializeCellStyleXfs", () => {
  it("should serialize empty cellStyleXfs collection", () => {
    const result = serializeElement(serializeCellStyleXfs([]));
    expect(result).toBe('<cellStyleXfs count="0"/>');
  });

  it("should serialize single cellStyleXf", () => {
    const cellStyleXfs: XlsxCellXf[] = [
      {
        numFmtId: numFmtId(0),
        fontId: fontId(0),
        fillId: fillId(0),
        borderId: borderId(0),
      },
    ];
    const result = serializeElement(serializeCellStyleXfs(cellStyleXfs));
    expect(result).toBe(
      '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>',
    );
  });

  it("should serialize multiple cellStyleXfs", () => {
    const cellStyleXfs: XlsxCellXf[] = [
      { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0) },
      { numFmtId: numFmtId(0), fontId: fontId(1), fillId: fillId(0), borderId: borderId(0) },
    ];
    const result = serializeElement(serializeCellStyleXfs(cellStyleXfs));
    expect(result).toContain('count="2"');
  });
});

// =============================================================================
// serializeCellStyle Tests
// =============================================================================

describe("serializeCellStyle", () => {
  it("should serialize cellStyle with name and xfId", () => {
    const cellStyle: XlsxCellStyle = {
      name: "Normal",
      xfId: 0,
    };
    const result = serializeElement(serializeCellStyle(cellStyle));
    expect(result).toBe('<cellStyle name="Normal" xfId="0"/>');
  });

  it("should serialize cellStyle with builtinId", () => {
    const cellStyle: XlsxCellStyle = {
      name: "Normal",
      xfId: 0,
      builtinId: 0,
    };
    const result = serializeElement(serializeCellStyle(cellStyle));
    expect(result).toBe('<cellStyle name="Normal" xfId="0" builtinId="0"/>');
  });

  it("should serialize cellStyle without builtinId when undefined", () => {
    const cellStyle: XlsxCellStyle = {
      name: "Custom",
      xfId: 1,
    };
    const result = serializeElement(serializeCellStyle(cellStyle));
    expect(result).toBe('<cellStyle name="Custom" xfId="1"/>');
  });
});

// =============================================================================
// serializeCellStyles Tests
// =============================================================================

describe("serializeCellStyles", () => {
  it("should serialize empty cellStyles collection", () => {
    const result = serializeElement(serializeCellStyles([]));
    expect(result).toBe('<cellStyles count="0"/>');
  });

  it("should serialize single cellStyle", () => {
    const cellStyles: XlsxCellStyle[] = [{ name: "Normal", xfId: 0, builtinId: 0 }];
    const result = serializeElement(serializeCellStyles(cellStyles));
    expect(result).toBe(
      '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>',
    );
  });

  it("should serialize multiple cellStyles", () => {
    const cellStyles: XlsxCellStyle[] = [
      { name: "Normal", xfId: 0, builtinId: 0 },
      { name: "Heading 1", xfId: 1, builtinId: 1 },
      { name: "Custom", xfId: 2 },
    ];
    const result = serializeElement(serializeCellStyles(cellStyles));
    expect(result).toContain('count="3"');
    expect(result).toContain('name="Normal"');
    expect(result).toContain('name="Heading 1"');
    expect(result).toContain('name="Custom"');
  });

  it("should preserve cellStyle order", () => {
    const cellStyles: XlsxCellStyle[] = [
      { name: "First", xfId: 0 },
      { name: "Second", xfId: 1 },
      { name: "Third", xfId: 2 },
    ];
    const result = serializeElement(serializeCellStyles(cellStyles));

    const firstIdx = result.indexOf("First");
    const secondIdx = result.indexOf("Second");
    const thirdIdx = result.indexOf("Third");

    expect(firstIdx).toBeLessThan(secondIdx);
    expect(secondIdx).toBeLessThan(thirdIdx);
  });
});

// =============================================================================
// serializeStyleSheet Tests
// =============================================================================

describe("serializeStyleSheet", () => {
  it("should serialize default stylesheet", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));

    // Verify namespace
    expect(result).toContain(
      'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"',
    );

    // Verify required elements
    expect(result).toContain("<fonts");
    expect(result).toContain("<fills");
    expect(result).toContain("<borders");
    expect(result).toContain("<cellStyleXfs");
    expect(result).toContain("<cellXfs");
    expect(result).toContain("<cellStyles");
  });

  it("should not include numFmts when no custom formats exist", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).not.toContain("<numFmts");
  });

  it("should include numFmts when custom formats exist", () => {
    const styleSheet: XlsxStyleSheet = {
      ...createDefaultStyleSheet(),
      numberFormats: [{ numFmtId: numFmtId(164), formatCode: "#,##0.00" } as XlsxNumberFormat],
    };
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain("<numFmts");
    expect(result).toContain('numFmtId="164"');
    expect(result).toContain('formatCode="#,##0.00"');
  });

  it("should serialize child elements in correct order", () => {
    const styleSheet: XlsxStyleSheet = {
      ...createDefaultStyleSheet(),
      numberFormats: [{ numFmtId: numFmtId(164), formatCode: "#,##0.00" } as XlsxNumberFormat],
    };
    const result = serializeElement(serializeStyleSheet(styleSheet));

    // Verify order: numFmts, fonts, fills, borders, cellStyleXfs, cellXfs, cellStyles
    const numFmtsIdx = result.indexOf("<numFmts");
    const fontsIdx = result.indexOf("<fonts");
    const fillsIdx = result.indexOf("<fills");
    const bordersIdx = result.indexOf("<borders");
    const cellStyleXfsIdx = result.indexOf("<cellStyleXfs");
    const cellXfsIdx = result.indexOf("<cellXfs");
    const cellStylesIdx = result.indexOf("<cellStyles");

    expect(numFmtsIdx).toBeLessThan(fontsIdx);
    expect(fontsIdx).toBeLessThan(fillsIdx);
    expect(fillsIdx).toBeLessThan(bordersIdx);
    expect(bordersIdx).toBeLessThan(cellStyleXfsIdx);
    expect(cellStyleXfsIdx).toBeLessThan(cellXfsIdx);
    expect(cellXfsIdx).toBeLessThan(cellStylesIdx);
  });

  it("should serialize indexedColors under colors when present", () => {
    const styleSheet: XlsxStyleSheet = {
      ...createDefaultStyleSheet(),
      indexedColors: ["FF010203", "FFFF0010"],
    };
    const result = serializeElement(serializeStyleSheet(styleSheet));

    expect(result).toContain("<colors>");
    expect(result).toContain("<indexedColors>");
    expect(result).toContain('<rgbColor rgb="FF010203"/>');
    expect(result).toContain('<rgbColor rgb="FFFF0010"/>');

    const cellStylesIdx = result.indexOf("<cellStyles");
    const colorsIdx = result.indexOf("<colors");
    expect(cellStylesIdx).toBeLessThan(colorsIdx);
  });

  it("should serialize fonts correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<fonts count="1">');
    expect(result).toContain('<name val="Calibri"/>');
    expect(result).toContain('<sz val="11"/>');
  });

  it("should serialize fills correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<fills count="2">');
    expect(result).toContain('patternType="none"');
    expect(result).toContain('patternType="gray125"');
  });

  it("should serialize borders correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<borders count="1">');
    expect(result).toContain("<border/>");
  });

  it("should serialize cellStyleXfs correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<cellStyleXfs count="1">');
  });

  it("should serialize cellXfs correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<cellXfs count="1">');
  });

  it("should serialize cellStyles correctly", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));
    expect(result).toContain('<cellStyles count="1">');
    expect(result).toContain('name="Normal"');
    expect(result).toContain('builtinId="0"');
  });

  it("should serialize complex stylesheet with multiple entries", () => {
    const styleSheet: XlsxStyleSheet = {
      fonts: [
        { name: "Calibri", size: 11, scheme: "minor" },
        { name: "Arial", size: 12, bold: true },
      ],
      fills: [
        { type: "none" },
        { type: "pattern", pattern: { patternType: "gray125" } },
        {
          type: "pattern",
          pattern: {
            patternType: "solid",
            fgColor: { type: "rgb", value: "FFFF0000" },
          },
        },
      ],
      borders: [
        {},
        {
          left: { style: "thin", color: { type: "auto" } },
          right: { style: "thin", color: { type: "auto" } },
        },
      ],
      numberFormats: [{ numFmtId: numFmtId(164), formatCode: "#,##0.00" } as XlsxNumberFormat],
      cellXfs: [
        { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0) },
        {
          numFmtId: numFmtId(164),
          fontId: fontId(1),
          fillId: fillId(2),
          borderId: borderId(1),
          applyNumberFormat: true,
          applyFont: true,
          applyFill: true,
          applyBorder: true,
        },
      ],
      cellStyleXfs: [
        { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0) },
      ],
      cellStyles: [{ name: "Normal", xfId: 0, builtinId: 0 }],
    };
    const result = serializeElement(serializeStyleSheet(styleSheet));

    expect(result).toContain('<numFmts count="1">');
    expect(result).toContain('<fonts count="2">');
    expect(result).toContain('<fills count="3">');
    expect(result).toContain('<borders count="2">');
    expect(result).toContain('<cellStyleXfs count="1">');
    expect(result).toContain('<cellXfs count="2">');
    expect(result).toContain('<cellStyles count="1">');
  });
});

// =============================================================================
// Round-trip Tests
// =============================================================================

describe("round-trip compatibility", () => {
  it("should produce valid XML for default stylesheet", () => {
    const styleSheet = createDefaultStyleSheet();
    const result = serializeElement(serializeStyleSheet(styleSheet));

    // Verify it starts and ends correctly
    expect(result).toMatch(/^<styleSheet xmlns="[^"]+">.*<\/styleSheet>$/);
  });

  it("should produce XML that matches expected format for cellXf with alignment", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      xfId: 0,
      applyAlignment: true,
      alignment: { horizontal: "center", vertical: "center", wrapText: true },
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain(
      '<alignment horizontal="center" vertical="center" wrapText="1"/>',
    );
  });

  it("should produce XML that matches expected format for cellXf with protection", () => {
    const xf: XlsxCellXf = {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      xfId: 0,
      applyProtection: true,
      protection: { locked: true, hidden: false },
    };
    const result = serializeElement(serializeCellXf(xf));
    expect(result).toContain('<protection locked="1" hidden="0"/>');
  });
});
