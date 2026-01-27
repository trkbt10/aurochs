/**
 * @file Styles Parser Integration Tests
 *
 * Tests for parsing the complete stylesheet from styles.xml.
 */

import { parseXml } from "@oxen/xml";
import type { XmlElement } from "@oxen/xml";
import {
  parseAlignment,
  parseProtection,
  parseCellXf,
  parseCellXfs,
  parseCellStyle,
  parseCellStyles,
  parseStyleSheet,
} from "./index";

/**
 * Helper to parse XML string and get the root element.
 */
function parseRoot(xml: string): XmlElement {
  const doc = parseXml(xml);
  const root = doc.children.find((c): c is XmlElement => c.type === "element");
  if (!root) {
    throw new Error("No root element found");
  }
  return root;
}

// =============================================================================
// parseAlignment Tests
// =============================================================================

describe("parseAlignment", () => {
  it("should parse horizontal alignment", () => {
    const xml = `<alignment horizontal="center"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.horizontal).toBe("center");
  });

  it("should parse vertical alignment", () => {
    const xml = `<alignment vertical="bottom"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.vertical).toBe("bottom");
  });

  it("should parse wrapText as true", () => {
    const xml = `<alignment wrapText="1"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.wrapText).toBe(true);
  });

  it("should parse wrapText as false", () => {
    const xml = `<alignment wrapText="0"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.wrapText).toBe(false);
  });

  it("should parse shrinkToFit", () => {
    const xml = `<alignment shrinkToFit="true"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.shrinkToFit).toBe(true);
  });

  it("should parse textRotation", () => {
    const xml = `<alignment textRotation="45"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.textRotation).toBe(45);
  });

  it("should parse indent", () => {
    const xml = `<alignment indent="2"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.indent).toBe(2);
  });

  it("should parse readingOrder", () => {
    const xml = `<alignment readingOrder="1"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result.readingOrder).toBe(1);
  });

  it("should parse all alignment properties", () => {
    const xml = `<alignment horizontal="left" vertical="top" wrapText="1" shrinkToFit="0" textRotation="90" indent="1" readingOrder="2"/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result).toEqual({
      horizontal: "left",
      vertical: "top",
      wrapText: true,
      shrinkToFit: false,
      textRotation: 90,
      indent: 1,
      readingOrder: 2,
    });
  });

  it("should handle empty alignment element", () => {
    const xml = `<alignment/>`;
    const result = parseAlignment(parseRoot(xml));
    expect(result).toEqual({
      horizontal: undefined,
      vertical: undefined,
      wrapText: undefined,
      shrinkToFit: undefined,
      textRotation: undefined,
      indent: undefined,
      readingOrder: undefined,
    });
  });

  it("should parse all valid horizontal alignment values", () => {
    const values = ["left", "center", "right", "fill", "justify", "centerContinuous", "distributed"];
    for (const value of values) {
      const xml = `<alignment horizontal="${value}"/>`;
      const result = parseAlignment(parseRoot(xml));
      expect(result.horizontal).toBe(value);
    }
  });

  it("should parse all valid vertical alignment values", () => {
    const values = ["top", "center", "bottom", "justify", "distributed"];
    for (const value of values) {
      const xml = `<alignment vertical="${value}"/>`;
      const result = parseAlignment(parseRoot(xml));
      expect(result.vertical).toBe(value);
    }
  });
});

// =============================================================================
// parseProtection Tests
// =============================================================================

describe("parseProtection", () => {
  it("should parse locked as true", () => {
    const xml = `<protection locked="1"/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result.locked).toBe(true);
  });

  it("should parse locked as false", () => {
    const xml = `<protection locked="0"/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result.locked).toBe(false);
  });

  it("should parse hidden as true", () => {
    const xml = `<protection hidden="true"/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result.hidden).toBe(true);
  });

  it("should parse hidden as false", () => {
    const xml = `<protection hidden="false"/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result.hidden).toBe(false);
  });

  it("should parse both locked and hidden", () => {
    const xml = `<protection locked="1" hidden="1"/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result).toEqual({ locked: true, hidden: true });
  });

  it("should handle empty protection element", () => {
    const xml = `<protection/>`;
    const result = parseProtection(parseRoot(xml));
    expect(result).toEqual({ locked: undefined, hidden: undefined });
  });
});

// =============================================================================
// parseCellXf Tests
// =============================================================================

describe("parseCellXf", () => {
  it("should parse minimal xf with defaults", () => {
    const xml = `<xf/>`;
    const result = parseCellXf(parseRoot(xml));
    expect(result.numFmtId).toBe(0);
    expect(result.fontId).toBe(0);
    expect(result.fillId).toBe(0);
    expect(result.borderId).toBe(0);
    expect(result.xfId).toBeUndefined();
    expect(result.alignment).toBeUndefined();
    expect(result.protection).toBeUndefined();
  });

  it("should parse all ID attributes", () => {
    const xml = `<xf numFmtId="164" fontId="1" fillId="2" borderId="3" xfId="0"/>`;
    const result = parseCellXf(parseRoot(xml));
    expect(result.numFmtId).toBe(164);
    expect(result.fontId).toBe(1);
    expect(result.fillId).toBe(2);
    expect(result.borderId).toBe(3);
    expect(result.xfId).toBe(0);
  });

  it("should parse apply flags", () => {
    const xml = `<xf applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1" applyProtection="1"/>`;
    const result = parseCellXf(parseRoot(xml));
    expect(result.applyNumberFormat).toBe(true);
    expect(result.applyFont).toBe(true);
    expect(result.applyFill).toBe(true);
    expect(result.applyBorder).toBe(true);
    expect(result.applyAlignment).toBe(true);
    expect(result.applyProtection).toBe(true);
  });

  it("should parse apply flags as false", () => {
    const xml = `<xf applyNumberFormat="0" applyFont="0"/>`;
    const result = parseCellXf(parseRoot(xml));
    expect(result.applyNumberFormat).toBe(false);
    expect(result.applyFont).toBe(false);
  });

  it("should parse alignment child element", () => {
    const xml = `
      <xf>
        <alignment horizontal="center" vertical="bottom" wrapText="1"/>
      </xf>
    `;
    const result = parseCellXf(parseRoot(xml));
    expect(result.alignment).toEqual({
      horizontal: "center",
      vertical: "bottom",
      wrapText: true,
      shrinkToFit: undefined,
      textRotation: undefined,
      indent: undefined,
      readingOrder: undefined,
    });
  });

  it("should parse protection child element", () => {
    const xml = `
      <xf>
        <protection locked="1" hidden="0"/>
      </xf>
    `;
    const result = parseCellXf(parseRoot(xml));
    expect(result.protection).toEqual({ locked: true, hidden: false });
  });

  it("should parse complete xf with all properties", () => {
    const xml = `
      <xf numFmtId="164" fontId="1" fillId="2" borderId="3" xfId="0"
          applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"
          applyAlignment="1" applyProtection="1">
        <alignment horizontal="left" vertical="center"/>
        <protection locked="1"/>
      </xf>
    `;
    const result = parseCellXf(parseRoot(xml));
    expect(result).toEqual({
      numFmtId: 164,
      fontId: 1,
      fillId: 2,
      borderId: 3,
      xfId: 0,
      applyNumberFormat: true,
      applyFont: true,
      applyFill: true,
      applyBorder: true,
      applyAlignment: true,
      applyProtection: true,
      alignment: {
        horizontal: "left",
        vertical: "center",
        wrapText: undefined,
        shrinkToFit: undefined,
        textRotation: undefined,
        indent: undefined,
        readingOrder: undefined,
      },
      protection: {
        locked: true,
        hidden: undefined,
      },
    });
  });
});

// =============================================================================
// parseCellXfs Tests
// =============================================================================

describe("parseCellXfs", () => {
  it("should return empty array for undefined element", () => {
    const result = parseCellXfs(undefined);
    expect(result).toEqual([]);
  });

  it("should parse empty cellXfs", () => {
    const xml = `<cellXfs count="0"/>`;
    const result = parseCellXfs(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse single xf", () => {
    const xml = `
      <cellXfs count="1">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
      </cellXfs>
    `;
    const result = parseCellXfs(parseRoot(xml));
    expect(result).toHaveLength(1);
    expect(result[0].numFmtId).toBe(0);
  });

  it("should parse multiple xf elements", () => {
    const xml = `
      <cellXfs count="3">
        <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
        <xf numFmtId="164" fontId="1" fillId="2" borderId="0"/>
        <xf numFmtId="0" fontId="2" fillId="0" borderId="1">
          <alignment horizontal="center"/>
        </xf>
      </cellXfs>
    `;
    const result = parseCellXfs(parseRoot(xml));
    expect(result).toHaveLength(3);
    expect(result[0].numFmtId).toBe(0);
    expect(result[1].numFmtId).toBe(164);
    expect(result[1].fontId).toBe(1);
    expect(result[2].alignment?.horizontal).toBe("center");
  });

  it("should preserve order from XML", () => {
    const xml = `
      <cellXfs count="3">
        <xf fontId="10"/>
        <xf fontId="20"/>
        <xf fontId="30"/>
      </cellXfs>
    `;
    const result = parseCellXfs(parseRoot(xml));
    expect(result[0].fontId).toBe(10);
    expect(result[1].fontId).toBe(20);
    expect(result[2].fontId).toBe(30);
  });
});

// =============================================================================
// parseCellStyle Tests
// =============================================================================

describe("parseCellStyle", () => {
  it("should parse cell style with all properties", () => {
    const xml = `<cellStyle name="Normal" xfId="0" builtinId="0"/>`;
    const result = parseCellStyle(parseRoot(xml));
    expect(result).toEqual({
      name: "Normal",
      xfId: 0,
      builtinId: 0,
    });
  });

  it("should use default name when missing", () => {
    const xml = `<cellStyle xfId="0"/>`;
    const result = parseCellStyle(parseRoot(xml));
    expect(result.name).toBe("Normal");
  });

  it("should use default xfId when missing", () => {
    const xml = `<cellStyle name="Test"/>`;
    const result = parseCellStyle(parseRoot(xml));
    expect(result.xfId).toBe(0);
  });

  it("should handle missing builtinId", () => {
    const xml = `<cellStyle name="Custom" xfId="1"/>`;
    const result = parseCellStyle(parseRoot(xml));
    expect(result.builtinId).toBeUndefined();
  });

  it("should parse various style names", () => {
    const styles = [
      { name: "Normal", builtinId: 0 },
      { name: "Heading 1", builtinId: 16 },
      { name: "Heading 2", builtinId: 17 },
      { name: "Title", builtinId: 15 },
      { name: "Percent", builtinId: 5 },
      { name: "Currency", builtinId: 4 },
    ];
    for (const { name, builtinId } of styles) {
      const xml = `<cellStyle name="${name}" xfId="0" builtinId="${builtinId}"/>`;
      const result = parseCellStyle(parseRoot(xml));
      expect(result.name).toBe(name);
      expect(result.builtinId).toBe(builtinId);
    }
  });
});

// =============================================================================
// parseCellStyles Tests
// =============================================================================

describe("parseCellStyles", () => {
  it("should return empty array for undefined element", () => {
    const result = parseCellStyles(undefined);
    expect(result).toEqual([]);
  });

  it("should parse empty cellStyles", () => {
    const xml = `<cellStyles count="0"/>`;
    const result = parseCellStyles(parseRoot(xml));
    expect(result).toEqual([]);
  });

  it("should parse single cellStyle", () => {
    const xml = `
      <cellStyles count="1">
        <cellStyle name="Normal" xfId="0" builtinId="0"/>
      </cellStyles>
    `;
    const result = parseCellStyles(parseRoot(xml));
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Normal");
  });

  it("should parse multiple cellStyle elements", () => {
    const xml = `
      <cellStyles count="3">
        <cellStyle name="Normal" xfId="0" builtinId="0"/>
        <cellStyle name="Heading 1" xfId="1" builtinId="16"/>
        <cellStyle name="Custom" xfId="2"/>
      </cellStyles>
    `;
    const result = parseCellStyles(parseRoot(xml));
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Normal");
    expect(result[1].name).toBe("Heading 1");
    expect(result[2].name).toBe("Custom");
  });
});

// =============================================================================
// parseStyleSheet Tests
// =============================================================================

describe("parseStyleSheet", () => {
  it("should parse minimal stylesheet", () => {
    const xml = `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"/>`;
    const result = parseStyleSheet(parseRoot(xml));
    expect(result).toEqual({
      numberFormats: [],
      fonts: [],
      fills: [],
      borders: [],
      cellStyleXfs: [],
      cellXfs: [],
      cellStyles: [],
    });
  });

  it("should parse complete stylesheet", () => {
    const xml = `
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <numFmts count="1">
          <numFmt numFmtId="164" formatCode="#,##0.00"/>
        </numFmts>
        <fonts count="1">
          <font>
            <sz val="11"/>
            <name val="Calibri"/>
          </font>
        </fonts>
        <fills count="2">
          <fill>
            <patternFill patternType="none"/>
          </fill>
          <fill>
            <patternFill patternType="gray125"/>
          </fill>
        </fills>
        <borders count="1">
          <border>
            <left/>
            <right/>
            <top/>
            <bottom/>
            <diagonal/>
          </border>
        </borders>
        <cellStyleXfs count="1">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
        </cellStyleXfs>
        <cellXfs count="2">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
          <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
        </cellXfs>
        <cellStyles count="1">
          <cellStyle name="Normal" xfId="0" builtinId="0"/>
        </cellStyles>
      </styleSheet>
    `;
    const result = parseStyleSheet(parseRoot(xml));

    expect(result.numberFormats).toHaveLength(1);
    expect(result.numberFormats[0].numFmtId).toBe(164);
    expect(result.numberFormats[0].formatCode).toBe("#,##0.00");

    expect(result.fonts).toHaveLength(1);
    expect(result.fonts[0].name).toBe("Calibri");
    expect(result.fonts[0].size).toBe(11);

    expect(result.fills).toHaveLength(2);
    expect(result.fills[0].type).toBe("none");
    expect(result.fills[1].type).toBe("pattern");

    expect(result.borders).toHaveLength(1);

    expect(result.cellStyleXfs).toHaveLength(1);
    expect(result.cellStyleXfs[0].numFmtId).toBe(0);

    expect(result.cellXfs).toHaveLength(2);
    expect(result.cellXfs[0].numFmtId).toBe(0);
    expect(result.cellXfs[1].numFmtId).toBe(164);
    expect(result.cellXfs[1].applyNumberFormat).toBe(true);

    expect(result.cellStyles).toHaveLength(1);
    expect(result.cellStyles[0].name).toBe("Normal");
  });

  it("should handle partial stylesheet with only fonts", () => {
    const xml = `
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <fonts count="2">
          <font>
            <sz val="11"/>
            <name val="Calibri"/>
          </font>
          <font>
            <sz val="14"/>
            <name val="Arial"/>
            <b/>
          </font>
        </fonts>
      </styleSheet>
    `;
    const result = parseStyleSheet(parseRoot(xml));
    expect(result.fonts).toHaveLength(2);
    expect(result.fills).toEqual([]);
    expect(result.borders).toEqual([]);
    expect(result.numberFormats).toEqual([]);
    expect(result.cellXfs).toEqual([]);
  });

  it("should handle stylesheet with alignment and protection", () => {
    const xml = `
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
        <cellXfs count="1">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" applyAlignment="1" applyProtection="1">
            <alignment horizontal="center" vertical="center" wrapText="1"/>
            <protection locked="1" hidden="0"/>
          </xf>
        </cellXfs>
      </styleSheet>
    `;
    const result = parseStyleSheet(parseRoot(xml));
    expect(result.cellXfs).toHaveLength(1);

    const xf = result.cellXfs[0];
    expect(xf.applyAlignment).toBe(true);
    expect(xf.applyProtection).toBe(true);
    expect(xf.alignment).toEqual({
      horizontal: "center",
      vertical: "center",
      wrapText: true,
      shrinkToFit: undefined,
      textRotation: undefined,
      indent: undefined,
      readingOrder: undefined,
    });
    expect(xf.protection).toEqual({
      locked: true,
      hidden: false,
    });
  });

  it("should handle realistic Excel stylesheet", () => {
    const xml = `
      <styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"
                  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
                  mc:Ignorable="x14ac x16r2 xr">
        <numFmts count="2">
          <numFmt numFmtId="164" formatCode="yyyy-mm-dd"/>
          <numFmt numFmtId="165" formatCode="#,##0.00&quot;円&quot;"/>
        </numFmts>
        <fonts count="3">
          <font>
            <sz val="11"/>
            <color theme="1"/>
            <name val="Calibri"/>
            <family val="2"/>
            <scheme val="minor"/>
          </font>
          <font>
            <sz val="11"/>
            <color theme="1"/>
            <name val="Calibri"/>
            <family val="2"/>
            <scheme val="minor"/>
            <b/>
          </font>
          <font>
            <sz val="14"/>
            <color rgb="FFFF0000"/>
            <name val="Calibri"/>
            <family val="2"/>
            <scheme val="minor"/>
            <b/>
            <i/>
          </font>
        </fonts>
        <fills count="3">
          <fill>
            <patternFill patternType="none"/>
          </fill>
          <fill>
            <patternFill patternType="gray125"/>
          </fill>
          <fill>
            <patternFill patternType="solid">
              <fgColor theme="4" tint="0.79998168889431442"/>
              <bgColor indexed="64"/>
            </patternFill>
          </fill>
        </fills>
        <borders count="2">
          <border>
            <left/>
            <right/>
            <top/>
            <bottom/>
            <diagonal/>
          </border>
          <border>
            <left style="thin">
              <color indexed="64"/>
            </left>
            <right style="thin">
              <color indexed="64"/>
            </right>
            <top style="thin">
              <color indexed="64"/>
            </top>
            <bottom style="thin">
              <color indexed="64"/>
            </bottom>
            <diagonal/>
          </border>
        </borders>
        <cellStyleXfs count="1">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
        </cellStyleXfs>
        <cellXfs count="4">
          <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
          <xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
          <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">
            <alignment horizontal="center"/>
          </xf>
          <xf numFmtId="165" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
        </cellXfs>
        <cellStyles count="1">
          <cellStyle name="Normal" xfId="0" builtinId="0"/>
        </cellStyles>
      </styleSheet>
    `;
    const result = parseStyleSheet(parseRoot(xml));

    // Number formats
    expect(result.numberFormats).toHaveLength(2);
    expect(result.numberFormats[0].formatCode).toBe("yyyy-mm-dd");
    expect(result.numberFormats[1].formatCode).toBe('#,##0.00"円"');

    // Fonts
    expect(result.fonts).toHaveLength(3);
    expect(result.fonts[0].bold).toBeUndefined();
    expect(result.fonts[1].bold).toBe(true);
    expect(result.fonts[2].bold).toBe(true);
    expect(result.fonts[2].italic).toBe(true);
    expect(result.fonts[2].color).toEqual({ type: "rgb", value: "FFFF0000" });

    // Fills
    expect(result.fills).toHaveLength(3);
    expect(result.fills[0].type).toBe("none");
    expect(result.fills[2].type).toBe("pattern");

    // Borders
    expect(result.borders).toHaveLength(2);
    expect(result.borders[0].left).toBeUndefined();
    expect(result.borders[1].left?.style).toBe("thin");

    // Cell XFs
    expect(result.cellXfs).toHaveLength(4);
    expect(result.cellXfs[2].alignment?.horizontal).toBe("center");

    // Cell Styles
    expect(result.cellStyles).toHaveLength(1);
    expect(result.cellStyles[0].name).toBe("Normal");
  });
});
