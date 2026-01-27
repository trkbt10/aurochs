/**
 * @file History tests
 */

import { describe, it, expect } from "vitest";
import {
  createHistory,
  pushHistory,
  undoHistory,
  redoHistory,
  canUndo,
  canRedo,
} from "./history";

describe("createHistory", () => {
  it("creates history with initial value", () => {
    const history = createHistory(1);
    expect(history.present).toBe(1);
    expect(history.past).toEqual([]);
    expect(history.future).toEqual([]);
  });

  it("works with object values", () => {
    const obj = { name: "test" };
    const history = createHistory(obj);
    expect(history.present).toBe(obj);
  });
});

describe("pushHistory", () => {
  it("pushes new state and clears future", () => {
    const history = createHistory(1);
    const updated = pushHistory(history, 2);

    expect(updated.present).toBe(2);
    expect(updated.past).toEqual([1]);
    expect(updated.future).toEqual([]);
  });

  it("clears future when pushing after undo", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    const h4 = pushHistory(h3, 3);

    expect(h4.present).toBe(3);
    expect(h4.past).toEqual([1]);
    expect(h4.future).toEqual([]);
  });

  it("accumulates past states", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = pushHistory(h2, 3);
    const h4 = pushHistory(h3, 4);

    expect(h4.past).toEqual([1, 2, 3]);
    expect(h4.present).toBe(4);
  });
});

describe("undoHistory", () => {
  it("moves to previous state", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);

    expect(h3.present).toBe(1);
    expect(h3.past).toEqual([]);
    expect(h3.future).toEqual([2]);
  });

  it("returns same history when past is empty", () => {
    const history = createHistory(1);
    const undone = undoHistory(history);

    expect(undone).toBe(history);
  });

  it("can undo multiple times", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = pushHistory(h2, 3);
    const h4 = undoHistory(h3);
    const h5 = undoHistory(h4);

    expect(h5.present).toBe(1);
    expect(h5.past).toEqual([]);
    expect(h5.future).toEqual([2, 3]);
  });
});

describe("redoHistory", () => {
  it("moves to next state", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    const h4 = redoHistory(h3);

    expect(h4.present).toBe(2);
    expect(h4.past).toEqual([1]);
    expect(h4.future).toEqual([]);
  });

  it("returns same history when future is empty", () => {
    const history = createHistory(1);
    const redone = redoHistory(history);

    expect(redone).toBe(history);
  });

  it("can redo multiple times", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = pushHistory(h2, 3);
    const h4 = undoHistory(undoHistory(h3));
    const h5 = redoHistory(h4);
    const h6 = redoHistory(h5);

    expect(h6.present).toBe(3);
    expect(h6.past).toEqual([1, 2]);
    expect(h6.future).toEqual([]);
  });
});

describe("canUndo", () => {
  it("returns false for new history", () => {
    const history = createHistory(1);
    expect(canUndo(history)).toBe(false);
  });

  it("returns true after push", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    expect(canUndo(h2)).toBe(true);
  });
});

describe("canRedo", () => {
  it("returns false for new history", () => {
    const history = createHistory(1);
    expect(canRedo(history)).toBe(false);
  });

  it("returns true after undo", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    expect(canRedo(h3)).toBe(true);
  });

  it("returns false after push clears future", () => {
    const h1 = createHistory(1);
    const h2 = pushHistory(h1, 2);
    const h3 = undoHistory(h2);
    const h4 = pushHistory(h3, 3);
    expect(canRedo(h4)).toBe(false);
  });
});
