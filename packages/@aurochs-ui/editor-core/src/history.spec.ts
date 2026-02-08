/**
 * @file History tests
 */

import {
  canRedo,
  canUndo,
  clearHistory,
  createHistory,
  pushHistory,
  redoCount,
  redoHistory,
  replacePresent,
  undoCount,
  undoHistory,
} from "./history";

describe("createHistory", () => {
  it("creates history with initial value", () => {
    const history = createHistory(1);
    expect(history.present).toBe(1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });
});

describe("pushHistory / undoHistory / redoHistory", () => {
  it("supports basic push/undo/redo", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    const h4 = redoHistory(h3);

    expect(h2.present).toBe(2);
    expect(h3.present).toBe(1);
    expect(h4.present).toBe(2);
  });

  it("clears future on push after undo", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    const h4 = pushHistory(h3, 3);

    expect(h4.present).toBe(3);
    expect(h4.future).toEqual([]);
  });
});

describe("canUndo / canRedo", () => {
  it("reflects availability", () => {
    const h1 = createHistory("a");
    expect(canUndo(h1)).toBe(false);
    expect(canRedo(h1)).toBe(false);

    const h2 = pushHistory(h1, "b");
    expect(canUndo(h2)).toBe(true);
    expect(canRedo(h2)).toBe(false);

    const h3 = undoHistory(h2);
    expect(canUndo(h3)).toBe(false);
    expect(canRedo(h3)).toBe(true);
  });
});

describe("undoCount / redoCount / clearHistory / replacePresent", () => {
  it("counts undo/redo steps", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = pushHistory(h2, 3);
    const h4 = undoHistory(h3);

    expect(undoCount(h3)).toBe(2);
    expect(redoCount(h3)).toBe(0);

    expect(undoCount(h4)).toBe(1);
    expect(redoCount(h4)).toBe(1);
  });

  it("clears history but keeps present", () => {
    const h1 = createHistory("a");
    const h2 = pushHistory(h1, "b");
    const cleared = clearHistory(h2);

    expect(cleared.present).toBe("b");
    expect(cleared.past).toEqual([]);
    expect(cleared.future).toEqual([]);
  });

  it("replaces present without adding undo", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const replaced = replacePresent(h2, 3);

    expect(replaced.present).toBe(3);
    expect(replaced.past).toEqual([1]);
    expect(replaced.future).toEqual([]);
  });
});
