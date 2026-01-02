/**
 * @file Tests for line (stroke) parsing
 *
 * ECMA-376 Part 1, Section 20.1.2.2.24 - a:ln (Line Properties)
 * This element specifies the line/stroke properties for a shape.
 *
 * Related sections:
 * - 20.1.10.31 ST_LineCap (Line cap types)
 * - 20.1.10.33 ST_CompoundLine (Compound line types)
 * - 20.1.10.39 ST_PenAlignment (Pen alignment)
 * - 20.1.10.55 ST_LineEndType (Line end arrow types)
 * - 20.1.10.56 ST_LineEndWidth (Line end width)
 * - 20.1.10.57 ST_LineEndLength (Line end length)
 * - 20.1.8.48 a:prstDash (Preset dash patterns)
 * - 20.1.8.21 a:custDash (Custom dash patterns)
 *
 * @see ECMA-376 Part 1, Section 20.1.2.2.24
 */

import type { XmlElement } from "../../../xml/index";
import { parseLine, getLineFromProperties } from "./line-parser";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// parseLine - Basic parsing (ECMA-376 Section 20.1.2.2.24)
// =============================================================================

describe("parseLine - a:ln (ECMA-376 Section 20.1.2.2.24)", () => {
  describe("Width (w attribute)", () => {
    it("parses line width in EMU", () => {
      // 12700 EMU = 1pt = ~1.33px
      const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);

      expect(result).toBeDefined();
      // EMU to pixels: 12700 / 9525 ≈ 1.33
      expect(result?.width).toBeCloseTo(1.33, 1);
    });

    it("parses larger line widths", () => {
      // 38100 EMU = 3pt = 4px
      const ln = el("a:ln", { w: "38100" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);

      expect(result).toBeDefined();
      expect(result?.width).toBeCloseTo(4, 0);
    });

    it("defaults width to 1 when not specified", () => {
      const ln = el("a:ln", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);

      expect(result?.width).toBe(1);
    });
  });

  describe("Line cap (cap attribute - ECMA-376 Section 20.1.10.31)", () => {
    it("parses cap='flat' as flat", () => {
      const ln = el("a:ln", { w: "12700", cap: "flat" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.cap).toBe("flat");
    });

    it("parses cap='rnd' as round", () => {
      const ln = el("a:ln", { w: "12700", cap: "rnd" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.cap).toBe("round");
    });

    it("parses cap='sq' as square", () => {
      const ln = el("a:ln", { w: "12700", cap: "sq" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.cap).toBe("square");
    });

    it("defaults cap to flat when not specified", () => {
      const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.cap).toBe("flat");
    });
  });

  describe("Compound line (cmpd attribute - ECMA-376 Section 20.1.10.33)", () => {
    it("parses cmpd='sng' as single line", () => {
      const ln = el("a:ln", { w: "12700", cmpd: "sng" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("sng");
    });

    it("parses cmpd='dbl' as double line", () => {
      const ln = el("a:ln", { w: "12700", cmpd: "dbl" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("dbl");
    });

    it("parses cmpd='thickThin' correctly", () => {
      const ln = el("a:ln", { w: "12700", cmpd: "thickThin" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
      ]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("thickThin");
    });

    it("parses cmpd='thinThick' correctly", () => {
      const ln = el("a:ln", { w: "12700", cmpd: "thinThick" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
      ]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("thinThick");
    });

    it("parses cmpd='tri' as triple line", () => {
      const ln = el("a:ln", { w: "12700", cmpd: "tri" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("tri");
    });

    it("defaults compound to sng when not specified", () => {
      const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.compound).toBe("sng");
    });
  });

  describe("Pen alignment (algn attribute - ECMA-376 Section 20.1.10.39)", () => {
    it("parses algn='ctr' as center", () => {
      const ln = el("a:ln", { w: "12700", algn: "ctr" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.alignment).toBe("ctr");
    });

    it("parses algn='in' as inset", () => {
      const ln = el("a:ln", { w: "12700", algn: "in" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.alignment).toBe("in");
    });

    it("defaults alignment to ctr when not specified", () => {
      const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);
      expect(result?.alignment).toBe("ctr");
    });
  });
});

// =============================================================================
// Line fill parsing
// =============================================================================

describe("parseLine - Line fill", () => {
  it("parses solid fill", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])]);
    const result = parseLine(ln);

    expect(result?.fill?.type).toBe("solidFill");
  });

  it("parses gradient fill", () => {
    const ln = el("a:ln", { w: "12700" }, [
      el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
      ]),
    ]);
    const result = parseLine(ln);

    expect(result?.fill?.type).toBe("gradientFill");
  });

  it("parses noFill", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:noFill")]);
    const result = parseLine(ln);

    expect(result?.fill?.type).toBe("noFill");
  });

  it("defaults to noFill when no fill specified", () => {
    const ln = el("a:ln", { w: "12700" });
    const result = parseLine(ln);

    expect(result?.fill?.type).toBe("noFill");
  });
});

// =============================================================================
// Dash patterns (ECMA-376 Section 20.1.8.48, 20.1.8.21)
// =============================================================================

describe("parseLine - Dash patterns", () => {
  describe("Preset dash (a:prstDash - ECMA-376 Section 20.1.8.48)", () => {
    it("parses solid dash", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "solid" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("solid");
    });

    it("parses dash pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "dash" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("dash");
    });

    it("parses dot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "dot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("dot");
    });

    it("parses dashDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "dashDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("dashDot");
    });

    it("parses lgDash pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "lgDash" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("lgDash");
    });

    it("parses lgDashDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "lgDashDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("lgDashDot");
    });

    it("parses lgDashDotDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "lgDashDotDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("lgDashDotDot");
    });

    it("parses sysDash pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "sysDash" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("sysDash");
    });

    it("parses sysDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "sysDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("sysDot");
    });

    it("parses sysDashDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "sysDashDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("sysDashDot");
    });

    it("parses sysDashDotDot pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash", { val: "sysDashDotDot" }),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("sysDashDotDot");
    });

    it("defaults dash to solid when prstDash val not specified", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:prstDash"),
      ]);
      const result = parseLine(ln);
      expect(result?.dash).toBe("solid");
    });
  });

  describe("Custom dash (a:custDash - ECMA-376 Section 20.1.8.21)", () => {
    it("parses custom dash pattern", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:custDash", {}, [el("a:ds", { d: "100000", sp: "50000" }), el("a:ds", { d: "200000", sp: "100000" })]),
      ]);
      const result = parseLine(ln);

      expect(result?.dash).toEqual({
        dashes: [
          { dashLength: 100, spaceLength: 50 },
          { dashLength: 200, spaceLength: 100 },
        ],
      });
    });

    it("parses custom dash with multiple segments", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:custDash", {}, [
          el("a:ds", { d: "50000", sp: "25000" }),
          el("a:ds", { d: "100000", sp: "25000" }),
          el("a:ds", { d: "50000", sp: "25000" }),
        ]),
      ]);
      const result = parseLine(ln);

      expect(result?.dash).toEqual({
        dashes: [
          { dashLength: 50, spaceLength: 25 },
          { dashLength: 100, spaceLength: 25 },
          { dashLength: 50, spaceLength: 25 },
        ],
      });
    });
  });

  it("defaults dash to solid when no dash specified", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
    const result = parseLine(ln);
    expect(result?.dash).toBe("solid");
  });
});

// =============================================================================
// Line ends (ECMA-376 Section 20.1.8.37, 20.1.10.55-57)
// =============================================================================

describe("parseLine - Line ends", () => {
  describe("Head end (a:headEnd)", () => {
    it("parses triangle head end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "triangle", w: "med", len: "med" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd).toBeDefined();
      expect(result?.headEnd?.type).toBe("triangle");
      expect(result?.headEnd?.width).toBe("med");
      expect(result?.headEnd?.length).toBe("med");
    });

    it("parses stealth head end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "stealth", w: "lg", len: "lg" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.type).toBe("stealth");
      expect(result?.headEnd?.width).toBe("lg");
      expect(result?.headEnd?.length).toBe("lg");
    });

    it("parses arrow head end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "arrow", w: "sm", len: "sm" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.type).toBe("arrow");
      expect(result?.headEnd?.width).toBe("sm");
      expect(result?.headEnd?.length).toBe("sm");
    });

    it("parses diamond head end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "diamond" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.type).toBe("diamond");
    });

    it("parses oval head end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "oval" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.type).toBe("oval");
    });

    it("returns undefined for type='none'", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "none" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd).toBeUndefined();
    });

    it("defaults width and length to 'med'", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "triangle" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.width).toBe("med");
      expect(result?.headEnd?.length).toBe("med");
    });
  });

  describe("Tail end (a:tailEnd)", () => {
    it("parses triangle tail end", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:tailEnd", { type: "triangle", w: "med", len: "med" }),
      ]);
      const result = parseLine(ln);

      expect(result?.tailEnd).toBeDefined();
      expect(result?.tailEnd?.type).toBe("triangle");
    });

    it("parses different head and tail ends", () => {
      const ln = el("a:ln", { w: "12700" }, [
        el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        el("a:headEnd", { type: "oval", w: "sm", len: "sm" }),
        el("a:tailEnd", { type: "triangle", w: "lg", len: "lg" }),
      ]);
      const result = parseLine(ln);

      expect(result?.headEnd?.type).toBe("oval");
      expect(result?.tailEnd?.type).toBe("triangle");
      expect(result?.headEnd?.width).toBe("sm");
      expect(result?.tailEnd?.width).toBe("lg");
    });

    it("returns undefined when no tail end specified", () => {
      const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
      const result = parseLine(ln);

      expect(result?.tailEnd).toBeUndefined();
    });
  });
});

// =============================================================================
// Line join
// =============================================================================

describe("parseLine - Line join", () => {
  it("parses round join", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]), el("a:round")]);
    const result = parseLine(ln);
    expect(result?.join).toBe("round");
  });

  it("parses bevel join", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]), el("a:bevel")]);
    const result = parseLine(ln);
    expect(result?.join).toBe("bevel");
  });

  it("parses miter join", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]), el("a:miter")]);
    const result = parseLine(ln);
    expect(result?.join).toBe("miter");
  });

  it("parses miter join with limit", () => {
    const ln = el("a:ln", { w: "12700" }, [
      el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
      el("a:miter", { lim: "800000" }), // 800%
    ]);
    const result = parseLine(ln);
    expect(result?.join).toBe("miter");
    expect(result?.miterLimit).toBe(800); // 800000 -> 800
  });

  it("defaults join to round", () => {
    const ln = el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })])]);
    const result = parseLine(ln);
    expect(result?.join).toBe("round");
  });
});

// =============================================================================
// Edge cases
// =============================================================================

describe("parseLine - Edge cases", () => {
  it("returns undefined for undefined input", () => {
    const result = parseLine(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined for line with no fill and no width", () => {
    const ln = el("a:ln");
    const result = parseLine(ln);
    expect(result).toBeUndefined();
  });

  it("returns line with width even if no fill", () => {
    const ln = el("a:ln", { w: "12700" });
    const result = parseLine(ln);
    expect(result).toBeDefined();
    expect(result?.fill?.type).toBe("noFill");
  });
});

// =============================================================================
// getLineFromProperties - Convenience function
// =============================================================================

describe("getLineFromProperties - Convenience function", () => {
  it("extracts line from spPr element", () => {
    const spPr = el("p:spPr", {}, [
      el("a:ln", { w: "12700" }, [el("a:solidFill", {}, [el("a:srgbClr", { val: "0000FF" })])]),
    ]);
    const result = getLineFromProperties(spPr);

    expect(result).toBeDefined();
    expect(result?.fill?.type).toBe("solidFill");
  });

  it("returns undefined for undefined input", () => {
    const result = getLineFromProperties(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when spPr has no line", () => {
    const spPr = el("p:spPr", {}, [el("a:xfrm")]);
    const result = getLineFromProperties(spPr);
    expect(result).toBeUndefined();
  });
});
