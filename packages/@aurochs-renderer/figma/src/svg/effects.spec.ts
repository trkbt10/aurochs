/**
 * @file Effect rendering unit tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  hasDropShadow,
  getDropShadows,
  hasInnerShadow,
  getInnerShadows,
  hasLayerBlur,
  getLayerBlur,
  hasBackgroundBlur,
  getBackgroundBlur,
  createDropShadowFilter,
  createInnerShadowFilter,
  createLayerBlurFilter,
  createCombinedFilter,
  getFilterAttr,
  type FigEffect,
} from "./effects";
import type { FigSvgRenderContext } from "../types";

// Mock context
function createMockContext(): FigSvgRenderContext {
  let idCounter = 0;
  const defs: string[] = [];

  return {
    defs: {
      generateId: (prefix: string) => `${prefix}_${++idCounter}`,
      add: (def: string) => defs.push(def),
      getDefs: () => defs,
    },
    // Other context properties would go here if needed
  } as unknown as FigSvgRenderContext;
}

const mockBounds = { x: 0, y: 0, width: 100, height: 100 };

describe("hasDropShadow", () => {
  it("returns false for undefined effects", () => {
    expect(hasDropShadow(undefined)).toBe(false);
  });

  it("returns false for empty effects", () => {
    expect(hasDropShadow([])).toBe(false);
  });

  it("returns true for visible drop shadow", () => {
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
    ];
    expect(hasDropShadow(effects)).toBe(true);
  });

  it("returns false for hidden drop shadow", () => {
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: false, radius: 4 },
    ];
    expect(hasDropShadow(effects)).toBe(false);
  });

  it("handles type as object", () => {
    const effects: FigEffect[] = [
      { type: { value: 0, name: "DROP_SHADOW" }, visible: true, radius: 4 },
    ];
    expect(hasDropShadow(effects)).toBe(true);
  });
});

describe("getDropShadows", () => {
  it("returns empty array for undefined effects", () => {
    expect(getDropShadows(undefined)).toEqual([]);
  });

  it("filters only visible drop shadows", () => {
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
      { type: "INNER_SHADOW", visible: true, radius: 2 },
      { type: "DROP_SHADOW", visible: false, radius: 8 },
    ];
    const result = getDropShadows(effects);
    expect(result).toHaveLength(1);
    expect(result[0].radius).toBe(4);
  });
});

describe("hasInnerShadow", () => {
  it("returns false for undefined effects", () => {
    expect(hasInnerShadow(undefined)).toBe(false);
  });

  it("returns true for visible inner shadow", () => {
    const effects: FigEffect[] = [
      { type: "INNER_SHADOW", visible: true, radius: 4 },
    ];
    expect(hasInnerShadow(effects)).toBe(true);
  });

  it("handles type as object", () => {
    const effects: FigEffect[] = [
      { type: { value: 1, name: "INNER_SHADOW" }, visible: true, radius: 4 },
    ];
    expect(hasInnerShadow(effects)).toBe(true);
  });
});

describe("getInnerShadows", () => {
  it("returns empty array for undefined effects", () => {
    expect(getInnerShadows(undefined)).toEqual([]);
  });

  it("filters only visible inner shadows", () => {
    const effects: FigEffect[] = [
      { type: "INNER_SHADOW", visible: true, radius: 4 },
      { type: "DROP_SHADOW", visible: true, radius: 2 },
      { type: "INNER_SHADOW", visible: false, radius: 8 },
    ];
    const result = getInnerShadows(effects);
    expect(result).toHaveLength(1);
    expect(result[0].radius).toBe(4);
  });
});

describe("hasLayerBlur", () => {
  it("returns false for undefined effects", () => {
    expect(hasLayerBlur(undefined)).toBe(false);
  });

  it("returns true for visible layer blur", () => {
    const effects: FigEffect[] = [
      { type: "LAYER_BLUR", visible: true, radius: 10 },
    ];
    expect(hasLayerBlur(effects)).toBe(true);
  });
});

describe("getLayerBlur", () => {
  it("returns undefined for undefined effects", () => {
    expect(getLayerBlur(undefined)).toBeUndefined();
  });

  it("returns first visible layer blur", () => {
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
      { type: "LAYER_BLUR", visible: true, radius: 10 },
    ];
    const result = getLayerBlur(effects);
    expect(result).toBeDefined();
    expect(result?.radius).toBe(10);
  });
});

describe("hasBackgroundBlur", () => {
  it("returns false for undefined effects", () => {
    expect(hasBackgroundBlur(undefined)).toBe(false);
  });

  it("returns true for visible background blur", () => {
    const effects: FigEffect[] = [
      { type: "BACKGROUND_BLUR", visible: true, radius: 20 },
    ];
    expect(hasBackgroundBlur(effects)).toBe(true);
  });
});

describe("getBackgroundBlur", () => {
  it("returns undefined for undefined effects", () => {
    expect(getBackgroundBlur(undefined)).toBeUndefined();
  });

  it("returns first visible background blur", () => {
    const effects: FigEffect[] = [
      { type: "BACKGROUND_BLUR", visible: true, radius: 20 },
    ];
    const result = getBackgroundBlur(effects);
    expect(result).toBeDefined();
    expect(result?.radius).toBe(20);
  });
});

describe("createDropShadowFilter", () => {
  it("returns null for empty shadows", () => {
    const ctx = createMockContext();
    const result = createDropShadowFilter([], ctx, mockBounds);
    expect(result).toBeNull();
  });

  it("creates filter with correct id", () => {
    const ctx = createMockContext();
    const shadows: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
    ];
    const result = createDropShadowFilter(shadows, ctx, mockBounds);
    expect(result).not.toBeNull();
    expect(result?.id).toContain("shadow");
  });

  it("includes filter definition with feBlend", () => {
    const ctx = createMockContext();
    const shadows: FigEffect[] = [
      {
        type: "DROP_SHADOW",
        visible: true,
        radius: 4,
        offset: { x: 0, y: 4 },
        color: { r: 0, g: 0, b: 0, a: 0.25 },
      },
    ];
    const result = createDropShadowFilter(shadows, ctx, mockBounds);
    expect(result?.def).toContain("<filter");
    expect(result?.def).toContain("feBlend");
    expect(result?.def).toContain("feGaussianBlur");
  });
});

describe("createInnerShadowFilter", () => {
  it("returns null for empty shadows", () => {
    const ctx = createMockContext();
    const result = createInnerShadowFilter([], ctx, mockBounds);
    expect(result).toBeNull();
  });

  it("creates filter with correct id", () => {
    const ctx = createMockContext();
    const shadows: FigEffect[] = [
      { type: "INNER_SHADOW", visible: true, radius: 4 },
    ];
    const result = createInnerShadowFilter(shadows, ctx, mockBounds);
    expect(result).not.toBeNull();
    expect(result?.id).toContain("inner-shadow");
  });

  it("includes feComposite for inner clipping", () => {
    const ctx = createMockContext();
    const shadows: FigEffect[] = [
      {
        type: "INNER_SHADOW",
        visible: true,
        radius: 4,
        offset: { x: 0, y: 2 },
        color: { r: 0, g: 0, b: 0, a: 0.25 },
      },
    ];
    const result = createInnerShadowFilter(shadows, ctx, mockBounds);
    expect(result?.def).toContain("<filter");
    expect(result?.def).toContain("feComposite");
    expect(result?.def).toContain('operator="out"');
  });
});

describe("createLayerBlurFilter", () => {
  it("returns null for zero radius", () => {
    const ctx = createMockContext();
    const blur: FigEffect = { type: "LAYER_BLUR", visible: true, radius: 0 };
    const result = createLayerBlurFilter(blur, ctx, mockBounds);
    expect(result).toBeNull();
  });

  it("creates filter with gaussian blur", () => {
    const ctx = createMockContext();
    const blur: FigEffect = { type: "LAYER_BLUR", visible: true, radius: 10 };
    const result = createLayerBlurFilter(blur, ctx, mockBounds);
    expect(result).not.toBeNull();
    expect(result?.id).toContain("layer-blur");
    expect(result?.def).toContain("feGaussianBlur");
    expect(result?.def).toContain('stdDeviation="5"'); // radius / 2
  });
});

describe("createCombinedFilter", () => {
  it("returns null for no effects", () => {
    const ctx = createMockContext();
    const result = createCombinedFilter([], ctx, mockBounds);
    expect(result).toBeNull();
  });

  it("combines drop shadow and inner shadow", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4, offset: { x: 0, y: 4 } },
      { type: "INNER_SHADOW", visible: true, radius: 2, offset: { x: 0, y: 1 } },
    ];
    const result = createCombinedFilter(effects, ctx, mockBounds);
    expect(result).not.toBeNull();
    expect(result?.id).toContain("effects");
    expect(result?.def).toContain("feBlend");
    expect(result?.def).toContain("feComposite");
  });

  it("includes layer blur in combined filter", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
      { type: "LAYER_BLUR", visible: true, radius: 8 },
    ];
    const result = createCombinedFilter(effects, ctx, mockBounds);
    expect(result?.def).toContain("feGaussianBlur");
  });
});

describe("getFilterAttr", () => {
  it("returns undefined for no effects", () => {
    const ctx = createMockContext();
    const result = getFilterAttr(undefined, ctx, mockBounds);
    expect(result).toBeUndefined();
  });

  it("returns undefined for empty effects", () => {
    const ctx = createMockContext();
    const result = getFilterAttr([], ctx, mockBounds);
    expect(result).toBeUndefined();
  });

  it("returns url reference for drop shadow", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
    ];
    const result = getFilterAttr(effects, ctx, mockBounds);
    expect(result).toMatch(/^url\(#shadow_\d+\)$/);
  });

  it("returns url reference for inner shadow", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "INNER_SHADOW", visible: true, radius: 4 },
    ];
    const result = getFilterAttr(effects, ctx, mockBounds);
    expect(result).toMatch(/^url\(#inner-shadow_\d+\)$/);
  });

  it("returns url reference for layer blur", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "LAYER_BLUR", visible: true, radius: 10 },
    ];
    const result = getFilterAttr(effects, ctx, mockBounds);
    expect(result).toMatch(/^url\(#layer-blur_\d+\)$/);
  });

  it("uses combined filter for multiple effect types", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
      { type: "INNER_SHADOW", visible: true, radius: 2 },
    ];
    const result = getFilterAttr(effects, ctx, mockBounds);
    expect(result).toMatch(/^url\(#effects_\d+\)$/);
  });

  it("adds filter definition to context", () => {
    const ctx = createMockContext();
    const effects: FigEffect[] = [
      { type: "DROP_SHADOW", visible: true, radius: 4 },
    ];
    getFilterAttr(effects, ctx, mockBounds);
    const defs = ctx.defs.getDefs();
    expect(defs.length).toBe(1);
    expect(defs[0]).toContain("<filter");
  });
});
