/**
 * @file Tests for SVG slide utilities
 *
 * Tests buildGroupTransformAttr for ECMA-376 compliance.
 *
 * @see ECMA-376 Part 1, Section 20.1.7.5 (grpSpPr)
 */

import { buildGroupTransformAttr, buildTransformAttr, createDefsCollector } from "./slide-utils";
import type { GroupTransform, Transform } from "@aurochs-office/pptx/domain/types";
import { px, deg } from "@aurochs-office/drawing-ml/domain/units";

describe("buildGroupTransformAttr", () => {
  it("returns empty string for undefined transform", () => {
    expect(buildGroupTransformAttr(undefined)).toBe("");
  });

  it("applies basic translate for non-zero x, y", () => {
    const transform: GroupTransform = {
      x: px(100),
      y: px(50),
      width: px(200),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="translate(100, 50)"');
  });

  it("applies scale when childExtent differs from extent", () => {
    // Group is 400x200 but child space is 200x100
    // Scale should be 2x, 2x
    const transform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(400),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="scale(2, 2)"');
  });

  it("applies childOffset translation", () => {
    // Child coordinate system starts at (100, 50)
    const transform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(200),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(100),
      childOffsetY: px(50),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="translate(-100, -50)"');
  });

  it("combines translate, scale, and childOffset correctly", () => {
    // Group at (100, 50), 400x200 with child space 200x100 starting at (50, 25)
    // Expected: translate(100, 50) scale(2, 2) translate(-50, -25)
    const transform: GroupTransform = {
      x: px(100),
      y: px(50),
      width: px(400),
      height: px(200),
      rotation: deg(0),
      flipH: false,
      flipV: false,
      childOffsetX: px(50),
      childOffsetY: px(25),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="translate(100, 50) scale(2, 2) translate(-50, -25)"');
  });

  it("applies rotation around center before scaling", () => {
    const transform: GroupTransform = {
      x: px(100),
      y: px(50),
      width: px(200),
      height: px(100),
      rotation: deg(45),
      flipH: false,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="translate(100, 50) rotate(45, 100, 50)"');
  });

  it("applies flipH transform", () => {
    const transform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(200),
      height: px(100),
      rotation: deg(0),
      flipH: true,
      flipV: false,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="scale(-1, 1) translate(-200, 0)"');
  });

  it("applies flipV transform", () => {
    const transform: GroupTransform = {
      x: px(0),
      y: px(0),
      width: px(200),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: true,
      childOffsetX: px(0),
      childOffsetY: px(0),
      childExtentWidth: px(200),
      childExtentHeight: px(100),
    };
    const result = buildGroupTransformAttr(transform);
    expect(result).toBe(' transform="scale(1, -1) translate(0, -100)"');
  });

  describe("ECMA-376 compliance: group resize scenario", () => {
    it("correctly scales children when group is resized", () => {
      // Original group: 200x100 with child space 200x100 (scale = 1)
      // After resize: 400x200 with child space still 200x100 (scale = 2)
      // This is the scenario that caused the bug

      // Original (before resize)
      const originalTransform: GroupTransform = {
        x: px(100),
        y: px(50),
        width: px(200),
        height: px(100),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(200),
        childExtentHeight: px(100),
      };
      const originalAttr = buildGroupTransformAttr(originalTransform);
      // Only translate, no scale needed
      expect(originalAttr).toBe(' transform="translate(100, 50)"');

      // After resize (2x larger)
      const resizedTransform: GroupTransform = {
        x: px(100),
        y: px(50),
        width: px(400),
        height: px(200),
        rotation: deg(0),
        flipH: false,
        flipV: false,
        childOffsetX: px(0),
        childOffsetY: px(0),
        childExtentWidth: px(200), // Child space unchanged
        childExtentHeight: px(100),
      };
      const resizedAttr = buildGroupTransformAttr(resizedTransform);
      // Now needs scale(2, 2) to map child space to new size
      expect(resizedAttr).toBe(' transform="translate(100, 50) scale(2, 2)"');
    });
  });
});

describe("buildTransformAttr (for comparison)", () => {
  it("only applies translate and rotation, no scaling", () => {
    const transform: Transform = {
      x: px(100),
      y: px(50),
      width: px(200),
      height: px(100),
      rotation: deg(0),
      flipH: false,
      flipV: false,
    };
    const result = buildTransformAttr(transform, 200, 100);
    expect(result).toBe(' transform="translate(100, 50)"');
  });
});

describe("createDefsCollector", () => {
  it("generates sequential IDs", () => {
    const collector = createDefsCollector();
    expect(collector.getNextId("grad")).toBe("grad-0");
    expect(collector.getNextId("grad")).toBe("grad-1");
    expect(collector.getNextId("clip")).toBe("clip-2");
  });

  it("collects defs and generates element", () => {
    const collector = createDefsCollector();
    collector.addDef('<linearGradient id="test1"/>');
    collector.addDef('<clipPath id="test2"/>');
    const result = collector.toDefsElement();
    expect(result).toBe('<defs><linearGradient id="test1"/>\n<clipPath id="test2"/></defs>');
  });

  it("returns empty string when no defs", () => {
    const collector = createDefsCollector();
    expect(collector.toDefsElement()).toBe("");
  });
});
