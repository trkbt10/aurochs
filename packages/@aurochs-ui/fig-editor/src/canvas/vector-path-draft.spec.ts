/** @file Vector path draft domain tests. */

import {
  appendVectorPathDraftPoint,
  applyVectorPathDraftAnchorDrag,
  canCommitVectorPathDraft,
  closeVectorPathDraft,
  commitVectorPathDraftToNodeSpec,
  isVectorPathDraftClosePoint,
  startVectorPathDraft,
  updateVectorPathDraftPreview,
  vectorPathDraftToPreviewPath,
} from "./vector-path-draft";

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

  it("turns anchor drags into cubic bezier controls and keeps the next segment continuous", () => {
    const first = startVectorPathDraft({
      parent: { parentId: null, parentTransform: undefined },
      localPoint: { x: 0, y: 0 },
      pagePoint: { x: 100, y: 100 },
    });
    const draggedStart = applyVectorPathDraftAnchorDrag(first, { x: 20, y: 0 }, { x: 120, y: 100 });
    const second = appendVectorPathDraftPoint(draggedStart, { x: 50, y: 50 }, { x: 150, y: 150 });
    const draggedSecond = applyVectorPathDraftAnchorDrag(second, { x: 70, y: 60 }, { x: 170, y: 160 });
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
});
