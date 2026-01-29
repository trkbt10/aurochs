/**
 * @file Selection tests
 */

import type { SelectionState } from "./selection";
import {
  addToSelection,
  createEmptySelection,
  createMultiSelection,
  createSingleSelection,
  isSelected,
  isSelectionEmpty,
  removeFromSelection,
  toggleSelection,
} from "./selection";

describe("selection", () => {
  it("creates empty selection", () => {
    const s: SelectionState<string> = createEmptySelection();
    expect(s.selectedIds).toEqual([]);
    expect(s.primaryId).toBeUndefined();
    expect(isSelectionEmpty(s)).toBe(true);
  });

  it("creates single selection", () => {
    const s = createSingleSelection("a");
    expect(s.selectedIds).toEqual(["a"]);
    expect(s.primaryId).toBe("a");
    expect(isSelected(s, "a")).toBe(true);
  });

  it("creates multi selection with explicit primary", () => {
    const s = createMultiSelection({ selectedIds: ["a", "b"], primaryId: "b" });
    expect(s.selectedIds).toEqual(["a", "b"]);
    expect(s.primaryId).toBe("b");
  });

  it("adds new id and sets primary", () => {
    const s0: SelectionState<string> = createEmptySelection();
    const s1 = addToSelection(s0, "a");
    const s2 = addToSelection(s1, "b");
    expect(s2.selectedIds).toEqual(["a", "b"]);
    expect(s2.primaryId).toBe("b");
  });

  it("removes id and falls back primary (last)", () => {
    const s0 = createMultiSelection({ selectedIds: ["a", "b", "c"], primaryId: "c" });
    const s1 = removeFromSelection({ selection: s0, id: "c", primaryFallback: "last" });
    expect(s1.selectedIds).toEqual(["a", "b"]);
    expect(s1.primaryId).toBe("b");
  });

  it("toggles selection with explicit fallback", () => {
    const s0 = createSingleSelection("a");
    const s1 = toggleSelection({ selection: s0, id: "a", primaryFallback: "first" });
    expect(s1.selectedIds).toEqual([]);
    expect(s1.primaryId).toBeUndefined();
  });
});

