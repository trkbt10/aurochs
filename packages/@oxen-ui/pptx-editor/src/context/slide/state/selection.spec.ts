/**
 * @file Selection tests
 */

import { describe, it, expect } from "vitest";
import {
  createEmptySelection,
  createSingleSelection,
  createMultiSelection,
  addToSelection,
  removeFromSelection,
  toggleSelection,
  isSelected,
  isSelectionEmpty,
} from "./selection";

describe("createEmptySelection", () => {
  it("creates empty selection", () => {
    const selection = createEmptySelection();
    expect(selection.selectedIds).toEqual([]);
    expect(selection.primaryId).toBeUndefined();
  });
});

describe("createSingleSelection", () => {
  it("creates selection with one shape", () => {
    const selection = createSingleSelection("shape1");
    expect(selection.selectedIds).toEqual(["shape1"]);
    expect(selection.primaryId).toBe("shape1");
  });
});

describe("createMultiSelection", () => {
  it("creates selection with multiple shapes", () => {
    const selection = createMultiSelection(["shape1", "shape2", "shape3"]);
    expect(selection.selectedIds).toEqual(["shape1", "shape2", "shape3"]);
    expect(selection.primaryId).toBe("shape1");
  });

  it("uses provided primaryId", () => {
    const selection = createMultiSelection(["shape1", "shape2"], "shape2");
    expect(selection.primaryId).toBe("shape2");
  });
});

describe("addToSelection", () => {
  it("adds shape to selection", () => {
    const s1 = createSingleSelection("shape1");
    const s2 = addToSelection(s1, "shape2");

    expect(s2.selectedIds).toEqual(["shape1", "shape2"]);
    expect(s2.primaryId).toBe("shape2");
  });

  it("returns same selection if already selected", () => {
    const s1 = createSingleSelection("shape1");
    const s2 = addToSelection(s1, "shape1");

    expect(s2).toBe(s1);
  });
});

describe("removeFromSelection", () => {
  it("removes shape from selection", () => {
    const s1 = createMultiSelection(["shape1", "shape2", "shape3"]);
    const s2 = removeFromSelection(s1, "shape2");

    expect(s2.selectedIds).toEqual(["shape1", "shape3"]);
  });

  it("updates primaryId when primary is removed", () => {
    const s1 = createMultiSelection(["shape1", "shape2"], "shape1");
    const s2 = removeFromSelection(s1, "shape1");

    expect(s2.primaryId).toBe("shape2");
  });

  it("keeps primaryId when non-primary is removed", () => {
    const s1 = createMultiSelection(["shape1", "shape2"], "shape1");
    const s2 = removeFromSelection(s1, "shape2");

    expect(s2.primaryId).toBe("shape1");
  });
});

describe("toggleSelection", () => {
  it("adds shape if not selected", () => {
    const s1 = createEmptySelection();
    const s2 = toggleSelection(s1, "shape1");

    expect(s2.selectedIds).toEqual(["shape1"]);
  });

  it("removes shape if already selected", () => {
    const s1 = createSingleSelection("shape1");
    const s2 = toggleSelection(s1, "shape1");

    expect(s2.selectedIds).toEqual([]);
  });
});

describe("isSelected", () => {
  it("returns true for selected shape", () => {
    const selection = createSingleSelection("shape1");
    expect(isSelected(selection, "shape1")).toBe(true);
  });

  it("returns false for unselected shape", () => {
    const selection = createSingleSelection("shape1");
    expect(isSelected(selection, "shape2")).toBe(false);
  });
});

describe("isSelectionEmpty", () => {
  it("returns true for empty selection", () => {
    const selection = createEmptySelection();
    expect(isSelectionEmpty(selection)).toBe(true);
  });

  it("returns false for non-empty selection", () => {
    const selection = createSingleSelection("shape1");
    expect(isSelectionEmpty(selection)).toBe(false);
  });
});
