/**
 * @file Tests for useEffects hook
 *
 * Tests effects resolution and SVG filter generation.
 */

import type { Effects, ShadowEffect, GlowEffect, SoftEdgeEffect } from "../../../../domain/effects";
import type { ColorContext } from "../../../../domain/resolution";
import { deg, px, pct } from "../../../../domain/types";
import { resolveEffectsForReact } from "./useEffects.js";
import { directionToOffset, resolveShadowProps } from "./ShadowFilter.js";
import { resolveGlowProps } from "./GlowFilter.js";

// =============================================================================
// Test Fixtures
// =============================================================================

function createMockGetNextId(): (prefix: string) => string {
  const counter = { value: 0 };
  return (prefix: string): string => `${prefix}-${counter.value++}`;
}

const testColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "FFFFFF",
    accent1: "4F81BD",
  },
  colorMap: {},
};

function createShadowEffect(): ShadowEffect {
  return {
    type: "outer",
    color: { spec: { type: "srgb", value: "000000" }, transform: { alpha: pct(50) } },
    blurRadius: px(4),
    distance: px(3),
    direction: deg(45),
  };
}

function createGlowEffect(): GlowEffect {
  return {
    color: { spec: { type: "srgb", value: "FF0000" }, transform: { alpha: pct(75) } },
    radius: px(6),
  };
}

function createSoftEdgeEffect(): SoftEdgeEffect {
  return {
    radius: px(5),
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("resolveEffectsForReact", () => {
  describe("undefined effects", () => {
    it("returns no effects for undefined", () => {
      const mockGetNextId = createMockGetNextId();
      const result = resolveEffectsForReact(undefined, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(false);
      expect(result.filterId).toBeUndefined();
      expect(result.filterUrl).toBeUndefined();
      expect(result.filterDef).toBeUndefined();
    });
  });

  describe("empty effects", () => {
    it("returns no effects for empty object", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = {};
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(false);
    });
  });

  describe("shadow effect", () => {
    it("resolves shadow effect", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = { shadow: createShadowEffect() };
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.filterId).toBe("effect-filter-0");
      expect(result.filterUrl).toBe("url(#effect-filter-0)");
      expect(result.filterDef).toBeDefined();
      expect(result.shadow).toBeDefined();
      expect(result.shadow?.blurRadius).toBe(4);
    });

    it("resolves shadow with scheme color", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = {
        shadow: {
          type: "outer",
          color: { spec: { type: "scheme", value: "dk1" } },
          blurRadius: px(4),
          distance: px(3),
          direction: deg(45),
        },
      };
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.shadow?.color).toBe("#000000");
    });
  });

  describe("glow effect", () => {
    it("resolves glow effect", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = { glow: createGlowEffect() };
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.glow).toBeDefined();
      expect(result.glow?.radius).toBe(6);
      expect(result.glow?.color).toBe("#FF0000");
      expect(result.glow?.opacity).toBe(0.75);
    });
  });

  describe("soft edge effect", () => {
    it("resolves soft edge effect", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = { softEdge: createSoftEdgeEffect() };
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.softEdgeRadius).toBe(5);
    });
  });

  describe("combined effects", () => {
    it("resolves multiple effects", () => {
      const mockGetNextId = createMockGetNextId();
      const effects: Effects = {
        shadow: createShadowEffect(),
        glow: createGlowEffect(),
      };
      const result = resolveEffectsForReact(effects, testColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.shadow).toBeDefined();
      expect(result.glow).toBeDefined();
    });
  });
});

describe("directionToOffset", () => {
  it("converts 0 degrees to positive X", () => {
    const { dx, dy } = directionToOffset(0, 10);
    expect(dx).toBeCloseTo(10, 5);
    expect(dy).toBeCloseTo(0, 5);
  });

  it("converts 90 degrees to positive Y", () => {
    const { dx, dy } = directionToOffset(90, 10);
    expect(dx).toBeCloseTo(0, 5);
    expect(dy).toBeCloseTo(10, 5);
  });

  it("converts 45 degrees to equal X and Y", () => {
    const { dx, dy } = directionToOffset(45, 10);
    expect(dx).toBeCloseTo(dy, 5);
  });

  it("converts 180 degrees to negative X", () => {
    const { dx, dy } = directionToOffset(180, 10);
    expect(dx).toBeCloseTo(-10, 5);
    expect(dy).toBeCloseTo(0, 5);
  });
});

describe("resolveShadowProps", () => {
  it("resolves shadow with alpha", () => {
    const shadow = createShadowEffect();
    const props = resolveShadowProps(shadow, testColorContext);

    expect(props).not.toBeNull();
    expect(props?.opacity).toBe(0.5);
    expect(props?.color).toBe("#000000");
    expect(props?.isInner).toBe(false);
  });

  it("resolves inner shadow", () => {
    const shadow: ShadowEffect = {
      type: "inner",
      color: { spec: { type: "srgb", value: "000000" } },
      blurRadius: px(4),
      distance: px(3),
      direction: deg(45),
    };
    const props = resolveShadowProps(shadow, testColorContext);

    expect(props?.isInner).toBe(true);
  });

  it("returns null for unresolved color", () => {
    const shadow: ShadowEffect = {
      type: "outer",
      // Use a valid scheme color key but with empty context
      color: { spec: { type: "scheme", value: "dk1" } },
      blurRadius: px(4),
      distance: px(3),
      direction: deg(45),
    };
    const emptyContext: ColorContext = { colorScheme: {}, colorMap: {} };
    const props = resolveShadowProps(shadow, emptyContext);

    expect(props).toBeNull();
  });
});

describe("resolveGlowProps", () => {
  it("resolves glow with alpha", () => {
    const glow = createGlowEffect();
    const props = resolveGlowProps(glow, testColorContext);

    expect(props).not.toBeNull();
    expect(props?.opacity).toBe(0.75);
    expect(props?.color).toBe("#FF0000");
    expect(props?.radius).toBe(6);
  });

  it("returns null for unresolved color", () => {
    const glow: GlowEffect = {
      // Use a valid scheme color key but with empty context
      color: { spec: { type: "scheme", value: "dk1" } },
      radius: px(6),
    };
    const emptyContext: ColorContext = { colorScheme: {}, colorMap: {} };
    const props = resolveGlowProps(glow, emptyContext);

    expect(props).toBeNull();
  });
});
