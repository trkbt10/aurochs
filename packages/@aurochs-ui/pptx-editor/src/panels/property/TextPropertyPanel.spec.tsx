/**
 * @file TextPropertyPanel component tests
 *
 * Verifies that TextPropertyPanel correctly wires TextEditContext
 * to MixedRunPropertiesEditor and MixedParagraphPropertiesEditor (SoT).
 * Individual control behavior is tested in the editor spec files.
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { TextPropertyPanel } from "./TextPropertyPanel";
import { TextEditContextProvider } from "@aurochs-ui/pptx-slide-canvas/context/slide/TextEditContext";
import type { TextEditContextValue } from "@aurochs-ui/pptx-slide-canvas/context/slide/TextEditContext";
import type { TextBody } from "@aurochs-office/pptx/domain/text";

// =============================================================================
// Helpers
// =============================================================================

function noop() {
  // no-op
}

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
        runs: [{ type: "text" as const, text: "Hello", properties: { fontSize: 12 as never } }],
      },
    ],
  };
}

function createContextValue(overrides: Partial<TextEditContextValue> = {}): TextEditContextValue {
  return {
    textEditState: {
      type: "active",
      shapeId: "s1",
      bounds: { x: 0 as never, y: 0 as never, width: 100 as never, height: 50 as never, rotation: 0 },
      initialTextBody: createTestTextBody(),
    },
    currentTextBody: createTestTextBody(),
    selectionContext: { type: "shape" },
    cursorState: undefined,
    applyRunProperties: noop,
    applyParagraphProperties: noop,
    toggleRunProperty: noop,
    stickyFormatting: undefined,
    setStickyFormatting: noop,
    clearStickyFormatting: noop,
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("TextPropertyPanel", () => {
  it("shows placeholder when no context", () => {
    render(<TextPropertyPanel />);
    expect(screen.getByText("Click on text to start editing")).toBeTruthy();
  });

  it("shows placeholder when selection is none", () => {
    const ctx = createContextValue({ selectionContext: { type: "none" } });
    render(
      <TextEditContextProvider value={ctx}>
        <TextPropertyPanel />
      </TextEditContextProvider>,
    );
    expect(screen.getByText("Click on text to start editing")).toBeTruthy();
  });

  it("renders MixedRunPropertiesEditor sections when active", () => {
    const ctx = createContextValue();
    render(
      <TextEditContextProvider value={ctx}>
        <TextPropertyPanel />
      </TextEditContextProvider>,
    );
    // FontSection renders aria-label="Font family"
    expect(screen.getByLabelText("Font family")).toBeTruthy();
    expect(screen.getByLabelText("Font weight")).toBeTruthy();
  });

  it("renders MixedParagraphPropertiesEditor sections when active", () => {
    const ctx = createContextValue();
    render(
      <TextEditContextProvider value={ctx}>
        <TextPropertyPanel />
      </TextEditContextProvider>,
    );
    // TextJustifySection has title "Text Alignment"
    expect(screen.getAllByText("Text Alignment").length).toBeGreaterThanOrEqual(1);
  });

  it("does not render debug cursor info", () => {
    const ctx = createContextValue({
      selectionContext: { type: "cursor", position: { paragraphIndex: 0, charOffset: 5 } },
    });
    render(
      <TextEditContextProvider value={ctx}>
        <TextPropertyPanel />
      </TextEditContextProvider>,
    );
    expect(screen.queryByText(/Cursor at paragraph/)).toBeNull();
  });

  it("applies custom className and style", () => {
    const ctx = createContextValue();
    const { container } = render(
      <TextEditContextProvider value={ctx}>
        <TextPropertyPanel className="my-panel" style={{ backgroundColor: "red" }} />
      </TextEditContextProvider>,
    );
    const el = container.firstChild as HTMLElement;
    expect(el.classList.contains("my-panel")).toBe(true);
    expect(el.style.backgroundColor).toBe("red");
  });
});
