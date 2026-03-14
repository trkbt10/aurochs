/**
 * @file Unit tests for item-selection.ts
 */

import {
  createEmptyItemSelection,
  createSingleItemSelection,
  selectSingleItem,
  selectItemRange,
  toggleItemSelection,
  addItemToSelection,
  removeItemFromSelection,
  isItemSelected,
  isItemSelectionEmpty,
  selectAllItems,
  handleItemSelectionClick,
} from "./item-selection";

const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];

describe("createEmptyItemSelection", () => {
  it("creates empty state", () => {
    const sel = createEmptyItemSelection();
    expect(sel.selectedIds).toEqual([]);
    expect(sel.primaryId).toBeUndefined();
    expect(sel.anchorIndex).toBeUndefined();
  });
});

describe("selectSingleItem", () => {
  it("selects one item", () => {
    const sel = selectSingleItem("b", 1);
    expect(sel.selectedIds).toEqual(["b"]);
    expect(sel.primaryId).toBe("b");
    expect(sel.anchorIndex).toBe(1);
  });
});

describe("selectItemRange", () => {
  it("selects range forward", () => {
    const sel = selectItemRange(items, 1, 3);
    expect(sel.selectedIds).toEqual(["b", "c", "d"]);
    expect(sel.primaryId).toBe("d");
    expect(sel.anchorIndex).toBe(1);
  });

  it("selects range backward", () => {
    const sel = selectItemRange(items, 3, 1);
    expect(sel.selectedIds).toEqual(["b", "c", "d"]);
    expect(sel.primaryId).toBe("b");
    expect(sel.anchorIndex).toBe(3);
  });
});

describe("toggleItemSelection", () => {
  it("adds unselected item", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = toggleItemSelection(initial, "c", 2);
    expect(sel.selectedIds).toEqual(["a", "c"]);
    expect(sel.primaryId).toBe("c");
  });

  it("removes selected item", () => {
    const initial = { selectedIds: ["a", "b"], primaryId: "b" as string | undefined, anchorIndex: 1 as number | undefined };
    const sel = toggleItemSelection(initial, "b", 1);
    expect(sel.selectedIds).toEqual(["a"]);
    expect(sel.primaryId).toBe("a");
  });
});

describe("addItemToSelection", () => {
  it("adds new item", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = addItemToSelection(initial, "b", 1);
    expect(sel.selectedIds).toEqual(["a", "b"]);
  });

  it("does not duplicate existing item", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = addItemToSelection(initial, "a", 0);
    expect(sel).toBe(initial);
  });
});

describe("removeItemFromSelection", () => {
  it("removes existing item", () => {
    const initial = { selectedIds: ["a", "b"], primaryId: "b" as string | undefined, anchorIndex: 1 as number | undefined };
    const sel = removeItemFromSelection(initial, "a");
    expect(sel.selectedIds).toEqual(["b"]);
  });

  it("returns same state if item not in selection", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = removeItemFromSelection(initial, "z");
    expect(sel).toBe(initial);
  });
});

describe("isItemSelected / isItemSelectionEmpty", () => {
  it("checks selection", () => {
    const sel = createSingleItemSelection("a", 0);
    expect(isItemSelected(sel, "a")).toBe(true);
    expect(isItemSelected(sel, "b")).toBe(false);
    expect(isItemSelectionEmpty(sel)).toBe(false);
    expect(isItemSelectionEmpty(createEmptyItemSelection())).toBe(true);
  });
});

describe("selectAllItems", () => {
  it("selects all", () => {
    const sel = selectAllItems(items);
    expect(sel.selectedIds).toEqual(["a", "b", "c", "d", "e"]);
    expect(sel.primaryId).toBe("a");
  });

  it("returns empty for empty array", () => {
    const sel = selectAllItems([]);
    expect(sel.selectedIds).toEqual([]);
  });
});

describe("handleItemSelectionClick", () => {
  it("single click selects single", () => {
    const sel = handleItemSelectionClick({
      items, currentSelection: createEmptyItemSelection(), id: "b", index: 1, shiftKey: false, metaOrCtrlKey: false,
    });
    expect(sel.selectedIds).toEqual(["b"]);
  });

  it("shift click selects range", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = handleItemSelectionClick({
      items, currentSelection: initial, id: "c", index: 2, shiftKey: true, metaOrCtrlKey: false,
    });
    expect(sel.selectedIds).toEqual(["a", "b", "c"]);
  });

  it("ctrl click toggles", () => {
    const initial = createSingleItemSelection("a", 0);
    const sel = handleItemSelectionClick({
      items, currentSelection: initial, id: "c", index: 2, shiftKey: false, metaOrCtrlKey: true,
    });
    expect(sel.selectedIds).toEqual(["a", "c"]);
  });
});
