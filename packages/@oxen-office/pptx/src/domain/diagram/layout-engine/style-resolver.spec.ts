/**
 * @file Tests for style and color resolver
 *
 * @see ECMA-376 Part 1, Section 21.4.4.6 (styleLbl)
 */

import type {
  DiagramStyleDefinition,
  DiagramColorsDefinition,
  DiagramColorList,
} from "../types";
import type { Fill } from "../../color/types";
import type { Color } from "@oxen-office/ooxml/domain/color";
import type { ColorContext } from "@oxen-office/ooxml/domain/color-context";
import type { DiagramTreeNode } from "./tree-builder";
import {
  resolveNodeStyle,
  findStyleLabel,
  findColorStyleLabel,
  resolveFillFromList,
  resolveLineFromList,
  calculateColorIndex,
  createStyleContext,
  createEmptyColorContext,
  type StyleResolverContext,
} from "./style-resolver";
import { resolveColor } from "@oxen-office/ooxml/domain/color-resolution";

// =============================================================================
// Helper Functions for Testing Fill Types
// =============================================================================

/**
 * Extract the hex color value from a Fill (only works for SolidFill with srgb)
 */
function extractColorFromFill(fill: Fill | undefined): string | undefined {
  if (!fill || fill.type !== "solidFill") {
    return undefined;
  }
  const spec = fill.color.spec;
  if (spec.type === "srgb") {
    return `#${spec.value.toUpperCase()}`;
  }
  return undefined;
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createPropertySet(styleLabel: string | undefined): { presentationStyleLabel: string } | undefined {
  if (!styleLabel) {
    return undefined;
  }
  return { presentationStyleLabel: styleLabel };
}

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
    propertySet: createPropertySet(styleLabel),
  };
}

function createStyleDefinition(): DiagramStyleDefinition {
  return {
    uniqueId: "test-style",
    styleLabels: [
      { name: "node0", style: { fillReference: { index: 1 } } },
      { name: "node1", style: { fillReference: { index: 2 } } },
      { name: "sibTrans", style: { fillReference: { index: 3 } } },
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

function createContext(): StyleResolverContext {
  const colorContext = createColorContext(new Map([
    ["accent1", "#4472C4"],
    ["accent2", "#ED7D31"],
    ["dk1", "#000000"],
    ["lt1", "#FFFFFF"],
  ]));
  return createStyleContext(
    colorContext,
    createStyleDefinition(),
    createColorDefinition()
  );
}

// =============================================================================
// resolveNodeStyle Tests
// =============================================================================

describe("resolveNodeStyle", () => {
  it("resolves style for node with style label", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    // Fill should be the first color in the cycle
    expect(extractColorFromFill(result.fill)).toBe("#4472C4");
    // Line should be resolved
    expect(result.line).toBeDefined();
    expect(extractColorFromFill(result.line?.fill)).toBe("#2F528F");
  });

  it("returns undefined when no style label", () => {
    const node = createTreeNode("1");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    // No style label means no fill/line resolved
    expect(result.fill).toBeUndefined();
    expect(result.line).toBeUndefined();
  });

  it("cycles through colors for multiple nodes", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result0 = resolveNodeStyle(node, 0, 3, context);
    const result1 = resolveNodeStyle(node, 1, 3, context);
    const result2 = resolveNodeStyle(node, 2, 3, context);

    expect(extractColorFromFill(result0.fill)).toBe("#4472C4");
    expect(extractColorFromFill(result1.fill)).toBe("#ED7D31");
    expect(extractColorFromFill(result2.fill)).toBe("#A5A5A5");
  });

  it("returns style label name", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    expect(result.styleLabel).toBe("node0");
  });

  it("returns shapeStyle from style definition", () => {
    const node = createTreeNode("1", "node0");
    const context = createContext();

    const result = resolveNodeStyle(node, 0, 3, context);

    expect(result.shapeStyle).toBeDefined();
    expect(result.shapeStyle?.fillReference?.index).toBe(1);
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
// resolveFillFromList Tests
// =============================================================================

describe("resolveFillFromList", () => {
  it("resolves Fill from color list", () => {
    const colorList: DiagramColorList = {
      colors: [
        { spec: { type: "srgb", value: "FF0000" } },
        { spec: { type: "srgb", value: "00FF00" } },
      ],
    };

    const result = resolveFillFromList(colorList, 0, 2);

    expect(result).toBeDefined();
    expect(result?.type).toBe("solidFill");
    expect(extractColorFromFill(result)).toBe("#FF0000");
  });

  it("returns undefined when no color list", () => {
    const result = resolveFillFromList(undefined, 0, 2);

    expect(result).toBeUndefined();
  });

  it("returns undefined when empty colors", () => {
    const colorList: DiagramColorList = { colors: [] };

    const result = resolveFillFromList(colorList, 0, 2);

    expect(result).toBeUndefined();
  });

  it("cycles through colors correctly", () => {
    const colorList: DiagramColorList = {
      method: "cycle",
      colors: [
        { spec: { type: "srgb", value: "FF0000" } },
        { spec: { type: "srgb", value: "00FF00" } },
      ],
    };

    const result0 = resolveFillFromList(colorList, 0, 4);
    const result1 = resolveFillFromList(colorList, 1, 4);
    const result2 = resolveFillFromList(colorList, 2, 4);
    const result3 = resolveFillFromList(colorList, 3, 4);

    expect(extractColorFromFill(result0)).toBe("#FF0000");
    expect(extractColorFromFill(result1)).toBe("#00FF00");
    expect(extractColorFromFill(result2)).toBe("#FF0000");
    expect(extractColorFromFill(result3)).toBe("#00FF00");
  });
});

// =============================================================================
// resolveLineFromList Tests
// =============================================================================

describe("resolveLineFromList", () => {
  it("resolves Line from color list", () => {
    const colorList: DiagramColorList = {
      colors: [{ spec: { type: "srgb", value: "2F528F" } }],
    };

    const result = resolveLineFromList(colorList, 0, 1);

    expect(result).toBeDefined();
    expect(result?.width).toBeDefined();
    expect(result?.cap).toBe("flat");
    expect(extractColorFromFill(result?.fill)).toBe("#2F528F");
  });

  it("returns undefined when no color list", () => {
    const result = resolveLineFromList(undefined, 0, 1);

    expect(result).toBeUndefined();
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
// createStyleContext Tests
// =============================================================================

describe("createStyleContext", () => {
  it("creates context with color context", () => {
    const colorContext = createColorContext(new Map([["accent1", "#FF0000"]]));
    const context = createStyleContext(colorContext);

    expect(context.colorContext).toBe(colorContext);
    expect(context.styleDefinition).toBeUndefined();
    expect(context.colorDefinition).toBeUndefined();
  });

  it("creates context with provided definitions", () => {
    const colorContext = createEmptyColorContext();
    const styleDef = createStyleDefinition();
    const colorDef = createColorDefinition();
    const context = createStyleContext(colorContext, styleDef, colorDef);

    expect(context.styleDefinition).toBe(styleDef);
    expect(context.colorDefinition).toBe(colorDef);
  });
});

// =============================================================================
// createEmptyColorContext Tests
// =============================================================================

describe("createEmptyColorContext", () => {
  it("creates empty color context", () => {
    const context = createEmptyColorContext();

    expect(context.colorScheme).toEqual({});
    expect(context.colorMap).toEqual({});
  });
});
