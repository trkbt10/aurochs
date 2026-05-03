/** @file Editable vector path command reducer tests. */

import {
  applyEditableVectorPathOperation,
  getEditableCommandEndpoint,
  getEditableCommandPoints,
  convertEditableSegmentToCurve,
  convertEditableSegmentToLine,
  deleteEditableAnchorCommand,
  getEditableControlLines,
  insertEditableLineAtNearestSegment,
  insertEditableLineBeforeClose,
  parseEditablePathData,
  replaceEditableCommandPoint,
  replaceEditableCommandEndpoint,
  scaleEditablePathData,
  serializeEditablePathData,
  setEditablePathClosed,
} from "./commands";

describe("editable vector path command reducer", () => {
  it("updates line endpoints without rewriting other commands", () => {
    const commands = parseEditablePathData("M 0 0 L 10 20 C 1 2 3 4 5 6 Z");

    expect(commands).toBeDefined();
    const updated = replaceEditableCommandEndpoint(commands ?? [], 2, { x: 50, y: 60 });

    expect(getEditableCommandEndpoint(updated[2]!)).toEqual({ x: 50, y: 60 });
    expect(serializeEditablePathData(updated)).toBe("M 0 0 L 10 20 C 1 2 48 58 50 60 Z");
  });

  it("updates bezier control points and inserts points before close", () => {
    const commands = parseEditablePathData("M 0 0 C 1 2 3 4 5 6 Z") ?? [];
    const movedControl = replaceEditableCommandPoint({
      commands,
      commandIndex: 1,
      valueIndex: 2,
      point: { x: 30, y: 40 },
    });
    const inserted = insertEditableLineBeforeClose(movedControl, { x: 9, y: 10 });

    expect(getEditableCommandPoints(movedControl[1]!)[1]).toEqual({ valueIndex: 2, x: 30, y: 40, role: "control" });
    expect(serializeEditablePathData(inserted)).toContain("C ");
    expect(serializeEditablePathData(inserted)).toMatch(/ Z$/);
  });

  it("moves committed path anchors with their attached bezier controls", () => {
    const commands = parseEditablePathData("M 0 0 C 10 0 30 40 50 50 C 70 60 90 80 100 90") ?? [];
    const movedMiddleAnchor = applyEditableVectorPathOperation(commands, {
      type: "move-command-point",
      commandIndex: 1,
      valueIndex: 4,
      point: { x: 60, y: 70 },
    });

    expect(serializeEditablePathData(movedMiddleAnchor)).toBe("M 0 0 C 10 0 40 60 60 70 C 80 80 90 80 100 90");

    const movedControl = applyEditableVectorPathOperation(movedMiddleAnchor, {
      type: "move-command-point",
      commandIndex: 2,
      valueIndex: 0,
      point: { x: 75, y: 85 },
    });

    expect(serializeEditablePathData(movedControl)).toBe("M 0 0 C 10 0 40 60 60 70 C 75 85 90 80 100 90");
  });

  it("inserts a point after the nearest segment instead of appending blindly", () => {
    const commands = parseEditablePathData("M 0 0 L 100 0 L 100 100 L 0 100 Z") ?? [];
    const inserted = insertEditableLineAtNearestSegment(commands, { x: 52, y: 2 });

    expect(serializeEditablePathData(inserted)).toBe("M 0 0 L 52 0 L 100 0 L 100 100 L 0 100 Z");
  });

  it("splits the clicked curve segment instead of inserting after the curve endpoint", () => {
    const commands = parseEditablePathData("M 0 0 C 0 100 100 100 100 0 L 160 0") ?? [];
    const inserted = insertEditableLineAtNearestSegment(commands, { x: 50, y: 76 });

    expect(serializeEditablePathData(inserted)).toBe("M 0 0 C 0 50 25 75 50 75 C 75 75 100 50 100 0 L 160 0");
  });

  it("converts straight and curved segments without changing the endpoint", () => {
    const commands = parseEditablePathData("M 0 0 L 90 0 Z") ?? [];
    const curved = convertEditableSegmentToCurve(commands, 1);
    const lined = convertEditableSegmentToLine(curved, 1);

    expect(serializeEditablePathData(curved)).toBe("M 0 0 C 30 0 60 0 90 0 Z");
    expect(serializeEditablePathData(lined)).toBe("M 0 0 L 90 0 Z");
  });

  it("scales editable path data around the local origin", () => {
    expect(scaleEditablePathData("M 0 0 C 10 20 30 40 50 60 L 100 80 Z", 2, 0.5))
      .toBe("M 0 0 C 20 10 60 20 100 30 L 200 40 Z");
  });

  it("deletes anchors while keeping at least two editable anchors", () => {
    const commands = parseEditablePathData("M 0 0 L 100 0 L 100 100 Z") ?? [];
    const deleted = deleteEditableAnchorCommand(commands, 1);
    const rejected = deleteEditableAnchorCommand(deleted, 1);

    expect(serializeEditablePathData(deleted)).toBe("M 0 0 L 100 100 Z");
    expect(serializeEditablePathData(rejected)).toBe("M 0 0 L 100 100 Z");
  });

  it("toggles closed paths and reports cubic control lines", () => {
    const commands = parseEditablePathData("M 0 0 C 30 0 60 50 90 50") ?? [];
    const closed = setEditablePathClosed(commands, true);
    const opened = setEditablePathClosed(closed, false);

    expect(serializeEditablePathData(closed)).toBe("M 0 0 C 30 0 60 50 90 50 Z");
    expect(serializeEditablePathData(opened)).toBe("M 0 0 C 30 0 60 50 90 50");
    expect(getEditableControlLines(commands)).toEqual([
      { key: "1:c1", from: { x: 0, y: 0 }, to: { x: 30, y: 0 } },
      { key: "1:c2", from: { x: 60, y: 50 }, to: { x: 90, y: 50 } },
    ]);
  });

  it("applies committed path editing operations through one operation reducer", () => {
    const commands = parseEditablePathData("M 0 0 L 90 0 L 90 60 Z") ?? [];
    const inserted = applyEditableVectorPathOperation(commands, {
      type: "insert-point-at-nearest-segment",
      point: { x: 45, y: 2 },
    });
    const curved = applyEditableVectorPathOperation(inserted, { type: "convert-segment-to-curve", commandIndex: 2 });
    const moved = applyEditableVectorPathOperation(curved, {
      type: "move-command-point",
      commandIndex: 2,
      valueIndex: 2,
      point: { x: 60, y: 30 },
    });
    const deleted = applyEditableVectorPathOperation(moved, { type: "delete-anchor", commandIndex: 1 });
    const opened = applyEditableVectorPathOperation(deleted, { type: "set-closed", closed: false });

    expect(serializeEditablePathData(opened)).toBe("M 0 0 C 60 0 60 30 90 0 L 90 60");
  });
});
