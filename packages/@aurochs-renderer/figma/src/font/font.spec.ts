/**
 * @file Font resolution tests
 */

import { describe, it, expect } from "vitest";
import { detectWeight, normalizeWeight, getWeightName, FONT_WEIGHTS } from "./weight";
import { detectStyle, isItalic, isOblique, isSlanted } from "./style";
import { detectFontCategory, getDefaultFallbacks, COMMON_FONT_MAPPINGS } from "./mappings";
import { FontResolver, createFontResolver } from "./resolver";

describe("weight detection", () => {
  it("detects common weight names", () => {
    expect(detectWeight("Thin")).toBe(100);
    expect(detectWeight("ExtraLight")).toBe(200);
    expect(detectWeight("Light")).toBe(300);
    expect(detectWeight("Regular")).toBe(400);
    expect(detectWeight("Medium")).toBe(500);
    expect(detectWeight("SemiBold")).toBe(600);
    expect(detectWeight("Bold")).toBe(700);
    expect(detectWeight("ExtraBold")).toBe(800);
    expect(detectWeight("Black")).toBe(900);
  });

  it("handles space-separated weight names", () => {
    expect(detectWeight("Extra Light")).toBe(200);
    expect(detectWeight("Semi Bold")).toBe(600);
    expect(detectWeight("Extra Bold")).toBe(800);
  });

  it("handles compound styles (weight + italic)", () => {
    expect(detectWeight("Bold Italic")).toBe(700);
    expect(detectWeight("Light Italic")).toBe(300);
    expect(detectWeight("SemiBold Oblique")).toBe(600);
  });

  it("returns undefined for unknown styles", () => {
    expect(detectWeight("Custom")).toBeUndefined();
    expect(detectWeight("")).toBeUndefined();
    expect(detectWeight(undefined)).toBeUndefined();
  });

  it("is case insensitive", () => {
    expect(detectWeight("BOLD")).toBe(700);
    expect(detectWeight("light")).toBe(300);
    expect(detectWeight("SeMiBOLD")).toBe(600);
  });
});

describe("weight normalization", () => {
  it("normalizes to nearest standard weight", () => {
    expect(normalizeWeight(149)).toBe(100);
    expect(normalizeWeight(151)).toBe(200);
    expect(normalizeWeight(349)).toBe(300);
    expect(normalizeWeight(351)).toBe(400);
    expect(normalizeWeight(649)).toBe(600);
    expect(normalizeWeight(651)).toBe(700);
  });

  it("returns exact match for standard weights", () => {
    expect(normalizeWeight(100)).toBe(100);
    expect(normalizeWeight(400)).toBe(400);
    expect(normalizeWeight(700)).toBe(700);
    expect(normalizeWeight(900)).toBe(900);
  });
});

describe("weight name", () => {
  it("gets human-readable names", () => {
    expect(getWeightName(100)).toBe("thin");
    expect(getWeightName(400)).toBe("regular");
    expect(getWeightName(700)).toBe("bold");
    expect(getWeightName(900)).toBe("black");
  });
});

describe("style detection", () => {
  it("detects italic", () => {
    expect(detectStyle("Italic")).toBe("italic");
    expect(detectStyle("Bold Italic")).toBe("italic");
    expect(detectStyle("It")).toBe("italic");
  });

  it("detects oblique", () => {
    expect(detectStyle("Oblique")).toBe("oblique");
    expect(detectStyle("Slanted")).toBe("oblique");
  });

  it("returns normal for regular styles", () => {
    expect(detectStyle("Regular")).toBe("normal");
    expect(detectStyle("Bold")).toBe("normal");
    expect(detectStyle(undefined)).toBe("normal");
  });

  it("prefers oblique over italic when both present", () => {
    expect(detectStyle("Italic Oblique")).toBe("oblique");
  });
});

describe("style helpers", () => {
  it("isItalic works correctly", () => {
    expect(isItalic("Italic")).toBe(true);
    expect(isItalic("Regular")).toBe(false);
    expect(isItalic("Oblique")).toBe(false);
  });

  it("isOblique works correctly", () => {
    expect(isOblique("Oblique")).toBe(true);
    expect(isOblique("Italic")).toBe(false);
  });

  it("isSlanted works correctly", () => {
    expect(isSlanted("Italic")).toBe(true);
    expect(isSlanted("Oblique")).toBe(true);
    expect(isSlanted("Regular")).toBe(false);
  });
});

describe("font category detection", () => {
  it("detects monospace fonts", () => {
    expect(detectFontCategory("Roboto Mono")).toBe("monospace");
    expect(detectFontCategory("Source Code Pro")).toBe("monospace");
    expect(detectFontCategory("Courier New")).toBe("monospace");
  });

  it("detects serif fonts", () => {
    expect(detectFontCategory("Times New Roman")).toBe("serif");
    expect(detectFontCategory("Georgia")).toBe("serif");
    expect(detectFontCategory("Noto Serif")).toBe("serif");
  });

  it("detects sans-serif fonts", () => {
    expect(detectFontCategory("Helvetica")).toBe("sans-serif");
    expect(detectFontCategory("Arial")).toBe("sans-serif");
    expect(detectFontCategory("Noto Sans")).toBe("sans-serif");
  });

  it("detects display fonts", () => {
    expect(detectFontCategory("SF Pro Display")).toBe("display");
  });

  it("returns unknown for unrecognized fonts", () => {
    expect(detectFontCategory("CustomFont")).toBe("unknown");
  });
});

describe("default fallbacks", () => {
  it("returns appropriate fallbacks by category", () => {
    const mono = getDefaultFallbacks("Roboto Mono");
    expect(mono).toContain("monospace");

    const serif = getDefaultFallbacks("Georgia");
    expect(serif).toContain("serif");

    const sans = getDefaultFallbacks("Helvetica");
    expect(sans).toContain("sans-serif");
  });
});

describe("common font mappings", () => {
  it("includes popular fonts", () => {
    expect(COMMON_FONT_MAPPINGS.has("Inter")).toBe(true);
    expect(COMMON_FONT_MAPPINGS.has("Roboto")).toBe(true);
    expect(COMMON_FONT_MAPPINGS.has("SF Pro")).toBe(true);
  });

  it("includes fallbacks in mappings", () => {
    const inter = COMMON_FONT_MAPPINGS.get("Inter");
    expect(inter).toBeDefined();
    expect(inter![0]).toBe("Inter");
    expect(inter!.length).toBeGreaterThan(1);
  });
});

describe("FontResolver", () => {
  it("resolves Figma font reference", () => {
    const resolver = createFontResolver();
    const result = resolver.resolve({
      family: "Inter",
      style: "Bold",
    });

    expect(result.fontWeight).toBe(700);
    expect(result.fontStyle).toBe("normal");
    expect(result.fontFamily).toContain("Inter");
    expect(result.fallbackChain[0]).toBe("Inter");
  });

  it("handles italic styles", () => {
    const resolver = createFontResolver();
    const result = resolver.resolve({
      family: "Roboto",
      style: "Bold Italic",
    });

    expect(result.fontWeight).toBe(700);
    expect(result.fontStyle).toBe("italic");
  });

  it("provides fallbacks for unknown fonts", () => {
    const resolver = createFontResolver();
    const result = resolver.resolve({
      family: "MyCustomFont",
      style: "Regular",
    });

    expect(result.fallbackChain[0]).toBe("MyCustomFont");
    expect(result.fallbackChain.length).toBeGreaterThan(1);
    expect(result.fallbackChain).toContain("sans-serif");
  });

  it("caches resolved fonts", () => {
    const resolver = createFontResolver();
    const ref = { family: "Inter", style: "Bold" };

    const first = resolver.resolve(ref);
    const second = resolver.resolve(ref);

    expect(first).toBe(second); // Same object reference
  });

  it("formats font-family string correctly", () => {
    const resolver = createFontResolver();
    const result = resolver.resolve({
      family: "SF Pro",
      style: "Regular",
    });

    // Should quote family names with spaces
    expect(result.fontFamily).toContain('"SF Pro"');
    // Should not quote generic families
    expect(result.fontFamily).not.toContain('"sans-serif"');
  });

  it("allows custom font mappings", () => {
    const customMappings = new Map([
      ["MyBrandFont", ["MyBrandFont", "Helvetica", "sans-serif"]],
    ]);

    const resolver = new FontResolver({
      fontMappings: customMappings,
    });

    const result = resolver.resolve({
      family: "MyBrandFont",
      style: "Regular",
    });

    expect(result.fallbackChain[0]).toBe("MyBrandFont");
    expect(result.fallbackChain[1]).toBe("Helvetica");
  });
});
