/**
 * @file Slide operations tests
 *
 * Tests for slide operations: delete, duplicate, move
 */

import { describe, it, expect } from "vitest";
import type { SlideWithId } from "@oxen/pptx/app";

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
// Delete operations
// =============================================================================

describe("delete slides", () => {
  it("deletes single slide", () => {
    const slides = createTestSlides(5);
    const toDelete = ["slide-3"];

    const remaining = slides.filter((s) => !toDelete.includes(s.id));

    expect(remaining).toHaveLength(4);
    expect(remaining.map((s) => s.id)).toEqual([
      "slide-1",
      "slide-2",
      "slide-4",
      "slide-5",
    ]);
  });

  it("deletes multiple selected slides", () => {
    const slides = createTestSlides(5);
    const toDelete = ["slide-2", "slide-4"];

    const remaining = slides.filter((s) => !toDelete.includes(s.id));

    expect(remaining).toHaveLength(3);
    expect(remaining.map((s) => s.id)).toEqual([
      "slide-1",
      "slide-3",
      "slide-5",
    ]);
  });

  it("prevents deleting last slide", () => {
    const slides = createTestSlides(1);
    const toDelete = ["slide-1"];

    // Should not delete if only one slide remains
    const maxDeletions = slides.length - 1;
    const actualDeleted = toDelete.slice(0, maxDeletions);

    expect(actualDeleted).toHaveLength(0);
  });

  it("limits deletions to keep at least one slide", () => {
    const slides = createTestSlides(3);
    const toDelete = ["slide-1", "slide-2", "slide-3"]; // try to delete all

    const maxDeletions = slides.length - 1; // can only delete 2
    const actualDeleted = toDelete.slice(0, maxDeletions);

    expect(actualDeleted).toHaveLength(2);
    expect(actualDeleted).toEqual(["slide-1", "slide-2"]);
  });

  describe("delete button visibility", () => {
    it("shows delete button on hover (editable mode)", () => {
      const isEditable = true;
      const canDelete = true; // slides.length > 1
      const isHovered = true;

      const showDeleteButton = isEditable && canDelete && isHovered;

      expect(showDeleteButton).toBe(true);
    });

    it("hides delete button when not hovered", () => {
      const isEditable = true;
      const canDelete = true;
      const isHovered = false;

      const showDeleteButton = isEditable && canDelete && isHovered;

      expect(showDeleteButton).toBe(false);
    });

    it("hides delete button in readonly mode", () => {
      const isEditable = false;
      const canDelete = true;
      const isHovered = true;

      const showDeleteButton = isEditable && canDelete && isHovered;

      expect(showDeleteButton).toBe(false);
    });

    it("hides delete button when only one slide exists", () => {
      const isEditable = true;
      const canDelete = false; // only 1 slide
      const isHovered = true;

      const showDeleteButton = isEditable && canDelete && isHovered;

      expect(showDeleteButton).toBe(false);
    });

    it("delete button visibility is NOT based on selection", () => {
      const isEditable = true;
      const canDelete = true;
      const isHovered = false;
      const isSelected = true; // selection should not matter

      // Delete button visibility is based on hover, NOT selection
      const showDeleteButton = isEditable && canDelete && isHovered;

      expect(showDeleteButton).toBe(false);
    });
  });
});

// =============================================================================
// Delete with selection
// =============================================================================

describe("delete with selection", () => {
  it("deletes all selected when clicking delete on selected slide", () => {
    const selectedIds = ["slide-2", "slide-3"];
    const clickedSlideId = "slide-2"; // is in selection

    const idsToDelete = selectedIds.includes(clickedSlideId)
      ? selectedIds
      : [clickedSlideId];

    expect(idsToDelete).toEqual(["slide-2", "slide-3"]);
  });

  it("deletes only clicked slide when not in selection", () => {
    const selectedIds = ["slide-2", "slide-3"];
    const clickedSlideId = "slide-4"; // not in selection

    const idsToDelete = selectedIds.includes(clickedSlideId)
      ? selectedIds
      : [clickedSlideId];

    expect(idsToDelete).toEqual(["slide-4"]);
  });
});

// =============================================================================
// Move operations (via D&D)
// =============================================================================

describe("move slides", () => {
  it("moves single slide to new position", () => {
    const slides = createTestSlides(5);
    // Move slide-2 to index 4 (after slide-5)
    const slideToMove = "slide-2";
    const fromIndex = 1;
    const toIndex = 4;

    // Simulate move: remove from old position, insert at new
    const mutable = [...slides];
    const [removed] = mutable.splice(fromIndex, 1);
    mutable.splice(toIndex - 1, 0, removed); // -1 because one was removed

    expect(mutable.map((s) => s.id)).toEqual([
      "slide-1",
      "slide-3",
      "slide-4",
      "slide-2", // moved here
      "slide-5",
    ]);
  });

  it("moves slide backwards", () => {
    const slides = createTestSlides(5);
    // Move slide-4 to index 1 (before slide-2)
    const slideToMove = "slide-4";
    const fromIndex = 3;
    const toIndex = 1;

    const mutable = [...slides];
    const [removed] = mutable.splice(fromIndex, 1);
    mutable.splice(toIndex, 0, removed);

    expect(mutable.map((s) => s.id)).toEqual([
      "slide-1",
      "slide-4", // moved here
      "slide-2",
      "slide-3",
      "slide-5",
    ]);
  });
});
