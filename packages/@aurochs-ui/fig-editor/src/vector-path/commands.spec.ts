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
  serializeEditablePathData,
  setEditablePathClosed,
} from "./commands";

describe("editable vector path command reducer", () => {
  it("updates line endpoints without rewriting other commands", () => {
    const commands = parseEditablePathData("M 0 0 L 10 20 C 1 2 3 4 5 6 Z");

    expect(commands).toBeDefined();
    const updated = replaceEditableCommandEndpoint(commands ?? [], 2, { x: 50, y: 60 });

    expect(getEditableCommandEndpoint(updated[2]!)).toEqual({ x: 50, y: 60 });
    expect(serializeEditablePathData(updated)).toBe("M 0 0 L 10 20 C 1 2 3 4 50 60 Z");
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
    expect(serializeEditablePathData(inserted)).toBe("M 0 0 C 1 2 30 40 5 6 L 9 10 Z");
  });

  it("inserts a point after the nearest segment instead of appending blindly", () => {
    const commands = parseEditablePathData("M 0 0 L 100 0 L 100 100 L 0 100 Z") ?? [];
    const inserted = insertEditableLineAtNearestSegment(commands, { x: 52, y: 2 });

    expect(serializeEditablePathData(inserted)).toBe("M 0 0 L 100 0 L 52 2 L 100 100 L 0 100 Z");
  });

  it("converts straight and curved segments without changing the endpoint", () => {
    const commands = parseEditablePathData("M 0 0 L 90 0 Z") ?? [];
    const curved = convertEditableSegmentToCurve(commands, 1);
    const lined = convertEditableSegmentToLine(curved, 1);

    expect(serializeEditablePathData(curved)).toBe("M 0 0 C 30 0 60 0 90 0 Z");
    expect(serializeEditablePathData(lined)).toBe("M 0 0 L 90 0 Z");
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

    expect(serializeEditablePathData(opened)).toBe("M 0 0 C 75 0.6666666666666666 60 30 45 2 L 90 60");
  });
});
