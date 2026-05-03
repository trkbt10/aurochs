/** @file Vector path draft domain tests. */

import {
  applyVectorPathDraftOperation,
  appendVectorPathDraftPoint,
  applyVectorPathDraftAnchorDrag,
  canCommitVectorPathDraft,
  closeVectorPathDraft,
  commitVectorPathDraftToNodeSpec,
  getVectorPathDraftControlLines,
  isVectorPathDraftClosePoint,
  startVectorPathDraft,
  updateVectorPathDraftPreview,
  vectorPathDraftToPreviewPath,
} from "./draft";

describe("vector path draft", () => {
  it("keeps drawing open across multiple anchor clicks before commit", () => {
    const draft = startVectorPathDraft({
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 10, y: 20 },
      pagePoint: { x: 110, y: 120 },
    });
    const second = appendVectorPathDraftPoint(draft, { x: 40, y: 50 }, { x: 140, y: 150 });
    const preview = updateVectorPathDraftPreview(second, { x: 180, y: 190 });

    expect(canCommitVectorPathDraft(draft)).toBe(false);
    expect(canCommitVectorPathDraft(second)).toBe(true);
    expect(vectorPathDraftToPreviewPath(preview)).toBe("M 110 120 L 140 150 L 180 190");
  });

  it("normalizes committed path units to the vector local bounding box", () => {
    const draft = appendVectorPathDraftPoint(
      appendVectorPathDraftPoint(
        startVectorPathDraft({
          parent: { parentId: null, parentTransform: undefined },
          localPoint: { x: 50, y: 40 },
          pagePoint: { x: 50, y: 40 },
        }),
        { x: 20, y: 80 },
        { x: 20, y: 80 },
      ),
      { x: 90, y: 10 },
      { x: 90, y: 10 },
    );

    const spec = commitVectorPathDraftToNodeSpec(draft);

    expect(spec).toMatchObject({
      type: "VECTOR",
      x: 20,
      y: 10,
      width: 70,
      height: 70,
    });
    expect(spec.type).toBe("VECTOR");
    if (spec.type === "VECTOR") {
      expect(spec.vectorPaths[0]?.data).toBe("M 30 30 L 0 70 L 70 0");
    }
  });

  it("uses rendered curve bounds instead of raw bezier handles for committed vector bounds", () => {
    const first = startVectorPathDraft({
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 0, y: 100 },
      pagePoint: { x: 0, y: 100 },
    });
    const draggedFirst = applyVectorPathDraftAnchorDrag(first, { x: 50, y: -200 }, { x: 50, y: -200 });
    const second = appendVectorPathDraftPoint(draggedFirst, { x: 100, y: 100 }, { x: 100, y: 100 });

    const spec = commitVectorPathDraftToNodeSpec(second);

    expect(spec).toMatchObject({
      type: "VECTOR",
      x: 0,
      width: 100,
    });
    expect(spec.type).toBe("VECTOR");
    if (spec.type === "VECTOR") {
      expect(spec.y).toBeGreaterThan(-200);
      expect(spec.vectorPaths[0]?.data).toContain("C ");
    }
  });

  it("turns anchor drags into cubic bezier controls and keeps the next segment continuous", () => {
    const first = startVectorPathDraft({
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 0, y: 0 },
      pagePoint: { x: 100, y: 100 },
    });
    const draggedStart = applyVectorPathDraftAnchorDrag(first, { x: 20, y: 0 }, { x: 120, y: 100 });
    expect(getVectorPathDraftControlLines(draggedStart)).toEqual([{
      key: "draft-control-line-outgoing",
      from: { x: 100, y: 100 },
      to: { x: 120, y: 100 },
    }]);
    const second = appendVectorPathDraftPoint(draggedStart, { x: 50, y: 50 }, { x: 150, y: 150 });
    const draggedSecond = applyVectorPathDraftAnchorDrag(second, { x: 70, y: 60 }, { x: 170, y: 160 });
    expect(getVectorPathDraftControlLines(draggedSecond).map((line) => line.key)).toEqual([
      "draft-control-line-0-1",
      "draft-control-line-0-2",
      "draft-control-line-outgoing",
    ]);
    const third = appendVectorPathDraftPoint(draggedSecond, { x: 100, y: 20 }, { x: 200, y: 120 });

    const spec = commitVectorPathDraftToNodeSpec(third);

    expect(spec.type).toBe("VECTOR");
    if (spec.type === "VECTOR") {
      expect(spec.vectorPaths[0]?.data).toBe("M 0 0 C 20 0 30 40 50 50 C 70 60 100 20 100 20");
    }
  });

  it("closes a draft by reconnecting to the first anchor", () => {
    const draft = appendVectorPathDraftPoint(
      appendVectorPathDraftPoint(
        startVectorPathDraft({
          parent: { parentId: null, parentTransform: undefined },
          localPoint: { x: 10, y: 10 },
          pagePoint: { x: 110, y: 110 },
        }),
        { x: 50, y: 10 },
        { x: 150, y: 110 },
      ),
      { x: 50, y: 50 },
      { x: 150, y: 150 },
    );

    expect(isVectorPathDraftClosePoint(draft, { x: 112, y: 111 }, 6)).toBe(true);

    const spec = commitVectorPathDraftToNodeSpec(closeVectorPathDraft(draft));

    expect(spec.type).toBe("VECTOR");
    if (spec.type === "VECTOR") {
      expect(spec.vectorPaths[0]?.data).toBe("M 0 0 L 40 0 L 40 40 Z");
    }
  });

  it("rejects committing incomplete drafts", () => {
    const draft = startVectorPathDraft({
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 0, y: 0 },
      pagePoint: { x: 0, y: 0 },
    });

    expect(() => commitVectorPathDraftToNodeSpec(draft)).toThrow("requires at least two anchors");
  });

  it("drives place, bezier drag, close, and commit through the draft operation domain", () => {
    const first = applyVectorPathDraftOperation(null, {
      type: "place-point",
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 0, y: 0 },
      pagePoint: { x: 100, y: 100 },
      pointerStart: { clientX: 100, clientY: 100 },
      closeTolerance: 6,
    });
    const dragged = applyVectorPathDraftOperation(first.session, {
      type: "anchor-drag-end",
      localPoint: { x: 20, y: 0 },
      pagePoint: { x: 120, y: 100 },
      exceededThreshold: true,
    });
    const second = applyVectorPathDraftOperation(dragged.session, {
      type: "place-point",
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 50, y: 40 },
      pagePoint: { x: 150, y: 140 },
      pointerStart: { clientX: 150, clientY: 140 },
      closeTolerance: 6,
    });
    const third = applyVectorPathDraftOperation(second.session, {
      type: "place-point",
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 80, y: 0 },
      pagePoint: { x: 180, y: 100 },
      pointerStart: { clientX: 180, clientY: 100 },
      closeTolerance: 6,
    });
    const closed = applyVectorPathDraftOperation(third.session, {
      type: "place-point",
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 1, y: 1 },
      pagePoint: { x: 101, y: 101 },
      pointerStart: { clientX: 101, clientY: 101 },
      closeTolerance: 6,
    });

    expect(getVectorPathDraftControlLines(dragged.session!.draft).map((line) => line.key)).toEqual(["draft-control-line-outgoing"]);
    expect(closed.session).toBeNull();
    expect(closed.committedDraft?.closed).toBe(true);
    expect(commitVectorPathDraftToNodeSpec(closed.committedDraft!).type).toBe("VECTOR");
  });
});
