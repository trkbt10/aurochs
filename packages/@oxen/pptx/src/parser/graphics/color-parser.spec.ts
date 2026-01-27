/**
 * @file Tests for ECMA-376 compliant color parsing
 *
 * Tests parsing of DrawingML color elements per ECMA-376 Part 1, Section 20.1.2.3.
 *
 * @see ECMA-376 Part 1, Section 20.1.2.3 (Color Types)
 */

import { findColorElement, parseColor, parseColorFromParent } from "./color-parser";
import type { XmlElement } from "@oxen/xml";

// =============================================================================
// Test Helpers
// =============================================================================

/**
 * Create a mock XmlElement for testing
 */
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// findColorElement - Color Element Detection
// =============================================================================

describe("findColorElement", () => {
  it("finds a:srgbClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:srgbClr", { val: "FF0000" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:srgbClr");
  });

  it("finds a:schemeClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:schemeClr", { val: "accent1" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:schemeClr");
  });

  it("finds a:sysClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:sysClr", { val: "windowText", lastClr: "000000" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:sysClr");
  });

  it("finds a:prstClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:prstClr", { val: "red" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:prstClr");
  });

  it("finds a:hslClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:hslClr", { hue: "0", sat: "100000", lum: "50000" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:hslClr");
  });

  it("finds a:scrgbClr in parent", () => {
    const parent = el("a:solidFill", {}, [el("a:scrgbClr", { r: "100000", g: "0", b: "0" })]);
    const result = findColorElement(parent);
    expect(result).toBeDefined();
    expect(result?.name).toBe("a:scrgbClr");
  });

  it("returns undefined when no color element found", () => {
    const parent = el("a:solidFill", {}, []);
    const result = findColorElement(parent);
    expect(result).toBeUndefined();
  });

  it("ignores non-color elements", () => {
    const parent = el("a:solidFill", {}, [el("a:someOther", { val: "test" })]);
    const result = findColorElement(parent);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// a:srgbClr - Section 20.1.2.3.32
// =============================================================================

describe("parseColor - a:srgbClr (ECMA-376 Section 20.1.2.3.32)", () => {
  it("parses hex color value", () => {
    const srgbClr = el("a:srgbClr", { val: "FF0000" });
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("srgb");
    if (result?.spec.type === "srgb") {
      expect(result.spec.value).toBe("FF0000");
    }
  });

  it("normalizes lowercase hex to uppercase", () => {
    const srgbClr = el("a:srgbClr", { val: "ff00ff" });
    const result = parseColor(srgbClr);

    expect(result?.spec.type).toBe("srgb");
    if (result?.spec.type === "srgb") {
      expect(result.spec.value).toBe("FF00FF");
    }
  });

  it("parses with alpha transform", () => {
    // OOXML: 100000 = 100%, Percent type: 100 = 100%
    const srgbClr = el("a:srgbClr", { val: "0000FF" }, [
      el("a:alpha", { val: "50000" }), // 50%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.alpha).toBe(50); // 50%
  });

  it("parses with shade transform", () => {
    const srgbClr = el("a:srgbClr", { val: "FF0000" }, [
      el("a:shade", { val: "75000" }), // 75%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.shade).toBe(75); // 75%
  });

  it("parses with tint transform", () => {
    const srgbClr = el("a:srgbClr", { val: "0000FF" }, [
      el("a:tint", { val: "40000" }), // 40%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.tint).toBe(40); // 40%
  });

  it("parses with gamma transform", () => {
    const srgbClr = el("a:srgbClr", { val: "123456" }, [el("a:gamma")]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.gamma).toBe(true);
  });

  it("parses with invGamma transform", () => {
    const srgbClr = el("a:srgbClr", { val: "123456" }, [el("a:invGamma")]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.invGamma).toBe(true);
  });

  it("parses with green transform", () => {
    const srgbClr = el("a:srgbClr", { val: "336633" }, [
      el("a:green", { val: "100000" }), // 100%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.green).toBe(100); // 100%
  });

  it("parses with greenMod transform", () => {
    const srgbClr = el("a:srgbClr", { val: "336633" }, [
      el("a:greenMod", { val: "60000" }), // 60%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.greenMod).toBe(60); // 60%
  });

  it("parses with greenOff transform", () => {
    const srgbClr = el("a:srgbClr", { val: "336633" }, [
      el("a:greenOff", { val: "20000" }), // 20%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.greenOff).toBe(20); // 20%
  });

  it("parses with redMod transform", () => {
    const srgbClr = el("a:srgbClr", { val: "663333" }, [
      el("a:redMod", { val: "60000" }), // 60%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.redMod).toBe(60); // 60%
  });

  it("parses with redOff transform", () => {
    const srgbClr = el("a:srgbClr", { val: "663333" }, [
      el("a:redOff", { val: "20000" }), // 20%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.redOff).toBe(20); // 20%
  });

  it("parses with blueMod transform", () => {
    const srgbClr = el("a:srgbClr", { val: "3366FF" }, [
      el("a:blueMod", { val: "60000" }), // 60%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.blueMod).toBe(60); // 60%
  });

  it("parses with blueOff transform", () => {
    const srgbClr = el("a:srgbClr", { val: "336633" }, [
      el("a:blueOff", { val: "20000" }), // 20%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.blueOff).toBe(20); // 20%
  });

  it("parses with multiple transforms", () => {
    const srgbClr = el("a:srgbClr", { val: "00FF00" }, [
      el("a:alpha", { val: "80000" }), // 80%
      el("a:shade", { val: "90000" }), // 90%
      el("a:lumMod", { val: "75000" }), // 75%
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.alpha).toBe(80); // 80%
    expect(result?.transform?.shade).toBe(90); // 90%
    expect(result?.transform?.lumMod).toBe(75); // 75%
  });

  it("returns undefined for missing val attribute", () => {
    const srgbClr = el("a:srgbClr", {});
    const result = parseColor(srgbClr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// a:schemeClr - Section 20.1.2.3.29
// =============================================================================

describe("parseColor - a:schemeClr (ECMA-376 Section 20.1.2.3.29)", () => {
  describe("Standard scheme colors", () => {
    const schemeColors = [
      "dk1",
      "dk2",
      "lt1",
      "lt2",
      "accent1",
      "accent2",
      "accent3",
      "accent4",
      "accent5",
      "accent6",
      "hlink",
      "folHlink",
    ];

    for (const color of schemeColors) {
      it(`parses ${color} scheme color`, () => {
        const schemeClr = el("a:schemeClr", { val: color });
        const result = parseColor(schemeClr);

        expect(result).toBeDefined();
        expect(result?.spec.type).toBe("scheme");
        if (result?.spec.type === "scheme") {
          expect(result.spec.value).toBe(color);
        }
      });
    }
  });

  describe("Mapped scheme colors", () => {
    it("parses tx1 (text 1 - maps to dk1)", () => {
      const schemeClr = el("a:schemeClr", { val: "tx1" });
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("tx1");
      }
    });

    it("parses tx2 (text 2 - maps to dk2)", () => {
      const schemeClr = el("a:schemeClr", { val: "tx2" });
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("tx2");
      }
    });

    it("parses bg1 (background 1 - maps to lt1)", () => {
      const schemeClr = el("a:schemeClr", { val: "bg1" });
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("bg1");
      }
    });

    it("parses bg2 (background 2 - maps to lt2)", () => {
      const schemeClr = el("a:schemeClr", { val: "bg2" });
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("bg2");
      }
    });

    it("parses phClr (placeholder color)", () => {
      const schemeClr = el("a:schemeClr", { val: "phClr" });
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      if (result?.spec.type === "scheme") {
        expect(result.spec.value).toBe("phClr");
      }
    });
  });

  describe("With transforms", () => {
    it("parses with shade transform", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:shade", { val: "50000" }), // 50%
      ]);
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      expect(result?.transform?.shade).toBe(50); // 50%
    });

    it("parses with lumMod and lumOff transforms", () => {
      const schemeClr = el("a:schemeClr", { val: "dk1" }, [
        el("a:lumMod", { val: "65000" }), // 65%
        el("a:lumOff", { val: "35000" }), // 35%
      ]);
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      expect(result?.transform?.lumMod).toBe(65); // 65%
      expect(result?.transform?.lumOff).toBe(35); // 35%
    });

    it("parses with satMod transform", () => {
      const schemeClr = el("a:schemeClr", { val: "accent2" }, [
        el("a:satMod", { val: "150000" }), // 150%
      ]);
      const result = parseColor(schemeClr);

      expect(result?.spec.type).toBe("scheme");
      expect(result?.transform?.satMod).toBe(150); // 150%
    });
  });
});

// =============================================================================
// a:sysClr - Section 20.1.2.3.33
// =============================================================================

describe("parseColor - a:sysClr (ECMA-376 Section 20.1.2.3.33)", () => {
  it("parses windowText system color", () => {
    const sysClr = el("a:sysClr", { val: "windowText", lastClr: "000000" });
    const result = parseColor(sysClr);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("system");
    if (result?.spec.type === "system") {
      expect(result.spec.value).toBe("windowText");
      expect(result.spec.lastColor).toBe("000000");
    }
  });

  it("parses window system color", () => {
    const sysClr = el("a:sysClr", { val: "window", lastClr: "FFFFFF" });
    const result = parseColor(sysClr);

    expect(result?.spec.type).toBe("system");
    if (result?.spec.type === "system") {
      expect(result.spec.value).toBe("window");
      expect(result.spec.lastColor).toBe("FFFFFF");
    }
  });

  it("parses without lastClr attribute", () => {
    const sysClr = el("a:sysClr", { val: "highlight" });
    const result = parseColor(sysClr);

    expect(result?.spec.type).toBe("system");
    if (result?.spec.type === "system") {
      expect(result.spec.value).toBe("highlight");
      expect(result.spec.lastColor).toBeUndefined();
    }
  });

  it("parses with alpha transform", () => {
    const sysClr = el("a:sysClr", { val: "windowText" }, [
      el("a:alpha", { val: "75000" }), // 75%
    ]);
    const result = parseColor(sysClr);

    expect(result?.transform?.alpha).toBe(75); // 75%
  });
});

// =============================================================================
// a:prstClr - Section 20.1.2.3.22
// =============================================================================

describe("parseColor - a:prstClr (ECMA-376 Section 20.1.2.3.22)", () => {
  const presetColors = [
    "aliceBlue",
    "antiqueWhite",
    "aqua",
    "aquamarine",
    "azure",
    "beige",
    "bisque",
    "black",
    "blanchedAlmond",
    "blue",
    "red",
    "green",
    "yellow",
    "white",
    "gray",
  ];

  for (const color of presetColors) {
    it(`parses ${color} preset color`, () => {
      const prstClr = el("a:prstClr", { val: color });
      const result = parseColor(prstClr);

      expect(result).toBeDefined();
      expect(result?.spec.type).toBe("preset");
      if (result?.spec.type === "preset") {
        expect(result.spec.value).toBe(color);
      }
    });
  }

  it("parses with transforms", () => {
    const prstClr = el("a:prstClr", { val: "red" }, [
      el("a:alpha", { val: "50000" }), // 50%
      el("a:shade", { val: "80000" }), // 80%
    ]);
    const result = parseColor(prstClr);

    expect(result?.spec.type).toBe("preset");
    expect(result?.transform?.alpha).toBe(50); // 50%
    expect(result?.transform?.shade).toBe(80); // 80%
  });
});

// =============================================================================
// a:hslClr - Section 20.1.2.3.13
// =============================================================================

describe("parseColor - a:hslClr (ECMA-376 Section 20.1.2.3.13)", () => {
  it("parses HSL color with all attributes", () => {
    // hue is in 1/60000 of a degree (0-21600000 = 0-360 degrees)
    // sat and lum are in 1/100000, converted to Percent (100 = 100%)
    const hslClr = el("a:hslClr", {
      hue: "10800000", // 180 degrees
      sat: "100000", // 100%
      lum: "50000", // 50%
    });
    const result = parseColor(hslClr);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("hsl");
    if (result?.spec.type === "hsl") {
      expect(result.spec.hue).toBe(180);
      expect(result.spec.saturation).toBe(100); // 100%
      expect(result.spec.luminance).toBe(50); // 50%
    }
  });

  it("parses red (hue=0)", () => {
    const hslClr = el("a:hslClr", {
      hue: "0",
      sat: "100000",
      lum: "50000",
    });
    const result = parseColor(hslClr);

    expect(result?.spec.type).toBe("hsl");
    if (result?.spec.type === "hsl") {
      expect(result.spec.hue).toBe(0);
    }
  });

  it("parses with transforms", () => {
    const hslClr = el(
      "a:hslClr",
      {
        hue: "0",
        sat: "100000",
        lum: "50000",
      },
      [
        el("a:alpha", { val: "60000" }), // 60%
      ],
    );
    const result = parseColor(hslClr);

    expect(result?.spec.type).toBe("hsl");
    expect(result?.transform?.alpha).toBe(60); // 60%
  });

  it("returns undefined for missing attributes", () => {
    const hslClr = el("a:hslClr", { hue: "0" }); // missing sat and lum
    const result = parseColor(hslClr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// a:scrgbClr - Section 20.1.2.3.30
// =============================================================================

describe("parseColor - a:scrgbClr (ECMA-376 Section 20.1.2.3.30)", () => {
  it("parses scRGB color with all attributes", () => {
    // r, g, b are in 1/100000 (100000 = 100%)
    const scrgbClr = el("a:scrgbClr", {
      r: "100000", // 100%
      g: "50000", // 50%
      b: "0", // 0%
    });
    const result = parseColor(scrgbClr);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("scrgb");
    if (result?.spec.type === "scrgb") {
      expect(result.spec.red).toBe(100);
      expect(result.spec.green).toBe(50);
      expect(result.spec.blue).toBe(0);
    }
  });

  it("parses white (all 100%)", () => {
    const scrgbClr = el("a:scrgbClr", {
      r: "100000",
      g: "100000",
      b: "100000",
    });
    const result = parseColor(scrgbClr);

    expect(result?.spec.type).toBe("scrgb");
    if (result?.spec.type === "scrgb") {
      expect(result.spec.red).toBe(100);
      expect(result.spec.green).toBe(100);
      expect(result.spec.blue).toBe(100);
    }
  });

  it("parses black (all 0%)", () => {
    const scrgbClr = el("a:scrgbClr", {
      r: "0",
      g: "0",
      b: "0",
    });
    const result = parseColor(scrgbClr);

    expect(result?.spec.type).toBe("scrgb");
    if (result?.spec.type === "scrgb") {
      expect(result.spec.red).toBe(0);
      expect(result.spec.green).toBe(0);
      expect(result.spec.blue).toBe(0);
    }
  });

  it("parses with transforms", () => {
    const scrgbClr = el(
      "a:scrgbClr",
      {
        r: "100000",
        g: "0",
        b: "0",
      },
      [
        el("a:alpha", { val: "75000" }), // 75%
      ],
    );
    const result = parseColor(scrgbClr);

    expect(result?.spec.type).toBe("scrgb");
    expect(result?.transform?.alpha).toBe(75);
  });

  it("returns undefined for missing attributes", () => {
    const scrgbClr = el("a:scrgbClr", { r: "100000" }); // missing g and b
    const result = parseColor(scrgbClr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Color Transforms - Section 20.1.2.3.*
// =============================================================================

describe("Color Transforms (ECMA-376 Section 20.1.2.3)", () => {
  // Note: Percent type uses 100 = 100% (not 1.0 = 100%)
  // OOXML uses 100000 = 100%, parser converts to Percent (100 = 100%)

  describe("a:alpha (Section 20.1.2.3.1)", () => {
    it("parses alpha value as percentage", () => {
      const srgbClr = el("a:srgbClr", { val: "FF0000" }, [
        el("a:alpha", { val: "50000" }), // 50%
      ]);
      const result = parseColor(srgbClr);
      expect(result?.transform?.alpha).toBe(50); // 50%
    });

    it("parses 0% alpha (fully transparent)", () => {
      const srgbClr = el("a:srgbClr", { val: "FF0000" }, [el("a:alpha", { val: "0" })]);
      const result = parseColor(srgbClr);
      expect(result?.transform?.alpha).toBe(0); // 0%
    });

    it("parses 100% alpha (fully opaque)", () => {
      const srgbClr = el("a:srgbClr", { val: "FF0000" }, [el("a:alpha", { val: "100000" })]);
      const result = parseColor(srgbClr);
      expect(result?.transform?.alpha).toBe(100); // 100%
    });
  });

  describe("a:shade (Section 20.1.2.3.31)", () => {
    it("parses shade value (darkens color)", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:shade", { val: "75000" }), // 75%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.shade).toBe(75); // 75%
    });
  });

  describe("a:tint (Section 20.1.2.3.35)", () => {
    it("parses tint value (lightens color)", () => {
      const schemeClr = el("a:schemeClr", { val: "dk1" }, [
        el("a:tint", { val: "40000" }), // 40%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.tint).toBe(40); // 40%
    });
  });

  describe("a:lumMod and a:lumOff (Sections 20.1.2.3.20, 20.1.2.3.21)", () => {
    it("parses luminance modulation", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:lumMod", { val: "50000" }), // 50%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.lumMod).toBe(50); // 50%
    });

    it("parses luminance offset", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:lumOff", { val: "25000" }), // 25%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.lumOff).toBe(25); // 25%
    });

    it("parses combined lumMod and lumOff", () => {
      const schemeClr = el("a:schemeClr", { val: "dk1" }, [
        el("a:lumMod", { val: "65000" }), // 65%
        el("a:lumOff", { val: "35000" }), // 35%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.lumMod).toBe(65); // 65%
      expect(result?.transform?.lumOff).toBe(35); // 35%
    });
  });

  describe("a:satMod and a:satOff (Sections 20.1.2.3.27, 20.1.2.3.28)", () => {
    it("parses saturation modulation", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:satMod", { val: "200000" }), // 200%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.satMod).toBe(200); // 200%
    });

    it("parses saturation offset", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:satOff", { val: "-20000" }), // -20%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.satOff).toBe(-20); // -20%
    });
  });

  describe("a:hueMod (Section 20.1.2.3.14)", () => {
    it("parses hue modulation", () => {
      const schemeClr = el("a:schemeClr", { val: "accent1" }, [
        el("a:hueMod", { val: "50000" }), // 50%
      ]);
      const result = parseColor(schemeClr);
      expect(result?.transform?.hueMod).toBe(50); // 50%
    });
  });
});

// =============================================================================
// parseColorFromParent - Convenience Function
// =============================================================================

describe("parseColorFromParent", () => {
  it("parses color from solidFill parent", () => {
    const solidFill = el("a:solidFill", {}, [el("a:srgbClr", { val: "00FF00" })]);
    const result = parseColorFromParent(solidFill);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("srgb");
    if (result?.spec.type === "srgb") {
      expect(result.spec.value).toBe("00FF00");
    }
  });

  it("parses color from gradient stop", () => {
    const gs = el("a:gs", { pos: "0" }, [el("a:schemeClr", { val: "accent1" })]);
    const result = parseColorFromParent(gs);

    expect(result).toBeDefined();
    expect(result?.spec.type).toBe("scheme");
  });

  it("returns undefined for parent without color", () => {
    const parent = el("a:solidFill", {}, []);
    const result = parseColorFromParent(parent);
    expect(result).toBeUndefined();
  });

  it("returns undefined for undefined input", () => {
    const result = parseColorFromParent(undefined);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("Edge cases", () => {
  it("returns undefined for undefined element", () => {
    const result = parseColor(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined for unknown element", () => {
    const unknownEl = el("a:unknownClr", { val: "test" });
    const result = parseColor(unknownEl);
    expect(result).toBeUndefined();
  });

  it("handles empty transform list", () => {
    const srgbClr = el("a:srgbClr", { val: "FF0000" }, []);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform).toBeUndefined();
  });

  it("ignores unknown transform children", () => {
    const srgbClr = el("a:srgbClr", { val: "FF0000" }, [
      el("a:alpha", { val: "50000" }), // 50%
      el("a:unknownTransform", { val: "test" }),
    ]);
    const result = parseColor(srgbClr);

    expect(result).toBeDefined();
    expect(result?.transform?.alpha).toBe(50); // 50%
  });
});
