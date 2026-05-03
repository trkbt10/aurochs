/** @file Fig editor node reducer tests. */

import type { FigDesignDocument, FigDesignNode, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { buildSceneGraph, createNodeId, evaluateBooleanPathResult, type SceneNode } from "@aurochs-renderer/fig/scene-graph";
import { createFigEditorState, figEditorReducer } from "./reducer";

function nodeId(id: string): FigNodeId {
  return id as FigNodeId;
}

type TestNodeOptions = {
  readonly id: string;
  readonly type: FigDesignNode["type"];
  readonly x: number;
  readonly y: number;
  readonly children?: readonly FigDesignNode[];
};

function makeNode({ id, type, x, y, children }: TestNodeOptions): FigDesignNode {
  return {
    id: nodeId(id),
    type,
    name: id,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: 100, y: 50 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    children,
  };
}

function makeDocument(children: readonly FigDesignNode[]): FigDesignDocument {
  return {
    pages: [{
      id: "page:1" as FigPageId,
      name: "Page 1",
      backgroundColor: DEFAULT_PAGE_BACKGROUND,
      children,
    }],
    components: new Map(),
    images: new Map(),
    blobs: [],
    metadata: null,
    styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  };
}

function findSceneNodeById(nodes: readonly SceneNode[], id: string): SceneNode | undefined {
  for (const node of nodes) {
    if (node.id === createNodeId(id)) {
      return node;
    }
    if ("children" in node) {
      const found = findSceneNodeById(node.children, id);
      if (found) {
        return found;
      }
    }
  }
  return undefined;
}

describe("node handlers", () => {
  it("adds image assets to the document image registry", () => {
    const state = createFigEditorState(makeDocument([]));
    const added = figEditorReducer(state, {
      type: "ADD_IMAGE_ASSET",
      source: "test",
      image: { ref: "asset.png", data: new Uint8Array([1, 2, 3]), mimeType: "image/png" },
    });

    expect(added.documentHistory.present.images.get("asset.png")?.mimeType).toBe("image/png");
    expect(added.documentHistory.past).toHaveLength(1);
  });

  it("updates multiple selected nodes in one property mutation", () => {
    const first = {
      ...makeNode({ id: "first", type: "RECTANGLE", x: 10, y: 20 }),
      fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: { r: 0, g: 0, b: 0, a: 1 } }],
    };
    const second = {
      ...makeNode({ id: "second", type: "RECTANGLE", x: 90, y: 20 }),
      fills: [{ type: "SOLID" as const, visible: true, opacity: 1, color: { r: 0, g: 0, b: 0, a: 1 } }],
    };
    const state = createFigEditorState(makeDocument([first, second]));

    const updated = figEditorReducer(state, {
      type: "UPDATE_NODES",
      nodeIds: [first.id, second.id],
      source: "property-panel",
      updater: (node) => ({
        ...node,
        fills: [{ ...node.fills[0]!, color: { r: 1, g: 0, b: 0, a: 1 } }],
      }),
    });

    const page = updated.documentHistory.present.pages[0]!;
    expect(page.children[0]!.fills[0]!.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
    expect(page.children[1]!.fills[0]!.color).toEqual({ r: 1, g: 0, b: 0, a: 1 });
  });

  it("groups selected siblings inside nested Frame/Component containers", () => {
    const first = makeNode({ id: "first", type: "RECTANGLE", x: 10, y: 20 });
    const second = makeNode({ id: "second", type: "ELLIPSE", x: 140, y: 40 });
    const frame = makeNode({ id: "frame", type: "FRAME", x: 200, y: 300, children: [first, second] });
    const state = createFigEditorState(makeDocument([frame]));

    const selected = figEditorReducer(state, {
      type: "SELECT_MULTIPLE_NODES",
      nodeIds: [first.id, second.id],
      primaryId: first.id,
    });
    const grouped = figEditorReducer(selected, { type: "GROUP_SELECTION" });
    const updatedFrame = grouped.documentHistory.present.pages[0]!.children[0]!;
    const wrapper = updatedFrame.children?.[0];

    expect(updatedFrame.children).toHaveLength(1);
    expect(wrapper?.type).toBe("GROUP");
    expect(wrapper?.transform.m02).toBe(10);
    expect(wrapper?.transform.m12).toBe(20);
    expect(wrapper?.children?.map((child) => child.id)).toEqual([first.id, second.id]);
    expect(wrapper?.children?.[0]?.transform.m02).toBe(0);
    expect(wrapper?.children?.[1]?.transform.m02).toBe(130);
  });

  it("registers component wrappers created from nested selections", () => {
    const child = makeNode({ id: "child", type: "RECTANGLE", x: 10, y: 20 });
    const frame = makeNode({ id: "frame", type: "FRAME", x: 0, y: 0, children: [child] });
    const state = createFigEditorState(makeDocument([frame]));
    const selected = figEditorReducer(state, {
      type: "SELECT_NODE",
      nodeId: child.id,
      addToSelection: false,
    });
    const componentized = figEditorReducer(selected, { type: "MAKE_COMPONENT_FROM_SELECTION" });
    const wrapper = componentized.documentHistory.present.pages[0]!.children[0]!.children?.[0];

    expect(wrapper?.type).toBe("COMPONENT");
    expect(componentized.documentHistory.present.components.get(wrapper!.id)).toBe(wrapper);
  });

  it("registers symbol wrappers created from nested selections", () => {
    const child = makeNode({ id: "child", type: "RECTANGLE", x: 10, y: 20 });
    const component = makeNode({ id: "component", type: "COMPONENT", x: 0, y: 0, children: [child] });
    const state = createFigEditorState(makeDocument([component]));
    const selected = figEditorReducer(state, {
      type: "SELECT_NODE",
      nodeId: child.id,
      addToSelection: false,
    });
    const symbolized = figEditorReducer(selected, { type: "MAKE_SYMBOL_FROM_SELECTION" });
    const wrapper = symbolized.documentHistory.present.pages[0]!.children[0]!.children?.[0];

    expect(wrapper?.type).toBe("SYMBOL");
    expect(wrapper?.name).toBe("Symbol");
    expect(wrapper?.children?.[0]?.transform.m02).toBe(0);
    expect(symbolized.documentHistory.present.components.get(wrapper!.id)).toBe(wrapper);
    expect(symbolized.nodeSelection.primaryId).toBe(wrapper?.id);
  });

  it("outlines selected shape nodes into explicit vector paths", () => {
    const rect = makeNode({ id: "rect", type: "RECTANGLE", x: 10, y: 20 });
    const state = createFigEditorState(makeDocument([rect]));
    const selected = figEditorReducer(state, {
      type: "SELECT_NODE",
      nodeId: rect.id,
      addToSelection: false,
    });
    const outlined = figEditorReducer(selected, { type: "OUTLINE_SELECTION" });
    const node = outlined.documentHistory.present.pages[0]!.children[0]!;

    expect(node.type).toBe("VECTOR");
    expect(node.name).toBe("rect Outline");
    expect(node.vectorPaths?.[0]?.data).toContain("M 0 0");
    expect(outlined.nodeSelection.primaryId).toBe(rect.id);
  });

  it("creates boolean operation wrappers from selected siblings", () => {
    const first = makeNode({ id: "first", type: "RECTANGLE", x: 10, y: 20 });
    const second = makeNode({ id: "second", type: "ELLIPSE", x: 80, y: 40 });
    const state = createFigEditorState(makeDocument([first, second]));
    const selected = figEditorReducer(state, {
      type: "SELECT_MULTIPLE_NODES",
      nodeIds: [first.id, second.id],
      primaryId: first.id,
    });
    const unioned = figEditorReducer(selected, { type: "BOOLEAN_OPERATION_SELECTION", operation: "UNION" });
    const wrapper = unioned.documentHistory.present.pages[0]!.children[0]!;

    expect(wrapper.type).toBe("BOOLEAN_OPERATION");
    expect(wrapper.name).toBe("Union");
    expect(wrapper.booleanOperation).toEqual({ value: 0, name: "UNION" });
    expect(wrapper.children?.map((child) => child.id)).toEqual([first.id, second.id]);
    expect(wrapper.children?.[0]?.transform.m02).toBe(0);
    expect(wrapper.children?.[1]?.transform.m02).toBe(70);
    expect(unioned.nodeSelection.primaryId).toBe(wrapper.id);

    const booleanInputs = wrapper.children?.map((child) => ({
      d: `M${child.transform.m02} ${child.transform.m12} L${child.transform.m02 + child.size.x} ${child.transform.m12} L${child.transform.m02 + child.size.x} ${child.transform.m12 + child.size.y} L${child.transform.m02} ${child.transform.m12 + child.size.y} Z`,
      windingRule: "nonzero" as const,
    })) ?? [];
    const directEvaluation = evaluateBooleanPathResult(booleanInputs, "UNION");
    expect(booleanInputs).toHaveLength(2);
    expect(directEvaluation.ok).toBe(true);
    expect(directEvaluation.ok ? directEvaluation.paths.length : 0).toBeGreaterThan(0);

    const graph = buildSceneGraph(unioned.documentHistory.present.pages[0]!.children, {
      images: unioned.documentHistory.present.images,
      blobs: unioned.documentHistory.present.blobs,
      symbolMap: unioned.documentHistory.present.components,
      canvasSize: { width: 300, height: 200 },
      viewport: { x: 0, y: 0, width: 300, height: 200 },
    });
    const rendered = findSceneNodeById(graph.root.children, wrapper.id);
    expect(rendered?.type).toBe("path");
    expect(rendered?.type === "path" ? rendered.contours.length : 0).toBeGreaterThan(0);
    expect(findSceneNodeById(graph.root.children, first.id)).toBeUndefined();
    expect(findSceneNodeById(graph.root.children, second.id)).toBeUndefined();
  });
});
