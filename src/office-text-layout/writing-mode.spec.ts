/**
 * @file Tests for Writing Mode and Directional Coordinate Utilities
 *
 * Tests coordinate conversion between physical (x, y) and directional (inline, block)
 * coordinate systems for different writing modes.
 */

import { px } from "../ooxml/domain/units";
import {
  textDirectionToWritingMode,
  toDirectional,
  fromDirectional,
  toDirectionalSize,
  fromDirectionalSize,
  toDirectionalBounds,
  fromDirectionalBounds,
  isHorizontal,
  isVertical,
  getCssWritingMode,
} from "./writing-mode";
import type { PhysicalCoords, PhysicalSize, PhysicalBounds, DirectionalCoords, DirectionalSize, DirectionalBounds } from "./writing-mode";

// =============================================================================
// textDirectionToWritingMode Tests
// =============================================================================

describe("textDirectionToWritingMode", () => {
  it("converts lrTb to horizontal-tb", () => {
    expect(textDirectionToWritingMode("lrTb")).toBe("horizontal-tb");
  });

  it("converts lrTbV to horizontal-tb", () => {
    expect(textDirectionToWritingMode("lrTbV")).toBe("horizontal-tb");
  });

  it("converts tbRl to vertical-rl", () => {
    expect(textDirectionToWritingMode("tbRl")).toBe("vertical-rl");
  });

  it("converts tbRlV to vertical-rl", () => {
    expect(textDirectionToWritingMode("tbRlV")).toBe("vertical-rl");
  });

  it("converts btLr to vertical-lr", () => {
    expect(textDirectionToWritingMode("btLr")).toBe("vertical-lr");
  });

  it("converts tbLrV to vertical-lr", () => {
    expect(textDirectionToWritingMode("tbLrV")).toBe("vertical-lr");
  });
});

// =============================================================================
// Coordinate Conversion Tests - horizontal-tb
// =============================================================================

describe("coordinate conversion - horizontal-tb", () => {
  const mode = "horizontal-tb" as const;

  it("toDirectional preserves X as inline, Y as block", () => {
    const physical: PhysicalCoords = { x: px(100), y: px(200) };
    const directional = toDirectional(physical, mode);
    expect(directional.inline).toBe(px(100));
    expect(directional.block).toBe(px(200));
  });

  it("fromDirectional preserves inline as X, block as Y", () => {
    const directional: DirectionalCoords = { inline: px(100), block: px(200) };
    const physical = fromDirectional(directional, mode);
    expect(physical.x).toBe(px(100));
    expect(physical.y).toBe(px(200));
  });

  it("toDirectionalSize preserves width as inlineSize, height as blockSize", () => {
    const physical: PhysicalSize = { width: px(300), height: px(400) };
    const directional = toDirectionalSize(physical, mode);
    expect(directional.inlineSize).toBe(px(300));
    expect(directional.blockSize).toBe(px(400));
  });

  it("fromDirectionalSize preserves inlineSize as width, blockSize as height", () => {
    const directional: DirectionalSize = { inlineSize: px(300), blockSize: px(400) };
    const physical = fromDirectionalSize(directional, mode);
    expect(physical.width).toBe(px(300));
    expect(physical.height).toBe(px(400));
  });

  it("round-trip conversion is identity", () => {
    const original: PhysicalCoords = { x: px(50), y: px(75) };
    const roundTrip = fromDirectional(toDirectional(original, mode), mode);
    expect(roundTrip.x).toBe(original.x);
    expect(roundTrip.y).toBe(original.y);
  });
});

// =============================================================================
// Coordinate Conversion Tests - vertical-rl
// =============================================================================

describe("coordinate conversion - vertical-rl", () => {
  const mode = "vertical-rl" as const;

  it("toDirectional swaps axes: Y becomes inline, -X becomes block", () => {
    const physical: PhysicalCoords = { x: px(100), y: px(200) };
    const directional = toDirectional(physical, mode);
    expect(directional.inline).toBe(px(200)); // Y
    expect(directional.block).toBe(px(-100)); // -X (block increases leftward)
  });

  it("fromDirectional swaps axes: inline becomes Y, -block becomes X", () => {
    const directional: DirectionalCoords = { inline: px(200), block: px(-100) };
    const physical = fromDirectional(directional, mode);
    expect(physical.x).toBe(px(100)); // -(-100) = 100
    expect(physical.y).toBe(px(200)); // inline
  });

  it("toDirectionalSize swaps width/height", () => {
    const physical: PhysicalSize = { width: px(300), height: px(400) };
    const directional = toDirectionalSize(physical, mode);
    expect(directional.inlineSize).toBe(px(400)); // height becomes inline
    expect(directional.blockSize).toBe(px(300)); // width becomes block
  });

  it("fromDirectionalSize swaps inlineSize/blockSize", () => {
    const directional: DirectionalSize = { inlineSize: px(400), blockSize: px(300) };
    const physical = fromDirectionalSize(directional, mode);
    expect(physical.width).toBe(px(300)); // block becomes width
    expect(physical.height).toBe(px(400)); // inline becomes height
  });
});

// =============================================================================
// Coordinate Conversion Tests - vertical-lr
// =============================================================================

describe("coordinate conversion - vertical-lr", () => {
  const mode = "vertical-lr" as const;

  it("toDirectional swaps axes: Y becomes inline, X becomes block", () => {
    const physical: PhysicalCoords = { x: px(100), y: px(200) };
    const directional = toDirectional(physical, mode);
    expect(directional.inline).toBe(px(200)); // Y
    expect(directional.block).toBe(px(100)); // X (block increases rightward)
  });

  it("fromDirectional swaps axes: inline becomes Y, block becomes X", () => {
    const directional: DirectionalCoords = { inline: px(200), block: px(100) };
    const physical = fromDirectional(directional, mode);
    expect(physical.x).toBe(px(100)); // block
    expect(physical.y).toBe(px(200)); // inline
  });
});

// =============================================================================
// Bounds Conversion Tests
// =============================================================================

describe("bounds conversion", () => {
  it("toDirectionalBounds converts both position and size", () => {
    const physical: PhysicalBounds = { x: px(10), y: px(20), width: px(100), height: px(50) };
    const directional = toDirectionalBounds(physical, "horizontal-tb");
    expect(directional.inline).toBe(px(10));
    expect(directional.block).toBe(px(20));
    expect(directional.inlineSize).toBe(px(100));
    expect(directional.blockSize).toBe(px(50));
  });

  it("fromDirectionalBounds converts both position and size", () => {
    const directional: DirectionalBounds = { inline: px(10), block: px(20), inlineSize: px(100), blockSize: px(50) };
    const physical = fromDirectionalBounds(directional, "horizontal-tb");
    expect(physical.x).toBe(px(10));
    expect(physical.y).toBe(px(20));
    expect(physical.width).toBe(px(100));
    expect(physical.height).toBe(px(50));
  });
});

// =============================================================================
// Predicate Tests
// =============================================================================

describe("writing mode predicates", () => {
  it("isHorizontal returns true for horizontal-tb", () => {
    expect(isHorizontal("horizontal-tb")).toBe(true);
  });

  it("isHorizontal returns false for vertical modes", () => {
    expect(isHorizontal("vertical-rl")).toBe(false);
    expect(isHorizontal("vertical-lr")).toBe(false);
  });

  it("isVertical returns false for horizontal-tb", () => {
    expect(isVertical("horizontal-tb")).toBe(false);
  });

  it("isVertical returns true for vertical modes", () => {
    expect(isVertical("vertical-rl")).toBe(true);
    expect(isVertical("vertical-lr")).toBe(true);
  });
});

// =============================================================================
// CSS Writing Mode Tests
// =============================================================================

describe("getCssWritingMode", () => {
  it("returns the mode as-is for CSS compatibility", () => {
    expect(getCssWritingMode("horizontal-tb")).toBe("horizontal-tb");
    expect(getCssWritingMode("vertical-rl")).toBe("vertical-rl");
    expect(getCssWritingMode("vertical-lr")).toBe("vertical-lr");
  });
});
