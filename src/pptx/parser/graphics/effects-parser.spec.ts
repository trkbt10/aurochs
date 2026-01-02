/**
 * @file Tests for effects parsing
 *
 * ECMA-376 Part 1, Section 20.1.8 - Effect Properties
 * This section defines the visual effects that can be applied to shapes.
 *
 * Effect types:
 * - a:outerShdw (20.1.8.49) - Outer shadow
 * - a:innerShdw (20.1.8.40) - Inner shadow
 * - a:glow (20.1.8.32) - Glow effect
 * - a:reflection (20.1.8.50) - Reflection effect
 * - a:softEdge (20.1.8.53) - Soft edge effect
 * - a:alphaBiLevel (20.1.8.1) - Alpha bi-level effect
 * - a:alphaCeiling (20.1.8.2) - Alpha ceiling effect
 * - a:alphaFloor (20.1.8.3) - Alpha floor effect
 * - a:alphaInv (20.1.8.4) - Alpha inverse effect
 * - a:alphaMod (20.1.8.5) - Alpha modulate effect
 * - a:alphaModFix (20.1.8.6) - Alpha modulate fixed effect
 * - a:alphaOutset (20.1.8.7) - Alpha outset/inset effect
 * - a:alphaRepl (20.1.8.8) - Alpha replace effect
 * - a:biLevel (20.1.8.11) - Bi-level (black/white) effect
 * - a:blend (20.1.8.12) - Blend effect
 * - a:clrChange (20.1.8.16) - Color change effect
 * - a:clrRepl (20.1.8.18) - Color replace effect
 * - a:duotone (20.1.8.23) - Duotone effect
 * - a:fillOverlay (20.1.8.29) - Fill overlay effect
 * - a:grayscl (20.1.8.34) - Gray scale effect
 * - a:prstShdw (20.1.8.49) - Preset shadow effect
 * - a:relOff (20.1.8.51) - Relative offset effect
 *
 * Container elements:
 * - a:effectLst (20.1.8.25) - Effect list
 * - a:effectDag (20.1.8.24) - Effect DAG (directed acyclic graph)
 *
 * Common attributes:
 * - blurRad: Blur radius in EMU
 * - dist: Distance in EMU
 * - dir: Direction angle in 1/60000 degrees
 * - rad: Radius in EMU
 *
 * @see ECMA-376 Part 1, Section 20.1.8
 */

import type { XmlElement } from "../../../xml/index";
import type { Color } from "../../domain";
import { parseEffects } from "./effects-parser";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

/**
 * Create sRGB Color object for test assertions
 */
function createColor(hex: string): Color {
  return {
    spec: { type: "srgb", value: hex },
  };
}

// =============================================================================
// parseEffects - Outer shadow (ECMA-376 Section 20.1.8.49)
// =============================================================================

describe("parseEffects - a:outerShdw (ECMA-376 Section 20.1.8.49)", () => {
  it("parses outer shadow with all attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el(
          "a:outerShdw",
          {
            blurRad: "38100", // 4px
            dist: "19050", // 2px
            dir: "2700000", // 45 degrees
          },
          [el("a:srgbClr", { val: "000000" })],
        ),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result).toBeDefined();
    expect(result?.shadow).toBeDefined();
    expect(result?.shadow?.type).toBe("outer");
    expect(result?.shadow?.blurRadius).toBeCloseTo(4, 0);
    expect(result?.shadow?.distance).toBeCloseTo(2, 0);
    expect(result?.shadow?.direction).toBe(45);
  });

  it("parses outer shadow color", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [el("a:outerShdw", { blurRad: "38100" }, [el("a:srgbClr", { val: "FF0000" })])]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow?.color).toBeDefined();
    // Color should be resolved to hex
  });

  it("parses outer shadow with color transform", () => {
    // Note: scheme colors require theme context to resolve, so we test with srgbClr
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", { blurRad: "38100" }, [
          el("a:srgbClr", { val: "000000" }, [
            el("a:alpha", { val: "40000" }), // 40% alpha
          ]),
        ]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow).toBeDefined();
  });

  it("defaults blur and distance to 0", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [el("a:outerShdw", {}, [el("a:srgbClr", { val: "000000" })])]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow?.blurRadius).toBe(0);
    expect(result?.shadow?.distance).toBe(0);
    expect(result?.shadow?.direction).toBe(0);
  });

  it("returns undefined for shadow without color", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:outerShdw", { blurRad: "38100" })])]);
    const result = parseEffects(spPr);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Inner shadow (ECMA-376 Section 20.1.8.40)
// =============================================================================

describe("parseEffects - a:innerShdw (ECMA-376 Section 20.1.8.40)", () => {
  it("parses inner shadow with all attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el(
          "a:innerShdw",
          {
            blurRad: "57150", // 6px
            dist: "28575", // 3px
            dir: "5400000", // 90 degrees
          },
          [el("a:srgbClr", { val: "333333" })],
        ),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result).toBeDefined();
    expect(result?.shadow).toBeDefined();
    expect(result?.shadow?.type).toBe("inner");
    expect(result?.shadow?.blurRadius).toBeCloseTo(6, 0);
    expect(result?.shadow?.distance).toBeCloseTo(3, 0);
    expect(result?.shadow?.direction).toBe(90);
  });

  it("outer shadow takes precedence over inner shadow", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", { blurRad: "38100" }, [el("a:srgbClr", { val: "000000" })]),
        el("a:innerShdw", { blurRad: "19050" }, [el("a:srgbClr", { val: "333333" })]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow?.type).toBe("outer");
  });
});

// =============================================================================
// parseEffects - Glow (ECMA-376 Section 20.1.8.32)
// =============================================================================

describe("parseEffects - a:glow (ECMA-376 Section 20.1.8.32)", () => {
  it("parses glow with radius", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:glow", { rad: "76200" }, [
          // 8px
          el("a:srgbClr", { val: "FFFF00" }),
        ]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result).toBeDefined();
    expect(result?.glow).toBeDefined();
    expect(result?.glow?.radius).toBeCloseTo(8, 0);
  });

  it("parses glow color with srgbClr", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [el("a:glow", { rad: "38100" }, [el("a:srgbClr", { val: "00FF00" })])]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.glow?.color).toBeDefined();
  });

  it("parses glow with color transform", () => {
    // Note: scheme colors require theme context to resolve
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:glow", { rad: "57150" }, [el("a:srgbClr", { val: "FF00FF" }, [el("a:alpha", { val: "60000" })])]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.glow).toBeDefined();
  });

  it("defaults radius to 0", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:glow", {}, [el("a:srgbClr", { val: "FFFF00" })])])]);
    const result = parseEffects(spPr);

    expect(result?.glow?.radius).toBe(0);
  });

  it("returns undefined for glow without color", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:glow", { rad: "38100" })])]);
    const result = parseEffects(spPr);

    // Glow should be undefined, but other effects might still exist
    expect(result?.glow).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Reflection (ECMA-376 Section 20.1.8.50)
// =============================================================================

describe("parseEffects - a:reflection (ECMA-376 Section 20.1.8.50)", () => {
  it("parses reflection with all attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:reflection", {
          blurRad: "9525", // 1px
          stA: "50000", // 50% start alpha
          endA: "0", // 0% end alpha
          dist: "19050", // 2px distance
          dir: "5400000", // 90 degrees
          fadeDir: "5400000", // 90 degrees fade
          sx: "100000", // 100% scale X
          sy: "-100000", // -100% scale Y (flip)
        }),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result).toBeDefined();
    expect(result?.reflection).toBeDefined();
    expect(result?.reflection?.blurRadius).toBeCloseTo(1, 0);
    expect(result?.reflection?.startOpacity).toBe(50);
    expect(result?.reflection?.endOpacity).toBe(0);
    expect(result?.reflection?.distance).toBeCloseTo(2, 0);
    expect(result?.reflection?.direction).toBe(90);
    expect(result?.reflection?.fadeDirection).toBe(90);
    expect(result?.reflection?.scaleX).toBe(100);
    expect(result?.reflection?.scaleY).toBe(-100);
  });

  it("parses reflection with minimal attributes", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:reflection", {})])]);
    const result = parseEffects(spPr);

    expect(result?.reflection).toBeDefined();
  });

  it("defaults to standard reflection values", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:reflection", {})])]);
    const result = parseEffects(spPr);

    expect(result?.reflection?.blurRadius).toBe(0);
    expect(result?.reflection?.startOpacity).toBe(100);
    expect(result?.reflection?.endOpacity).toBe(0);
    expect(result?.reflection?.distance).toBe(0);
    expect(result?.reflection?.scaleX).toBe(100);
    expect(result?.reflection?.scaleY).toBe(100);
  });
});

// =============================================================================
// parseEffects - Soft edge (ECMA-376 Section 20.1.8.53)
// =============================================================================

describe("parseEffects - a:softEdge (ECMA-376 Section 20.1.8.53)", () => {
  it("parses soft edge radius", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:softEdge", { rad: "38100" }), // 4px
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result).toBeDefined();
    expect(result?.softEdge).toBeDefined();
    expect(result?.softEdge?.radius).toBeCloseTo(4, 0);
  });

  it("returns undefined for soft edge without radius", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:softEdge", {})])]);
    const result = parseEffects(spPr);

    expect(result?.softEdge).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Alpha bi-level (ECMA-376 Section 20.1.8.1)
// =============================================================================

describe("parseEffects - a:alphaBiLevel (ECMA-376 Section 20.1.8.1)", () => {
  it("parses alpha bi-level threshold", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaBiLevel", { thresh: "50000" })])]);

    const result = parseEffects(spPr);
    expect(result?.alphaBiLevel?.threshold).toBe(50);
  });

  it("returns undefined when threshold is missing", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaBiLevel", {})])]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Alpha ceiling (ECMA-376 Section 20.1.8.2)
// =============================================================================

describe("parseEffects - a:alphaCeiling (ECMA-376 Section 20.1.8.2)", () => {
  it("parses alpha ceiling effect", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaCeiling", {})])]);

    const result = parseEffects(spPr);
    expect(result?.alphaCeiling?.type).toBe("alphaCeiling");
  });
});

// =============================================================================
// parseEffects - Alpha floor (ECMA-376 Section 20.1.8.3)
// =============================================================================

describe("parseEffects - a:alphaFloor (ECMA-376 Section 20.1.8.3)", () => {
  it("parses alpha floor effect", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaFloor", {})])]);

    const result = parseEffects(spPr);
    expect(result?.alphaFloor?.type).toBe("alphaFloor");
  });
});

// =============================================================================
// parseEffects - Alpha inverse (ECMA-376 Section 20.1.8.4)
// =============================================================================

describe("parseEffects - a:alphaInv (ECMA-376 Section 20.1.8.4)", () => {
  it("parses alpha inverse effect", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaInv", {})])]);

    const result = parseEffects(spPr);
    expect(result?.alphaInv?.type).toBe("alphaInv");
  });
});

// =============================================================================
// parseEffects - Alpha modulate (ECMA-376 Section 20.1.8.5)
// =============================================================================

describe("parseEffects - a:alphaMod (ECMA-376 Section 20.1.8.5)", () => {
  it("parses alpha modulate effect container attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [el("a:alphaMod", {}, [el("a:cont", { type: "tree", name: "alphaModContainer" })])]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.alphaMod?.type).toBe("alphaMod");
    expect(result?.alphaMod?.containerType).toBe("tree");
    expect(result?.alphaMod?.name).toBe("alphaModContainer");
    expect(result?.alphaMod?.container?.type).toBe("tree");
    expect(result?.alphaMod?.container?.name).toBe("alphaModContainer");
  });

  it("returns undefined when container is missing", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst", {}, [el("a:alphaMod", {})])]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Alpha modulate fixed (ECMA-376 Section 20.1.8.6)
// =============================================================================

describe("parseEffects - a:alphaModFix (ECMA-376 Section 20.1.8.6)", () => {
  it("parses alpha modulate fixed amount", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaModFix", { amt: "25000" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.alphaModFix?.amount).toBe(25);
  });

  it("defaults to 100% when amount is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaModFix", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.alphaModFix?.amount).toBe(100);
  });
});

// =============================================================================
// parseEffects - Alpha outset (ECMA-376 Section 20.1.8.7)
// =============================================================================

describe("parseEffects - a:alphaOutset (ECMA-376 Section 20.1.8.7)", () => {
  it("parses alpha outset radius", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaOutset", { rad: "19050" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.alphaOutset?.radius).toBeCloseTo(2, 0);
  });

  it("returns undefined when radius is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaOutset", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Alpha replace (ECMA-376 Section 20.1.8.8)
// =============================================================================

describe("parseEffects - a:alphaRepl (ECMA-376 Section 20.1.8.8)", () => {
  it("parses alpha replace value", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaRepl", { a: "75000" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.alphaRepl?.alpha).toBe(75);
  });

  it("returns undefined when alpha is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:alphaRepl", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Bi-level (ECMA-376 Section 20.1.8.11)
// =============================================================================

describe("parseEffects - a:biLevel (ECMA-376 Section 20.1.8.11)", () => {
  it("parses bi-level threshold", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:biLevel", { thresh: "30000" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.biLevel?.threshold).toBe(30);
  });

  it("returns undefined when threshold is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:biLevel", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Blend (ECMA-376 Section 20.1.8.12)
// =============================================================================

describe("parseEffects - a:blend (ECMA-376 Section 20.1.8.12)", () => {
  it("parses blend effect attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:blend", { blend: "screen" }, [
          el("a:cont", { type: "sib", name: "blendContainer" }),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.blend?.type).toBe("blend");
    expect(result?.blend?.blend).toBe("screen");
    expect(result?.blend?.containerType).toBe("sib");
    expect(result?.blend?.name).toBe("blendContainer");
    expect(result?.blend?.container?.type).toBe("sib");
    expect(result?.blend?.container?.name).toBe("blendContainer");
  });

  it("returns undefined when blend attribute is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:blend", {}, [
          el("a:cont", {}),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });

  it("returns undefined when container is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:blend", { blend: "over" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Color change (ECMA-376 Section 20.1.8.16)
// =============================================================================

describe("parseEffects - a:clrChange (ECMA-376 Section 20.1.8.16)", () => {
  it("parses color change from/to and useAlpha", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:clrChange", { useA: "0" }, [
          el("a:clrFrom", {}, [el("a:srgbClr", { val: "112233" })]),
          el("a:clrTo", {}, [el("a:srgbClr", { val: "AABBCC" })]),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.colorChange?.from).toEqual(createColor("112233"));
    expect(result?.colorChange?.to).toEqual(createColor("AABBCC"));
    expect(result?.colorChange?.useAlpha).toBe(false);
  });

  it("defaults useAlpha to true", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:clrChange", {}, [
          el("a:clrFrom", {}, [el("a:srgbClr", { val: "000000" })]),
          el("a:clrTo", {}, [el("a:srgbClr", { val: "FFFFFF" })]),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.colorChange?.useAlpha).toBe(true);
  });

  it("returns undefined when colors are missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:clrChange", {}, [
          el("a:clrFrom", {}, [el("a:srgbClr", { val: "000000" })]),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Color replace (ECMA-376 Section 20.1.8.18)
// =============================================================================

describe("parseEffects - a:clrRepl (ECMA-376 Section 20.1.8.18)", () => {
  it("parses color replace value", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:clrRepl", {}, [
          el("a:srgbClr", { val: "FF00FF" }),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.colorReplace?.color).toEqual(createColor("FF00FF"));
  });

  it("returns undefined when color is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:clrRepl", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Duotone (ECMA-376 Section 20.1.8.23)
// =============================================================================

describe("parseEffects - a:duotone (ECMA-376 Section 20.1.8.23)", () => {
  it("parses duotone colors", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:duotone", {}, [
          el("a:srgbClr", { val: "112233" }),
          el("a:srgbClr", { val: "AABBCC" }),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.duotone?.colors).toEqual([createColor("112233"), createColor("AABBCC")]);
  });

  it("returns undefined when fewer than two colors are provided", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:duotone", {}, [
          el("a:srgbClr", { val: "112233" }),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Fill overlay (ECMA-376 Section 20.1.8.29)
// =============================================================================

describe("parseEffects - a:fillOverlay (ECMA-376 Section 20.1.8.29)", () => {
  it("parses fill overlay blend and fill type", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:fillOverlay", { blend: "darken" }, [
          el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.fillOverlay?.blend).toBe("darken");
    expect(result?.fillOverlay?.fillType).toBe("solidFill");
  });

  it("returns undefined when blend is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:fillOverlay", {}, [
          el("a:solidFill", {}, [el("a:srgbClr", { val: "000000" })]),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });

  it("returns undefined when fill is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:fillOverlay", { blend: "over" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Gray scale (ECMA-376 Section 20.1.8.34)
// =============================================================================

describe("parseEffects - a:grayscl (ECMA-376 Section 20.1.8.34)", () => {
  it("parses gray scale effect", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:grayscl", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.grayscale?.type).toBe("grayscl");
  });
});

// =============================================================================
// parseEffects - Preset shadow (ECMA-376 Section 20.1.8.49)
// =============================================================================

describe("parseEffects - a:prstShdw (ECMA-376 Section 20.1.8.49)", () => {
  it("parses preset shadow attributes", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:prstShdw", { prst: "shdw5", dist: "19050", dir: "5400000" }, [
          el("a:srgbClr", { val: "112233" }),
        ]),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.presetShadow?.type).toBe("preset");
    expect(result?.presetShadow?.preset).toBe("shdw5");
    expect(result?.presetShadow?.color).toEqual(createColor("112233"));
    expect(result?.presetShadow?.distance).toBeCloseTo(2, 0);
    expect(result?.presetShadow?.direction).toBe(90);
  });

  it("returns undefined when preset or color is missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:prstShdw", { dist: "19050" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Relative offset (ECMA-376 Section 20.1.8.51)
// =============================================================================

describe("parseEffects - a:relOff (ECMA-376 Section 20.1.8.51)", () => {
  it("parses relative offset percentages", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:relOff", { tx: "50000", ty: "25000" }),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result?.relativeOffset?.offsetX).toBe(50);
    expect(result?.relativeOffset?.offsetY).toBe(25);
  });

  it("returns undefined when offsets are missing", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:relOff", {}),
      ]),
    ]);

    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// parseEffects - Multiple effects
// =============================================================================

describe("parseEffects - Multiple effects", () => {
  it("parses multiple effects together", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", { blurRad: "38100" }, [el("a:srgbClr", { val: "000000" })]),
        el("a:glow", { rad: "57150" }, [el("a:srgbClr", { val: "FFFF00" })]),
        el("a:reflection", { blurRad: "9525" }),
        el("a:softEdge", { rad: "19050" }),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow).toBeDefined();
    expect(result?.glow).toBeDefined();
    expect(result?.reflection).toBeDefined();
    expect(result?.softEdge).toBeDefined();
  });

  it("parses shadow and glow together", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", { blurRad: "38100", dist: "19050" }, [el("a:srgbClr", { val: "333333" })]),
        el("a:glow", { rad: "76200" }, [el("a:srgbClr", { val: "FFFF00" })]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow?.type).toBe("outer");
    expect(result?.glow).toBeDefined();
  });
});

// =============================================================================
// parseEffects - Effect DAG (ECMA-376 Section 20.1.8.24)
// =============================================================================

describe("parseEffects - a:effectDag (ECMA-376 Section 20.1.8.24)", () => {
  it("parses effects from effectDag", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectDag", {}, [el("a:outerShdw", { blurRad: "38100" }, [el("a:srgbClr", { val: "000000" })])]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow).toBeDefined();
  });

  it("prefers effectLst over effectDag", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", { blurRad: "38100" }, [
          el("a:srgbClr", { val: "FF0000" }), // Red
        ]),
      ]),
      el("a:effectDag", {}, [
        el("a:outerShdw", { blurRad: "38100" }, [
          el("a:srgbClr", { val: "0000FF" }), // Blue
        ]),
      ]),
    ]);
    const result = parseEffects(spPr);

    expect(result?.shadow).toBeDefined();
    // Should use effectLst version (red)
  });
});

// =============================================================================
// parseEffects - Edge cases
// =============================================================================

describe("parseEffects - Edge cases", () => {
  it("returns undefined for undefined input", () => {
    const result = parseEffects(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when no effect container exists", () => {
    const spPr = el("p:spPr", {}, [el("a:solidFill")]);
    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty effect list", () => {
    const spPr = el("p:spPr", {}, [el("a:effectLst")]);
    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });

  it("handles effect list with only invalid effects", () => {
    const spPr = el("p:spPr", {}, [
      el("a:effectLst", {}, [
        el("a:outerShdw", {}), // No color - invalid
        el("a:glow", {}), // No color - invalid
      ]),
    ]);
    const result = parseEffects(spPr);
    expect(result).toBeUndefined();
  });
});
