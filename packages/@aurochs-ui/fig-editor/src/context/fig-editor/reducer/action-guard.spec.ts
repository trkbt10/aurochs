/** @file Tests for reducer-level action guard. */

import type { FigDesignDocument, FigNodeId } from "@aurochs/fig/domain";
import { createFigEditorState } from "./reducer";
import { figEditorReducer } from "./reducer";
import { isFigEditorActionAllowed } from "./action-guard";

function makeDocument(): FigDesignDocument {
  return {
    id: "doc" as FigNodeId,
    name: "Doc",
    pages: [{ id: "page" as FigNodeId, name: "Page", children: [] }],
    components: {},
    styles: {},
  } as FigDesignDocument;
}

describe("isFigEditorActionAllowed", () => {
  it("rejects property mutations during text editing while allowing text-edit mutations", () => {
    const state = {
      ...createFigEditorState(makeDocument()),
      textEdit: { type: "active", nodeId: "text" as FigNodeId },
    };

    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODE",
      nodeId: "text" as FigNodeId,
      source: "text-edit",
      updater: (node) => node,
    })).toBe(true);
    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODES",
      nodeIds: ["text" as FigNodeId],
      source: "text-edit",
      updater: (node) => node,
    })).toBe(true);
    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODE",
      nodeId: "text" as FigNodeId,
      source: "property-panel",
      updater: (node) => node,
    })).toBe(false);
    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODES",
      nodeIds: ["text" as FigNodeId],
      source: "property-panel",
      updater: (node) => node,
    })).toBe(false);

    const reduced = figEditorReducer(state, {
      type: "UPDATE_NODE",
      nodeId: "text" as FigNodeId,
      source: "property-panel",
      updater: (node) => node,
    });
    expect(reduced).toBe(state);
  });

  it("rejects property mutations during path editing while allowing path mutations", () => {
    const state = {
      ...createFigEditorState(makeDocument()),
      creationMode: { type: "pen" as const },
    };

    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODE",
      nodeId: "vector" as FigNodeId,
      source: "path-edit",
      updater: (node) => node,
    })).toBe(true);
    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODE",
      nodeId: "vector" as FigNodeId,
      source: "property-panel",
      updater: (node) => node,
    })).toBe(false);
  });

  it("rejects inspector and page edits during active canvas transforms", () => {
    const state = {
      ...createFigEditorState(makeDocument()),
      drag: {
        type: "move" as const,
        startX: 10,
        startY: 20,
        shapeIds: ["shape" as FigNodeId],
        initialBounds: new Map(),
        previewDelta: { dx: 0, dy: 0 },
      },
    };

    expect(isFigEditorActionAllowed(state, {
      type: "START_MOVE",
      startX: 10,
      startY: 20,
    })).toBe(false);

    expect(isFigEditorActionAllowed(state, {
      type: "UPDATE_NODE",
      nodeId: "shape" as FigNodeId,
      source: "property-panel",
      updater: (node) => node,
    })).toBe(false);
    expect(isFigEditorActionAllowed(state, {
      type: "RENAME_PAGE",
      pageId: "page" as FigNodeId,
      name: "Renamed",
    })).toBe(false);
    expect(isFigEditorActionAllowed(state, {
      type: "PREVIEW_MOVE",
      dx: 4,
      dy: 2,
    })).toBe(true);
  });
});
