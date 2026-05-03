/** @file Multi-turn reducer persistence tests. */

import type { FigDesignDocument, FigDesignNode, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { createFigEditorState, figEditorReducer } from "./reducer";

function nodeId(id: string): FigNodeId {
  return id as FigNodeId;
}

function makeTextNode(): FigDesignNode {
  return {
    id: nodeId("text"),
    type: "TEXT",
    name: "Text",
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: 10, m10: 0, m11: 1, m12: 20 },
    size: { x: 100, y: 40 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
    textData: {
      characters: "A",
      fontSize: 16,
      fontName: { family: "Inter", style: "Regular" },
      textAlignHorizontal: { name: "LEFT", value: 0 },
      textAlignVertical: { name: "TOP", value: 0 },
    },
  };
}

function makeDocument(node: FigDesignNode): FigDesignDocument {
  return {
    pages: [{
      id: "page:1" as FigPageId,
      name: "Page",
      backgroundColor: DEFAULT_PAGE_BACKGROUND,
      children: [node],
    }],
    components: new Map(),
    images: new Map(),
    blobs: [],
    metadata: null,
    styleRegistry: EMPTY_FIG_STYLE_REGISTRY,
  };
}

describe("multi-turn reducer persistence", () => {
  it("accumulates committed move deltas across separate drag turns", () => {
    const node = makeTextNode();
    const selected = figEditorReducer(createFigEditorState(makeDocument(node)), {
      type: "SELECT_NODE",
      nodeId: node.id,
      addToSelection: false,
    });
    const firstMove = figEditorReducer(figEditorReducer(figEditorReducer(selected, {
      type: "START_PENDING_MOVE",
      startX: 10,
      startY: 20,
      startClientX: 10,
      startClientY: 20,
    }), { type: "CONFIRM_MOVE" }), { type: "PREVIEW_MOVE", dx: 5, dy: 6 });
    const firstCommit = figEditorReducer(firstMove, { type: "COMMIT_DRAG" });
    const secondMove = figEditorReducer(figEditorReducer(figEditorReducer(firstCommit, {
      type: "START_PENDING_MOVE",
      startX: 15,
      startY: 26,
      startClientX: 15,
      startClientY: 26,
    }), { type: "CONFIRM_MOVE" }), { type: "PREVIEW_MOVE", dx: 7, dy: 8 });
    const secondCommit = figEditorReducer(secondMove, { type: "COMMIT_DRAG" });
    const moved = secondCommit.documentHistory.present.pages[0]!.children[0]!;

    expect(moved.transform.m02).toBe(22);
    expect(moved.transform.m12).toBe(34);
    expect(secondCommit.drag.type).toBe("idle");
  });

  it("persists repeated text updates without restoring the previous characters", () => {
    const node = makeTextNode();
    const first = figEditorReducer(createFigEditorState(makeDocument(node)), {
      type: "UPDATE_NODE",
        source: "test",
      nodeId: node.id,
      updater: (current) => ({
        ...current,
        textData: current.textData ? { ...current.textData, characters: "AB" } : current.textData,
      }),
    });
    const second = figEditorReducer(first, {
      type: "UPDATE_NODE",
        source: "test",
      nodeId: node.id,
      updater: (current) => ({
        ...current,
        textData: current.textData ? { ...current.textData, characters: "ABC" } : current.textData,
      }),
    });

    expect(second.documentHistory.present.pages[0]!.children[0]!.textData?.characters).toBe("ABC");
  });
});
