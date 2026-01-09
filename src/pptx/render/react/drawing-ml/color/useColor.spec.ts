/**
 * @file Tests for useColor hook
 *
 * Tests color resolution for all 5 color types and transforms.
 */

import type { Color } from "../../../../domain/color/types";
import type { ColorContext } from "../../../../domain/resolution";
import type { SchemeColorValue } from "../../../../domain/types";
import { deg, pct } from "../../../../domain/types";
import { resolveColorForReact } from "./useColor";

// =============================================================================
// Test Fixtures
// =============================================================================

const testColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    dk2: "1F497D",
    lt2: "EEECE1",
    accent1: "4F81BD",
    accent2: "C0504D",
    accent3: "9BBB59",
    accent4: "8064A2",
    accent5: "4BACC6",
    accent6: "F79646",
    hlink: "0000FF",
    folHlink: "800080",
  },
  colorMap: {
    tx1: "dk1",
    bg1: "lt1",
    tx2: "dk2",
    bg2: "lt2",
  },
};

// =============================================================================
// Color Type Tests
// =============================================================================

describe("resolveColorForReact", () => {
  describe("undefined color", () => {
    it("returns transparent for undefined color", () => {
      const result = resolveColorForReact(undefined, testColorContext);

      expect(result.hex).toBeUndefined();
      expect(result.cssColor).toBe("transparent");
      expect(result.alpha).toBe(1);
      expect(result.isResolved).toBe(false);
    });
  });

  describe("srgb color", () => {
    it("resolves direct hex color", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("FF0000");
      expect(result.cssColor).toBe("#FF0000");
      expect(result.alpha).toBe(1);
      expect(result.isResolved).toBe(true);
    });
  });

  describe("scheme color", () => {
    it("resolves theme color via color scheme", () => {
      const color: Color = {
        spec: { type: "scheme", value: "accent1" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("4F81BD");
      expect(result.cssColor).toBe("#4F81BD");
      expect(result.isResolved).toBe(true);
    });

    it("resolves color via color map", () => {
      // tx1 maps to dk1 in colorMap
      const color: Color = {
        spec: { type: "scheme", value: "tx1" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("000000");
      expect(result.cssColor).toBe("#000000");
      expect(result.isResolved).toBe(true);
    });

    it("returns unresolved for missing scheme color", () => {
      const color: Color = {
        // Cast to test edge case with unknown value
        spec: { type: "scheme", value: "unknownColor" as SchemeColorValue },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.isResolved).toBe(false);
      expect(result.cssColor).toBe("transparent");
    });
  });

  describe("preset color", () => {
    it("resolves named preset color", () => {
      const color: Color = {
        spec: { type: "preset", value: "red" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("FF0000");
      expect(result.cssColor).toBe("#FF0000");
      expect(result.isResolved).toBe(true);
    });

    it("resolves coral preset", () => {
      const color: Color = {
        spec: { type: "preset", value: "coral" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("FF7F50");
      expect(result.cssColor).toBe("#FF7F50");
      expect(result.isResolved).toBe(true);
    });
  });

  describe("system color", () => {
    it("resolves system color with lastColor", () => {
      const color: Color = {
        spec: { type: "system", value: "windowText", lastColor: "123456" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("123456");
      expect(result.cssColor).toBe("#123456");
      expect(result.isResolved).toBe(true);
    });

    it("falls back to system color default", () => {
      const color: Color = {
        spec: { type: "system", value: "windowText" },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("000000");
      expect(result.isResolved).toBe(true);
    });
  });

  describe("hsl color", () => {
    it("resolves HSL color to hex", () => {
      // Red in HSL: hue=0, sat=100%, lum=50%
      const color: Color = {
        spec: { type: "hsl", hue: deg(0), saturation: pct(100), luminance: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("FF0000");
      expect(result.cssColor).toBe("#FF0000");
      expect(result.isResolved).toBe(true);
    });

    it("resolves blue HSL color", () => {
      // Blue in HSL: hue=240, sat=100%, lum=50%
      const color: Color = {
        spec: { type: "hsl", hue: deg(240), saturation: pct(100), luminance: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("0000FF");
      expect(result.isResolved).toBe(true);
    });
  });
});

// =============================================================================
// Color Transform Tests
// =============================================================================

describe("color transforms", () => {
  describe("alpha transform", () => {
    it("extracts alpha from transform", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { alpha: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("FF0000");
      expect(result.alpha).toBe(0.5);
      expect(result.isResolved).toBe(true);
    });

    it("handles 0% alpha", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { alpha: pct(0) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.alpha).toBe(0);
    });

    it("handles 100% alpha", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { alpha: pct(100) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.alpha).toBe(1);
    });
  });

  describe("shade transform", () => {
    it("applies shade to darken color", () => {
      // 50% shade should halve RGB values
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { shade: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      // FF0000 with 50% shade -> 800000 (approximately)
      expect(result.hex).toBe("800000");
      expect(result.isResolved).toBe(true);
    });
  });

  describe("tint transform", () => {
    it("applies tint to lighten color", () => {
      // 50% tint should move halfway to white
      const color: Color = {
        spec: { type: "srgb", value: "000000" },
        transform: { tint: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      // 000000 with 50% tint -> 808080 (approximately)
      expect(result.hex).toBe("808080");
      expect(result.isResolved).toBe(true);
    });
  });

  describe("satMod transform", () => {
    it("modifies saturation", () => {
      // Red with 0% saturation -> gray
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { satMod: pct(0) },
      };

      const result = resolveColorForReact(color, testColorContext);

      // Pure red desaturated should become gray
      expect(result.isResolved).toBe(true);
    });
  });

  describe("lumMod transform", () => {
    it("modifies luminance", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { lumMod: pct(50) },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.isResolved).toBe(true);
      // Luminance modification changes the brightness
    });
  });

  describe("comp transform", () => {
    it("returns complement color", () => {
      // Red complement -> Cyan
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { comp: true },
      };

      const result = resolveColorForReact(color, testColorContext);

      expect(result.hex).toBe("00FFFF");
      expect(result.isResolved).toBe(true);
    });
  });

  describe("gray transform", () => {
    it("converts to grayscale", () => {
      const color: Color = {
        spec: { type: "srgb", value: "FF0000" },
        transform: { gray: true },
      };

      const result = resolveColorForReact(color, testColorContext);

      // Red converted to grayscale using luminance formula
      expect(result.isResolved).toBe(true);
      // R, G, B should all be equal
      const r = parseInt(result.hex!.slice(0, 2), 16);
      const g = parseInt(result.hex!.slice(2, 4), 16);
      const b = parseInt(result.hex!.slice(4, 6), 16);
      expect(r).toBe(g);
      expect(g).toBe(b);
    });
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe("edge cases", () => {
  it("handles missing colorContext", () => {
    const color: Color = {
      spec: { type: "srgb", value: "FF0000" },
    };

    const result = resolveColorForReact(color, undefined);

    expect(result.hex).toBe("FF0000");
    expect(result.isResolved).toBe(true);
  });

  it("handles empty colorScheme", () => {
    const color: Color = {
      spec: { type: "scheme", value: "accent1" },
    };

    const result = resolveColorForReact(color, { colorScheme: {}, colorMap: {} });

    expect(result.isResolved).toBe(false);
  });
});
