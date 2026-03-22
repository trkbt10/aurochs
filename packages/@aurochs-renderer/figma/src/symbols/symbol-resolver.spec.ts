/**
 * @file Unit tests for symbol resolver
 */

import type { FigNode } from "@aurochs/fig/types";
import { resolveSymbol, cloneSymbolChildren, type FigSymbolData } from "./symbol-resolver";

/** Type guard that treats a partial object as FigNode for test purposes */
function isFigNode(obj: unknown): obj is FigNode {
  return typeof obj === "object" && obj !== null;
}

/** Create a FigNode from partial data for testing */
function createTestNode(data: Record<string, unknown>): FigNode {
  if (isFigNode(data)) {
    return data;
  }
  throw new Error("Invalid test node data");
}

describe("resolveSymbol", () => {
  it("resolves SYMBOL node by GUID", () => {
    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [],
    });

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
    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "EmptySymbol",
    });

    const result = cloneSymbolChildren(symbolNode);
    expect(result).toEqual([]);
  });

  it("deep clones children", () => {
    const child1 = {
      type: "RECTANGLE",
      name: "Rect1",
      guid: { sessionID: 1, localID: 1 },
    };

    const child2 = {
      type: "RECTANGLE",
      name: "Rect2",
      guid: { sessionID: 1, localID: 2 },
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child1, child2],
    });

    const result = cloneSymbolChildren(symbolNode);

    expect(result).toHaveLength(2);
    expect(result[0]).not.toBe(child1);
    expect(result[1]).not.toBe(child2);
    expect(result[0].name).toBe("Rect1");
    expect(result[1].name).toBe("Rect2");
  });

  it("deep clones nested children", () => {
    const grandchild = {
      type: "ELLIPSE",
      name: "Circle",
      guid: { sessionID: 1, localID: 3 },
    };

    const child = createTestNode({
      type: "FRAME",
      name: "Frame",
      guid: { sessionID: 1, localID: 2 },
      children: [grandchild],
    });

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    });

    const result = cloneSymbolChildren(symbolNode);

    expect(result).toHaveLength(1);
    expect(result[0].children).toHaveLength(1);
    expect(result[0].children![0].name).toBe("Circle");
    expect(result[0].children![0]).not.toBe(grandchild);
  });

  it("applies symbolOverrides to matching children", () => {
    const child = {
      type: "RECTANGLE",
      name: "OriginalName",
      guid: { sessionID: 1, localID: 10 },
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    });

    const result = cloneSymbolChildren(symbolNode, {
      symbolOverrides: [
        {
          guidPath: { guids: [{ sessionID: 1, localID: 10 }] },
          name: "OverriddenName",
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("OverriddenName");
  });

  it("applies componentPropAssignments to TEXT children", () => {
    const textChild = {
      type: "TEXT",
      name: "Label",
      guid: { sessionID: 1, localID: 20 },
      componentPropRefs: [{ defID: "prop-1", componentPropNodeField: "characters" }],
      characters: "Original",
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [textChild],
    });

    const result = cloneSymbolChildren(symbolNode, {
      componentPropAssignments: [{ defID: "prop-1", value: "Overridden" }],
    });

    expect(result).toHaveLength(1);
    expect((result[0] as Record<string, unknown>).characters).toBe("Overridden");
  });

  it("propagates depth-N symbolOverrides to nested INSTANCE children", () => {
    const nestedChild = {
      type: "TEXT",
      name: "NestedText",
      guid: { sessionID: 1, localID: 30 },
    };

    const instanceChild = createTestNode({
      type: "INSTANCE",
      name: "InstanceChild",
      guid: { sessionID: 1, localID: 20 },
      children: [nestedChild],
    });

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [instanceChild],
    });

    const result = cloneSymbolChildren(symbolNode, {
      symbolOverrides: [
        {
          guidPath: { guids: [{ sessionID: 1, localID: 20 }, { sessionID: 1, localID: 30 }] },
          name: "DeepOverride",
        },
      ],
    });

    expect(result).toHaveLength(1);
    // The override should be propagated to the INSTANCE child's symbolOverrides
    const instanceResult = result[0] as Record<string, unknown>;
    const propagated = instanceResult.symbolOverrides as Array<Record<string, unknown>>;
    expect(propagated).toBeDefined();
    expect(propagated.length).toBeGreaterThan(0);
  });
});
