/**
 * @file Tests for transform parsing
 *
 * ECMA-376 Part 1, Section 20.1.7.6 - a:xfrm (2D Transform)
 * This element specifies the 2D transform for a shape.
 *
 * Related sections:
 * - 20.1.7.4 a:off (Offset)
 * - 20.1.7.3 a:ext (Extent)
 * - 20.1.7.1 a:chOff (Child Offset)
 * - 20.1.7.2 a:chExt (Child Extent)
 *
 * Coordinate units:
 * - Position and size are in EMU (English Metric Units)
 * - 914400 EMU = 1 inch = 96 pixels at 96 DPI
 * - Rotation is in 1/60000 of a degree
 * - 5400000 = 90 degrees
 *
 * @see ECMA-376 Part 1, Section 20.1.7.6
 */

import type { XmlElement } from "../../../xml/index";
import {
  parseTransform,
  parseGroupTransform,
  getTransformFromProperties,
  getGroupTransformFromProperties,
  applyGroupTransform,
} from "./transform-parser";
import type { Transform, GroupTransform } from "../../domain/index";
import { px, deg } from "../../domain/types";

// Helper to create mock XmlElement
function el(name: string, attrs: Record<string, string> = {}, children: XmlElement[] = []): XmlElement {
  return { type: "element", name, attrs, children };
}

// =============================================================================
// parseTransform - Basic parsing (ECMA-376 Section 20.1.7.6)
// =============================================================================

describe("parseTransform - a:xfrm (ECMA-376 Section 20.1.7.6)", () => {
  describe("Position (a:off - Section 20.1.7.4)", () => {
    it("parses x and y position from a:off", () => {
      // 914400 EMU = 1 inch = 96px at standard DPI
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "914400", y: "914400" }),
        el("a:ext", { cx: "1828800", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result).toBeDefined();
      expect(result?.x).toBeCloseTo(96, 0);
      expect(result?.y).toBeCloseTo(96, 0);
    });

    it("defaults position to 0 when attributes missing", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", {}), el("a:ext", { cx: "914400", cy: "914400" })]);
      const result = parseTransform(xfrm);

      expect(result?.x).toBe(0);
      expect(result?.y).toBe(0);
    });

    it("handles negative positions", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "-914400", y: "-457200" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.x).toBeCloseTo(-96, 0);
      expect(result?.y).toBeCloseTo(-48, 0);
    });
  });

  describe("Size (a:ext - Section 20.1.7.3)", () => {
    it("parses width and height from a:ext", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "1828800", cy: "914400" })]);
      const result = parseTransform(xfrm);

      // 1828800 EMU = 2 inches = 192px
      expect(result?.width).toBeCloseTo(192, 0);
      expect(result?.height).toBeCloseTo(96, 0);
    });

    it("defaults size to 0 when attributes missing", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", {})]);
      const result = parseTransform(xfrm);

      expect(result?.width).toBe(0);
      expect(result?.height).toBe(0);
    });

    it("handles large sizes", () => {
      // 9144000 EMU = 10 inches = 960px
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "9144000", cy: "6858000" })]);
      const result = parseTransform(xfrm);

      expect(result?.width).toBeCloseTo(960, 0);
      expect(result?.height).toBeCloseTo(720, 0);
    });
  });

  describe("Rotation (rot attribute)", () => {
    it("parses rotation in 1/60000 degrees", () => {
      // 5400000 = 90 degrees
      const xfrm = el("a:xfrm", { rot: "5400000" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBe(90);
    });

    it("parses 45 degree rotation", () => {
      // 2700000 = 45 degrees
      const xfrm = el("a:xfrm", { rot: "2700000" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBe(45);
    });

    it("parses 180 degree rotation", () => {
      // 10800000 = 180 degrees
      const xfrm = el("a:xfrm", { rot: "10800000" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBe(180);
    });

    it("parses 270 degree rotation", () => {
      // 16200000 = 270 degrees
      const xfrm = el("a:xfrm", { rot: "16200000" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBe(270);
    });

    it("defaults rotation to 0 when not specified", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBe(0);
    });

    it("handles fractional degrees", () => {
      // 60000 = 1 degree, so 30000 = 0.5 degrees
      const xfrm = el("a:xfrm", { rot: "30000" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.rotation).toBeCloseTo(0.5, 1);
    });
  });

  describe("Flip (flipH, flipV attributes)", () => {
    it("parses flipH='1' as true", () => {
      const xfrm = el("a:xfrm", { flipH: "1" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.flipH).toBe(true);
      expect(result?.flipV).toBe(false);
    });

    it("parses flipV='1' as true", () => {
      const xfrm = el("a:xfrm", { flipV: "1" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.flipH).toBe(false);
      expect(result?.flipV).toBe(true);
    });

    it("parses both flips together", () => {
      const xfrm = el("a:xfrm", { flipH: "1", flipV: "1" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.flipH).toBe(true);
      expect(result?.flipV).toBe(true);
    });

    it("parses flipH='0' as false", () => {
      const xfrm = el("a:xfrm", { flipH: "0" }, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseTransform(xfrm);

      expect(result?.flipH).toBe(false);
    });

    it("defaults flips to false when not specified", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" }), el("a:ext", { cx: "914400", cy: "914400" })]);
      const result = parseTransform(xfrm);

      expect(result?.flipH).toBe(false);
      expect(result?.flipV).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = parseTransform(undefined);
      expect(result).toBeUndefined();
    });

    it("returns undefined when a:off is missing", () => {
      const xfrm = el("a:xfrm", {}, [el("a:ext", { cx: "914400", cy: "914400" })]);
      const result = parseTransform(xfrm);
      expect(result).toBeUndefined();
    });

    it("returns undefined when a:ext is missing", () => {
      const xfrm = el("a:xfrm", {}, [el("a:off", { x: "0", y: "0" })]);
      const result = parseTransform(xfrm);
      expect(result).toBeUndefined();
    });
  });
});

// =============================================================================
// parseGroupTransform - Group shape transform (ECMA-376 Section 20.1.7.6)
// =============================================================================

describe("parseGroupTransform - Group transform", () => {
  describe("Child offset (a:chOff - Section 20.1.7.1)", () => {
    it("parses child offset from a:chOff", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "914400", y: "914400" }),
        el("a:ext", { cx: "1828800", cy: "1371600" }),
        el("a:chOff", { x: "0", y: "0" }),
        el("a:chExt", { cx: "9144000", cy: "6858000" }),
      ]);
      const result = parseGroupTransform(xfrm);

      expect(result).toBeDefined();
      expect(result?.childOffsetX).toBe(0);
      expect(result?.childOffsetY).toBe(0);
    });

    it("parses non-zero child offset", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
        el("a:chOff", { x: "914400", y: "457200" }),
        el("a:chExt", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseGroupTransform(xfrm);

      expect(result?.childOffsetX).toBeCloseTo(96, 0);
      expect(result?.childOffsetY).toBeCloseTo(48, 0);
    });
  });

  describe("Child extent (a:chExt - Section 20.1.7.2)", () => {
    it("parses child extent from a:chExt", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "686100" }),
        el("a:chOff", { x: "0", y: "0" }),
        el("a:chExt", { cx: "9144000", cy: "6858000" }),
      ]);
      const result = parseGroupTransform(xfrm);

      expect(result?.childExtentWidth).toBeCloseTo(960, 0);
      expect(result?.childExtentHeight).toBeCloseTo(720, 0);
    });
  });

  describe("Inherits shape transform properties", () => {
    it("includes position, size, rotation, and flip", () => {
      const xfrm = el("a:xfrm", { rot: "5400000", flipH: "1" }, [
        el("a:off", { x: "914400", y: "457200" }),
        el("a:ext", { cx: "1828800", cy: "914400" }),
        el("a:chOff", { x: "0", y: "0" }),
        el("a:chExt", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseGroupTransform(xfrm);

      expect(result?.x).toBeCloseTo(96, 0);
      expect(result?.y).toBeCloseTo(48, 0);
      expect(result?.width).toBeCloseTo(192, 0);
      expect(result?.height).toBeCloseTo(96, 0);
      expect(result?.rotation).toBe(90);
      expect(result?.flipH).toBe(true);
      expect(result?.flipV).toBe(false);
    });
  });

  describe("Edge cases", () => {
    it("returns undefined for undefined input", () => {
      const result = parseGroupTransform(undefined);
      expect(result).toBeUndefined();
    });

    it("returns undefined when a:chOff is missing", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
        el("a:chExt", { cx: "914400", cy: "914400" }),
      ]);
      const result = parseGroupTransform(xfrm);
      expect(result).toBeUndefined();
    });

    it("returns undefined when a:chExt is missing", () => {
      const xfrm = el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "914400" }),
        el("a:chOff", { x: "0", y: "0" }),
      ]);
      const result = parseGroupTransform(xfrm);
      expect(result).toBeUndefined();
    });
  });
});

// =============================================================================
// getTransformFromProperties - Convenience function
// =============================================================================

describe("getTransformFromProperties - Convenience function", () => {
  it("extracts transform from spPr element", () => {
    const spPr = el("p:spPr", {}, [
      el("a:xfrm", {}, [el("a:off", { x: "914400", y: "914400" }), el("a:ext", { cx: "1828800", cy: "914400" })]),
    ]);
    const result = getTransformFromProperties(spPr);

    expect(result).toBeDefined();
    expect(result?.x).toBeCloseTo(96, 0);
    expect(result?.width).toBeCloseTo(192, 0);
  });

  it("returns undefined for undefined input", () => {
    const result = getTransformFromProperties(undefined);
    expect(result).toBeUndefined();
  });

  it("returns undefined when spPr has no xfrm", () => {
    const spPr = el("p:spPr", {}, [el("a:solidFill")]);
    const result = getTransformFromProperties(spPr);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// getGroupTransformFromProperties - Convenience function
// =============================================================================

describe("getGroupTransformFromProperties - Convenience function", () => {
  it("extracts group transform from grpSpPr element", () => {
    const grpSpPr = el("p:grpSpPr", {}, [
      el("a:xfrm", {}, [
        el("a:off", { x: "0", y: "0" }),
        el("a:ext", { cx: "914400", cy: "686100" }),
        el("a:chOff", { x: "0", y: "0" }),
        el("a:chExt", { cx: "9144000", cy: "6858000" }),
      ]),
    ]);
    const result = getGroupTransformFromProperties(grpSpPr);

    expect(result).toBeDefined();
    expect(result?.childExtentWidth).toBeCloseTo(960, 0);
  });

  it("returns undefined for undefined input", () => {
    const result = getGroupTransformFromProperties(undefined);
    expect(result).toBeUndefined();
  });
});

// =============================================================================
// applyGroupTransform - Coordinate mapping
// =============================================================================

describe("applyGroupTransform - Coordinate mapping", () => {
  describe("Position transformation", () => {
    it("scales and translates child position", () => {
      const child: Transform = {
        x: px(480), // Center of child space (960/2)
        y: px(360), // Center of child space (720/2)
        width: px(100),
        height: px(50),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(100),
        y: px(100),
        width: px(192), // Scale 0.2x
        height: px(144), // Scale 0.2x
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(960),
        childExtentHeight: px(720),
      };

      const result = applyGroupTransform(child, group);

      // x: 100 + (480 - 0) * (192/960) = 100 + 480 * 0.2 = 196
      expect(result.x).toBeCloseTo(196, 0);
      // y: 100 + (360 - 0) * (144/720) = 100 + 360 * 0.2 = 172
      expect(result.y).toBeCloseTo(172, 0);
    });

    it("handles child offset", () => {
      const child: Transform = {
        x: px(100),
        y: px(100),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(50),
        y: px(50),
        width: px(200),
        height: px(200),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(50), // Child space starts at 50
        childOffsetY: px(50),
        childExtentWidth: px(200),
        childExtentHeight: px(200),
      };

      const result = applyGroupTransform(child, group);

      // x: 50 + (100 - 50) * 1 = 100
      expect(result.x).toBe(100);
      expect(result.y).toBe(100);
    });
  });

  describe("Size transformation", () => {
    it("scales child size", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(200),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100), // Scale 0.5x
        height: px(50),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(200),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.width).toBe(100); // 200 * 0.5
      expect(result.height).toBe(50); // 100 * 0.5
    });
  });

  describe("Rotation combination", () => {
    it("adds child rotation to group rotation", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(45),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(90),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(100),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.rotation).toBe(135); // 45 + 90
    });

    it("wraps rotation at 360 degrees", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(270),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(180),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(100),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.rotation).toBe(90); // (270 + 180) % 360
    });
  });

  describe("Flip XOR logic", () => {
    it("XORs flip states - child only", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: true,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(100),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.flipH).toBe(true); // true XOR false = true
      expect(result.flipV).toBe(false); // false XOR false = false
    });

    it("XORs flip states - group only", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: true,
        flipV: true,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(100),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.flipH).toBe(true); // false XOR true = true
      expect(result.flipV).toBe(true); // false XOR true = true
    });

    it("XORs flip states - both set (cancels out)", () => {
      const child: Transform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: true,
        flipV: true,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: true,
        flipV: true,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(100),
        childExtentHeight: px(100),
      };

      const result = applyGroupTransform(child, group);

      expect(result.flipH).toBe(false); // true XOR true = false
      expect(result.flipV).toBe(false); // true XOR true = false
    });
  });

  describe("Edge cases", () => {
    it("handles zero child extent (no scaling)", () => {
      const child: Transform = {
        x: px(100),
        y: px(100),
        width: px(50),
        height: px(50),
        rotation: deg(0),
        flipH: false,
        flipV: false,
      };

      const group: GroupTransform = {
        x: px(0),
        y: px(0),
        width: px(100),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(0), // Zero extent
        childExtentHeight: px(0),
      };

      const result = applyGroupTransform(child, group);

      // Scale factor should be 1 when extent is 0
      expect(result.width).toBe(50);
      expect(result.height).toBe(50);
    });
  });
});
