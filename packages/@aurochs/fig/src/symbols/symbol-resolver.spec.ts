/**
 * @file Unit tests for symbol resolver
 */

import type { FigNode } from "@aurochs/fig/types";
import { cloneSymbolChildren } from "./symbol-resolver";

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
      componentPropRefs: [
        {
          defID: { sessionID: 1, localID: 100 },
          componentPropNodeField: { value: 0, name: "TEXT_DATA" },
        },
      ],
      textData: { characters: "Original" },
      characters: "Original",
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [textChild],
    });

    const result = cloneSymbolChildren(symbolNode, {
      componentPropAssignments: [
        {
          defID: { sessionID: 1, localID: 100 },
          value: { textValue: { characters: "Overridden" } },
        },
      ],
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
    // depth-2 overrides targeting children WITHIN a nested INSTANCE are stored
    // as derivedSymbolData on the INSTANCE node (not symbolOverrides).
    // When the INSTANCE is later resolved during rendering, resolveInstance()
    // picks up derivedSymbolData and applies the overrides to the INSTANCE's children.
    const instanceResult = result[0] as Record<string, unknown>;
    const propagated = instanceResult.derivedSymbolData as Array<Record<string, unknown>>;
    expect(propagated).toBeDefined();
    expect(propagated.length).toBeGreaterThan(0);
    // The shortened override should target localID 30 (the nested TEXT child)
    const firstEntry = propagated[0] as { guidPath: { guids: Array<{ localID: number }> }; name: string };
    expect(firstEntry.guidPath.guids).toHaveLength(1);
    expect(firstEntry.guidPath.guids[0].localID).toBe(30);
    expect(firstEntry.name).toBe("DeepOverride");
  });

  it("applies componentPropAssignments VISIBLE toggle", () => {
    const child = {
      type: "RECTANGLE",
      name: "Toggleable",
      guid: { sessionID: 1, localID: 40 },
      visible: true,
      componentPropRefs: [
        {
          defID: { sessionID: 1, localID: 100 },
          componentPropNodeField: { value: 0, name: "VISIBLE" },
        },
      ],
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [child],
    });

    const result = cloneSymbolChildren(symbolNode, {
      componentPropAssignments: [
        {
          defID: { sessionID: 1, localID: 100 },
          value: { boolValue: false },
        },
      ],
    });

    expect(result).toHaveLength(1);
    expect(result[0].visible).toBe(false);
  });

  it("applies componentPropAssignments OVERRIDDEN_SYMBOL_ID", () => {
    const instanceChild = {
      type: "INSTANCE",
      name: "SwappableInstance",
      guid: { sessionID: 1, localID: 50 },
      componentPropRefs: [
        {
          defID: { sessionID: 1, localID: 200 },
          componentPropNodeField: { value: 0, name: "OVERRIDDEN_SYMBOL_ID" },
        },
      ],
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [instanceChild],
    });

    const newSymbolGuid = { sessionID: 2, localID: 10 };
    const result = cloneSymbolChildren(symbolNode, {
      componentPropAssignments: [
        {
          defID: { sessionID: 1, localID: 200 },
          value: { guidValue: newSymbolGuid },
        },
      ],
    });

    expect(result).toHaveLength(1);
    const resultNode = result[0] as Record<string, unknown>;
    expect(resultNode.overriddenSymbolID).toEqual(newSymbolGuid);
  });

  it("applies componentPropAssignments TEXT_DATA with proper field format", () => {
    const textChild = {
      type: "TEXT",
      name: "Label",
      guid: { sessionID: 1, localID: 60 },
      componentPropRefs: [
        {
          defID: { sessionID: 1, localID: 300 },
          componentPropNodeField: { value: 0, name: "TEXT_DATA" },
        },
      ],
      textData: { characters: "Original", lines: [{ lineType: 0 }] },
      characters: "Original",
    };

    const symbolNode = createTestNode({
      type: "SYMBOL",
      name: "TestSymbol",
      children: [textChild],
    });

    const result = cloneSymbolChildren(symbolNode, {
      componentPropAssignments: [
        {
          defID: { sessionID: 1, localID: 300 },
          value: {
            textValue: { characters: "Overridden Text" },
          },
        },
      ],
    });

    expect(result).toHaveLength(1);
    const resultNode = result[0] as Record<string, unknown>;
    expect(resultNode.characters).toBe("Overridden Text");
    const textData = resultNode.textData as Record<string, unknown>;
    expect(textData.characters).toBe("Overridden Text");
    // derivedTextData should be deleted (stale glyph paths)
    expect(resultNode.derivedTextData).toBeUndefined();
  });
});

