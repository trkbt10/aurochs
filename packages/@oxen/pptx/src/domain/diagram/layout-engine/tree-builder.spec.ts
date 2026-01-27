/**
 * @file Tests for diagram tree builder
 *
 * @see ECMA-376 Part 1, Section 21.4.4 (dgm:dataModel)
 */

import type { DiagramDataModel, DiagramPoint, DiagramConnection } from "../types";
import {
  buildDiagramTree,
  traverseTree,
  countNodes,
  filterNodesByType,
  getContentNodes,
  getNodeText,
} from "./tree-builder";

// =============================================================================
// Test Fixtures
// =============================================================================

function createTextBody(text: string): { bodyProperties: Record<string, never>; paragraphs: { properties: Record<string, never>; runs: { type: "text"; text: string }[] }[] } {
  return {
    bodyProperties: {},
    paragraphs: [
      {
        properties: {},
        runs: [{ type: "text" as const, text }],
      },
    ],
  };
}

function createPoint(
  modelId: string,
  type?: string,
  text?: string
): DiagramPoint {
  return {
    modelId,
    type,
    textBody: text ? createTextBody(text) : undefined,
  };
}

function createConnection(
  modelId: string,
  sourceId: string,
  destinationId: string,
  type: "parOf" | "presOf" | "presParOf" = "parOf",
  sourceOrder?: number
): DiagramConnection {
  return {
    modelId,
    type,
    sourceId,
    destinationId,
    sourceOrder,
  };
}

// =============================================================================
// buildDiagramTree Tests
// =============================================================================

describe("buildDiagramTree", () => {
  it("builds empty tree from empty data model", () => {
    const dataModel: DiagramDataModel = {
      points: [],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.roots).toHaveLength(0);
    expect(result.nodeCount).toBe(0);
    expect(result.maxDepth).toBe(0);
  });

  it("builds single root node tree", () => {
    const dataModel: DiagramDataModel = {
      points: [createPoint("1", "doc", "Root")],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.roots).toHaveLength(1);
    expect(result.roots[0].id).toBe("1");
    expect(result.roots[0].type).toBe("doc");
    expect(result.roots[0].depth).toBe(0);
    expect(result.roots[0].children).toHaveLength(0);
    expect(result.nodeCount).toBe(1);
    expect(result.maxDepth).toBe(0);
  });

  it("builds tree with parent-child relationships", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc", "Root"),
        createPoint("child1", "node", "Child 1"),
        createPoint("child2", "node", "Child 2"),
      ],
      connections: [
        createConnection("c1", "child1", "root", "parOf"),
        createConnection("c2", "child2", "root", "parOf"),
      ],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.roots).toHaveLength(1);
    const root = result.roots[0];
    expect(root.id).toBe("root");
    expect(root.children).toHaveLength(2);
    expect(root.children[0].id).toBe("child1");
    expect(root.children[1].id).toBe("child2");
    expect(result.nodeCount).toBe(3);
    expect(result.maxDepth).toBe(1);
  });

  it("respects sourceOrder for child ordering", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("a", "node"),
        createPoint("b", "node"),
        createPoint("c", "node"),
      ],
      connections: [
        createConnection("c1", "a", "root", "parOf", 2),
        createConnection("c2", "b", "root", "parOf", 0),
        createConnection("c3", "c", "root", "parOf", 1),
      ],
    };

    const result = buildDiagramTree(dataModel);
    const root = result.roots[0];

    expect(root.children[0].id).toBe("b");
    expect(root.children[1].id).toBe("c");
    expect(root.children[2].id).toBe("a");
  });

  it("sets correct sibling indices and counts", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("a", "node"),
        createPoint("b", "node"),
        createPoint("c", "node"),
      ],
      connections: [
        createConnection("c1", "a", "root", "parOf", 0),
        createConnection("c2", "b", "root", "parOf", 1),
        createConnection("c3", "c", "root", "parOf", 2),
      ],
    };

    const result = buildDiagramTree(dataModel);
    const root = result.roots[0];

    expect(root.children[0].siblingIndex).toBe(0);
    expect(root.children[0].siblingCount).toBe(3);
    expect(root.children[1].siblingIndex).toBe(1);
    expect(root.children[1].siblingCount).toBe(3);
    expect(root.children[2].siblingIndex).toBe(2);
    expect(root.children[2].siblingCount).toBe(3);
  });

  it("builds deep tree correctly", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("1", "doc"),
        createPoint("2", "node"),
        createPoint("3", "node"),
        createPoint("4", "node"),
      ],
      connections: [
        createConnection("c1", "2", "1", "parOf"),
        createConnection("c2", "3", "2", "parOf"),
        createConnection("c3", "4", "3", "parOf"),
      ],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.maxDepth).toBe(3);
    expect(result.roots[0].depth).toBe(0);
    expect(result.roots[0].children[0].depth).toBe(1);
    expect(result.roots[0].children[0].children[0].depth).toBe(2);
    expect(result.roots[0].children[0].children[0].children[0].depth).toBe(3);
  });

  it("ignores presOf and presParOf connections for tree structure", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("child", "node"),
        createPoint("pres", "pres"),
      ],
      connections: [
        createConnection("c1", "child", "root", "parOf"),
        createConnection("c2", "pres", "child", "presOf"),
        createConnection("c3", "pres", "root", "presParOf"),
      ],
    };

    const result = buildDiagramTree(dataModel);

    // pres should be a root since presOf/presParOf are not tree relationships
    expect(result.roots).toHaveLength(2);
    expect(result.roots[0].id).toBe("root");
    expect(result.roots[0].children).toHaveLength(1);
    expect(result.roots[0].children[0].id).toBe("child");
  });

  it("parses different point types correctly", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("1", "doc"),
        createPoint("2", "node"),
        createPoint("3", "asst"),
        createPoint("4", "parTrans"),
        createPoint("5", "sibTrans"),
        createPoint("6", "pres"),
        createPoint("7", undefined), // defaults to "node"
      ],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    const types = result.roots.map((n) => n.type);
    expect(types).toContain("doc");
    expect(types).toContain("node");
    expect(types).toContain("asst");
    expect(types).toContain("parTrans");
    expect(types).toContain("sibTrans");
    expect(types).toContain("pres");
  });

  it("sorts roots with doc type first", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("a", "node"),
        createPoint("b", "doc"),
        createPoint("c", "asst"),
      ],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.roots[0].type).toBe("doc");
  });

  it("provides nodeMap for quick lookup", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("child", "node"),
      ],
      connections: [createConnection("c1", "child", "root", "parOf")],
    };

    const result = buildDiagramTree(dataModel);

    expect(result.nodeMap.get("root")).toBeDefined();
    expect(result.nodeMap.get("child")).toBeDefined();
    expect(result.nodeMap.get("root")?.id).toBe("root");
    expect(result.nodeMap.get("child")?.id).toBe("child");
  });
});

// =============================================================================
// Traversal Tests
// =============================================================================

describe("traverseTree", () => {
  it("traverses all nodes in depth-first order", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("a", "node"),
        createPoint("b", "node"),
        createPoint("a1", "node"),
      ],
      connections: [
        createConnection("c1", "a", "root", "parOf", 0),
        createConnection("c2", "b", "root", "parOf", 1),
        createConnection("c3", "a1", "a", "parOf"),
      ],
    };

    const result = buildDiagramTree(dataModel);
    const visited: string[] = [];

    traverseTree(result.roots, (node) => {
      visited.push(node.id);
    });

    expect(visited).toEqual(["root", "a", "a1", "b"]);
  });

  it("provides parent reference in callback", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("root", "doc"),
        createPoint("child", "node"),
      ],
      connections: [createConnection("c1", "child", "root", "parOf")],
    };

    const result = buildDiagramTree(dataModel);
    const parentMap = new Map<string, string | undefined>();

    traverseTree(result.roots, (node, parent) => {
      parentMap.set(node.id, parent?.id);
    });

    expect(parentMap.get("root")).toBeUndefined();
    expect(parentMap.get("child")).toBe("root");
  });
});

describe("countNodes", () => {
  it("counts nodes matching predicate", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("1", "doc"),
        createPoint("2", "node"),
        createPoint("3", "node"),
        createPoint("4", "asst"),
      ],
      connections: [
        createConnection("c1", "2", "1", "parOf"),
        createConnection("c2", "3", "1", "parOf"),
        createConnection("c3", "4", "1", "parOf"),
      ],
    };

    const result = buildDiagramTree(dataModel);

    expect(countNodes(result.roots, (n) => n.type === "node")).toBe(2);
    expect(countNodes(result.roots, (n) => n.type === "doc")).toBe(1);
    expect(countNodes(result.roots, () => true)).toBe(4);
  });
});

describe("filterNodesByType", () => {
  it("returns nodes of specified type", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("1", "doc"),
        createPoint("2", "node"),
        createPoint("3", "node"),
        createPoint("4", "asst"),
      ],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    const nodeTypes = filterNodesByType(result.roots, "node");
    expect(nodeTypes).toHaveLength(2);
    expect(nodeTypes.map((n) => n.id)).toContain("2");
    expect(nodeTypes.map((n) => n.id)).toContain("3");
  });
});

describe("getContentNodes", () => {
  it("returns only content nodes (node, doc, asst)", () => {
    const dataModel: DiagramDataModel = {
      points: [
        createPoint("1", "doc"),
        createPoint("2", "node"),
        createPoint("3", "asst"),
        createPoint("4", "parTrans"),
        createPoint("5", "sibTrans"),
        createPoint("6", "pres"),
      ],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    const contentNodes = getContentNodes(result.roots);
    expect(contentNodes).toHaveLength(3);
    const ids = contentNodes.map((n) => n.id);
    expect(ids).toContain("1");
    expect(ids).toContain("2");
    expect(ids).toContain("3");
    expect(ids).not.toContain("4");
    expect(ids).not.toContain("5");
    expect(ids).not.toContain("6");
  });
});

describe("getNodeText", () => {
  it("extracts text from node", () => {
    const dataModel: DiagramDataModel = {
      points: [createPoint("1", "doc", "Hello World")],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(getNodeText(result.roots[0])).toBe("Hello World");
  });

  it("returns empty string for node without text", () => {
    const dataModel: DiagramDataModel = {
      points: [createPoint("1", "doc")],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(getNodeText(result.roots[0])).toBe("");
  });

  it("concatenates text from multiple runs", () => {
    const dataModel: DiagramDataModel = {
      points: [
        {
          modelId: "1",
          type: "doc",
          textBody: {
            bodyProperties: {},
            paragraphs: [
              {
                properties: {},
                runs: [
                  { type: "text" as const, text: "Hello " },
                  { type: "text" as const, text: "World" },
                ],
              },
            ],
          },
        },
      ],
      connections: [],
    };

    const result = buildDiagramTree(dataModel);

    expect(getNodeText(result.roots[0])).toBe("Hello World");
  });
});
