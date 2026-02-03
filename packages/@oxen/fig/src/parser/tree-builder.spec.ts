/**
 * @file Tests for tree-builder
 */

import {
  buildNodeTree,
  guidToString,
  getNodeType,
  findNodesByType,
  findNodeByGuid,
} from "./tree-builder";
import type { FigNode, FigNodeType, KiwiEnumValue, FigGuid, FigParentIndex } from "../types";

// Test helper options
type TestNodeOptions = {
  readonly typeName: FigNodeType;
  readonly typeValue: number;
  readonly guid: FigGuid;
  readonly name?: string;
  readonly parentIndex?: FigParentIndex;
  readonly children?: readonly FigNode[];
};

// Test helper to create minimal FigNode for tests
function createTestNode(options: TestNodeOptions): FigNode {
  return {
    guid: options.guid,
    phase: { value: 0, name: "CREATED" },
    type: { value: options.typeValue, name: options.typeName } as KiwiEnumValue<FigNodeType>,
    name: options.name,
    parentIndex: options.parentIndex,
    children: options.children,
  };
}

// Create a test node without type (for edge case testing)
function createNodeWithoutType(guid: FigGuid): FigNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = {
    guid,
    phase: { value: 0, name: "CREATED" },
  };
  return node;
}

// Create a test node with legacy string type (for backwards compat testing)
function createLegacyStringTypeNode(stringType: string, guid: FigGuid): FigNode {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const node: any = {
    type: stringType,
    guid,
    phase: { value: 0, name: "CREATED" },
  };
  return node;
}

describe("tree-builder", () => {
  describe("guidToString", () => {
    it("converts guid to string", () => {
      expect(guidToString({ sessionID: 4, localID: 1224 })).toBe("4:1224");
    });

    it("returns empty string for undefined", () => {
      expect(guidToString(undefined)).toBe("");
    });
  });

  describe("buildNodeTree", () => {
    it("builds tree from flat nodes", () => {
      const nodes: FigNode[] = [
        createTestNode({ typeName: "DOCUMENT", typeValue: 1, guid: { sessionID: 0, localID: 0 }, name: "Doc" }),
        createTestNode({
          typeName: "CANVAS",
          typeValue: 2,
          guid: { sessionID: 0, localID: 1 },
          name: "Page 1",
          parentIndex: { guid: { sessionID: 0, localID: 0 }, position: "!" },
        }),
        createTestNode({
          typeName: "FRAME",
          typeValue: 4,
          guid: { sessionID: 0, localID: 2 },
          name: "Frame A",
          parentIndex: { guid: { sessionID: 0, localID: 1 }, position: "!" },
        }),
        createTestNode({
          typeName: "RECTANGLE",
          typeValue: 10,
          guid: { sessionID: 0, localID: 3 },
          name: "Rect",
          parentIndex: { guid: { sessionID: 0, localID: 2 }, position: "!" },
        }),
      ];

      const result = buildNodeTree(nodes);

      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].name).toBe("Doc");
      expect(result.roots[0].children).toHaveLength(1);
      expect(result.roots[0].children![0].name).toBe("Page 1");
      expect(result.roots[0].children![0].children).toHaveLength(1);
      expect(result.roots[0].children![0].children![0].name).toBe("Frame A");
      expect(result.roots[0].children![0].children![0].children).toHaveLength(1);
      expect(result.roots[0].children![0].children![0].children![0].name).toBe("Rect");
    });

    it("handles multiple roots", () => {
      const nodes: FigNode[] = [
        createTestNode({ typeName: "DOCUMENT", typeValue: 1, guid: { sessionID: 0, localID: 0 }, name: "Doc1" }),
        createTestNode({ typeName: "DOCUMENT", typeValue: 1, guid: { sessionID: 1, localID: 0 }, name: "Doc2" }),
      ];

      const result = buildNodeTree(nodes);
      expect(result.roots).toHaveLength(2);
    });

    it("handles nodes without children", () => {
      const nodes: FigNode[] = [
        createTestNode({ typeName: "DOCUMENT", typeValue: 1, guid: { sessionID: 0, localID: 0 }, name: "Doc" }),
      ];

      const result = buildNodeTree(nodes);
      expect(result.roots).toHaveLength(1);
      expect(result.roots[0].children).toBeUndefined();
    });
  });

  describe("getNodeType", () => {
    it("returns string type from legacy format", () => {
      // Test backwards compatibility with string type
      const node = createLegacyStringTypeNode("FRAME", { sessionID: 0, localID: 0 });
      expect(getNodeType(node)).toBe("FRAME");
    });

    it("returns name from object type", () => {
      const node = createTestNode({ typeName: "RECTANGLE", typeValue: 10, guid: { sessionID: 0, localID: 0 } });
      expect(getNodeType(node)).toBe("RECTANGLE");
    });

    it("returns UNKNOWN for missing type", () => {
      const node = createNodeWithoutType({ sessionID: 0, localID: 0 });
      expect(getNodeType(node)).toBe("UNKNOWN");
    });
  });

  describe("findNodesByType", () => {
    it("finds all nodes of given type", () => {
      const tree: FigNode[] = [
        createTestNode({
          typeName: "DOCUMENT",
          typeValue: 1,
          guid: { sessionID: 0, localID: 0 },
          name: "Doc",
          children: [
            createTestNode({
              typeName: "CANVAS",
              typeValue: 2,
              guid: { sessionID: 0, localID: 1 },
              name: "Page",
              children: [
                createTestNode({ typeName: "FRAME", typeValue: 4, guid: { sessionID: 0, localID: 2 }, name: "F1" }),
                createTestNode({ typeName: "FRAME", typeValue: 4, guid: { sessionID: 0, localID: 3 }, name: "F2" }),
                createTestNode({ typeName: "TEXT", typeValue: 13, guid: { sessionID: 0, localID: 4 }, name: "T1" }),
              ],
            }),
          ],
        }),
      ];

      const frames = findNodesByType(tree, "FRAME");
      expect(frames).toHaveLength(2);
      expect(frames.map(f => f.name)).toEqual(["F1", "F2"]);
    });
  });

  describe("findNodeByGuid", () => {
    it("finds node by guid string", () => {
      const nodes: FigNode[] = [
        createTestNode({ typeName: "FRAME", typeValue: 4, guid: { sessionID: 1, localID: 42 }, name: "Target" }),
      ];

      const { nodeMap } = buildNodeTree(nodes);
      const found = findNodeByGuid(nodeMap, "1:42");

      expect(found).toBeDefined();
      expect(found!.name).toBe("Target");
    });

    it("returns undefined for unknown guid", () => {
      const { nodeMap } = buildNodeTree([]);
      expect(findNodeByGuid(nodeMap, "999:999")).toBeUndefined();
    });
  });
});
