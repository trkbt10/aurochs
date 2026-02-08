/**
 * @file DocxTextEditController unit tests
 */

// @vitest-environment jsdom

import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import type { DocxParagraph } from "@aurochs-office/docx/domain/paragraph";
import type { DocxCursorPosition } from "./cursor";
import { DocxTextEditController, createInitialState } from "./DocxTextEditController";

type CallTracker<Args extends readonly unknown[]> = {
  readonly fn: (...args: Args) => void;
  readonly calls: Args[];
  readonly clear: () => void;
};

function createCallTracker<Args extends readonly unknown[]>(): CallTracker<Args> {
  const calls: Args[] = [];
  return {
    fn: (...args) => {
      calls.push(args);
    },
    calls,
    clear: () => {
      calls.length = 0;
    },
  };
}

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
function createBounds(options: Partial<{ x: number; y: number; width: number; height: number }> = {}): DOMRect {
  const { x = 100, y = 200, width = 300, height = 50 } = options;
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
  type SelectionRange = { start: DocxCursorPosition; end: DocxCursorPosition };
  type Setup = ReturnType<typeof createSetup>;

  function createSetup() {
    const onTextChange = createCallTracker<[DocxParagraph]>();
    const onSelectionChange = createCallTracker<[SelectionRange]>();
    const onExit = createCallTracker<[]>();

    return {
      props: {
        editingElementId: "0",
        paragraph: createSimpleParagraph("Test"),
        bounds: createBounds(),
        onTextChange: onTextChange.fn,
        onSelectionChange: onSelectionChange.fn,
        onExit: onExit.fn,
      },
      trackers: { onTextChange, onSelectionChange, onExit },
    } as const;
  }

  let setup: Setup;

  beforeEach(() => {
    setup = createSetup();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders controller container", () => {
    render(<DocxTextEditController {...setup.props} />);

    const controller = screen.getByTestId("docx-text-edit-controller");
    expect(controller).toBeDefined();
    expect(controller.getAttribute("data-editing-element")).toBe("0");
  });

  it("renders textarea with initial text", () => {
    render(<DocxTextEditController {...setup.props} />);

    const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;
    expect(textarea.value).toBe("Test");
  });

  it("focuses textarea on mount", async () => {
    render(<DocxTextEditController {...setup.props} />);

    const textarea = screen.getByTestId("docx-text-edit-textarea");
    await waitFor(() => {
      expect(document.activeElement).toBe(textarea);
    });
  });

  describe("text input", () => {
    it("calls onTextChange when text is entered", async () => {
      const onTextChange = createCallTracker<[DocxParagraph]>();
      render(<DocxTextEditController {...setup.props} onTextChange={onTextChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.change(textarea, { target: { value: "Test123" } });

      expect(onTextChange.calls.length).toBeGreaterThan(0);
      const newParagraph = onTextChange.calls[0]![0];
      expect(newParagraph.type).toBe("paragraph");
    });

    it("updates currentText and currentParagraph in sync", () => {
      const onTextChange = createCallTracker<[DocxParagraph]>();
      render(<DocxTextEditController {...setup.props} onTextChange={onTextChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: "New Text" } });

      expect(textarea.value).toBe("New Text");
      expect(onTextChange.calls.length).toBeGreaterThan(0);
      expect(onTextChange.calls[0]![0]).toEqual(expect.objectContaining({ type: "paragraph" }));
    });
  });

  describe("selection changes", () => {
    it("calls onSelectionChange when selection changes", () => {
      const onSelectionChange = createCallTracker<[SelectionRange]>();
      render(<DocxTextEditController {...setup.props} onSelectionChange={onSelectionChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      // Clear mock to ignore initial selection change from mount
      onSelectionChange.clear();

      textarea.setSelectionRange(1, 3);
      fireEvent.select(textarea);

      expect(onSelectionChange.calls.length).toBeGreaterThan(0);
      const selection = onSelectionChange.calls[0]![0];
      expect(selection.start.charOffset).toBe(1);
      expect(selection.end.charOffset).toBe(3);
    });
  });

  describe("IME composition", () => {
    it("does not trigger selection change during composition", () => {
      const onSelectionChange = createCallTracker<[SelectionRange]>();
      render(<DocxTextEditController {...setup.props} onSelectionChange={onSelectionChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");

      // Reset the mock to ignore the initial selection change from mount
      onSelectionChange.clear();

      fireEvent.compositionStart(textarea);
      fireEvent.select(textarea);

      // Selection change should not be called during composition
      expect(onSelectionChange.calls.length).toBe(0);
    });

    it("updates paragraph after composition ends", () => {
      const onTextChange = createCallTracker<[DocxParagraph]>();
      render(<DocxTextEditController {...setup.props} onTextChange={onTextChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      fireEvent.compositionStart(textarea);
      // Simulate composition update
      Object.defineProperty(textarea, "value", { value: "Test日本語", writable: true });
      fireEvent.compositionEnd(textarea, { data: "日本語" });

      expect(onTextChange.calls.length).toBeGreaterThan(0);
    });
  });

  describe("keyboard handling", () => {
    it("calls onExit when Escape is pressed", () => {
      const onExit = createCallTracker<[]>();
      render(<DocxTextEditController {...setup.props} onExit={onExit.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onExit.calls.length).toBeGreaterThan(0);
    });

    it("does not exit during IME composition", () => {
      const onExit = createCallTracker<[]>();
      render(<DocxTextEditController {...setup.props} onExit={onExit.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.compositionStart(textarea);
      fireEvent.keyDown(textarea, { key: "Escape" });

      expect(onExit.calls.length).toBe(0);
    });
  });

  describe("formatting preservation", () => {
    it("preserves base formatting when text changes", () => {
      const formattedParagraph = createFormattedParagraph();
      const onTextChange = createCallTracker<[DocxParagraph]>();

      render(<DocxTextEditController {...setup.props} paragraph={formattedParagraph} onTextChange={onTextChange.fn} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea");
      fireEvent.change(textarea, { target: { value: "Modified text" } });

      expect(onTextChange.calls.length).toBeGreaterThan(0);
      const newParagraph = onTextChange.calls[0]![0];
      expect(newParagraph.content.length).toBeGreaterThan(0);
      // The first run should have formatting from the original
      if (newParagraph.content[0].type === "run") {
        expect(newParagraph.content[0].properties).toBeDefined();
      }
    });
  });

  describe("bounds positioning", () => {
    it("applies bounds to container", () => {
      const bounds = createBounds({ x: 50, y: 100, width: 400, height: 60 });
      render(<DocxTextEditController {...setup.props} bounds={bounds} />);

      const controller = screen.getByTestId("docx-text-edit-controller");
      expect(controller.style.left).toBe("50px");
      expect(controller.style.top).toBe("100px");
      expect(controller.style.width).toBe("400px");
      expect(controller.style.height).toBe("60px");
    });

    it("applies bounds to textarea (positioned inside container)", () => {
      const bounds = createBounds({ x: 50, y: 100, width: 400, height: 60 });
      render(<DocxTextEditController {...setup.props} bounds={bounds} />);

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

      render(<DocxTextEditController {...setup.props} initialCursorPosition={initialPosition} />);

      const textarea = screen.getByTestId("docx-text-edit-textarea") as HTMLTextAreaElement;

      await waitFor(() => {
        expect(textarea.selectionStart).toBe(2);
        expect(textarea.selectionEnd).toBe(2);
      });
    });
  });
});
