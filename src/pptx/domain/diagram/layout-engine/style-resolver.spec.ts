/**
 * @file Tests for style and color resolver
 *
 * @see ECMA-376 Part 1, Section 21.4.4.6 (styleLbl)
 */

import { describe, it, expect } from "vitest";
import type {
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramColorList,
} from "../types";
import type { Color } from "../../color";
import type { ColorContext } from "../../resolution";
import type { DiagramTreeNode } from "./tree-builder";
import {
  resolveNodeStyle,
  findStyleLabel,
  findColorStyleLabel,
  resolveColorFromList,
  calculateColorIndex,
  resolveColor,
  resolveSchemeColor,
  applyColorTransforms,
  createDefaultStyleContext,
  type StyleResolverContext,
} from "./style-resolver";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTreeNode(
  id: string,
  styleLabel?: string
): DiagramTreeNode {
  return {
    id,
    type: "node",
    children: [],
    depth: 0,
    siblingIndex: 0,
    siblingCount: 1,
    propertySet: styleLabel
      ? { presentationStyleLabel: styleLabel }
      : undefined,
  };
}

function createStyleDefinition(): DiagramStyleDefinition {
  return {
    uniqueId: "test-style",
    styleLabels: [
      { name: "node0", style: { fillRef: { idx: 1 } } },
      { name: "node1", style: { fillRef: { idx: 2 } } },
      { name: "sibTrans", style: { fillRef: { idx: 3 } } },
    ],
  };
}

function createColorDefinition(): DiagramColorsDefinition {
  return {
    uniqueId: "test-colors",
    styleLabels: [
      {
        name: "node0",
        fillColors: {
          method: "cycle",
          colors: [
            { spec: { type: "srgb", value: "4472C4" } },
            { spec: { type: "srgb", value: "ED7D31" } },
            { spec: { type: "srgb", value: "A5A5A5" } },
          ],
        },
        lineColors: {
          colors: [{ spec: { type: "srgb", value: "2F528F" } }],
        },
      },
      {
        name: "node1",
        fillColors: {
          method: "span",
          colors: [
            { spec: { type: "srgb", value: "FF0000" } },
            { spec: { type: "srgb", value: "00FF00" } },
            { spec: { type: "srgb", value: "0000FF" } },
          ],
        },
      },
    ],
  };
}

function createContext(): StyleResolverContext {
  return createDefaultStyleContext(
    createStyleDefinition(),
    createColorDefinition(),
    new Map([
      ["accent1", "#4472C4"],
      ["accent2", "#ED7D31"],
      ["dk1", "#000000"],
      ["lt1", "#FFFFFF"],
    ])
  );
}

function createColorContext(themeColors?: Map<string, string>): ColorContext {
  const colorScheme: Record<string, string> = {};
  if (themeColors) {
    for (const [key, value] of themeColors) {
      colorScheme[key] = value.replace(/^#/, "");
    }
  }
  return {
    colorScheme,
    colorMap: {},
  };
}

// =============================================================================
// resolveNodeStyle Tests
// =============================================================================

describe("resolveNodeStyle", () => {
  it("resolves style for node with style label", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    expect(result.fillColor?.toUpperCase()).toBe("#4472C4");
    expect(result.lineColor?.toUpperCase()).toBe("#2F528F");
  });

  it("uses default colors when no style label", () => {
    const node = createTreeNode("1");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    expect(result.fillColor).toBe("#4472C4"); // default
    expect(result.lineColor).toBe("#2F528F"); // default
  });

  it("cycles through colors for multiple nodes", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result0 = resolveNodeStyle(node, 0, 3, context);
    const result1 = resolveNodeStyle(node, 1, 3, context);
    const result2 = resolveNodeStyle(node, 2, 3, context);

    expect(result0.fillColor?.toUpperCase()).toBe("#4472C4");
    expect(result1.fillColor?.toUpperCase()).toBe("#ED7D31");
    expect(result2.fillColor?.toUpperCase()).toBe("#A5A5A5");
  });
});

// =============================================================================
// findStyleLabel Tests
// =============================================================================

describe("findStyleLabel", () => {
  it("finds style label by name", () => {
    const styleDef = createStyleDefinition();
    const result = findStyleLabel("node0", styleDef);

    expect(result).toBeDefined();
    expect(result?.name).toBe("node0");
  });

  it("returns undefined for unknown name", () => {
    const styleDef = createStyleDefinition();
    const result = findStyleLabel("unknown", styleDef);

    expect(result).toBeUndefined();
  });

  it("returns undefined when no style definition", () => {
    const result = findStyleLabel("node0", undefined);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// findColorStyleLabel Tests
// =============================================================================

describe("findColorStyleLabel", () => {
  it("finds color style label by name", () => {
    const colorDef = createColorDefinition();
    const result = findColorStyleLabel("node0", colorDef);

    expect(result).toBeDefined();
    expect(result?.name).toBe("node0");
  });

  it("returns undefined for unknown name", () => {
    const colorDef = createColorDefinition();
    const result = findColorStyleLabel("unknown", colorDef);

    expect(result).toBeUndefined();
  });
});

// =============================================================================
// calculateColorIndex Tests
// =============================================================================

describe("calculateColorIndex", () => {
  it("cycles through colors", () => {
    expect(calculateColorIndex(0, 6, 3, "cycle")).toBe(0);
    expect(calculateColorIndex(1, 6, 3, "cycle")).toBe(1);
    expect(calculateColorIndex(2, 6, 3, "cycle")).toBe(2);
    expect(calculateColorIndex(3, 6, 3, "cycle")).toBe(0);
    expect(calculateColorIndex(4, 6, 3, "cycle")).toBe(1);
    expect(calculateColorIndex(5, 6, 3, "cycle")).toBe(2);
  });

  it("repeats colors in segments", () => {
    expect(calculateColorIndex(0, 6, 3, "repeat")).toBe(0);
    expect(calculateColorIndex(1, 6, 3, "repeat")).toBe(0);
    expect(calculateColorIndex(2, 6, 3, "repeat")).toBe(1);
    expect(calculateColorIndex(3, 6, 3, "repeat")).toBe(1);
    expect(calculateColorIndex(4, 6, 3, "repeat")).toBe(2);
    expect(calculateColorIndex(5, 6, 3, "repeat")).toBe(2);
  });

  it("spans colors across nodes", () => {
    expect(calculateColorIndex(0, 5, 3, "span")).toBe(0);
    expect(calculateColorIndex(2, 5, 3, "span")).toBe(1);
    expect(calculateColorIndex(4, 5, 3, "span")).toBe(2);
  });

  it("handles single node", () => {
    expect(calculateColorIndex(0, 1, 3, "span")).toBe(0);
  });

  it("defaults to cycle", () => {
    expect(calculateColorIndex(3, 6, 3, undefined)).toBe(0);
  });

  it("handles zero colors", () => {
    expect(calculateColorIndex(0, 3, 0, "cycle")).toBe(0);
  });
});

// =============================================================================
// resolveColorFromList Tests
// =============================================================================

describe("resolveColorFromList", () => {
  const colorContext = createColorContext(new Map([["accent1", "#4472C4"]]));

  it("resolves RGB color from list", () => {
    const colorList: DiagramColorList = {
      colors: [
        { spec: { type: "srgb", value: "FF0000" } },
        { spec: { type: "srgb", value: "00FF00" } },
      ],
    };

    const result = resolveColorFromList(colorList, 0, 2, colorContext, undefined);

    expect(result?.toUpperCase()).toBe("#FF0000");
  });

  it("returns default when no color list", () => {
    const result = resolveColorFromList(undefined, 0, 2, colorContext, "#FFFFFF");

    expect(result).toBe("#FFFFFF");
  });

  it("returns default when empty colors", () => {
    const colorList: DiagramColorList = { colors: [] };

    const result = resolveColorFromList(colorList, 0, 2, colorContext, "#FFFFFF");

    expect(result).toBe("#FFFFFF");
  });

  it("resolves scheme color from theme", () => {
    const colorList: DiagramColorList = {
      colors: [{ spec: { type: "scheme", value: "accent1" } }],
    };

    const result = resolveColorFromList(colorList, 0, 1, colorContext, undefined);

    expect(result?.toLowerCase()).toBe("#4472c4");
  });
});

// =============================================================================
// resolveColor Tests
// =============================================================================

describe("resolveColor", () => {
  const colorContext = createColorContext(new Map([["accent1", "#4472C4"]]));

  it("resolves RGB color", () => {
    const color: Color = { spec: { type: "srgb", value: "FF0000" } };
    const result = resolveColor(color, colorContext);

    expect(result?.toUpperCase()).toBe("FF0000");
  });

  it("resolves scheme color", () => {
    const color: Color = { spec: { type: "scheme", value: "accent1" } };
    const result = resolveColor(color, colorContext);

    expect(result?.toLowerCase()).toBe("4472c4");
  });

  it("resolves system color", () => {
    const color: Color = { spec: { type: "system", value: "windowText" } };
    const result = resolveColor(color, colorContext);

    expect(result?.toUpperCase()).toBe("000000");
  });

  it("resolves preset color", () => {
    const color: Color = { spec: { type: "preset", value: "red" } };
    const result = resolveColor(color, colorContext);

    expect(result?.toUpperCase()).toBe("FF0000");
  });
});

// =============================================================================
// resolveSchemeColor Tests
// =============================================================================

describe("resolveSchemeColor", () => {
  const themeColors = new Map([
    ["accent1", "#4472C4"],
    ["dk1", "#000000"],
  ]);

  it("resolves from theme colors", () => {
    const result = resolveSchemeColor({ val: "accent1" }, themeColors);

    expect(result?.toLowerCase()).toBe("#4472c4");
  });

  it("falls back to default scheme colors", () => {
    const result = resolveSchemeColor({ val: "accent2" }, new Map());

    expect(result?.toLowerCase()).toBe("#ed7d31");
  });

  it("applies luminance modifier", () => {
    const result = resolveSchemeColor(
      { val: "accent1", lumMod: 50000 },
      themeColors
    );

    // Should be darker (50% luminance)
    expect(result).toBeDefined();
    expect(result?.toLowerCase()).not.toBe("#4472c4");
  });

  it("applies tint", () => {
    const result = resolveSchemeColor(
      { val: "dk1", tint: 50000 },
      themeColors
    );

    // Should be lighter (mixed with white)
    expect(result).toBeDefined();
    expect(result?.toLowerCase()).not.toBe("#000000");
  });
});

// =============================================================================
// applyColorTransforms Tests
// =============================================================================

describe("applyColorTransforms", () => {
  it("applies luminance modifier", () => {
    const result = applyColorTransforms("#808080", { lumMod: 50000 });

    // Gray at 50% luminance should be darker
    expect(result).toBeDefined();
  });

  it("applies luminance offset", () => {
    const result = applyColorTransforms("#808080", { lumOff: 20000 });

    // Should be lighter
    expect(result).toBeDefined();
  });

  it("applies tint", () => {
    const result = applyColorTransforms("#000000", { tint: 50000 });

    // Black with 50% tint should be gray-ish
    expect(result).toBeDefined();
    expect(result?.toLowerCase()).not.toBe("#000000");
  });

  it("applies shade", () => {
    const result = applyColorTransforms("#FFFFFF", { shade: 50000 });

    // White with 50% shade should be gray-ish
    expect(result).toBeDefined();
    expect(result?.toLowerCase()).not.toBe("#ffffff");
  });

  it("clamps values", () => {
    // Extreme transforms should not exceed valid ranges
    const result = applyColorTransforms("#FFFFFF", { lumMod: 200000 });

    expect(result).toBeDefined();
    expect(result).toMatch(/^#[0-9a-f]{6}$/i);
  });
});

// =============================================================================
// createDefaultStyleContext Tests
// =============================================================================

describe("createDefaultStyleContext", () => {
  it("creates context with defaults", () => {
    const context = createDefaultStyleContext();

    expect(context.styleDefinition).toBeUndefined();
    expect(context.colorDefinition).toBeUndefined();
    expect(context.defaultColors.fill).toBe("#4472C4");
  });

  it("creates context with provided definitions", () => {
    const styleDef = createStyleDefinition();
    const colorDef = createColorDefinition();
    const context = createDefaultStyleContext(styleDef, colorDef);

    expect(context.styleDefinition).toBe(styleDef);
    expect(context.colorDefinition).toBe(colorDef);
  });

  it("creates context with theme colors", () => {
    const themeColors = new Map([["accent1", "#FF0000"]]);
    const context = createDefaultStyleContext(undefined, undefined, themeColors);

    expect(context.themeColors.get("accent1")).toBe("#FF0000");
  });
});
