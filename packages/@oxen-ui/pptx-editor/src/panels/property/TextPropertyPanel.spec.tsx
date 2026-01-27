/**
 * @file TextPropertyPanel component tests
 *
 * Tests rendering in different text edit contexts and integration with editors.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TextPropertyPanel } from "./TextPropertyPanel";
import { TextEditContextProvider } from "../../context/slide/TextEditContext";
import type { TextEditContextValue } from "../../context/slide/TextEditContext";
import type { TextBody } from "@oxen/pptx/domain/text";
import type { TextEditState } from "../../slide/text-edit";

// =============================================================================
// Test Helpers
// =============================================================================

function createTestTextBody(): TextBody {
  return {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: { left: 0 as never, top: 0 as never, right: 0 as never, bottom: 0 as never },
    },
    paragraphs: [
      {
        properties: { alignment: "left", level: 0 },
        runs: [
          {
            type: "text" as const,
            text: "Hello World",
            properties: { fontSize: 12 as never, bold: true },
          },
        ],
      },
    ],
  };
}

function createInactiveTextEditState(): TextEditState {
  return { type: "inactive" };
}

function createActiveTextEditState(): TextEditState {
  return {
    type: "active",
    shapeId: "shape-1",
    bounds: { x: 0 as never, y: 0 as never, width: 100 as never, height: 50 as never, rotation: 0 },
    initialTextBody: createTestTextBody(),
  };
}

function createTestContextValue(
  overrides: Partial<TextEditContextValue> = {}
): TextEditContextValue {
  const defaultValue: TextEditContextValue = {
    textEditState: createActiveTextEditState(),
    currentTextBody: createTestTextBody(),
    selectionContext: { type: "shape" },
    cursorState: undefined,
    applyRunProperties: vi.fn(),
    applyParagraphProperties: vi.fn(),
    toggleRunProperty: vi.fn(),
    stickyFormatting: undefined,
    setStickyFormatting: vi.fn(),
    clearStickyFormatting: vi.fn(),
  };

  return { ...defaultValue, ...overrides };
}

function renderWithContext(
  contextValue: TextEditContextValue | null
): ReturnType<typeof render> {
  if (contextValue === null) {
    return render(<TextPropertyPanel />);
  }

  return render(
    <TextEditContextProvider value={contextValue}>
      <TextPropertyPanel />
    </TextEditContextProvider>
  );
}

// =============================================================================
// Tests
// =============================================================================

describe("TextPropertyPanel", () => {
  describe("without context", () => {
    it("renders 'Not in text editing mode' message", () => {
      renderWithContext(null);

      expect(screen.getByText("Not in text editing mode")).toBeTruthy();
    });
  });

  describe("with inactive text edit state", () => {
    it("renders 'Click on text to start editing' message", () => {
      const contextValue = createTestContextValue({
        textEditState: createInactiveTextEditState(),
        selectionContext: { type: "none" },
      });

      renderWithContext(contextValue);

      expect(screen.getByText("Click on text to start editing")).toBeTruthy();
    });
  });

  describe("with shape selection context", () => {
    it("renders selection info showing entire text body", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      renderWithContext(contextValue);

      expect(screen.getByText("Entire text body")).toBeTruthy();
    });

    it("renders Character accordion", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      renderWithContext(contextValue);

      expect(screen.getByText("Character")).toBeTruthy();
    });

    it("renders Paragraph accordion", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      renderWithContext(contextValue);

      expect(screen.getByText("Paragraph")).toBeTruthy();
    });
  });

  describe("with cursor selection context", () => {
    it("renders cursor position info", () => {
      const contextValue = createTestContextValue({
        selectionContext: {
          type: "cursor",
          position: { paragraphIndex: 0, charOffset: 5 },
        },
      });

      renderWithContext(contextValue);

      expect(screen.getByText(/Cursor at paragraph 1, character 5/)).toBeTruthy();
    });
  });

  describe("with range selection context", () => {
    it("renders character count for same-paragraph selection", () => {
      const contextValue = createTestContextValue({
        selectionContext: {
          type: "selection",
          selection: {
            start: { paragraphIndex: 0, charOffset: 0 },
            end: { paragraphIndex: 0, charOffset: 5 },
          },
        },
      });

      renderWithContext(contextValue);

      expect(screen.getByText(/5 characters selected/)).toBeTruthy();
    });

    it("renders single character count correctly", () => {
      const contextValue = createTestContextValue({
        selectionContext: {
          type: "selection",
          selection: {
            start: { paragraphIndex: 0, charOffset: 0 },
            end: { paragraphIndex: 0, charOffset: 1 },
          },
        },
      });

      renderWithContext(contextValue);

      expect(screen.getByText(/1 character selected/)).toBeTruthy();
    });

    it("renders paragraph count for multi-paragraph selection", () => {
      const contextValue = createTestContextValue({
        selectionContext: {
          type: "selection",
          selection: {
            start: { paragraphIndex: 0, charOffset: 0 },
            end: { paragraphIndex: 2, charOffset: 5 },
          },
        },
      });

      renderWithContext(contextValue);

      expect(screen.getByText(/Selection across 3 paragraphs/)).toBeTruthy();
    });
  });

  describe("property application", () => {
    it("calls applyRunProperties when character property is changed", () => {
      const applyRunProperties = vi.fn();
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
        applyRunProperties,
      });

      renderWithContext(contextValue);

      // Find the Character accordion and expand it if needed
      const characterAccordion = screen.getByText("Character");
      fireEvent.click(characterAccordion);

      // Find and interact with bold button
      const boldButton = screen.getByRole("button", { name: /bold/i });
      fireEvent.click(boldButton);

      // applyRunProperties should have been called
      expect(applyRunProperties).toHaveBeenCalled();
    });

    it("calls applyParagraphProperties when paragraph property is changed", () => {
      const applyParagraphProperties = vi.fn();
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
        applyParagraphProperties,
      });

      const { container } = renderWithContext(contextValue);

      // Find the Paragraph accordion and expand it
      const paragraphAccordion = screen.getByText("Paragraph");
      fireEvent.click(paragraphAccordion);

      // Find alignment select - it has options like "Left", "Center", "Right", "Justify"
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let alignmentSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          // Alignment select has "Center" as one of its options
          if (option.value === "center" && option.textContent === "Center") {
            alignmentSelect = select;
            break;
          }
        }
        if (alignmentSelect) {break;}
      }

      if (alignmentSelect) {
        fireEvent.change(alignmentSelect, { target: { value: "center" } });
        expect(applyParagraphProperties).toHaveBeenCalled();
      } else {
        // Fail if no alignment select found
        expect(alignmentSelect).toBeTruthy();
      }
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      const { container } = render(
        <TextEditContextProvider value={contextValue}>
          <TextPropertyPanel className="custom-panel" />
        </TextEditContextProvider>
      );

      expect((container.firstChild as HTMLElement).classList.contains("custom-panel")).toBe(true);
    });

    it("applies custom style", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      const { container } = render(
        <TextEditContextProvider value={contextValue}>
          <TextPropertyPanel style={{ backgroundColor: "blue" }} />
        </TextEditContextProvider>
      );

      expect((container.firstChild as HTMLElement).style.backgroundColor).toBe("blue");
    });
  });

  describe("accordion behavior", () => {
    it("Character accordion is expanded by default", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      renderWithContext(contextValue);

      // The accordion content should be visible (contains Font label)
      const characterSection = screen.getByText("Character").closest("div");
      expect(characterSection).toBeTruthy();

      // Bold button should be visible (inside expanded Character accordion)
      expect(screen.getByRole("button", { name: /bold/i })).toBeTruthy();
    });

    it("Paragraph accordion can be expanded", () => {
      const contextValue = createTestContextValue({
        selectionContext: { type: "shape" },
      });

      renderWithContext(contextValue);

      // Click on Paragraph to expand
      const paragraphAccordion = screen.getByText("Paragraph");
      fireEvent.click(paragraphAccordion);

      // After clicking, we should see alignment controls
      // (The select elements should be visible)
      const selects = screen.getAllByRole("combobox") as HTMLSelectElement[];
      expect(selects.length).toBeGreaterThan(0);
    });
  });
});

describe("TextPropertyPanel with multi-run text body", () => {
  it("shows Mixed indicators when text has different run properties", () => {
    const mixedTextBody: TextBody = {
      bodyProperties: {
        verticalType: "horz",
        wrapping: "square",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        autoFit: { type: "none" },
        insets: { left: 0 as never, top: 0 as never, right: 0 as never, bottom: 0 as never },
      },
      paragraphs: [
        {
          properties: { alignment: "left" },
          runs: [
            {
              type: "text" as const,
              text: "Bold text",
              properties: { bold: true, fontSize: 12 as never },
            },
            {
              type: "text" as const,
              text: "Normal text",
              properties: { bold: false, fontSize: 14 as never },
            },
          ],
        },
      ],
    };

    const contextValue: TextEditContextValue = {
      textEditState: {
        type: "active",
        shapeId: "shape-1",
        bounds: { x: 0 as never, y: 0 as never, width: 100 as never, height: 50 as never, rotation: 0 },
        initialTextBody: mixedTextBody,
      },
      currentTextBody: mixedTextBody,
      selectionContext: { type: "shape" },
      cursorState: undefined,
      applyRunProperties: vi.fn(),
      applyParagraphProperties: vi.fn(),
      toggleRunProperty: vi.fn(),
      stickyFormatting: undefined,
      setStickyFormatting: vi.fn(),
      clearStickyFormatting: vi.fn(),
    };

    render(
      <TextEditContextProvider value={contextValue}>
        <TextPropertyPanel />
      </TextEditContextProvider>
    );

    // The bold button should have mixed state since runs have different bold values
    const boldButton = screen.getByRole("button", { name: /bold/i });
    expect(boldButton.getAttribute("aria-pressed")).toBe("mixed");
  });

  it("shows Mixed indicators for font size when different", () => {
    const mixedTextBody: TextBody = {
      bodyProperties: {
        verticalType: "horz",
        wrapping: "square",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        autoFit: { type: "none" },
        insets: { left: 0 as never, top: 0 as never, right: 0 as never, bottom: 0 as never },
      },
      paragraphs: [
        {
          properties: { alignment: "left" },
          runs: [
            {
              type: "text" as const,
              text: "Small",
              properties: { fontSize: 10 as never },
            },
            {
              type: "text" as const,
              text: "Large",
              properties: { fontSize: 20 as never },
            },
          ],
        },
      ],
    };

    const contextValue: TextEditContextValue = {
      textEditState: {
        type: "active",
        shapeId: "shape-1",
        bounds: { x: 0 as never, y: 0 as never, width: 100 as never, height: 50 as never, rotation: 0 },
        initialTextBody: mixedTextBody,
      },
      currentTextBody: mixedTextBody,
      selectionContext: { type: "shape" },
      cursorState: undefined,
      applyRunProperties: vi.fn(),
      applyParagraphProperties: vi.fn(),
      toggleRunProperty: vi.fn(),
      stickyFormatting: undefined,
      setStickyFormatting: vi.fn(),
      clearStickyFormatting: vi.fn(),
    };

    const { container } = render(
      <TextEditContextProvider value={contextValue}>
        <TextPropertyPanel />
      </TextEditContextProvider>
    );

    // Should show "(Mixed)" in the size label
    expect(container.textContent).toContain("Size (Mixed)");
  });
});

describe("TextPropertyPanel with multi-paragraph text body", () => {
  it("shows Mixed indicators when paragraphs have different alignments", () => {
    const multiParaTextBody: TextBody = {
      bodyProperties: {
        verticalType: "horz",
        wrapping: "square",
        anchor: "top",
        anchorCenter: false,
        overflow: "overflow",
        autoFit: { type: "none" },
        insets: { left: 0 as never, top: 0 as never, right: 0 as never, bottom: 0 as never },
      },
      paragraphs: [
        {
          properties: { alignment: "left" },
          runs: [{ type: "text" as const, text: "Left aligned" }],
        },
        {
          properties: { alignment: "center" },
          runs: [{ type: "text" as const, text: "Center aligned" }],
        },
      ],
    };

    const contextValue: TextEditContextValue = {
      textEditState: {
        type: "active",
        shapeId: "shape-1",
        bounds: { x: 0 as never, y: 0 as never, width: 100 as never, height: 50 as never, rotation: 0 },
        initialTextBody: multiParaTextBody,
      },
      currentTextBody: multiParaTextBody,
      selectionContext: { type: "shape" },
      cursorState: undefined,
      applyRunProperties: vi.fn(),
      applyParagraphProperties: vi.fn(),
      toggleRunProperty: vi.fn(),
      stickyFormatting: undefined,
      setStickyFormatting: vi.fn(),
      clearStickyFormatting: vi.fn(),
    };

    const { container } = render(
      <TextEditContextProvider value={contextValue}>
        <TextPropertyPanel />
      </TextEditContextProvider>
    );

    // Expand Paragraph accordion
    const paragraphAccordion = screen.getByText("Paragraph");
    fireEvent.click(paragraphAccordion);

    // Should show "(M)" for alignment since paragraphs have different values
    expect(container.textContent).toContain("Align (M)");
  });
});
