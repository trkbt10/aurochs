/** @file Fig editor node reducer tests. */

import type { FigDesignDocument, FigDesignNode, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
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

describe("node handlers", () => {
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
});
