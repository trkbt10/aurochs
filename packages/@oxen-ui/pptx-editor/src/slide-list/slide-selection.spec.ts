/**
 * @file Slide selection tests
 *
 * Tests for slide selection logic: single, range (Shift+click), toggle (Ctrl+click)
 */

import { describe, it, expect } from "vitest";
import type { SlideWithId } from "@oxen/pptx/app";
import {
  createEmptySlideSelection,
  createSingleSlideSelection,
} from "./types";
import {
  selectSingle,
  selectRange,
  toggleSelection,
  addToSelection,
  removeFromSelection,
  isSelected,
  isSelectionEmpty,
  selectAll,
  handleSelectionClick,
} from "./selection";

// =============================================================================
// Test fixtures
// =============================================================================

function createTestSlides(count: number): readonly SlideWithId[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `slide-${i + 1}`,
    slide: { shapes: [] },
  }));
}

// =============================================================================
// Selection state creation
// =============================================================================

describe("createEmptySlideSelection", () => {
  it("creates empty selection", () => {
    const selection = createEmptySlideSelection();
    expect(selection.selectedIds).toEqual([]);
    expect(selection.primaryId).toBeUndefined();
    expect(selection.anchorIndex).toBeUndefined();
  });
});

describe("createSingleSlideSelection", () => {
  it("creates selection with one slide", () => {
    const selection = createSingleSlideSelection("slide-1", 0);
    expect(selection.selectedIds).toEqual(["slide-1"]);
    expect(selection.primaryId).toBe("slide-1");
    expect(selection.anchorIndex).toBe(0);
  });
});

// =============================================================================
// Selection operations
// =============================================================================

describe("selectSingle", () => {
  it("creates selection with specified slide", () => {
    const result = selectSingle("slide-3", 2);

    expect(result.selectedIds).toEqual(["slide-3"]);
    expect(result.primaryId).toBe("slide-3");
    expect(result.anchorIndex).toBe(2);
  });
});

describe("selectRange", () => {
  const slides = createTestSlides(5);

  it("selects range from anchor to target", () => {
    const result = selectRange(slides, 1, 3);

    expect(result.selectedIds).toEqual(["slide-2", "slide-3", "slide-4"]);
    expect(result.primaryId).toBe("slide-4");
    expect(result.anchorIndex).toBe(1);
  });

  it("selects range backwards (target before anchor)", () => {
    const result = selectRange(slides, 3, 1);

    expect(result.selectedIds).toEqual(["slide-2", "slide-3", "slide-4"]);
    expect(result.primaryId).toBe("slide-2");
    expect(result.anchorIndex).toBe(3);
  });

  it("selects single slide when anchor equals target", () => {
    const result = selectRange(slides, 2, 2);

    expect(result.selectedIds).toEqual(["slide-3"]);
    expect(result.primaryId).toBe("slide-3");
  });
});

describe("toggleSelection", () => {
  it("adds slide to selection if not selected", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = toggleSelection(initial, "slide-3", 2);

    expect(result.selectedIds).toContain("slide-1");
    expect(result.selectedIds).toContain("slide-3");
    expect(result.primaryId).toBe("slide-3");
    expect(result.anchorIndex).toBe(2);
  });

  it("removes slide from selection if already selected", () => {
    const initial = {
      selectedIds: ["slide-1", "slide-3"] as readonly string[],
      primaryId: "slide-3",
      anchorIndex: 2,
    };
    const result = toggleSelection(initial, "slide-3", 2);

    expect(result.selectedIds).toEqual(["slide-1"]);
    expect(result.selectedIds).not.toContain("slide-3");
  });

  it("handles removing last selected slide", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = toggleSelection(initial, "slide-1", 0);

    expect(result.selectedIds).toHaveLength(0);
    expect(result.primaryId).toBeUndefined();
  });
});

describe("addToSelection", () => {
  it("adds slide to selection", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = addToSelection(initial, "slide-2", 1);

    expect(result.selectedIds).toEqual(["slide-1", "slide-2"]);
    expect(result.primaryId).toBe("slide-2");
  });

  it("returns same selection if already selected", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = addToSelection(initial, "slide-1", 0);

    expect(result).toBe(initial);
  });
});

describe("removeFromSelection", () => {
  it("removes slide from selection", () => {
    const initial = {
      selectedIds: ["slide-1", "slide-2", "slide-3"] as readonly string[],
      primaryId: "slide-2",
      anchorIndex: 1,
    };
    const result = removeFromSelection(initial, "slide-2");

    expect(result.selectedIds).toEqual(["slide-1", "slide-3"]);
  });

  it("updates primaryId when primary is removed", () => {
    const initial = {
      selectedIds: ["slide-1", "slide-2"] as readonly string[],
      primaryId: "slide-1",
      anchorIndex: 0,
    };
    const result = removeFromSelection(initial, "slide-1");

    expect(result.primaryId).toBe("slide-2");
  });

  it("keeps primaryId when non-primary is removed", () => {
    const initial = {
      selectedIds: ["slide-1", "slide-2"] as readonly string[],
      primaryId: "slide-1",
      anchorIndex: 0,
    };
    const result = removeFromSelection(initial, "slide-2");

    expect(result.primaryId).toBe("slide-1");
  });

  it("returns same selection if slide not in selection", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = removeFromSelection(initial, "slide-999");

    expect(result).toBe(initial);
  });
});

describe("isSelected", () => {
  it("returns true for selected slide", () => {
    const selection = createSingleSlideSelection("slide-1", 0);
    expect(isSelected(selection, "slide-1")).toBe(true);
  });

  it("returns false for unselected slide", () => {
    const selection = createSingleSlideSelection("slide-1", 0);
    expect(isSelected(selection, "slide-2")).toBe(false);
  });
});

describe("isSelectionEmpty", () => {
  it("returns true for empty selection", () => {
    const selection = createEmptySlideSelection();
    expect(isSelectionEmpty(selection)).toBe(true);
  });

  it("returns false for non-empty selection", () => {
    const selection = createSingleSlideSelection("slide-1", 0);
    expect(isSelectionEmpty(selection)).toBe(false);
  });
});

describe("selectAll", () => {
  it("selects all slides", () => {
    const slides = createTestSlides(3);
    const result = selectAll(slides);

    expect(result.selectedIds).toEqual(["slide-1", "slide-2", "slide-3"]);
    expect(result.primaryId).toBe("slide-1");
    expect(result.anchorIndex).toBe(0);
  });

  it("returns empty selection for empty slides", () => {
    const result = selectAll([]);

    expect(result.selectedIds).toEqual([]);
  });
});

describe("handleSelectionClick", () => {
  const slides = createTestSlides(5);

  it("single click selects only clicked slide", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = handleSelectionClick(
      slides,
      initial,
      "slide-3",
      2,
      false, // shiftKey
      false  // metaOrCtrlKey
    );

    expect(result.selectedIds).toEqual(["slide-3"]);
  });

  it("Shift+click selects range from anchor", () => {
    const initial = createSingleSlideSelection("slide-2", 1);
    const result = handleSelectionClick(
      slides,
      initial,
      "slide-4",
      3,
      true,  // shiftKey
      false  // metaOrCtrlKey
    );

    expect(result.selectedIds).toEqual(["slide-2", "slide-3", "slide-4"]);
  });

  it("Ctrl/Cmd+click toggles selection", () => {
    const initial = createSingleSlideSelection("slide-1", 0);
    const result = handleSelectionClick(
      slides,
      initial,
      "slide-3",
      2,
      false, // shiftKey
      true   // metaOrCtrlKey
    );

    expect(result.selectedIds).toContain("slide-1");
    expect(result.selectedIds).toContain("slide-3");
  });

  it("Ctrl/Cmd+click on selected slide removes it", () => {
    const initial = {
      selectedIds: ["slide-1", "slide-3"] as readonly string[],
      primaryId: "slide-3",
      anchorIndex: 2,
    };
    const result = handleSelectionClick(
      slides,
      initial,
      "slide-3",
      2,
      false, // shiftKey
      true   // metaOrCtrlKey
    );

    expect(result.selectedIds).toEqual(["slide-1"]);
    expect(result.selectedIds).not.toContain("slide-3");
  });
});
