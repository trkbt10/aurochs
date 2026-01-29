/**
 * @file Tests for ECMA-376 compliant shape effects rendering
 *
 * @see ECMA-376 Part 1, Section 20.1.8.49 (outerShdw)
 * @see ECMA-376 Part 1, Section 20.1.8.40 (innerShdw)
 * @see ECMA-376 Part 1, Section 20.1.8.32 (glow)
 * @see ECMA-376 Part 1, Section 20.1.8.53 (softEdge)
 */

import { px, deg } from "@oxen-office/ooxml/domain/units";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { Effects, ShadowEffect, GlowEffect, SoftEdgeEffect } from "@oxen-office/pptx/domain";
import {
  generateEffectsFilterId,
  generateEffectsFilter,
  getFilterAttribute,
} from "./effects";

/**
 * Create a Color object for testing.
 * Uses sRGB color spec for simplicity.
 */
function createColor(hex: string): Color {
  return {
    spec: { type: "srgb", value: hex.replace("#", "") },
  };
}

// =============================================================================
// Filter ID Generation Tests
// =============================================================================

describe("generateEffectsFilterId", () => {
  it("generates unique ID based on shape ID", () => {
    const id = generateEffectsFilterId("shape1");
    expect(id).toBe("effect-shape1");
  });

  it("handles complex shape IDs", () => {
    const id = generateEffectsFilterId("slide1-shape2-group3");
    expect(id).toBe("effect-slide1-shape2-group3");
  });
});

// =============================================================================
// Outer Shadow Tests (ECMA-376 20.1.8.49)
// =============================================================================

describe("Outer Shadow - ECMA-376 20.1.8.49", () => {
  const createOuterShadow = (overrides: Partial<ShadowEffect> = {}): ShadowEffect => ({
    type: "outer",
    color: createColor("#000000"),
    blurRadius: px(4),
    distance: px(3),
    direction: deg(45),
    ...overrides,
  });

  it("generates filter with correct ID", () => {
    const effects: Effects = { shadow: createOuterShadow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result).toBeDefined();
    expect(result!.filterId).toBe("effect-shape1");
  });

  it("generates feGaussianBlur for blur radius", () => {
    const effects: Effects = { shadow: createOuterShadow({ blurRadius: px(8) }) };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feGaussianBlur");
    // stdDeviation = blurRadius / 2 = 4
    expect(result!.filterDef).toContain('stdDeviation="4"');
  });

  it("generates feOffset for shadow position", () => {
    const effects: Effects = {
      shadow: createOuterShadow({
        distance: px(10),
        direction: deg(0), // 0 degrees = right
      }),
    };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feOffset");
    // At 0 degrees: dx = 10, dy = 0
    expect(result!.filterDef).toContain('dx="10"');
  });

  it("generates feColorMatrix for shadow color", () => {
    const effects: Effects = {
      shadow: createOuterShadow({ color: createColor("#FF0000") }),
    };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feColorMatrix");
    expect(result!.filterDef).toContain('type="matrix"');
  });

  it("generates feMerge to combine shadow and source", () => {
    const effects: Effects = { shadow: createOuterShadow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feMerge>");
    expect(result!.filterDef).toContain("<feMergeNode");
    expect(result!.filterDef).toContain('in="shadow"');
    expect(result!.filterDef).toContain('in="SourceGraphic"');
  });

  it("uses extended filter bounds for shadow overflow", () => {
    const effects: Effects = { shadow: createOuterShadow() };
    const result = generateEffectsFilter(effects, "shape1");

    // Filter should extend beyond shape bounds for shadow visibility
    expect(result!.filterDef).toContain('x="-50%"');
    expect(result!.filterDef).toContain('width="200%"');
  });
});

// =============================================================================
// Inner Shadow Tests (ECMA-376 20.1.8.40)
// =============================================================================

describe("Inner Shadow - ECMA-376 20.1.8.40", () => {
  const createInnerShadow = (overrides: Partial<ShadowEffect> = {}): ShadowEffect => ({
    type: "inner",
    color: createColor("#000000"),
    blurRadius: px(4),
    distance: px(3),
    direction: deg(45),
    ...overrides,
  });

  it("generates filter for inner shadow type", () => {
    const effects: Effects = { shadow: createInnerShadow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result).toBeDefined();
    expect(result!.filterDef).toContain("<filter");
  });

  it("uses feComposite to clip shadow inside shape", () => {
    const effects: Effects = { shadow: createInnerShadow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feComposite");
    expect(result!.filterDef).toContain('operator="in"');
  });

  it("inverts offset direction for inner shadow", () => {
    const effects: Effects = {
      shadow: createInnerShadow({
        distance: px(10),
        direction: deg(0), // 0 degrees = right
      }),
    };
    const result = generateEffectsFilter(effects, "shape1");

    // Inner shadow offset should be inverted (-dx, -dy)
    expect(result!.filterDef).toContain('dx="-10"');
  });
});

// =============================================================================
// Glow Effect Tests (ECMA-376 20.1.8.32)
// =============================================================================

describe("Glow Effect - ECMA-376 20.1.8.32", () => {
  const createGlow = (overrides: Partial<GlowEffect> = {}): GlowEffect => ({
    color: createColor("#FFFF00"),
    radius: px(8),
    ...overrides,
  });

  it("generates filter for glow effect", () => {
    const effects: Effects = { glow: createGlow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result).toBeDefined();
    expect(result!.filterId).toBe("effect-shape1");
  });

  it("generates feGaussianBlur for glow spread", () => {
    const effects: Effects = { glow: createGlow({ radius: px(12) }) };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feGaussianBlur");
    // stdDeviation = radius / 2 = 6
    expect(result!.filterDef).toContain('stdDeviation="6"');
  });

  it("applies glow color via feColorMatrix", () => {
    const effects: Effects = { glow: createGlow({ color: createColor("#00FF00") }) };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feColorMatrix");
  });

  it("renders glow behind source graphic", () => {
    const effects: Effects = { glow: createGlow() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feMerge>");
    expect(result!.filterDef).toContain('in="glow"');
    expect(result!.filterDef).toContain('in="SourceGraphic"');
  });
});

// =============================================================================
// Soft Edge Effect Tests (ECMA-376 20.1.8.53)
// =============================================================================

describe("Soft Edge Effect - ECMA-376 20.1.8.53", () => {
  const createSoftEdge = (overrides: Partial<SoftEdgeEffect> = {}): SoftEdgeEffect => ({
    radius: px(6),
    ...overrides,
  });

  it("generates filter for soft edge effect", () => {
    const effects: Effects = { softEdge: createSoftEdge() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result).toBeDefined();
    expect(result!.filterId).toBe("effect-shape1");
  });

  it("generates feGaussianBlur for edge fading", () => {
    const effects: Effects = { softEdge: createSoftEdge({ radius: px(10) }) };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feGaussianBlur");
    // stdDeviation = radius / 2 = 5
    expect(result!.filterDef).toContain('stdDeviation="5"');
  });

  it("uses feComposite to apply soft edge to shape", () => {
    const effects: Effects = { softEdge: createSoftEdge() };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain("<feComposite");
    expect(result!.filterDef).toContain('in="SourceGraphic"');
  });
});

// =============================================================================
// Effect Priority Tests
// =============================================================================

describe("Effect Priority", () => {
  it("prioritizes shadow over glow", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: createColor("#000000"),
        blurRadius: px(4),
        distance: px(3),
        direction: deg(45),
      },
      glow: { color: createColor("#FFFF00"), radius: px(8) },
    };
    const result = generateEffectsFilter(effects, "shape1");

    // Shadow should be rendered, not glow
    expect(result!.filterDef).toContain('in="shadow"');
    expect(result!.filterDef).not.toContain('in="glow"');
  });

  it("prioritizes glow over soft edge", () => {
    const effects: Effects = {
      glow: { color: createColor("#FFFF00"), radius: px(8) },
      softEdge: { radius: px(6) },
    };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toContain('in="glow"');
  });
});

// =============================================================================
// getFilterAttribute Tests
// =============================================================================

describe("getFilterAttribute", () => {
  it("returns undefined when no effects", () => {
    const attr = getFilterAttribute(undefined, "shape1");
    expect(attr).toBeUndefined();
  });

  it("returns undefined for empty effects", () => {
    const attr = getFilterAttribute({}, "shape1");
    expect(attr).toBeUndefined();
  });

  it("returns filter URL for shadow effect", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: createColor("#000000"),
        blurRadius: px(4),
        distance: px(3),
        direction: deg(45),
      },
    };
    const attr = getFilterAttribute(effects, "shape1");
    expect(attr).toBe("url(#effect-shape1)");
  });

  it("returns filter URL for glow effect", () => {
    const effects: Effects = {
      glow: { color: createColor("#FFFF00"), radius: px(8) },
    };
    const attr = getFilterAttribute(effects, "shape1");
    expect(attr).toBe("url(#effect-shape1)");
  });

  it("returns filter URL for soft edge effect", () => {
    const effects: Effects = {
      softEdge: { radius: px(6) },
    };
    const attr = getFilterAttribute(effects, "shape1");
    expect(attr).toBe("url(#effect-shape1)");
  });
});

// =============================================================================
// SVG Structure Validation
// =============================================================================

describe("SVG filter structure", () => {
  it("generates valid SVG filter element", () => {
    const effects: Effects = {
      shadow: {
        type: "outer",
        color: createColor("#000000"),
        blurRadius: px(4),
        distance: px(3),
        direction: deg(45),
      },
    };
    const result = generateEffectsFilter(effects, "shape1");

    expect(result!.filterDef).toMatch(/<filter\s/);
    expect(result!.filterDef).toMatch(/id="[^"]+"/);
    expect(result!.filterDef).toContain("</filter>");
  });
});
