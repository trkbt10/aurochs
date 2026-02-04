/**
 * @file Unit tests for symbol resolver
 */

import type { FigNode } from "@oxen/fig/types";
import { resolveSymbol, cloneSymbolChildren, type FigSymbolData } from "./symbol-resolver";

describe("resolveSymbol", () => {
  it("resolves SYMBOL node by GUID", () => {
    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "TestSymbol",
      children: [],
    };

    const symbolMap = new Map<string, FigNode>([["4:21", symbolNode]]);

    const symbolData: FigSymbolData = {
      symbolID: { sessionID: 4, localID: 21 },
    };

    const result = resolveSymbol(symbolData, symbolMap);
    expect(result).toBe(symbolNode);
  });

  it("returns undefined when SYMBOL not found", () => {
    const symbolMap = new Map<string, FigNode>();

    const symbolData: FigSymbolData = {
      symbolID: { sessionID: 99, localID: 999 },
    };

    const result = resolveSymbol(symbolData, symbolMap);
    expect(result).toBeUndefined();
  });
});

describe("cloneSymbolChildren", () => {
  it("returns empty array for SYMBOL with no children", () => {
    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "EmptySymbol",
    };

    const result = cloneSymbolChildren(symbolNode);
    expect(result).toEqual([]);
  });

  it("deep clones children", () => {
    const child1: FigNode = {
      type: "RECTANGLE",
      name: "Rect1",
      guid: { sessionID: 1, localID: 1 },
    };

    const child2: FigNode = {
      type: "RECTANGLE",
      name: "Rect2",
      guid: { sessionID: 1, localID: 2 },
    };

    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child1, child2],
    };

    const result = cloneSymbolChildren(symbolNode);

    expect(result).toHaveLength(2);
    expect(result[0]).not.toBe(child1);
    expect(result[1]).not.toBe(child2);
    expect(result[0].name).toBe("Rect1");
    expect(result[1].name).toBe("Rect2");
  });

  it("deep clones nested children", () => {
    const grandchild: FigNode = {
      type: "ELLIPSE",
      name: "Circle",
      guid: { sessionID: 1, localID: 3 },
    };

    const child: FigNode = {
      type: "FRAME",
      name: "Frame",
      guid: { sessionID: 1, localID: 1 },
      children: [grandchild],
    };

    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "NestedSymbol",
      children: [child],
    };

    const result = cloneSymbolChildren(symbolNode);

    expect(result).toHaveLength(1);
    expect(result[0]).not.toBe(child);
    expect(result[0].children).toBeDefined();
    expect(result[0].children![0]).not.toBe(grandchild);
    expect(result[0].children![0].name).toBe("Circle");
  });

  it("applies symbolOverrides to matching nodes", () => {
    const child: FigNode = {
      type: "RECTANGLE",
      name: "Rect",
      guid: { sessionID: 1, localID: 5 },
      fillPaints: [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }],
    };

    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    };

    const overrides = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 5 }] },
        fillPaints: [{ type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 } }],
      },
    ];

    const result = cloneSymbolChildren(symbolNode, { symbolOverrides: overrides });

    expect(result).toHaveLength(1);
    const resultData = result[0] as Record<string, unknown>;
    expect(resultData.fillPaints).toEqual([{ type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 } }]);
  });

  it("does not modify original nodes when applying overrides", () => {
    const originalFill = [{ type: "SOLID", color: { r: 1, g: 0, b: 0, a: 1 } }];
    const child: FigNode = {
      type: "RECTANGLE",
      name: "Rect",
      guid: { sessionID: 1, localID: 5 },
      fillPaints: originalFill,
    };

    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    };

    const overrides = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 5 }] },
        fillPaints: [{ type: "SOLID", color: { r: 0, g: 1, b: 0, a: 1 } }],
      },
    ];

    cloneSymbolChildren(symbolNode, { symbolOverrides: overrides });

    // Original should be unchanged
    const childData = child as Record<string, unknown>;
    expect(childData.fillPaints).toBe(originalFill);
  });

  it("applies derivedSymbolData transform overrides", () => {
    const child: FigNode = {
      type: "RECTANGLE",
      name: "Rect",
      guid: { sessionID: 1, localID: 5 },
      transform: { m00: 1, m01: 0, m02: 100, m10: 0, m11: 1, m12: 100 },
    };

    const symbolNode: FigNode = {
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    };

    const derivedData = [
      {
        guidPath: { guids: [{ sessionID: 1, localID: 5 }] },
        transform: { m00: 1, m01: 0, m02: 70, m10: 0, m11: 1, m12: 66 },
      },
    ];

    const result = cloneSymbolChildren(symbolNode, { derivedSymbolData: derivedData });

    expect(result).toHaveLength(1);
    const resultData = result[0] as Record<string, unknown>;
    const transform = resultData.transform as { m02: number; m12: number };
    expect(transform.m02).toBe(70);
    expect(transform.m12).toBe(66);
  });
});
