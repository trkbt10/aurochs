/**
 * @file Tests for fill parsing and style reference resolution
 *
 * ECMA-376 Part 1, Section 20.1.8 - Fill Properties
 * This section defines the fill properties used throughout DrawingML.
 *
 * Fill types:
 * - a:noFill (20.1.8.44) - No fill
 * - a:solidFill (20.1.8.54) - Solid color fill
 * - a:gradFill (20.1.8.33) - Gradient fill
 * - a:blipFill (20.1.8.14) - Picture/blip fill
 * - a:pattFill (20.1.8.47) - Pattern fill
 * - a:grpFill (20.1.8.35) - Group fill
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fill Properties)
 * @see ECMA-376 Part 1, Section 20.1.4.2.10 (a:fillRef)
 */

import type { XmlElement } from "@oxen/xml";
import { findFillElement, parseFill, parseFillFromParent, resolveFillFromStyleReference } from "./fill-parser";
import type { StyleReference } from "../../domain/index";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// findFillElement - Fill Detection
// =============================================================================

describe("findFillElement - Fill type detection", () => {
  it("finds a:noFill element", () => {
    const parent = el("a:spPr", {}, [el("a:noFill")]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:noFill");
  });

  it("finds a:solidFill element", () => {
    const parent = el("a:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:solidFill");
  });

  it("finds a:gradFill element", () => {
    const parent = el("a:spPr", {}, [el("a:gradFill", {}, [el("a:gsLst")])]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:gradFill");
  });

  it("finds a:blipFill element", () => {
    const parent = el("a:spPr", {}, [el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" })])]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:blipFill");
  });

  it("finds a:pattFill element", () => {
    const parent = el("a:spPr", {}, [el("a:pattFill", { prst: "pct5" })]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:pattFill");
  });

  it("finds a:grpFill element", () => {
    const parent = el("a:spPr", {}, [el("a:grpFill")]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:grpFill");
  });

  it("returns undefined when no fill element exists", () => {
    const parent = el("a:spPr", {}, [el("a:ln")]);
    const result = findFillElement(parent);
    expect(result).toBeUndefined();
  });

  it("returns first fill element when multiple exist", () => {
    const parent = el("a:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })]), el("a:noFill")]);
    const result = findFillElement(parent);
    expect(result?.name).toBe("a:solidFill");
  });
});

// =============================================================================
// parseFill - a:noFill (ECMA-376 Section 20.1.8.44)
// =============================================================================

describe("parseFill - a:noFill (ECMA-376 Section 20.1.8.44)", () => {
  it("parses noFill element", () => {
    const noFill = el("a:noFill");
    const result = parseFill(noFill);
    expect(result).toBeDefined();
    expect(result?.type).toBe("noFill");
  });
});

// =============================================================================
// parseFill - a:solidFill (ECMA-376 Section 20.1.8.54)
// =============================================================================

describe("parseFill - a:solidFill (ECMA-376 Section 20.1.8.54)", () => {
  it("parses solidFill with srgbClr", () => {
    const solidFill = el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })]);
    const result = parseFill(solidFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("solidFill");
    if (result?.type === "solidFill") {
      expect(result.color.spec.type).toBe("srgb");
      if (result.color.spec.type === "srgb") {
        expect(result.color.spec.value).toBe("FF0000");
      }
    }
  });

  it("parses solidFill with schemeClr", () => {
    const solidFill = el("a:solidFill", {}, [el("a:schemeClr", { val: "accent1" })]);
    const result = parseFill(solidFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("solidFill");
    if (result?.type === "solidFill") {
      expect(result.color.spec.type).toBe("scheme");
      if (result.color.spec.type === "scheme") {
        expect(result.color.spec.value).toBe("accent1");
      }
    }
  });

  it("parses solidFill with color transforms", () => {
    const solidFill = el("a:solidFill", {}, [
      el("a:schemeClr", { val: "accent1" }, [
        el("a:alpha", { val: "50000" }), // 50%
      ]),
    ]);
    const result = parseFill(solidFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("solidFill");
    if (result?.type === "solidFill") {
      expect(result.color.transform?.alpha).toBe(50); // Percent type: 50 = 50%
    }
  });

  it("returns undefined for solidFill without color", () => {
    const solidFill = el("a:solidFill");
    const result = parseFill(solidFill);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseFill - a:gradFill (ECMA-376 Section 20.1.8.33)
// =============================================================================

describe("parseFill - a:gradFill (ECMA-376 Section 20.1.8.33)", () => {
  describe("Gradient stops (a:gsLst, a:gs - Section 20.1.8.36)", () => {
    it("parses gradient with two stops", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
      ]);
      const result = parseFill(gradFill);

      expect(result).toBeDefined();
      expect(result?.type).toBe("gradientFill");
      if (result?.type === "gradientFill") {
        expect(result.stops).toHaveLength(2);
        expect(result.stops[0].position).toBe(0);
        expect(result.stops[1].position).toBe(100); // 100000 -> 100%
      }
    });

    it("parses gradient stop positions correctly (100000 = 100%)", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "50000" }, [el("a:srgbClr", { val: "00FF00" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.stops[0].position).toBe(0);
        expect(result.stops[1].position).toBe(50);
        expect(result.stops[2].position).toBe(100);
      }
    });

    it("sorts gradient stops by position", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "50000" }, [el("a:srgbClr", { val: "00FF00" })]),
        ]),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.stops[0].position).toBe(0);
        expect(result.stops[1].position).toBe(50);
        expect(result.stops[2].position).toBe(100);
      }
    });
  });

  describe("Linear gradient (a:lin - Section 20.1.8.41)", () => {
    it("parses linear gradient with angle", () => {
      // ang is in 1/60000 of a degree
      // 5400000 = 90 degrees
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:lin", { ang: "5400000", scaled: "1" }),
      ]);
      const result = parseFill(gradFill);

      expect(result?.type).toBe("gradientFill");
      if (result?.type === "gradientFill") {
        expect(result.linear).toBeDefined();
        expect(result.linear?.angle).toBe(90);
        expect(result.linear?.scaled).toBe(true);
      }
    });

    it("parses angle values correctly (60000 units = 1 degree)", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:lin", { ang: "2700000" }), // 45 degrees
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.linear?.angle).toBe(45);
      }
    });

    it("defaults scaled to true when not specified", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:lin", { ang: "0" }),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.linear?.scaled).toBe(true);
      }
    });
  });

  describe("Path gradient (a:path - Section 20.1.8.46)", () => {
    it("parses circle path gradient", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:path", { path: "circle" }, [el("a:fillToRect", { l: "50000", t: "50000", r: "50000", b: "50000" })]),
      ]);
      const result = parseFill(gradFill);

      expect(result?.type).toBe("gradientFill");
      if (result?.type === "gradientFill") {
        expect(result.path).toBeDefined();
        expect(result.path?.path).toBe("circle");
        expect(result.path?.fillToRect?.left).toBe(50);
        expect(result.path?.fillToRect?.top).toBe(50);
        expect(result.path?.fillToRect?.right).toBe(50);
        expect(result.path?.fillToRect?.bottom).toBe(50);
      }
    });

    it("parses rect path gradient", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:path", { path: "rect" }),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.path?.path).toBe("rect");
      }
    });

    it("parses shape path gradient", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:path", { path: "shape" }),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.path?.path).toBe("shape");
      }
    });
  });

  describe("Tile rectangle (a:tileRect)", () => {
    it("parses tileRect with offsets", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
        el("a:tileRect", { l: "-50000", t: "0", r: "50000", b: "0" }),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.tileRect).toBeDefined();
        expect(result.tileRect?.left).toBe(-50);
        expect(result.tileRect?.right).toBe(50);
      }
    });
  });

  describe("rotWithShape attribute", () => {
    it("defaults rotWithShape to true", () => {
      const gradFill = el("a:gradFill", {}, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.rotWithShape).toBe(true);
      }
    });

    it("parses rotWithShape='0' as false", () => {
      const gradFill = el("a:gradFill", { rotWithShape: "0" }, [
        el("a:gsLst", {}, [
          el("a:gs", { pos: "0" }, [el("a:srgbClr", { val: "FF0000" })]),
          el("a:gs", { pos: "100000" }, [el("a:srgbClr", { val: "0000FF" })]),
        ]),
      ]);
      const result = parseFill(gradFill);

      if (result?.type === "gradientFill") {
        expect(result.rotWithShape).toBe(false);
      }
    });
  });

  it("returns undefined for gradFill without gsLst", () => {
    const gradFill = el("a:gradFill");
    const result = parseFill(gradFill);
    expect(result).toBeUndefined();
  });

  it("returns undefined for gradFill with empty gsLst", () => {
    const gradFill = el("a:gradFill", {}, [el("a:gsLst")]);
    const result = parseFill(gradFill);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseFill - a:blipFill (ECMA-376 Section 20.1.8.14)
// =============================================================================

describe("parseFill - a:blipFill (ECMA-376 Section 20.1.8.14)", () => {
  it("parses blipFill with embedded resource", () => {
    const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" })]);
    const result = parseFill(blipFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("blipFill");
    if (result?.type === "blipFill") {
      expect(result.resourceId).toBe("rId1");
      expect(result.relationshipType).toBe("embed");
    }
  });

  it("parses blipFill with linked resource", () => {
    const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:link": "rId2" })]);
    const result = parseFill(blipFill);

    if (result?.type === "blipFill") {
      expect(result.resourceId).toBe("rId2");
      expect(result.relationshipType).toBe("link");
    }
  });

  describe("Stretch fill mode (a:stretch - Section 20.1.8.56)", () => {
    it("parses stretch with fillRect", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }),
        el("a:stretch", {}, [el("a:fillRect", { l: "10000", t: "10000", r: "10000", b: "10000" })]),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.stretch).toBeDefined();
        expect(result.stretch?.fillRect?.left).toBe(10);
        expect(result.stretch?.fillRect?.top).toBe(10);
      }
    });

    it("parses stretch without fillRect", () => {
      const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" }), el("a:stretch")]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.stretch).toBeDefined();
      }
    });
  });

  describe("Tile fill mode (a:tile - Section 20.1.8.58)", () => {
    it("parses tile with offset and scale", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }),
        el("a:tile", {
          tx: "914400", // 1 inch = 96px at standard DPI
          ty: "914400",
          sx: "50000", // 50%
          sy: "50000",
          flip: "xy",
          algn: "ctr",
        }),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.tile).toBeDefined();
        expect(result.tile?.flip).toBe("xy");
        expect(result.tile?.alignment).toBe("ctr");
        expect(result.tile?.sx).toBe(50);
        expect(result.tile?.sy).toBe(50);
      }
    });

    it("defaults tile flip to 'none'", () => {
      const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" }), el("a:tile", {})]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.tile?.flip).toBe("none");
      }
    });
  });

  describe("Source rectangle (a:srcRect)", () => {
    it("parses source rectangle crop", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }),
        el("a:srcRect", { l: "25000", t: "25000", r: "25000", b: "25000" }),
        el("a:stretch"),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.sourceRect).toBeDefined();
        expect(result.sourceRect?.left).toBe(25);
        expect(result.sourceRect?.top).toBe(25);
        expect(result.sourceRect?.right).toBe(25);
        expect(result.sourceRect?.bottom).toBe(25);
      }
    });
  });

  it("defaults rotWithShape to true", () => {
    const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" })]);
    const result = parseFill(blipFill);

    if (result?.type === "blipFill") {
      expect(result.rotWithShape).toBe(true);
    }
  });

  it("returns undefined for blipFill without blip", () => {
    const blipFill = el("a:blipFill");
    const result = parseFill(blipFill);
    expect(result).toBeUndefined();
  });

  it("returns undefined for blipFill with blip but no resource ID", () => {
    const blipFill = el("a:blipFill", {}, [el("a:blip")]);
    const result = parseFill(blipFill);
    expect(result).toBeUndefined();
  });

  describe("dpi attribute (ECMA-376 Section 20.1.8.14)", () => {
    it("parses dpi attribute", () => {
      const blipFill = el("a:blipFill", { dpi: "150" }, [el("a:blip", { "r:embed": "rId1" })]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.dpi).toBe(150);
      }
    });

    it("handles missing dpi attribute", () => {
      const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" })]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.dpi).toBeUndefined();
      }
    });
  });

  describe("blip effects (ECMA-376 Section 20.1.8.13 CT_Blip)", () => {
    it("parses grayscale effect in blip", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }, [el("a:grayscl")]),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.blipEffects).toBeDefined();
        expect(result.blipEffects?.grayscale).toBe(true);
      }
    });

    it("parses alphaModFix effect in blip", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }, [el("a:alphaModFix", { amt: "50000" })]),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.blipEffects).toBeDefined();
        expect(result.blipEffects?.alphaModFix?.amount).toBe(50);
      }
    });

    it("parses blur effect in blip", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }, [el("a:blur", { rad: "914400", grow: "1" })]),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.blipEffects).toBeDefined();
        expect(result.blipEffects?.blur).toBeDefined();
        expect(result.blipEffects?.blur?.grow).toBe(true);
      }
    });

    it("parses duotone effect in blip", () => {
      const blipFill = el("a:blipFill", {}, [
        el("a:blip", { "r:embed": "rId1" }, [
          el("a:duotone", {}, [
            el("a:srgbClr", { val: "000000" }),
            el("a:srgbClr", { val: "FFFFFF" }),
          ]),
        ]),
      ]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.blipEffects).toBeDefined();
        expect(result.blipEffects?.duotone).toBeDefined();
        expect(result.blipEffects?.duotone?.colors).toHaveLength(2);
      }
    });

    it("returns undefined blipEffects when no effects present", () => {
      const blipFill = el("a:blipFill", {}, [el("a:blip", { "r:embed": "rId1" })]);
      const result = parseFill(blipFill);

      if (result?.type === "blipFill") {
        expect(result.blipEffects).toBeUndefined();
      }
    });
  });
});

// =============================================================================
// parseFill - a:pattFill (ECMA-376 Section 20.1.8.47)
// =============================================================================

describe("parseFill - a:pattFill (ECMA-376 Section 20.1.8.47)", () => {
  it("parses pattern fill with preset", () => {
    const pattFill = el("a:pattFill", { prst: "pct5" }, [
      el("a:fgClr", {}, [el("a:srgbClr", { val: "000000" })]),
      el("a:bgClr", {}, [el("a:srgbClr", { val: "FFFFFF" })]),
    ]);
    const result = parseFill(pattFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("patternFill");
    if (result?.type === "patternFill") {
      expect(result.preset).toBe("pct5");
    }
  });

  it("parses foreground and background colors", () => {
    const pattFill = el("a:pattFill", { prst: "horzBrick" }, [
      el("a:fgClr", {}, [el("a:schemeClr", { val: "dk1" })]),
      el("a:bgClr", {}, [el("a:schemeClr", { val: "lt1" })]),
    ]);
    const result = parseFill(pattFill);

    if (result?.type === "patternFill") {
      expect(result.foregroundColor.spec.type).toBe("scheme");
      expect(result.backgroundColor.spec.type).toBe("scheme");
    }
  });

  it("returns undefined without preset", () => {
    const pattFill = el("a:pattFill", {}, [
      el("a:fgClr", {}, [el("a:srgbClr", { val: "000000" })]),
      el("a:bgClr", {}, [el("a:srgbClr", { val: "FFFFFF" })]),
    ]);
    const result = parseFill(pattFill);
    expect(result).toBeUndefined();
  });

  it("returns undefined without foreground color", () => {
    const pattFill = el("a:pattFill", { prst: "pct5" }, [el("a:bgClr", {}, [el("a:srgbClr", { val: "FFFFFF" })])]);
    const result = parseFill(pattFill);
    expect(result).toBeUndefined();
  });

  it("returns undefined without background color", () => {
    const pattFill = el("a:pattFill", { prst: "pct5" }, [el("a:fgClr", {}, [el("a:srgbClr", { val: "000000" })])]);
    const result = parseFill(pattFill);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseFill - a:grpFill (ECMA-376 Section 20.1.8.35)
// =============================================================================

describe("parseFill - a:grpFill (ECMA-376 Section 20.1.8.35)", () => {
  it("parses group fill", () => {
    const grpFill = el("a:grpFill");
    const result = parseFill(grpFill);

    expect(result).toBeDefined();
    expect(result?.type).toBe("groupFill");
  });
});

// =============================================================================
// parseFill - Edge cases
// =============================================================================

describe("parseFill - Edge cases", () => {
  it("returns undefined for undefined input", () => {
    const result = parseFill(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined for unknown fill type", () => {
    const unknownFill = el("a:unknownFill");
    const result = parseFill(unknownFill);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseFillFromParent - Convenience function
// =============================================================================

describe("parseFillFromParent - Convenience function", () => {
  it("finds and parses fill from parent element", () => {
    const parent = el("a:spPr", {}, [el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })])]);
    const result = parseFillFromParent(parent);

    expect(result).toBeDefined();
    expect(result?.type).toBe("solidFill");
    if (result?.type === "solidFill") {
      expect(result.color.spec.type).toBe("srgb");
    }
  });

  it("returns undefined for undefined parent", () => {
    const result = parseFillFromParent(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when parent has no fill", () => {
    const parent = el("a:spPr", {}, [el("a:ln")]);
    const result = parseFillFromParent(parent);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// resolveFillFromStyleReference (ECMA-376 Section 20.1.4.2.10)
// =============================================================================

describe("resolveFillFromStyleReference", () => {
  describe("ECMA-376 20.1.4.2.10 (a:fillRef)", () => {
    it("should return undefined for fillRef with index 0", () => {
      const fillRef: StyleReference = { index: 0 };
      const fillStyles = [el("a:solidFill")];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      expect(result).toBeUndefined();
    });

    it("should resolve solidFill from fillStyleLst (idx=1 -> index 0)", () => {
      const fillRef: StyleReference = { index: 1 };
      const fillStyles = [el("a:solidFill", {}, [el("a:schemeClr", { val: "phClr" })])];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      expect(result).toBeDefined();
      expect(result?.type).toBe("solidFill");
    });

    it("should resolve fillRef with idx=2 to second fill style", () => {
      const fillRef: StyleReference = { index: 2 };
      const fillStyles = [
        el("a:solidFill", {}, [el("a:schemeClr", { val: "lt1" })]),
        el("a:gradFill", {}, [
          el("a:gsLst", {}, [
            el("a:gs", { pos: "0" }, [el("a:schemeClr", { val: "phClr" })]),
            el("a:gs", { pos: "100000" }, [el("a:schemeClr", { val: "phClr" })]),
          ]),
        ]),
        el("a:gradFill", {}, [
          el("a:gsLst", {}, [
            el("a:gs", { pos: "0" }, [el("a:schemeClr", { val: "phClr" })]),
            el("a:gs", { pos: "100000" }, [el("a:schemeClr", { val: "phClr" })]),
          ]),
        ]),
      ];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      expect(result).toBeDefined();
      expect(result?.type).toBe("gradientFill");
    });

    it("should return undefined for out-of-range index", () => {
      const fillRef: StyleReference = { index: 10 };
      const fillStyles = [el("a:solidFill")];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      expect(result).toBeUndefined();
    });

    it("should handle background fill index (idx >= 1001)", () => {
      const fillRef: StyleReference = { index: 1001 };
      const fillStyles = [el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })])];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      // idx 1001 -> index 0 in bgFillStyleLst (or fallback to fillStyleLst)
      expect(result).toBeDefined();
      expect(result?.type).toBe("solidFill");
    });

    it("should apply color override to phClr in solidFill", () => {
      const fillRef: StyleReference = {
        index: 1,
        color: {
          type: "solidFill",
          color: { spec: { type: "scheme", value: "accent1" } },
        },
      };
      const fillStyles = [el("a:solidFill", {}, [el("a:schemeClr", { val: "phClr" })])];

      const result = resolveFillFromStyleReference(fillRef, fillStyles);

      expect(result).toBeDefined();
      expect(result?.type).toBe("solidFill");
      if (result?.type === "solidFill") {
        expect(result.color.spec.type).toBe("scheme");
        if (result.color.spec.type === "scheme") {
          expect(result.color.spec.value).toBe("accent1");
        }
      }
    });
  });
});
