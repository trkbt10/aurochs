/**
 * @file History state tests
 */

import {
  canRedo,
  canUndo,
  createHistory,
  pushHistory,
  redoHistory,
  undoHistory,
} from "@aurochs-ui/editor-core/history";

describe("createHistory", () => {
  it("creates history with initial value", () => {
    const history = createHistory("initial");
    expect(history.present).toBe("initial");
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });
});

describe("pushHistory", () => {
  it("adds current to past and sets new present", () => {
    const history = createHistory("a");
    const pushed = pushHistory(history, "b");

    expect(pushed).not.toBe(history);
    expect(pushed.past).toEqual(["a"]);
    expect(pushed.present).toBe("b");
    expect(pushed.future).toEqual([]);

    expect(pushed.past).not.toBe(history.past);
    expect(pushed.future).not.toBe(history.future);
    expect(history).toEqual({ past: [], present: "a", future: [] });
  });

  it("clears future on push", () => {
    const historyA = createHistory("a");
    const historyB = pushHistory(historyA, "b");
    const historyC = pushHistory(historyB, "c");

    const undone = undoHistory(historyC);
    expect(undone.present).toBe("b");
    expect(undone.future).toEqual(["c"]);

    const pushed = pushHistory(undone, "d");
    expect(pushed.present).toBe("d");
    expect(pushed.past).toEqual(["a", "b"]);
    expect(pushed.future).toEqual([]);
  });
});

describe("undoHistory", () => {
  it("restores previous state", () => {
    const historyA = createHistory("a");
    const historyB = pushHistory(historyA, "b");
    const historyC = pushHistory(historyB, "c");

    const undone = undoHistory(historyC);
    expect(undone).not.toBe(historyC);
    expect(undone.past).toEqual(["a"]);
    expect(undone.present).toBe("b");
    expect(undone.future).toEqual(["c"]);

    expect(historyC.present).toBe("c");
    expect(historyC.past).toEqual(["a", "b"]);
    expect(historyC.future).toEqual([]);
  });

  it("does not change state if no past", () => {
    const history = createHistory("a");
    const undone = undoHistory(history);
    expect(undone).toBe(history);
    expect(undone).toEqual({ past: [], present: "a", future: [] });
  });
});

describe("redoHistory", () => {
  it("restores next state", () => {
    const historyA = createHistory("a");
    const historyB = pushHistory(historyA, "b");
    const historyC = pushHistory(historyB, "c");

    const undone = undoHistory(historyC);
    const redone = redoHistory(undone);

    expect(redone).not.toBe(undone);
    expect(redone.past).toEqual(["a", "b"]);
    expect(redone.present).toBe("c");
    expect(redone.future).toEqual([]);

    expect(undone.present).toBe("b");
    expect(undone.future).toEqual(["c"]);
  });

  it("does not change state if no future", () => {
    const history = pushHistory(createHistory("a"), "b");
    const redone = redoHistory(history);
    expect(redone).toBe(history);
    expect(redone).toEqual({ past: ["a"], present: "b", future: [] });
  });
});

describe("canUndo / canRedo", () => {
  it("reflects whether undo/redo is available", () => {
    const historyA = createHistory("a");
    expect(canUndo(historyA)).toBe(false);
    expect(canRedo(historyA)).toBe(false);

    const historyB = pushHistory(historyA, "b");
    expect(canUndo(historyB)).toBe(true);
    expect(canRedo(historyB)).toBe(false);

    const undone = undoHistory(historyB);
    expect(canUndo(undone)).toBe(false);
    expect(canRedo(undone)).toBe(true);
  });
});
