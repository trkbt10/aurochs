/** @file Fig editor creation reducer tests. */

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
  readonly width: number;
  readonly height: number;
  readonly children?: readonly FigDesignNode[];
};

function makeNode({ id, type, x, y, width, height, children }: TestNodeOptions): FigDesignNode {
  return {
    id: nodeId(id),
    type,
    name: id,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: width, y: height },
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

describe("creation handlers", () => {
  it("creates a new node inside the deepest containing frame with local coordinates", () => {
    const frame = makeNode({ id: "frame", type: "FRAME", x: 100, y: 100, width: 300, height: 200, children: [] });
    const state = createFigEditorState(makeDocument([frame]));
    const creating = figEditorReducer(state, { type: "SET_CREATION_MODE", mode: { type: "rectangle" } });
    const next = figEditorReducer(creating, {
      type: "COMMIT_CREATION",
      x: 125,
      y: 150,
      width: 80,
      height: 40,
    });

    const updatedFrame = next.documentHistory.present.pages[0]!.children[0]!;
    const child = updatedFrame.children?.[0];

    expect(next.documentHistory.present.pages[0]!.children).toHaveLength(1);
    expect(child?.type).toBe("RECTANGLE");
    expect(child?.transform.m02).toBe(25);
    expect(child?.transform.m12).toBe(50);
    expect(next.nodeSelection.primaryId).toBe(child?.id);
  });
});
