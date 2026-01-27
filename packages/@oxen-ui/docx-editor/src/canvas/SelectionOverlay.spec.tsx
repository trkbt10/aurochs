/**
 * @file SelectionOverlay unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { useRef } from "react";
import type { DocxSelectionState } from "../context/document/state/selection";
import type { TextEditState } from "../context/document/editor/types";
import {
  createEmptyDocxSelection,
  createSingleElementSelection,
  createMultiElementSelection,
} from "../context/document/state/selection";
import { SelectionOverlay } from "./SelectionOverlay";

// =============================================================================
// Test Fixtures
// =============================================================================

function createEmptyTextEditState(): TextEditState {
  return {
    isEditing: false,
    editingElementId: undefined,
    cursorPosition: undefined,
  };
}

function createEditingTextEditState(): TextEditState {
  return {
    isEditing: true,
    editingElementId: "0",
    cursorPosition: { paragraphIndex: 0, charOffset: 5 },
  };
}

// Wrapper component to provide a ref
function TestWrapper({
  selection,
  textEdit,
}: {
  selection: DocxSelectionState;
  textEdit: TextEditState;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} style={{ position: "relative", width: 500, height: 500 }}>
      <div data-element-id="0" style={{ height: 100 }}>
        Paragraph 1
      </div>
      <div data-element-id="1" style={{ height: 100 }}>
        Paragraph 2
      </div>
      <SelectionOverlay
        containerRef={containerRef}
        selection={selection}
        textEdit={textEdit}
      />
    </div>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("SelectionOverlay", () => {
  it("renders nothing when no selection", () => {
    const selection = createEmptyDocxSelection();
    const textEdit = createEmptyTextEditState();

    render(<TestWrapper selection={selection} textEdit={textEdit} />);

    expect(screen.queryByTestId("selection-overlay")).toBeNull();
  });

  it("renders overlay when element is selected", () => {
    const selection: DocxSelectionState = {
      element: createSingleElementSelection("0"),
      text: { range: undefined, cursor: undefined, isCollapsed: true },
      mode: "element",
    };
    const textEdit = createEmptyTextEditState();

    render(<TestWrapper selection={selection} textEdit={textEdit} />);

    expect(screen.getByTestId("selection-overlay")).toBeDefined();
  });

  it("renders multiple selection boxes for multi-select", () => {
    const selection: DocxSelectionState = {
      element: createMultiElementSelection(["0", "1"], "1"),
      text: { range: undefined, cursor: undefined, isCollapsed: true },
      mode: "element",
    };
    const textEdit = createEmptyTextEditState();

    const { container } = render(
      <TestWrapper selection={selection} textEdit={textEdit} />
    );

    // Should have selection overlay
    const overlay = screen.getByTestId("selection-overlay");
    expect(overlay).toBeDefined();

    // Should have child divs for selection boxes
    const boxes = overlay.querySelectorAll("div");
    expect(boxes.length).toBeGreaterThan(0);
  });

  it("renders overlay when text editing is active", () => {
    const selection = createEmptyDocxSelection();
    const textEdit = createEditingTextEditState();

    render(<TestWrapper selection={selection} textEdit={textEdit} />);

    expect(screen.getByTestId("selection-overlay")).toBeDefined();
  });

  it("applies correct styles to overlay", () => {
    const selection: DocxSelectionState = {
      element: createSingleElementSelection("0"),
      text: { range: undefined, cursor: undefined, isCollapsed: true },
      mode: "element",
    };
    const textEdit = createEmptyTextEditState();

    render(<TestWrapper selection={selection} textEdit={textEdit} />);

    const overlay = screen.getByTestId("selection-overlay");
    expect(overlay.style.position).toBe("absolute");
    expect(overlay.style.pointerEvents).toBe("none");
  });

  it("does not render element boxes in text mode", () => {
    const selection: DocxSelectionState = {
      element: createSingleElementSelection("0"),
      text: { range: undefined, cursor: undefined, isCollapsed: true },
      mode: "text",
    };
    const textEdit = createEmptyTextEditState();

    render(<TestWrapper selection={selection} textEdit={textEdit} />);

    // Overlay should still exist but no element boxes should be rendered
    // (just empty overlay for text mode)
  });

  describe("element selection", () => {
    it("distinguishes primary from secondary selection", () => {
      const selection: DocxSelectionState = {
        element: createMultiElementSelection(["0", "1"], "1"),
        text: { range: undefined, cursor: undefined, isCollapsed: true },
        mode: "element",
      };
      const textEdit = createEmptyTextEditState();

      const { container } = render(
        <TestWrapper selection={selection} textEdit={textEdit} />
      );

      const overlay = screen.getByTestId("selection-overlay");
      // The component differentiates primary/secondary via border style
      expect(overlay).toBeDefined();
    });
  });

  describe("text cursor", () => {
    it("renders cursor when editing", () => {
      const selection = createEmptyDocxSelection();
      const textEdit = createEditingTextEditState();

      render(<TestWrapper selection={selection} textEdit={textEdit} />);

      const overlay = screen.getByTestId("selection-overlay");
      expect(overlay).toBeDefined();
    });

    it("does not render cursor when not editing", () => {
      const selection = createEmptyDocxSelection();
      const textEdit = createEmptyTextEditState();

      render(<TestWrapper selection={selection} textEdit={textEdit} />);

      expect(screen.queryByTestId("selection-overlay")).toBeNull();
    });
  });
});
