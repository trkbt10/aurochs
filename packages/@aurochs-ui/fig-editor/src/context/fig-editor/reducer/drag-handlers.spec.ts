/** @file Fig editor drag reducer tests. */

import type { FigDesignDocument, FigDesignNode, FigNodeId, FigPageId } from "@aurochs/fig/domain";
import { DEFAULT_PAGE_BACKGROUND, EMPTY_FIG_STYLE_REGISTRY } from "@aurochs/fig/domain";
import { computePreRotationTopLeft, extractRotationDeg } from "../rotation";
import { createFigEditorState, figEditorReducer } from "./reducer";

function nodeId(id: string): FigNodeId {
  return id as FigNodeId;
}

function makeNode(id: string, x: number, y: number): FigDesignNode {
  return {
    id: nodeId(id),
    type: "RECTANGLE",
    name: id,
    visible: true,
    opacity: 1,
    transform: { m00: 1, m01: 0, m02: x, m10: 0, m11: 1, m12: y },
    size: { x: 20, y: 20 },
    fills: [],
    strokes: [],
    strokeWeight: 0,
    effects: [],
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

describe("drag handlers", () => {
  it("rotates a multi-selection around the combined bounding-box center", () => {
    const left = makeNode("left", 0, 0);
    const right = makeNode("right", 100, 0);
    const selected = figEditorReducer(createFigEditorState(makeDocument([left, right])), {
      type: "SELECT_MULTIPLE_NODES",
      nodeIds: [left.id, right.id],
      primaryId: left.id,
    });
    const pending = figEditorReducer(selected, {
      type: "START_PENDING_ROTATE",
      startX: 120,
      startY: 10,
      startClientX: 120,
      startClientY: 10,
    });
    const rotating = figEditorReducer(figEditorReducer(pending, { type: "CONFIRM_ROTATE" }), {
      type: "PREVIEW_ROTATE",
      currentAngle: 90,
    });
    const committed = figEditorReducer(rotating, { type: "COMMIT_DRAG" });
    const [nextLeft, nextRight] = committed.documentHistory.present.pages[0]!.children;

    expect(extractRotationDeg(nextLeft!.transform)).toBeCloseTo(90);
    expect(extractRotationDeg(nextRight!.transform)).toBeCloseTo(90);
    expect(computePreRotationTopLeft(nextLeft!.transform, 20, 20)).toMatchObject({ x: 50, y: -50 });
    expect(computePreRotationTopLeft(nextRight!.transform, 20, 20)).toMatchObject({ x: 50, y: 50 });
  });

  it("rotates a single selection around its explicit transform origin", () => {
    const node = { ...makeNode("node", 100, 200), transformOrigin: { x: 0, y: 10 } };
    const selected = figEditorReducer(createFigEditorState(makeDocument([node])), {
      type: "SELECT_NODE",
      nodeId: node.id,
    });
    const pending = figEditorReducer(selected, {
      type: "START_PENDING_ROTATE",
      startX: 120,
      startY: 210,
      startClientX: 120,
      startClientY: 210,
    });
    const rotating = figEditorReducer(figEditorReducer(pending, { type: "CONFIRM_ROTATE" }), {
      type: "PREVIEW_ROTATE",
      currentAngle: 90,
    });
    const committed = figEditorReducer(rotating, { type: "COMMIT_DRAG" });
    const next = committed.documentHistory.present.pages[0]!.children[0]!;
    const originBefore = {
      x: node.transform.m00 * node.transformOrigin.x + node.transform.m01 * node.transformOrigin.y + node.transform.m02,
      y: node.transform.m10 * node.transformOrigin.x + node.transform.m11 * node.transformOrigin.y + node.transform.m12,
    };
    const originAfter = {
      x: next.transform.m00 * node.transformOrigin.x + next.transform.m01 * node.transformOrigin.y + next.transform.m02,
      y: next.transform.m10 * node.transformOrigin.x + next.transform.m11 * node.transformOrigin.y + next.transform.m12,
    };

    expect(extractRotationDeg(next.transform)).toBeCloseTo(90);
    expect(originAfter.x).toBeCloseTo(originBefore.x);
    expect(originAfter.y).toBeCloseTo(originBefore.y);
  });
});
