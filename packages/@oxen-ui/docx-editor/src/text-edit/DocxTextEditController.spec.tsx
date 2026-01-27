/**
 * @file DocxTextEditController unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { DocxParagraph } from "@oxen/docx/domain/paragraph";
import type { DocxCursorPosition } from "./cursor";
import { DocxTextEditController, createInitialState } from "./DocxTextEditController";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSimpleParagraph(text: string): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        content: [{ type: "text", value: text }],
      },
    ],
  };
}

function createFormattedParagraph(): DocxParagraph {
  return {
    type: "paragraph",
    content: [
      {
        type: "run",
        properties: { b: true },
        content: [{ type: "text", value: "Bold" }],
      },
      {
        type: "run",
        properties: { i: true },
        content: [{ type: "text", value: " Italic" }],
      },
    ],
  };
}

/**
 * Create a DOMRect-like object for testing.
 * jsdom doesn't have DOMRect constructor, so we create a compatible object.
 */
function createBounds(x = 100, y = 200, width = 300, height = 50): DOMRect {
  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return { x, y, width, height };
    },
  } as DOMRect;
}

// =============================================================================
// createInitialState Tests
// =============================================================================

describe("createInitialState", () => {
  it("creates state from paragraph text", () => {
    const paragraph = createSimpleParagraph("Hello World");
    const state = createInitialState(paragraph);

    expect(state.currentText).toBe("Hello World");
    expect(state.currentParagraph).toBe(paragraph);
    expect(state.isComposing).toBe(false);
  });

  it("sets cursor at end when no initial position", () => {
    const paragraph = createSimpleParagraph("Hello");
    const state = createInitialState(paragraph);

    expect(state.selectionStart).toBe(5);
    expect(state.selectionEnd).toBe(5);
  });

  it("uses initial cursor position when provided", () => {
    const paragraph = createSimpleParagraph("Hello World");
    const position: DocxCursorPosition = { elementIndex: 0, charOffset: 3 };
    const state = createInitialState(paragraph, position);

    expect(state.selectionStart).toBe(3);
    expect(state.selectionEnd).toBe(3);
  });

  it("extracts text from formatted paragraph", () => {
    const paragraph = createFormattedParagraph();
    const state = createInitialState(paragraph);

    expect(state.currentText).toBe("Bold Italic");
  });
});

// =============================================================================
// DocxTextEditController Tests
// =============================================================================

describe("DocxTextEditController", () => {
  const defaultProps = {
    editingElementId: "0",
    paragraph: createSimpleParagraph("Test"),
    bounds: createBounds(),
    onTextChange: vi.fn(),
    onSelectionChange: vi.fn(),
    onExit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders controller container", () => {
    render(<DocxTextEditController {...defaultProps} />);

    const controller = screen.getByTestId("docx-text-edit-controller");
    expect(controller).toBeDefined();
    expect(controller.getAttribute("data-editing-element")).toBe("0");
  });

  it("renders textarea with initial text", () => {
    render(<DocxTextEditController {...defaultProps} />);

    const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Test");
  });

  it("focuses textarea on mount", async () => {
    render(<DocxTextEditController {...defaultProps} />);

    const textarea = screen.getByTestId("docx-text-edit-textarea");
    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe("text input", () => {
    it("calls onTextChange when text is entered", async () => {
      const onTextChange = vi.fn();
      render(
        <DocxTextEditController {...defaultProps} onTextChange={onTextChange} />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.change(textarea, { target: { value: "Test123" } });

      expect(onTextChange).toHaveBeenCalled();
      const newParagraph = onTextChange.mock.calls[0][0];
      expect(newParagraph.type).toBe("paragraph");
    });

    it("updates currentText and currentParagraph in sync", () => {
      const onTextChange = vi.fn();
      render(
        <DocxTextEditController {...defaultProps} onTextChange={onTextChange} />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "New Text" } });

      expect(textarea.value).toBe("New Text");
      expect(onTextChange).toHaveBeenCalledWith(
        expect.objectContaining({ type: "paragraph" })
      );
    });
  });

  describe("selection changes", () => {
    it("calls onSelectionChange when selection changes", () => {
      const onSelectionChange = vi.fn();
      render(
        <DocxTextEditController
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      // Clear mock to ignore initial selection change from mount
      onSelectionChange.mockClear();

      textarea.setSelectionRange(1, 3);
      fireEvent.select(textarea);

      expect(onSelectionChange).toHaveBeenCalled();
      const selection = onSelectionChange.mock.calls[0][0];
      expect(selection.start.charOffset).toBe(1);
      expect(selection.end.charOffset).toBe(3);
    });
  });

  describe("IME composition", () => {
    it("does not trigger selection change during composition", () => {
      const onSelectionChange = vi.fn();
      render(
        <DocxTextEditController
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea");

      // Reset the mock to ignore the initial selection change from mount
      onSelectionChange.mockClear();

      fireEvent.compositionStart(textarea);
      fireEvent.select(textarea);

      // Selection change should not be called during composition
      expect(onSelectionChange).not.toHaveBeenCalled();
    });

    it("updates paragraph after composition ends", () => {
      const onTextChange = vi.fn();
      render(
        <DocxTextEditController {...defaultProps} onTextChange={onTextChange} />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      fireEvent.compositionStart(textarea);
      // Simulate composition update
      Object.defineProperty(textarea, "value", { value: "Test日本語", writable: true });
      fireEvent.compositionEnd(textarea, { data: "日本語" });

      expect(onTextChange).toHaveBeenCalled();
    });
  });

  describe("keyboard handling", () => {
    it("calls onExit when Escape is pressed", () => {
      const onExit = vi.fn();
      render(<DocxTextEditController {...defaultProps} onExit={onExit} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onExit).toHaveBeenCalled();
    });

    it("does not exit during IME composition", () => {
      const onExit = vi.fn();
      render(<DocxTextEditController {...defaultProps} onExit={onExit} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.compositionStart(textarea);
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onExit).not.toHaveBeenCalled();
    });
  });

  describe("formatting preservation", () => {
    it("preserves base formatting when text changes", () => {
      const formattedParagraph = createFormattedParagraph();
      const onTextChange = vi.fn();

      render(
        <DocxTextEditController
          {...defaultProps}
          paragraph={formattedParagraph}
          onTextChange={onTextChange}
        />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.change(textarea, { target: { value: "Modified text" } });

      expect(onTextChange).toHaveBeenCalled();
      const newParagraph = onTextChange.mock.calls[0][0] as DocxParagraph;
      expect(newParagraph.content.length).toBeGreaterThan(0);
      // The first run should have formatting from the original
      if (newParagraph.content[0].type === "run") {
        expect(newParagraph.content[0].properties).toBeDefined();
      }
    });
  });

  describe("bounds positioning", () => {
    it("applies bounds to container", () => {
      const bounds = createBounds(50, 100, 400, 60);
      render(<DocxTextEditController {...defaultProps} bounds={bounds} />);

      const controller = screen.getByTestId("docx-text-edit-controller");
      expect(controller.style.left).toBe("50px");
      expect(controller.style.top).toBe("100px");
      expect(controller.style.width).toBe("400px");
      expect(controller.style.height).toBe("60px");
    });

    it("applies bounds to textarea (positioned inside container)", () => {
      const bounds = createBounds(50, 100, 400, 60);
      render(<DocxTextEditController {...defaultProps} bounds={bounds} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;
      // Textarea is positioned relative to container with 0,0
      expect(textarea.style.left).toBe("0px");
      expect(textarea.style.top).toBe("0px");
      expect(textarea.style.width).toBe("100%");
      expect(textarea.style.height).toBe("100%");
    });
  });

  describe("initial cursor position", () => {
    it("sets cursor at specified position", async () => {
      const initialPosition: DocxCursorPosition = {
        elementIndex: 0,
        charOffset: 2,
      };

      render(
        <DocxTextEditController
          {...defaultProps}
          initialCursorPosition={initialPosition}
        />
      );

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      await waitFor(() => {
        expect(textarea.selectionStart).toBe(2);
        expect(textarea.selectionEnd).toBe(2);
      });
    });
  });
});
