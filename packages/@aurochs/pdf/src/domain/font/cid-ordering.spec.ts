/**
 * @file Tests for CID ordering fallback
 */

import {
  getCIDFallbackMapping,
  detectCIDOrdering,
  decodeCIDFallback,
} from "./cid-ordering";

describe("detectCIDOrdering", () => {
  it("detects Japan1 ordering", () => {
    expect(detectCIDOrdering("Japan1")).toBe("Japan1");
    expect(detectCIDOrdering("Adobe-Japan1")).toBe("Japan1");
    expect(detectCIDOrdering("japan")).toBe("Japan1");
  });

  it("detects GB1 ordering", () => {
    expect(detectCIDOrdering("GB1")).toBe("GB1");
    expect(detectCIDOrdering("Adobe-GB1")).toBe("GB1");
  });

  it("detects CNS1 ordering", () => {
    expect(detectCIDOrdering("CNS1")).toBe("CNS1");
    expect(detectCIDOrdering("Adobe-CNS1")).toBe("CNS1");
  });

  it("detects Korea1 ordering", () => {
    expect(detectCIDOrdering("Korea1")).toBe("Korea1");
    expect(detectCIDOrdering("Adobe-Korea1")).toBe("Korea1");
    expect(detectCIDOrdering("KSC")).toBe("Korea1");
  });

  it("returns null for unknown ordering", () => {
    expect(detectCIDOrdering("Unknown")).toBeNull();
    expect(detectCIDOrdering("")).toBeNull();
  });
});

describe("getCIDFallbackMapping", () => {
  it("returns ASCII range for all orderings", () => {
    const japan1Map = getCIDFallbackMapping("Japan1");
    const gb1Map = getCIDFallbackMapping("GB1");

    // CID 1 should be space (U+0020)
    expect(japan1Map.get(1)).toBe(" ");
    expect(gb1Map.get(1)).toBe(" ");

    // CID 2 should be ! (U+0021)
    expect(japan1Map.get(2)).toBe("!");
    expect(gb1Map.get(2)).toBe("!");

    // CID 34 should be A (U+0041)
    expect(japan1Map.get(34)).toBe("A");
    expect(gb1Map.get(34)).toBe("A");
  });
});

describe("decodeCIDFallback", () => {
  it("returns null for CID 0 (notdef)", () => {
    expect(decodeCIDFallback(0, "Japan1")).toBeNull();
    expect(decodeCIDFallback(0, null)).toBeNull();
  });

  it("decodes ASCII range CIDs", () => {
    expect(decodeCIDFallback(1, null)).toBe(" ");
    expect(decodeCIDFallback(34, null)).toBe("A");
    expect(decodeCIDFallback(66, null)).toBe("a");
  });

  it("decodes Japan1-specific CIDs", () => {
    // Spot-check a few hiragana that are stable in Adobe-Japan1 mappings.
    expect(decodeCIDFallback(842, "Japan1")).toBe("ぁ");
    expect(decodeCIDFallback(843, "Japan1")).toBe("あ");
  });

  it("returns null for unmapped CIDs", () => {
    expect(decodeCIDFallback(10000, "Japan1")).toBeNull();
    expect(decodeCIDFallback(500, null)).toBeNull();
  });
});
