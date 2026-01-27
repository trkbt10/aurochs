/**
 * @file Tests for PDF operator parser
 */

import { createOperatorParser, type ParsedPath, type ParsedText, type ParsedImage } from "./operator-parser";
import { tokenizeContentStream } from "../../domain/content-stream";
import type { FontMappings, FontInfo, FontMetrics } from "../../domain/font";

describe("OperatorParser", () => {
  function parse(content: string, fontMappings?: FontMappings) {
    const tokens = tokenizeContentStream(content);
    const parser = createOperatorParser(fontMappings);
    return parser.parse(tokens);
  }

  describe("path parsing", () => {
    it("parses moveTo and lineTo", () => {
      const elements = parse("100 200 m 300 400 l S");
      expect(elements).toHaveLength(1);

      const path = elements[0] as ParsedPath;
      expect(path.type).toBe("path");
      expect(path.operations).toHaveLength(2);
      expect(path.operations[0]).toEqual({ type: "moveTo", point: { x: 100, y: 200 } });
      expect(path.operations[1]).toEqual({ type: "lineTo", point: { x: 300, y: 400 } });
      expect(path.paintOp).toBe("stroke");
    });

    it("parses curveTo", () => {
      const elements = parse("0 0 m 10 20 30 40 50 60 c S");
      const path = elements[0] as ParsedPath;

      expect(path.operations[1]).toEqual({
        type: "curveTo",
        cp1: { x: 10, y: 20 },
        cp2: { x: 30, y: 40 },
        end: { x: 50, y: 60 },
      });
    });

    it("parses curveToV", () => {
      const elements = parse("0 0 m 30 40 50 60 v S");
      const path = elements[0] as ParsedPath;

      expect(path.operations[1]).toEqual({
        type: "curveToV",
        cp2: { x: 30, y: 40 },
        end: { x: 50, y: 60 },
      });
    });

    it("parses curveToY", () => {
      const elements = parse("0 0 m 10 20 50 60 y S");
      const path = elements[0] as ParsedPath;

      expect(path.operations[1]).toEqual({
        type: "curveToY",
        cp1: { x: 10, y: 20 },
        end: { x: 50, y: 60 },
      });
    });

    it("parses closePath", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l h S");
      const path = elements[0] as ParsedPath;

      expect(path.operations).toHaveLength(4);
      expect(path.operations[3]).toEqual({ type: "closePath" });
    });

    it("parses rectangle", () => {
      const elements = parse("10 20 100 50 re S");
      const path = elements[0] as ParsedPath;

      expect(path.operations[0]).toEqual({
        type: "rect",
        x: 10,
        y: 20,
        width: 100,
        height: 50,
      });
    });
  });

  describe("paint operations", () => {
    it("parses stroke (S)", () => {
      const elements = parse("0 0 m 100 100 l S");
      expect((elements[0] as ParsedPath).paintOp).toBe("stroke");
    });

    it("parses close and stroke (s)", () => {
      const elements = parse("0 0 m 100 100 l s");
      const path = elements[0] as ParsedPath;
      expect(path.paintOp).toBe("stroke");
      // Last op should be closePath
      expect(path.operations[path.operations.length - 1].type).toBe("closePath");
    });

    it("parses fill (f)", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l f");
      expect((elements[0] as ParsedPath).paintOp).toBe("fill");
    });

    it("parses fill (F)", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l F");
      expect((elements[0] as ParsedPath).paintOp).toBe("fill");
    });

    it("parses fill-stroke (B)", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l B");
      expect((elements[0] as ParsedPath).paintOp).toBe("fillStroke");
    });

    it("parses no-op (n)", () => {
      const elements = parse("0 0 m 100 100 l n");
      expect((elements[0] as ParsedPath).paintOp).toBe("none");
    });

    it("parses clip (W)", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l W 0 0 10 10 re f");
      expect(elements).toHaveLength(1);
      const path = elements[0] as ParsedPath;
      expect(path.paintOp).toBe("fill");
      expect(path.graphicsState.clipBBox).toEqual([0, 0, 100, 100]);
    });
  });

  describe("graphics state", () => {
    it("handles q/Q save/restore", () => {
      const elements = parse("q 2 w 0 0 m 100 100 l S Q 0 0 m 200 200 l S");
      expect(elements).toHaveLength(2);

      const path1 = elements[0] as ParsedPath;
      const path2 = elements[1] as ParsedPath;

      expect(path1.graphicsState.lineWidth).toBe(2);
      expect(path2.graphicsState.lineWidth).toBe(1); // restored to default
    });

    it("sets line width", () => {
      const elements = parse("3 w 0 0 m 100 100 l S");
      expect((elements[0] as ParsedPath).graphicsState.lineWidth).toBe(3);
    });

    it("sets line cap", () => {
      const elements = parse("1 J 0 0 m 100 100 l S");
      expect((elements[0] as ParsedPath).graphicsState.lineCap).toBe(1);
    });

    it("sets line join", () => {
      const elements = parse("2 j 0 0 m 100 100 l S");
      expect((elements[0] as ParsedPath).graphicsState.lineJoin).toBe(2);
    });

    it("sets miter limit", () => {
      const elements = parse("20 M 0 0 m 100 100 l S");
      expect((elements[0] as ParsedPath).graphicsState.miterLimit).toBe(20);
    });

    it("sets dash pattern", () => {
      const elements = parse("[3 2] 0 d 0 0 m 100 100 l S");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.dashArray).toEqual([3, 2]);
      expect(path.graphicsState.dashPhase).toBe(0);
    });
  });

  describe("color", () => {
    it("sets fill gray", () => {
      const elements = parse("0.5 g 0 0 100 100 re f");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.fillColor.colorSpace).toBe("DeviceGray");
      expect(path.graphicsState.fillColor.components).toEqual([0.5]);
    });

    it("sets stroke gray", () => {
      const elements = parse("0.8 G 0 0 m 100 100 l S");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.strokeColor.colorSpace).toBe("DeviceGray");
      expect(path.graphicsState.strokeColor.components).toEqual([0.8]);
    });

    it("sets fill RGB", () => {
      const elements = parse("1 0 0 rg 0 0 100 100 re f");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.fillColor.colorSpace).toBe("DeviceRGB");
      expect(path.graphicsState.fillColor.components).toEqual([1, 0, 0]);
    });

    it("sets stroke RGB", () => {
      const elements = parse("0 0 1 RG 0 0 m 100 100 l S");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.strokeColor.colorSpace).toBe("DeviceRGB");
      expect(path.graphicsState.strokeColor.components).toEqual([0, 0, 1]);
    });

    it("sets fill CMYK", () => {
      const elements = parse("1 0 0 0 k 0 0 100 100 re f");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.fillColor.colorSpace).toBe("DeviceCMYK");
      expect(path.graphicsState.fillColor.components).toEqual([1, 0, 0, 0]);
    });

    it("sets stroke CMYK", () => {
      const elements = parse("0 1 0 0 K 0 0 m 100 100 l S");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.strokeColor.colorSpace).toBe("DeviceCMYK");
      expect(path.graphicsState.strokeColor.components).toEqual([0, 1, 0, 0]);
    });
  });

  describe("transformation matrix", () => {
    it("applies cm transform", () => {
      const elements = parse("2 0 0 2 10 20 cm 0 0 m 100 100 l S");
      const path = elements[0] as ParsedPath;
      expect(path.graphicsState.ctm[0]).toBe(2);
      expect(path.graphicsState.ctm[3]).toBe(2);
      expect(path.graphicsState.ctm[4]).toBe(10);
      expect(path.graphicsState.ctm[5]).toBe(20);
    });

    it("concatenates multiple transforms", () => {
      const elements = parse("1 0 0 1 100 0 cm 2 0 0 2 0 0 cm 0 0 m 50 50 l S");
      const path = elements[0] as ParsedPath;
      // Pre-multiplication: translate then scale
      expect(path.graphicsState.ctm[0]).toBe(2);
      expect(path.graphicsState.ctm[3]).toBe(2);
      expect(path.graphicsState.ctm[4]).toBe(100);
    });
  });

  describe("text parsing", () => {
    it("parses simple text", () => {
      const elements = parse("BT /F1 12 Tf (Hello) Tj ET");
      expect(elements).toHaveLength(1);

      const text = elements[0] as ParsedText;
      expect(text.type).toBe("text");
      expect(text.runs).toHaveLength(1);
      expect(text.runs[0].text).toBe("Hello");
      expect(text.runs[0].fontSize).toBe(12);
    });

    it("parses text with positioning", () => {
      const elements = parse("BT 100 700 Td (Text) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBe(100);
      expect(text.runs[0].y).toBe(700);
    });

    it("parses text matrix", () => {
      const elements = parse("BT 1 0 0 1 50 100 Tm (Text) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBe(50);
      expect(text.runs[0].y).toBe(100);
    });

    it("parses TJ array", () => {
      const elements = parse("BT /F1 10 Tf [(A) 50 (B)] TJ ET");
      const text = elements[0] as ParsedText;
      expect(text.runs).toHaveLength(2);
      expect(text.runs[0].text).toBe("A");
      expect(text.runs[1].text).toBe("B");
    });

    it("skips empty text object", () => {
      const elements = parse("BT ET");
      expect(elements).toHaveLength(0);
    });

    it("parses Tc (character spacing)", () => {
      const elements = parse("2.5 Tc BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.charSpacing).toBe(2.5);
    });

    it("parses Tw (word spacing)", () => {
      const elements = parse("3.0 Tw BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.wordSpacing).toBe(3.0);
    });

    it("parses Tz (horizontal scaling)", () => {
      const elements = parse("150 Tz BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.horizontalScaling).toBe(150);
    });

    it("parses TL (text leading)", () => {
      const elements = parse("14 TL BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.textLeading).toBe(14);
    });

    it("parses Tr (text rendering mode)", () => {
      const elements = parse("3 Tr BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.textRenderingMode).toBe(3);
    });

    it("parses Ts (text rise)", () => {
      const elements = parse("-5 Ts BT (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.graphicsState.textRise).toBe(-5);
    });

    it("TD sets text leading to -ty", () => {
      const elements = parse("BT 0 -12 TD (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      // TD with ty=-12 should set leading to 12
      expect(text.graphicsState.textLeading).toBe(12);
    });

    it("T* uses stored leading value", () => {
      const elements = parse("BT 14 TL 100 700 Td (Line1) Tj T* (Line2) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs).toHaveLength(2);
      // First line at y=700, second at y=700-14=686
      expect(text.runs[0].y).toBe(700);
      expect(text.runs[1].y).toBe(686);
    });
  });

  describe("XObject parsing", () => {
    it("parses Do operator", () => {
      const elements = parse("/Img1 Do");
      expect(elements).toHaveLength(1);

      const image = elements[0] as ParsedImage;
      expect(image.type).toBe("image");
      expect(image.name).toBe("Img1");
    });
  });

  describe("complex paths", () => {
    it("parses path with multiple subpaths", () => {
      const elements = parse("0 0 m 100 0 l 100 100 l h 200 200 m 300 200 l 300 300 l h f");
      const path = elements[0] as ParsedPath;

      expect(path.operations).toHaveLength(8);
      expect(path.operations[3].type).toBe("closePath");
      expect(path.operations[7].type).toBe("closePath");
    });

    it("parses mixed path and text", () => {
      const elements = parse("0 0 100 100 re f BT (Hello) Tj ET");
      expect(elements).toHaveLength(2);
      expect(elements[0].type).toBe("path");
      expect(elements[1].type).toBe("text");
    });
  });

  describe("text displacement calculation (PDF Reference 9.4.4)", () => {
    // Create font mappings with known widths for testing
    function createFontMappings(): FontMappings {
      const metrics: FontMetrics = {
        widths: new Map([
          [65, 600],  // 'A'
          [66, 700],  // 'B'
          [67, 650],  // 'C'
          [32, 300],  // space
        ]),
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      const fontInfo: FontInfo = {
        mapping: new Map(),
        codeByteWidth: 1,
        metrics,
      };
      return new Map([["TestFont", fontInfo]]);
    }

    it("uses font metrics for displacement calculation", () => {
      const fontMappings = createFontMappings();
      // 'A' has width 600, fontSize=10
      // displacement = 600 * 10 / 1000 = 6
      const elements = parse("BT /TestFont 10 Tf (A) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(6);
    });

    it("uses default width for unknown characters", () => {
      const fontMappings = createFontMappings();
      // 'X' (charCode 88) has no entry, defaultWidth=500, fontSize=10
      // displacement = 500 * 10 / 1000 = 5
      const elements = parse("BT /TestFont 10 Tf (X) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(5);
    });

    it("applies Tc (character spacing) to each character", () => {
      const fontMappings = createFontMappings();
      // 'AB': A=600, B=700, fontSize=10, Tc=2
      // displacement = (600/1000*10 + 2) + (700/1000*10 + 2) = 8 + 9 = 17
      const elements = parse("2 Tc BT /TestFont 10 Tf (AB) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(17);
    });

    it("applies Tw (word spacing) only to space characters", () => {
      const fontMappings = createFontMappings();
      // 'A B': A=600, space=300, B=700, fontSize=10, Tw=5
      // displacement = (600*10/1000 + 0) + (300*10/1000 + 5) + (700*10/1000 + 0)
      //              = 6 + 8 + 7 = 21
      const elements = parse("5 Tw BT /TestFont 10 Tf (A B) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(21);
    });

    it("applies Tz (horizontal scaling) to displacement", () => {
      const fontMappings = createFontMappings();
      // 'A' has width 600, fontSize=10, Tz=200 (200%)
      // displacement = 600 * 10 / 1000 * 2 = 12
      const elements = parse("200 Tz BT /TestFont 10 Tf (A) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(12);
    });

    it("applies Tz to TJ number adjustments", () => {
      const fontMappings = createFontMappings();
      // 'A' width=600, fontSize=10, Tz=200 (200%)
      // First: 'A' displacement = 600 * 10 / 1000 * 2 = 12
      // Then: TJ adjustment 500 moves by -500 * 10 / 1000 * 2 = -10
      // Then: 'B' displacement = 700 * 10 / 1000 * 2 = 14
      // Total first run = 12, then position adjusts by -10, then second run = 14
      const elements = parse("200 Tz BT /TestFont 10 Tf [(A) 500 (B)] TJ ET", fontMappings);
      const text = elements[0] as ParsedText;
      // First run 'A': x=0, endX=12
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(12);
      // Position after TJ adjustment: 12 + (-10) = 2
      // Second run 'B': x=2, endX=2+14=16
      expect(text.runs[1].x).toBeCloseTo(2);
      expect(text.runs[1].endX - text.runs[1].x).toBeCloseTo(14);
    });

    it("combines Tc, Tw, and Tz correctly", () => {
      const fontMappings = createFontMappings();
      // 'A ' (A and space): A=600, space=300, fontSize=10, Tc=1, Tw=2, Tz=150
      // A: (600 * 10/1000 + 1 + 0) * 1.5 = (6 + 1) * 1.5 = 10.5
      // space: (300 * 10/1000 + 1 + 2) * 1.5 = (3 + 1 + 2) * 1.5 = 9
      // Total = 19.5
      const elements = parse("1 Tc 2 Tw 150 Tz BT /TestFont 10 Tf (A ) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(19.5);
    });
  });

  describe("text matrix + CTM composition (PDF Reference 9.4.2)", () => {
    it("applies CTM translation to text position", () => {
      // CTM translates by (100, 50)
      // Text at (10, 20) should be at (110, 70)
      const elements = parse("1 0 0 1 100 50 cm BT 10 20 Td (A) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBeCloseTo(110);
      expect(text.runs[0].y).toBeCloseTo(70);
    });

    it("applies CTM scale to text position", () => {
      // CTM scales by 2x
      // Text at (10, 20) should be at (20, 40)
      const elements = parse("2 0 0 2 0 0 cm BT 10 20 Td (A) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBeCloseTo(20);
      expect(text.runs[0].y).toBeCloseTo(40);
    });

    it("applies CTM scale to text displacement", () => {
      const fontMappings = new Map<string, FontInfo>();
      const metrics: FontMetrics = {
        widths: new Map([[65, 600]]), // 'A' = 600
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      fontMappings.set("TestFont", { mapping: new Map(), codeByteWidth: 1, metrics });

      // CTM scales by 2x
      // 'A' displacement in text space = 600 * 10 / 1000 = 6
      // In page space = 6 * 2 = 12 (x scaled by CTM)
      const elements = parse("2 0 0 2 0 0 cm BT /TestFont 10 Tf (A) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].endX - text.runs[0].x).toBeCloseTo(12);
    });

    it("applies combined translation and scale", () => {
      // CTM: scale by 2, then translate by (50, 100)
      // Combined: [2, 0, 0, 2, 50, 100]
      // Text at (10, 20) transforms to: (10*2 + 50, 20*2 + 100) = (70, 140)
      const elements = parse("2 0 0 2 50 100 cm BT 10 20 Td (A) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBeCloseTo(70);
      expect(text.runs[0].y).toBeCloseTo(140);
    });

    it("applies text rise (Ts) to baseline position", () => {
      // Text rise shifts baseline by 5 units
      // Position at (0, 0) with rise 5 should have y = 5
      const elements = parse("5 Ts BT (A) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].y).toBeCloseTo(5);
    });

    it("combines text rise with CTM scale", () => {
      // CTM scales by 2
      // Text rise = 10 (in text space)
      // Position at (0, 0): y = 0 + 10 = 10 in text space
      // After CTM scale: y = 10 * 2 = 20
      const elements = parse("2 0 0 2 0 0 cm 10 Ts BT (A) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].y).toBeCloseTo(20);
    });

    it("preserves text matrix across multiple Tj calls", () => {
      const fontMappings = new Map<string, FontInfo>();
      const metrics: FontMetrics = {
        widths: new Map([[65, 600]]), // 'A' = 600
        defaultWidth: 500,
        ascender: 800,
        descender: -200,
      };
      fontMappings.set("TestFont", { mapping: new Map(), codeByteWidth: 1, metrics });

      // First 'A' at x=0, second 'A' should start where first ended
      // Displacement = 600 * 10 / 1000 = 6
      const elements = parse("BT /TestFont 10 Tf (A) Tj (A) Tj ET", fontMappings);
      const text = elements[0] as ParsedText;
      expect(text.runs[0].x).toBeCloseTo(0);
      expect(text.runs[0].endX).toBeCloseTo(6);
      expect(text.runs[1].x).toBeCloseTo(6);
      expect(text.runs[1].endX).toBeCloseTo(12);
    });
  });

  describe("effectiveFontSize calculation (PDF Reference 9.4.4)", () => {
    it("equals fontSize when text matrix and CTM are identity", () => {
      const elements = parse("BT /F1 12 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].fontSize).toBe(12);
      expect(text.runs[0].effectiveFontSize).toBe(12);
    });

    it("scales by text matrix Y-scale", () => {
      // Text matrix: [1 0 0 2 0 0] scales Y by 2
      // effectiveFontSize = 12 * 2 = 24
      const elements = parse("BT 1 0 0 2 0 0 Tm /F1 12 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].fontSize).toBe(12);
      expect(text.runs[0].effectiveFontSize).toBeCloseTo(24);
    });

    it("scales by CTM Y-scale", () => {
      // CTM: [1 0 0 3 0 0] scales Y by 3
      // effectiveFontSize = 10 * 3 = 30
      const elements = parse("1 0 0 3 0 0 cm BT /F1 10 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].fontSize).toBe(10);
      expect(text.runs[0].effectiveFontSize).toBeCloseTo(30);
    });

    it("combines text matrix and CTM scaling", () => {
      // Text matrix: [2 0 0 2 0 0] scales by 2
      // CTM: [1.5 0 0 1.5 0 0] scales by 1.5
      // Composite Y-scale = 2 * 1.5 = 3
      // effectiveFontSize = 10 * 3 = 30
      const elements = parse("1.5 0 0 1.5 0 0 cm BT 2 0 0 2 0 0 Tm /F1 10 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].fontSize).toBe(10);
      expect(text.runs[0].effectiveFontSize).toBeCloseTo(30);
    });

    it("CTM translation does not affect effectiveFontSize", () => {
      // CTM: [1 0 0 1 100 200] is translation only
      // effectiveFontSize should remain 12
      const elements = parse("1 0 0 1 100 200 cm BT /F1 12 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].effectiveFontSize).toBe(12);
    });

    it("handles rotation in CTM", () => {
      // CTM: 90 degree rotation [0 1 -1 0 0 0]
      // Y-scale = sqrt((-1)^2 + 0^2) = 1
      // effectiveFontSize = 12 * 1 = 12
      const elements = parse("0 1 -1 0 0 0 cm BT /F1 12 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].effectiveFontSize).toBeCloseTo(12);
    });

    it("handles rotation with scale in CTM", () => {
      // CTM: 2x scale with 90 degree rotation
      // cos(90°)=0, sin(90°)=1, so matrix is [0 2 -2 0 0 0]
      // Y-scale = sqrt((-2)^2 + 0^2) = 2
      // effectiveFontSize = 10 * 2 = 20
      const elements = parse("0 2 -2 0 0 0 cm BT /F1 10 Tf (Hello) Tj ET");
      const text = elements[0] as ParsedText;
      expect(text.runs[0].effectiveFontSize).toBeCloseTo(20);
    });
  });
});
