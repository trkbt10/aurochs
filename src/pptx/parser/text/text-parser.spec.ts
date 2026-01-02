/**
 * @file Text parser unit tests
 *
 * Tests for ECMA-376 Part 1, Section 21.1.2 text element parsing
 */

import { parseXml, isXmlElement } from "../../../xml/index";
import type { XmlElement } from "../../../xml/index";
import {
  parseBodyProperties,
  parseParagraphProperties,
  parseRunProperties,
  parseParagraph,
  parseTextBody,
} from "./text-parser";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Parse XML string and return root element
 */
function xml(str: string): XmlElement {
  const doc = parseXml(str);
  // Find first element child in document
  for (const child of doc.children) {
    if (isXmlElement(child)) {
      return child;
    }
  }
  throw new Error("No root element found");
}

// =============================================================================
// parseBodyProperties Tests
// =============================================================================

describe("parseBodyProperties", () => {
  describe("default values", () => {
    it("returns defaults when bodyPr is undefined", () => {
      const result = parseBodyProperties(undefined);

      expect(result.verticalType).toBe("horz");
      expect(result.wrapping).toBe("square");
      expect(result.anchor).toBe("top");
      expect(result.anchorCenter).toBe(false);
      expect(result.overflow).toBe("overflow");
      expect(result.autoFit.type).toBe("none");
      expect(result.insets.left as number).toBe(0);
    });

    it("returns defaults for empty bodyPr", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');
      const result = parseBodyProperties(bodyPr);

      expect(result.verticalType).toBe("horz");
      expect(result.wrapping).toBe("square");
      expect(result.anchor).toBe("top");
    });
  });

  describe("anchor attribute", () => {
    it('parses anchor="t" as top', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" anchor="t"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.anchor).toBe("top");
    });

    it('parses anchor="ctr" as center', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" anchor="ctr"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.anchor).toBe("center");
    });

    it('parses anchor="b" as bottom', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" anchor="b"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.anchor).toBe("bottom");
    });
  });

  describe("wrapping attribute", () => {
    it('parses wrap="none"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" wrap="none"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.wrapping).toBe("none");
    });

    it('parses wrap="square"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" wrap="square"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.wrapping).toBe("square");
    });
  });

  describe("vertical type attribute", () => {
    it('parses vert="vert"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vert="vert"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalType).toBe("vert");
    });

    it('parses vert="vert270"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vert="vert270"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalType).toBe("vert270");
    });

    it('parses vert="eaVert"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vert="eaVert"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalType).toBe("eaVert");
    });
  });

  describe("insets (ECMA-376 EMU units)", () => {
    it("parses inset attributes in EMU", () => {
      // 914400 EMU = 1 inch = 96 pixels
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          lIns="914400" tIns="457200" rIns="914400" bIns="457200"/>
      `);
      const result = parseBodyProperties(bodyPr);

      // 914400 EMU = 96 px
      expect(result.insets.left as number).toBeCloseTo(96, 1);
      // 457200 EMU = 48 px
      expect(result.insets.top as number).toBeCloseTo(48, 1);
      expect(result.insets.right as number).toBeCloseTo(96, 1);
      expect(result.insets.bottom as number).toBeCloseTo(48, 1);
    });
  });

  describe("auto-fit", () => {
    it("parses a:noAutofit", () => {
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:noAutofit/>
        </a:bodyPr>
      `);
      const result = parseBodyProperties(bodyPr);
      expect(result.autoFit.type).toBe("none");
    });

    it("parses a:spAutoFit (shape auto-fit)", () => {
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:spAutoFit/>
        </a:bodyPr>
      `);
      const result = parseBodyProperties(bodyPr);
      expect(result.autoFit.type).toBe("shape");
    });

    it("parses a:normAutofit with scale attributes", () => {
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:normAutofit fontScale="90000" lnSpcReduction="10000"/>
        </a:bodyPr>
      `);
      const result = parseBodyProperties(bodyPr);
      expect(result.autoFit.type).toBe("normal");
      if (result.autoFit.type === "normal") {
        expect(result.autoFit.fontScale as number).toBeCloseTo(90, 1);
        expect(result.autoFit.lineSpaceReduction as number).toBeCloseTo(10, 1);
      }
    });
  });

  describe("rotation", () => {
    it("parses rot attribute in 60000ths of degree", () => {
      // 5400000 = 90 degrees
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" rot="5400000"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.rotation as number).toBeCloseTo(90, 1);
    });
  });

  describe("columns", () => {
    it("parses numCol attribute", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" numCol="2"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.columns).toBe(2);
    });

    it("parses spcCol attribute in EMU", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" spcCol="457200"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.columnSpacing as number).toBeCloseTo(48, 1);
    });
  });

  describe("vertical overflow (ECMA-376 21.1.2.1.42)", () => {
    it('parses vertOverflow="overflow"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vertOverflow="overflow"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalOverflow).toBe("overflow");
    });

    it('parses vertOverflow="ellipsis"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vertOverflow="ellipsis"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalOverflow).toBe("ellipsis");
    });

    it('parses vertOverflow="clip"', () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" vertOverflow="clip"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.verticalOverflow).toBe("clip");
    });
  });

  describe("additional body properties (ECMA-376 21.1.2.1.2)", () => {
    it("parses rtlCol attribute", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" rtlCol="1"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.rtlColumns).toBe(true);
    });

    it("parses spcFirstLastPara attribute", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" spcFirstLastPara="1"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.spaceFirstLastPara).toBe(true);
    });

    it("parses forceAA attribute", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" forceAA="1"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.forceAntiAlias).toBe(true);
    });

    it("parses fromWordArt attribute", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" fromWordArt="1"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.fromWordArt).toBe(true);
    });
  });

  describe("text warp (ECMA-376 21.1.2.1.28)", () => {
    it("parses a:prstTxWarp with preset", () => {
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:prstTxWarp prst="textWave1"/>
        </a:bodyPr>
      `);
      const result = parseBodyProperties(bodyPr);
      expect(result.textWarp).toBeDefined();
      expect(result.textWarp?.preset).toBe("textWave1");
      expect(result.textWarp?.adjustValues).toHaveLength(0);
    });

    it("parses a:prstTxWarp with adjust values", () => {
      const bodyPr = xml(`
        <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:prstTxWarp prst="textArchUp">
            <a:avLst>
              <a:gd name="adj" fmla="val 10800000"/>
            </a:avLst>
          </a:prstTxWarp>
        </a:bodyPr>
      `);
      const result = parseBodyProperties(bodyPr);
      expect(result.textWarp).toBeDefined();
      expect(result.textWarp?.preset).toBe("textArchUp");
      expect(result.textWarp?.adjustValues).toHaveLength(1);
      expect(result.textWarp?.adjustValues[0].name).toBe("adj");
      expect(result.textWarp?.adjustValues[0].value).toBe(10800000);
    });

    it("returns undefined when no prstTxWarp present", () => {
      const bodyPr = xml('<a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');
      const result = parseBodyProperties(bodyPr);
      expect(result.textWarp).toBeUndefined();
    });

    it("parses common text warp presets", () => {
      const presets = ["textNoShape", "textPlain", "textTriangle", "textCurveUp", "textInflate"];
      for (const preset of presets) {
        const bodyPr = xml(`
          <a:bodyPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
            <a:prstTxWarp prst="${preset}"/>
          </a:bodyPr>
        `);
        const result = parseBodyProperties(bodyPr);
        expect(result.textWarp?.preset).toBe(preset);
      }
    });
  });
});

// =============================================================================
// parseParagraphProperties Tests
// =============================================================================

describe("parseParagraphProperties", () => {
  describe("default values", () => {
    it("returns defaults when pPr is undefined", () => {
      const result = parseParagraphProperties(undefined);

      expect(result.level).toBe(0);
      expect(result.alignment).toBe("left");
    });
  });

  describe("level attribute", () => {
    it("parses lvl attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" lvl="2"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.level).toBe(2);
    });

    it("defaults to 0 when lvl not specified", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.level).toBe(0);
    });
  });

  describe("alignment attribute", () => {
    // ECMA-376 Part 1, Section 21.1.2.1.25 (ST_TextAlignType)
    // Parser maps OOXML values to domain values
    const testCases: Array<[string, string]> = [
      ["l", "left"],
      ["ctr", "center"],
      ["r", "right"],
      ["just", "justify"],
      ["justLow", "justifyLow"],
      ["dist", "distributed"],
      ["thaiDist", "thaiDistributed"],
    ];

    for (const [input, expected] of testCases) {
      it(`maps algn="${input}" to "${expected}"`, () => {
        const pPr = xml(`<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" algn="${input}"/>`);
        const result = parseParagraphProperties(pPr);
        expect(result.alignment).toBe(expected);
      });
    }
  });

  describe("default run properties", () => {
    it("parses a:defRPr within pPr", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:defRPr sz="2000" b="1"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.defaultRunProperties?.fontSize as number).toBeCloseTo(20, 1);
      expect(result.defaultRunProperties?.bold).toBe(true);
    });
  });

  describe("margins and indent (EMU units)", () => {
    it("parses marL attribute", () => {
      // 914400 EMU = 96 px
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" marL="914400"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.marginLeft as number).toBeCloseTo(96, 1);
    });

    it("parses marR attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" marR="914400"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.marginRight as number).toBeCloseTo(96, 1);
    });

    it("parses indent attribute (can be negative)", () => {
      // -457200 EMU = -48 px (hanging indent)
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" indent="-457200"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.indent as number).toBeCloseTo(-48, 1);
    });
  });

  describe("line spacing", () => {
    it("parses a:spcPct (percentage-based)", () => {
      // 150000 = 150%
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lnSpc>
            <a:spcPct val="150000"/>
          </a:lnSpc>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.lineSpacing?.type).toBe("percent");
      if (result.lineSpacing?.type === "percent") {
        expect(result.lineSpacing.value as number).toBeCloseTo(150, 1);
      }
    });

    it("parses a:spcPts (point-based)", () => {
      // 1800 = 18 points (stored in 100ths of point)
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:lnSpc>
            <a:spcPts val="1800"/>
          </a:lnSpc>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.lineSpacing?.type).toBe("points");
      if (result.lineSpacing?.type === "points") {
        expect(result.lineSpacing.value as number).toBeCloseTo(18, 1);
      }
    });
  });

  describe("space before/after", () => {
    it("parses a:spcBef with points", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:spcBef>
            <a:spcPts val="1200"/>
          </a:spcBef>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.spaceBefore?.type).toBe("points");
      if (result.spaceBefore?.type === "points") {
        expect(result.spaceBefore.value as number).toBeCloseTo(12, 1);
      }
    });

    it("parses a:spcAft with percentage", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:spcAft>
            <a:spcPct val="50000"/>
          </a:spcAft>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.spaceAfter?.type).toBe("percent");
      if (result.spaceAfter?.type === "percent") {
        expect(result.spaceAfter.value as number).toBeCloseTo(50, 1);
      }
    });
  });

  describe("bullet style", () => {
    it("parses a:buNone", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buNone/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.bullet.type).toBe("none");
    });

    it("parses a:buChar with character", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.bullet.type).toBe("char");
      if (result.bulletStyle?.bullet.type === "char") {
        expect(result.bulletStyle.bullet.char).toBe("•");
      }
    });

    it("parses a:buAutoNum with scheme", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buAutoNum type="arabicPeriod" startAt="1"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.bullet.type).toBe("auto");
      if (result.bulletStyle?.bullet.type === "auto") {
        expect(result.bulletStyle.bullet.scheme).toBe("arabicPeriod");
        expect(result.bulletStyle.bullet.startAt).toBe(1);
      }
    });

    it("parses bullet color with a:buClr", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buClr>
            <a:srgbClr val="FF0000"/>
          </a:buClr>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.color?.spec.type).toBe("srgb");
    });

    it("parses a:buClrTx (color follow text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buClrTx/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.colorFollowText).toBe(true);
    });

    it("parses bullet size with a:buSzPct", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buSzPct val="75000"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.sizePercent as number).toBeCloseTo(75, 1);
    });

    it("parses bullet size with a:buSzPts", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buSzPts val="2400"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.sizePoints as number).toBeCloseTo(24, 1);
    });

    it("parses a:buSzTx (size follow text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buSzTx/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.sizeFollowText).toBe(true);
    });

    it("parses bullet font with a:buFont", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buFont typeface="Wingdings"/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.font).toBe("Wingdings");
    });

    it("parses a:buFontTx (font follow text)", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:buChar char="•"/>
          <a:buFontTx/>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.fontFollowText).toBe(true);
    });

    it("parses a:buBlip with embedded resource", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <a:buBlip>
            <a:blip r:embed="rId7"/>
          </a:buBlip>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);
      expect(result.bulletStyle?.bullet.type).toBe("blip");
      if (result.bulletStyle?.bullet.type === "blip") {
        expect(result.bulletStyle.bullet.resourceId).toBe("rId7");
      }
    });
  });

  describe("tab stops", () => {
    it("parses a:tabLst with multiple tabs", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:tabLst>
            <a:tab pos="914400" algn="l"/>
            <a:tab pos="1828800" algn="ctr"/>
            <a:tab pos="2743200" algn="r"/>
          </a:tabLst>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);

      expect(result.tabStops).toHaveLength(3);
      expect(result.tabStops?.[0].position as number).toBeCloseTo(96, 1);
      // ECMA-376 Part 1, Section 21.1.2.1.37 (ST_TextTabAlignType)
      // Parser maps OOXML values to domain values
      expect(result.tabStops?.[0].alignment).toBe("left");
      expect(result.tabStops?.[1].alignment).toBe("center");
      expect(result.tabStops?.[2].alignment).toBe("right");
    });

    it("parses decimal tab alignment", () => {
      const pPr = xml(`
        <a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:tabLst>
            <a:tab pos="914400" algn="dec"/>
          </a:tabLst>
        </a:pPr>
      `);
      const result = parseParagraphProperties(pPr);

      expect(result.tabStops?.[0].alignment).toBe("decimal");
    });
  });

  describe("RTL attribute", () => {
    it("parses rtl attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" rtl="1"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.rtl).toBe(true);
    });
  });

  describe("font alignment attribute", () => {
    // ECMA-376 Part 1, Section 21.1.2.1.12 (ST_TextFontAlignType)
    // Parser maps OOXML values to domain values
    const testCases: Array<[string, string]> = [
      ["auto", "auto"],
      ["base", "base"],
      ["t", "top"],
      ["ctr", "center"],
      ["b", "bottom"],
    ];

    for (const [input, expected] of testCases) {
      it(`maps fontAlgn="${input}" to "${expected}"`, () => {
        const pPr = xml(`<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" fontAlgn="${input}"/>`);
        const result = parseParagraphProperties(pPr);
        expect(result.fontAlignment).toBe(expected);
      });
    }

    it("returns undefined for unknown values", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" fontAlgn="invalid"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.fontAlignment).toBeUndefined();
    });
  });

  describe("line break attributes (ECMA-376 21.1.2.2.7)", () => {
    it("parses eaLnBrk attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" eaLnBrk="1"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.eaLineBreak).toBe(true);
    });

    it("parses latinLnBrk attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" latinLnBrk="1"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.latinLineBreak).toBe(true);
    });

    it("parses hangingPunct attribute", () => {
      const pPr = xml('<a:pPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" hangingPunct="1"/>');
      const result = parseParagraphProperties(pPr);
      expect(result.hangingPunctuation).toBe(true);
    });
  });
});

// =============================================================================
// parseRunProperties Tests
// =============================================================================

describe("parseRunProperties", () => {
  it("returns undefined for undefined input", () => {
    const result = parseRunProperties(undefined);
    expect(result).toBeUndefined();
  });

  describe("font size (centipoints)", () => {
    it("parses sz attribute", () => {
      // 1800 centipoints = 18 points
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" sz="1800"/>');
      const result = parseRunProperties(rPr);
      expect(result?.fontSize as number).toBeCloseTo(18, 1);
    });

    it("parses large font sizes", () => {
      // 4400 centipoints = 44 points
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" sz="4400"/>');
      const result = parseRunProperties(rPr);
      expect(result?.fontSize as number).toBeCloseTo(44, 1);
    });
  });

  describe("font family", () => {
    it("parses a:latin typeface", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:latin typeface="Arial" pitchFamily="34"/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fontFamily).toBe("Arial");
      expect(result?.fontFamilyPitchFamily).toBe(34);
    });

    it("parses a:ea typeface (East Asian)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ea typeface="MS Gothic"/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fontFamilyEastAsian).toBe("MS Gothic");
    });

    it("parses a:cs typeface (Complex Script)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:cs typeface="Arial"/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fontFamilyComplexScript).toBe("Arial");
    });

    it("parses a:sym typeface (Symbol)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:sym typeface="Wingdings"/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fontFamilySymbol).toBe("Wingdings");
    });
  });

  describe("bold and italic", () => {
    it("parses b attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="1"/>');
      const result = parseRunProperties(rPr);
      expect(result?.bold).toBe(true);
    });

    it("parses i attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" i="1"/>');
      const result = parseRunProperties(rPr);
      expect(result?.italic).toBe(true);
    });

    it("handles b=0 as false", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="0"/>');
      const result = parseRunProperties(rPr);
      expect(result?.bold).toBe(false);
    });

    it("handles on/off/def values", () => {
      expect(parseRunProperties(xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="on"/>'))?.bold).toBe(true);
      expect(parseRunProperties(xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="off"/>'))?.bold).toBe(false);
      expect(parseRunProperties(xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="def"/>'))?.bold).toBeUndefined();
    });
  });

  describe("underline", () => {
    const underlineTypes = ["sng", "dbl", "heavy", "dotted", "dash", "wavy"];

    for (const type of underlineTypes) {
      it(`parses u="${type}"`, () => {
        const rPr = xml(`<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" u="${type}"/>`);
        const result = parseRunProperties(rPr);
        expect(result?.underline).toBe(type);
      });
    }

    it("parses underline line and fill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:uLn>
            <a:srgbClr val="00FF00"/>
          </a:uLn>
          <a:uFill>
            <a:solidFill>
              <a:srgbClr val="FF0000"/>
            </a:solidFill>
          </a:uFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.underlineColor?.spec.type).toBe("srgb");
      if (result?.underlineFill?.type === "solidFill") {
        expect(result.underlineFill.color.spec.type).toBe("srgb");
      } else {
        throw new Error("Expected solidFill underline fill");
      }
    });

    it("parses uFillTx (underline fill follows text)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="112233"/>
          </a:solidFill>
          <a:uFillTx/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.underlineFillFollowText).toBe(true);
      if (result?.underlineFill?.type === "solidFill") {
        expect(result.underlineFill.color.spec.type).toBe("srgb");
      } else {
        throw new Error("Expected solidFill underline fill");
      }
    });

    it("parses uLnTx (underline line follows text outline)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ln w="12700">
            <a:solidFill>
              <a:srgbClr val="00FF00"/>
            </a:solidFill>
          </a:ln>
          <a:uLnTx/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.underlineLineFollowText).toBe(true);
      if (result?.underlineLine?.fill.type === "solidFill") {
        expect(result.underlineLine.fill.color.spec.type).toBe("srgb");
      } else {
        throw new Error("Expected solidFill underline line fill");
      }
    });
  });

  describe("strike-through", () => {
    it("parses strike=sngStrike", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" strike="sngStrike"/>');
      const result = parseRunProperties(rPr);
      expect(result?.strike).toBe("sngStrike");
    });

    it("parses strike=dblStrike", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" strike="dblStrike"/>');
      const result = parseRunProperties(rPr);
      expect(result?.strike).toBe("dblStrike");
    });
  });

  describe("caps", () => {
    it("parses cap=all", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" cap="all"/>');
      const result = parseRunProperties(rPr);
      expect(result?.caps).toBe("all");
    });

    it("parses cap=small", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" cap="small"/>');
      const result = parseRunProperties(rPr);
      expect(result?.caps).toBe("small");
    });
  });

  describe("baseline (super/subscript)", () => {
    it("parses positive baseline (superscript)", () => {
      // 30000 = 30%
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" baseline="30000"/>');
      const result = parseRunProperties(rPr);
      expect(result?.baseline).toBe(30000);
    });

    it("parses negative baseline (subscript)", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" baseline="-25000"/>');
      const result = parseRunProperties(rPr);
      expect(result?.baseline).toBe(-25000);
    });
  });

  describe("letter spacing", () => {
    it("parses spc attribute in hundredths of a point", () => {
      // Per ECMA-376 Part 1, Section 21.1.2.3.9:
      // spc is in hundredths of a point
      // 100 = 1 point = 96/72 px ≈ 1.333 px
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" spc="100"/>');
      const result = parseRunProperties(rPr);
      expect(result?.spacing as number).toBeCloseTo(96 / 72, 2); // 1 pt = 1.333 px
    });

    it("parses negative spc for condensed text", () => {
      // -50 = -0.5 point
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" spc="-50"/>');
      const result = parseRunProperties(rPr);
      expect(result?.spacing as number).toBeCloseTo(-0.5 * (96 / 72), 2);
    });

    it("parses large spc values for expanded text", () => {
      // 1000 = 10 points = 10 * 96/72 px ≈ 13.33 px
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" spc="1000"/>');
      const result = parseRunProperties(rPr);
      expect(result?.spacing as number).toBeCloseTo(10 * (96 / 72), 2);
    });
  });

  describe("kerning", () => {
    it("parses kern attribute (minimum font size for kerning)", () => {
      // 1200 = 12 points
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" kern="1200"/>');
      const result = parseRunProperties(rPr);
      expect(result?.kerning as number).toBeCloseTo(12, 1);
    });
  });

  describe("color", () => {
    it("parses a:solidFill with srgbClr", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="FF5500"/>
          </a:solidFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.color?.spec.type).toBe("srgb");
      if (result?.color?.spec.type === "srgb") {
        expect(result.color.spec.value).toBe("FF5500");
      }
    });

    it("parses a:solidFill with schemeClr", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:schemeClr val="accent1"/>
          </a:solidFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.color?.spec.type).toBe("scheme");
      if (result?.color?.spec.type === "scheme") {
        expect(result.color.spec.value).toBe("accent1");
      }
    });
  });

  describe("highlight color", () => {
    it("parses a:highlight", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:highlight>
            <a:srgbClr val="FFFF00"/>
          </a:highlight>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.highlightColor?.spec.type).toBe("srgb");
    });
  });

  describe("hyperlink", () => {
    it("parses a:hlinkClick", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <a:hlinkClick r:id="rId1" tooltip="Click here">
            <a:snd r:embed="rId10" name="click.wav"/>
          </a:hlinkClick>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.hyperlink?.id).toBe("rId1");
      expect(result?.hyperlink?.tooltip).toBe("Click here");
      expect(result?.hyperlink?.sound?.embed).toBe("rId10");
      expect(result?.hyperlink?.sound?.name).toBe("click.wav");
    });
  });

  describe("language", () => {
    it("parses lang attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" lang="en-US"/>');
      const result = parseRunProperties(rPr);
      expect(result?.language).toBe("en-US");
    });

    it("parses altLang attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" altLang="ja-JP"/>');
      const result = parseRunProperties(rPr);
      expect(result?.altLanguage).toBe("ja-JP");
    });
  });

  describe("mouse over hyperlink (ECMA-376 21.1.2.3.6)", () => {
    it("parses a:hlinkMouseOver", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
               xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
          <a:hlinkMouseOver r:id="rId2" tooltip="Hover text">
            <a:snd r:embed="rId11" name="hover.wav"/>
          </a:hlinkMouseOver>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.hyperlinkMouseOver?.id).toBe("rId2");
      expect(result?.hyperlinkMouseOver?.tooltip).toBe("Hover text");
      expect(result?.hyperlinkMouseOver?.sound?.embed).toBe("rId11");
      expect(result?.hyperlinkMouseOver?.sound?.name).toBe("hover.wav");
    });
  });

  describe("additional run properties (ECMA-376 21.1.2.3.9)", () => {
    it("parses err attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" err="1"/>');
      const result = parseRunProperties(rPr);
      expect(result?.error).toBe(true);
    });

    it("parses kumimoji attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" kumimoji="1"/>');
      const result = parseRunProperties(rPr);
      expect(result?.kumimoji).toBe(true);
    });

    it("parses normalizeH attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" normalizeH="1"/>');
      const result = parseRunProperties(rPr);
      expect(result?.normalizeHeights).toBe(true);
    });

    it("parses smtId attribute", () => {
      const rPr = xml('<a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" smtId="123"/>');
      const result = parseRunProperties(rPr);
      expect(result?.smartTagId).toBe(123);
    });
  });

  describe("run-level RTL (ECMA-376 21.1.2.3.12)", () => {
    it("parses a:rtl child element", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:rtl/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.rtl).toBe(true);
    });
  });

  describe("text fill (ECMA-376 20.1.8)", () => {
    it("parses a:solidFill as fill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:solidFill>
            <a:srgbClr val="FF0000"/>
          </a:solidFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fill?.type).toBe("solidFill");
    });

    it("parses a:gradFill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:gradFill>
            <a:gsLst>
              <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
              <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
            </a:gsLst>
            <a:lin ang="5400000"/>
          </a:gradFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fill?.type).toBe("gradientFill");
    });

    it("parses a:noFill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:noFill/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fill?.type).toBe("noFill");
    });

    it("parses a:pattFill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:pattFill prst="pct10">
            <a:fgClr><a:srgbClr val="000000"/></a:fgClr>
            <a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr>
          </a:pattFill>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fill?.type).toBe("patternFill");
    });

    it("parses a:grpFill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:grpFill/>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.fill?.type).toBe("groupFill");
    });
  });

  describe("text outline (ECMA-376 20.1.2.2.24)", () => {
    it("parses a:ln with solid fill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ln w="12700">
            <a:solidFill>
              <a:srgbClr val="000000"/>
            </a:solidFill>
          </a:ln>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.textOutline).toBeDefined();
      expect(result?.textOutline?.width).toBeCloseTo(1.333, 2); // 12700 EMU = ~1.33 px
      expect(result?.textOutline?.fill?.type).toBe("solidFill");
    });

    it("parses a:ln with gradient fill", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ln w="25400">
            <a:gradFill>
              <a:gsLst>
                <a:gs pos="0"><a:srgbClr val="FF0000"/></a:gs>
                <a:gs pos="100000"><a:srgbClr val="0000FF"/></a:gs>
              </a:gsLst>
              <a:lin ang="5400000"/>
            </a:gradFill>
          </a:ln>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.textOutline).toBeDefined();
      expect(result?.textOutline?.width).toBeCloseTo(2.667, 2); // 25400 EMU = ~2.67 px
      expect(result?.textOutline?.fill?.type).toBe("gradientFill");
    });

    it("parses a:ln with noFill (transparent outline)", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ln w="12700">
            <a:noFill/>
          </a:ln>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.textOutline).toBeDefined();
      expect(result?.textOutline?.fill?.type).toBe("noFill");
    });

    it("parses a:ln with line cap and join", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:ln w="12700" cap="rnd">
            <a:solidFill>
              <a:srgbClr val="000000"/>
            </a:solidFill>
            <a:round/>
          </a:ln>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.textOutline).toBeDefined();
      expect(result?.textOutline?.cap).toBe("round");
      expect(result?.textOutline?.join).toBe("round");
    });

    it("returns undefined when a:ln is not present", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="1"/>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.textOutline).toBeUndefined();
    });
  });

  describe("text effects (ECMA-376 20.1.8.25)", () => {
    it("parses a:effectLst with outer shadow", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:effectLst>
            <a:outerShdw blurRad="50800" dist="38100" dir="2700000">
              <a:srgbClr val="000000"/>
            </a:outerShdw>
          </a:effectLst>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.effects).toBeDefined();
      expect(result?.effects?.shadow?.type).toBe("outer");
    });

    it("parses a:effectLst with glow", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:effectLst>
            <a:glow rad="63500">
              <a:srgbClr val="FF0000"/>
            </a:glow>
          </a:effectLst>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.effects).toBeDefined();
      expect(result?.effects?.glow).toBeDefined();
    });

    it("parses a:effectLst with reflection", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:effectLst>
            <a:reflection blurRad="6350" stA="50000" endA="0" dist="50800"/>
          </a:effectLst>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.effects).toBeDefined();
      expect(result?.effects?.reflection).toBeDefined();
    });

    it("parses a:effectLst with soft edge", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
          <a:effectLst>
            <a:softEdge rad="12700"/>
          </a:effectLst>
        </a:rPr>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.effects).toBeDefined();
      expect(result?.effects?.softEdge).toBeDefined();
    });

    it("returns undefined when no effects present", () => {
      const rPr = xml(`
        <a:rPr xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" b="1"/>
      `);
      const result = parseRunProperties(rPr);
      expect(result?.effects).toBeUndefined();
    });
  });
});

// =============================================================================
// parseParagraph Tests
// =============================================================================

describe("parseParagraph", () => {
  it("parses empty paragraph", () => {
    const p = xml('<a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"/>');
    const result = parseParagraph(p);

    expect(result.runs).toHaveLength(0);
    expect(result.properties.level).toBe(0);
  });

  it("parses paragraph with single text run", () => {
    const p = xml(`
      <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:r>
          <a:t>Hello World</a:t>
        </a:r>
      </a:p>
    `);
    const result = parseParagraph(p);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].type).toBe("text");
    if (result.runs[0].type === "text") {
      expect(result.runs[0].text).toBe("Hello World");
    }
  });

  it("parses paragraph with multiple text runs", () => {
    const p = xml(`
      <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:r>
          <a:t>Hello </a:t>
        </a:r>
        <a:r>
          <a:rPr b="1"/>
          <a:t>World</a:t>
        </a:r>
      </a:p>
    `);
    const result = parseParagraph(p);

    expect(result.runs).toHaveLength(2);
    expect(result.runs[1].properties?.bold).toBe(true);
  });

  it("parses paragraph with line break", () => {
    const p = xml(`
      <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:r>
          <a:t>Line 1</a:t>
        </a:r>
        <a:br/>
        <a:r>
          <a:t>Line 2</a:t>
        </a:r>
      </a:p>
    `);
    const result = parseParagraph(p);

    expect(result.runs).toHaveLength(3);
    expect(result.runs[1].type).toBe("break");
  });

  it("parses paragraph with field", () => {
    const p = xml(`
      <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:fld type="slidenum" id="{12345}">
          <a:t>1</a:t>
        </a:fld>
      </a:p>
    `);
    const result = parseParagraph(p);

    expect(result.runs).toHaveLength(1);
    expect(result.runs[0].type).toBe("field");
    if (result.runs[0].type === "field") {
      expect(result.runs[0].fieldType).toBe("slidenum");
      expect(result.runs[0].id).toBe("{12345}");
      expect(result.runs[0].text).toBe("1");
    }
  });

  it("parses endParaRPr", () => {
    const p = xml(`
      <a:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:endParaRPr sz="2400" b="1"/>
      </a:p>
    `);
    const result = parseParagraph(p);

    expect(result.endProperties?.fontSize as number).toBeCloseTo(24, 1);
    expect(result.endProperties?.bold).toBe(true);
  });
});

// =============================================================================
// parseTextBody Tests
// =============================================================================

describe("parseTextBody", () => {
  it("returns undefined for undefined input", () => {
    const result = parseTextBody(undefined);
    expect(result).toBeUndefined();
  });

  it("parses empty text body", () => {
    const txBody = xml(`
      <p:txBody xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:bodyPr/>
      </p:txBody>
    `);
    const result = parseTextBody(txBody);

    expect(result).toBeDefined();
    expect(result?.paragraphs).toHaveLength(1); // Empty paragraph added
  });

  it("parses text body with bodyPr and paragraphs", () => {
    const txBody = xml(`
      <p:txBody xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:bodyPr anchor="ctr" wrap="none"/>
        <a:p>
          <a:r>
            <a:t>First paragraph</a:t>
          </a:r>
        </a:p>
        <a:p>
          <a:r>
            <a:t>Second paragraph</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    `);
    const result = parseTextBody(txBody);

    expect(result?.bodyProperties.anchor).toBe("center");
    expect(result?.bodyProperties.wrapping).toBe("none");
    expect(result?.paragraphs).toHaveLength(2);
  });

  it("parses text body with lstStyle", () => {
    const txBody = xml(`
      <p:txBody xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
        <a:bodyPr/>
        <a:lstStyle>
          <a:lvl1pPr algn="ctr">
            <a:defRPr sz="2400"/>
          </a:lvl1pPr>
        </a:lstStyle>
        <a:p>
          <a:r>
            <a:t>Styled text</a:t>
          </a:r>
        </a:p>
      </p:txBody>
    `);
    const result = parseTextBody(txBody);

    // lstStyle should be applied through parseTextParagraph
    expect(result?.paragraphs).toHaveLength(1);
  });
});
