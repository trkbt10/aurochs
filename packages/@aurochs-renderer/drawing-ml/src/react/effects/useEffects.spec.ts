/**
 * @file Tests for useEffects
 */

// describe, it, expect are provided by the test runner globals
import { resolveEffectsForReact } from "./useEffects";
import type { Effects } from "@aurochs-office/drawing-ml/domain/effects";
import type { ColorContext } from "@aurochs-office/drawing-ml/domain/color-context";

const mockColorContext: ColorContext = {
  colorScheme: {
    dk1: "000000",
    lt1: "ffffff",
    dk2: "1f497d",
    lt2: "eeece1",
    accent1: "4f81bd",
    accent2: "c0504d",
    accent3: "9bbb59",
    accent4: "8064a2",
    accent5: "4bacc6",
    accent6: "f79646",
    hlink: "0000ff",
    folHlink: "800080",
  },
  colorMap: {},
};

const mockGetNextId = (prefix: string) => `${prefix}-test`;

describe("resolveEffectsForReact", () => {
  describe("no effects", () => {
    it("returns hasEffects: false for undefined effects", () => {
      const result = resolveEffectsForReact(undefined, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(false);
      expect(result.filterId).toBeUndefined();
      expect(result.filterUrl).toBeUndefined();
      expect(result.filterDef).toBeUndefined();
    });

    it("returns hasEffects: false for empty effects object", () => {
      const effects: Effects = {};
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(false);
    });
  });

  describe("shadow effect", () => {
    it("resolves outer shadow effect", () => {
      const effects: Effects = {
        shadow: {
          type: "outer",
          blurRadius: 10,
          distance: 5,
          direction: 45,
          color: { spec: { type: "srgb", value: "000000" } },
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.filterId).toBe("effect-filter-test");
      expect(result.filterUrl).toBe("url(#effect-filter-test)");
      expect(result.filterDef).toBeDefined();
      expect(result.shadow).toBeDefined();
      expect(result.shadow?.isInner).toBe(false);
    });

    it("resolves inner shadow effect", () => {
      const effects: Effects = {
        shadow: {
          type: "inner",
          blurRadius: 5,
          distance: 3,
          direction: 90,
          color: { spec: { type: "srgb", value: "333333" } },
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.shadow?.isInner).toBe(true);
    });
  });

  describe("glow effect", () => {
    it("resolves glow effect", () => {
      const effects: Effects = {
        glow: {
          radius: 8,
          color: { spec: { type: "srgb", value: "ffff00" } },
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.glow).toBeDefined();
      expect(result.glow?.radius).toBe(8);
    });

    it("resolves glow with scheme color", () => {
      const effects: Effects = {
        glow: {
          radius: 10,
          color: { spec: { type: "scheme", value: "accent1" } },
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.glow).toBeDefined();
      // accent1 resolves to 4f81bd
      expect(result.glow?.color).toBe("#4f81bd");
    });
  });

  describe("soft edge effect", () => {
    it("resolves soft edge effect", () => {
      const effects: Effects = {
        softEdge: {
          radius: 12,
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.softEdgeRadius).toBe(12);
    });
  });

  describe("combined effects", () => {
    it("resolves multiple effects together", () => {
      const effects: Effects = {
        shadow: {
          type: "outer",
          blurRadius: 10,
          distance: 5,
          direction: 45,
          color: { spec: { type: "srgb", value: "000000" } },
        },
        glow: {
          radius: 8,
          color: { spec: { type: "srgb", value: "ffff00" } },
        },
      };
      const result = resolveEffectsForReact(effects, mockColorContext, mockGetNextId);

      expect(result.hasEffects).toBe(true);
      expect(result.shadow).toBeDefined();
      expect(result.glow).toBeDefined();
      expect(result.filterDef).toBeDefined();
    });
  });
});
