/**
 * @file HTML fill rendering tests
 *
 * Tests for converting Fill domain objects to CSS background values.
 * These tests use the same domain objects that SVG renderer would use,
 * ensuring consistent handling across renderers.
 *
 * @see ECMA-376 Part 1, Section 20.1.8 (Fills)
 */

import { resolvedFillToBackground, fillToBackground, resolvedLineToBorder, lineToBorder } from "./fill";
import type { Fill, Line } from "@oxen-office/pptx/domain";
import type { ResolvedFill, ResolvedLine } from "@oxen-office/pptx/domain/color/fill";
import { pct, px } from "@oxen-office/ooxml/domain/units";

// =============================================================================
// resolvedFillToBackground Tests
// =============================================================================

describe("resolvedFillToBackground", () => {
  describe("none fill", () => {
    it("returns transparent for none fill", () => {
      const fill: ResolvedFill = { type: "none" };
      expect(resolvedFillToBackground(fill)).toBe("transparent");
    });
  });

  describe("solid fill", () => {
    it("renders solid red (full alpha uses hex)", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "FF0000", alpha: 1 },
      };
      // alpha >= 1 returns hex format
      expect(resolvedFillToBackground(fill)).toBe("#FF0000");
    });

    it("renders solid blue with alpha (uses rgba)", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "0000FF", alpha: 0.5 },
      };
      expect(resolvedFillToBackground(fill)).toBe("rgba(0, 0, 255, 0.5)");
    });

    it("renders black", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "000000", alpha: 1 },
      };
      expect(resolvedFillToBackground(fill)).toBe("#000000");
    });

    it("renders white", () => {
      const fill: ResolvedFill = {
        type: "solid",
        color: { hex: "FFFFFF", alpha: 1 },
      };
      expect(resolvedFillToBackground(fill)).toBe("#FFFFFF");
    });
  });

  describe("gradient fill", () => {
    it("renders linear gradient", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 0,
        stops: [
          { position: 0, color: { hex: "FF0000", alpha: 1 } },
          { position: 100, color: { hex: "0000FF", alpha: 1 } },
        ],
        isRadial: false,
      };
      const result = resolvedFillToBackground(fill);
      expect(result).toContain("linear-gradient");
      expect(result).toContain("90deg");
      expect(result).toContain("#FF0000");
      expect(result).toContain("#0000FF");
    });

    it("renders gradient with angle", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 45,
        stops: [
          { position: 0, color: { hex: "000000", alpha: 1 } },
          { position: 100, color: { hex: "FFFFFF", alpha: 1 } },
        ],
        isRadial: false,
      };
      const result = resolvedFillToBackground(fill);
      expect(result).toContain("45deg");
    });

    it("renders radial gradient", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 0,
        stops: [
          { position: 0, color: { hex: "FFFFFF", alpha: 1 } },
          { position: 100, color: { hex: "000000", alpha: 1 } },
        ],
        isRadial: true,
        radialCenter: { cx: 50, cy: 50 },
      };
      const result = resolvedFillToBackground(fill);
      expect(result).toContain("radial-gradient");
      expect(result).toContain("circle at 50% 50%");
    });

    it("returns transparent for empty stops", () => {
      const fill: ResolvedFill = {
        type: "gradient",
        angle: 0,
        stops: [],
        isRadial: false,
      };
      expect(resolvedFillToBackground(fill)).toBe("transparent");
    });
  });

  describe("unresolved fill", () => {
    it("returns transparent for unresolved fill", () => {
      const fill: ResolvedFill = { type: "unresolved", originalType: "solidFill" };
      expect(resolvedFillToBackground(fill)).toBe("transparent");
    });
  });
});

// =============================================================================
// fillToBackground Tests (with domain Fill objects)
// =============================================================================

describe("fillToBackground", () => {
  it("renders noFill as transparent", () => {
    const fill: Fill = { type: "noFill" };
    expect(fillToBackground(fill)).toBe("transparent");
  });

  it("renders srgb solid fill", () => {
    const fill: Fill = {
      type: "solidFill",
      color: { spec: { type: "srgb", value: "FF0000" } },
    };
    expect(fillToBackground(fill)).toBe("#FF0000");
  });

  it("renders solid fill with alpha", () => {
    // Note: alpha is divided by 100 in current implementation
    // ECMA-376 uses 0-100000 range, so 50 = 50%
    const fill: Fill = {
      type: "solidFill",
      color: {
        spec: { type: "srgb", value: "00FF00" },
        transform: { alpha: pct(50) },
      },
    };
    expect(fillToBackground(fill)).toBe("rgba(0, 255, 0, 0.5)");
  });

  it("renders scheme color with context", () => {
    const fill: Fill = {
      type: "solidFill",
      color: { spec: { type: "scheme", value: "accent1" } },
    };
    const colorContext = {
      colorScheme: { accent1: "4472C4" },
      colorMap: {},
    };
    expect(fillToBackground(fill, colorContext)).toBe("#4472C4");
  });
});

// =============================================================================
// resolvedLineToBorder Tests
// =============================================================================

describe("resolvedLineToBorder", () => {
  it("renders none for no fill", () => {
    const line: ResolvedLine = {
      width: 1,
      fill: { type: "none" },
      dash: "solid",
      cap: "flat",
      join: "round",
    };
    expect(resolvedLineToBorder(line)).toBe("none");
  });

  it("renders solid line (full alpha uses hex)", () => {
    const line: ResolvedLine = {
      width: 2,
      fill: { type: "solid", color: { hex: "000000", alpha: 1 } },
      dash: "solid",
      cap: "flat",
      join: "round",
    };
    expect(resolvedLineToBorder(line)).toBe("2px solid #000000");
  });

  it("renders dashed line", () => {
    const line: ResolvedLine = {
      width: 1,
      fill: { type: "solid", color: { hex: "FF0000", alpha: 1 } },
      dash: "dash",
      cap: "flat",
      join: "round",
    };
    expect(resolvedLineToBorder(line)).toBe("1px dashed #FF0000");
  });
});

// =============================================================================
// lineToBorder Tests
// =============================================================================

describe("lineToBorder", () => {
  it("renders solid line from domain object", () => {
    const line: Line = {
      width: px(2),
      cap: "flat",
      compound: "sng",
      alignment: "ctr",
      fill: {
        type: "solidFill",
        color: { spec: { type: "srgb", value: "000000" } },
      },
      dash: "solid",
      join: "round",
    };
    expect(lineToBorder(line)).toBe("2px solid #000000");
  });
});
