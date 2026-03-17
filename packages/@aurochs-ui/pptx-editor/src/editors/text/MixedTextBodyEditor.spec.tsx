/**
 * @file MixedTextBodyEditor component tests
 *
 * MixedTextBodyEditor composes MixedRunPropertiesEditor + MixedParagraphPropertiesEditor
 * without wrapping Accordions or summary. Individual control tests live in the
 * respective editor spec files (SoT). This file tests the composition/wiring.
 */

// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { MixedTextBodyEditor } from "./MixedTextBodyEditor";
import type { TextBody } from "@aurochs-office/pptx/domain/text";
import type { Points, Pixels } from "@aurochs-office/drawing-ml/domain/units";

type CallTracker<Args extends readonly unknown[]> = {
  readonly fn: (...args: Args) => void;
  readonly calls: Args[];
};

function createCallTracker<Args extends readonly unknown[]>(): CallTracker<Args> {
  const calls: Args[] = [];
  return {
    fn: (...args) => {
      calls.push(args);
    },
    calls,
  };
}

// =============================================================================
// Test Fixtures
// =============================================================================

function createSingleRunTextBody(): TextBody {
  return {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: { left: 0 as Pixels, top: 0 as Pixels, right: 0 as Pixels, bottom: 0 as Pixels },
    },
    paragraphs: [
      {
        properties: { alignment: "left" },
        runs: [
          {
            type: "text" as const,
            text: "Hello World",
            properties: { bold: true, fontSize: 12 as Points },
          },
        ],
      },
    ],
  };
}

function createMixedTextBody(): TextBody {
  return {
    bodyProperties: {
      verticalType: "horz",
      wrapping: "square",
      anchor: "top",
      anchorCenter: false,
      overflow: "overflow",
      autoFit: { type: "none" },
      insets: { left: 0 as Pixels, top: 0 as Pixels, right: 0 as Pixels, bottom: 0 as Pixels },
    },
    paragraphs: [
      {
        properties: { alignment: "left" },
        runs: [
          { type: "text" as const, text: "Bold text", properties: { bold: true, fontSize: 12 as Points } },
          { type: "text" as const, text: "Normal text", properties: { bold: false, fontSize: 14 as Points } },
        ],
      },
      {
        properties: { alignment: "center" },
        runs: [
          { type: "text" as const, text: "Second paragraph", properties: { italic: true } },
        ],
      },
    ],
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("MixedTextBodyEditor", () => {
  describe("rendering", () => {
    it("renders run property sections (Font, Color)", () => {
      const onChange = createCallTracker<[TextBody]>();
      render(<MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} />);

      expect(screen.getByLabelText("Font family")).toBeTruthy();
      expect(screen.getByLabelText("Font weight")).toBeTruthy();
    });

    it("renders paragraph property sections (Text Alignment)", () => {
      const onChange = createCallTracker<[TextBody]>();
      render(<MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} />);

      expect(screen.getAllByText("Text Alignment").length).toBeGreaterThanOrEqual(1);
    });

    it("does not render summary or accordion wrappers", () => {
      const onChange = createCallTracker<[TextBody]>();
      const { container } = render(<MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} />);

      // No "1 paragraph, 11 characters" summary
      expect(container.textContent).not.toContain("paragraph,");
      expect(container.textContent).not.toContain("characters");
      // No "Character" or "Paragraph" accordion titles
      expect(screen.queryByText("Character")).toBeNull();
    });
  });

  describe("applying properties", () => {
    it("applies alignment to all paragraphs", () => {
      const onChange = createCallTracker<[TextBody]>();
      const { container } = render(<MixedTextBodyEditor value={createMixedTextBody()} onChange={onChange.fn} />);

      // Find alignment select in "Alignment Details" section
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      // eslint-disable-next-line no-restricted-syntax -- mutable test state
      let alignmentSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.value === "right" && option.textContent === "Right") {
            alignmentSelect = select;
            break;
          }
        }
        if (alignmentSelect) { break; }
      }

      if (alignmentSelect) {
        fireEvent.change(alignmentSelect, { target: { value: "right" } });
        expect(onChange.calls.length).toBeGreaterThan(0);
        const newTextBody = onChange.calls[0]![0];
        for (const para of newTextBody.paragraphs) {
          expect(para.properties.alignment).toBe("right");
        }
      }
    });
  });

  describe("disabled state", () => {
    it("disables font controls when disabled", () => {
      const onChange = createCallTracker<[TextBody]>();
      render(<MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} disabled />);

      const fontFamily = screen.getByLabelText("Font family") as HTMLButtonElement;
      expect(fontFamily.disabled).toBe(true);
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      const onChange = createCallTracker<[TextBody]>();
      const { container } = render(
        <MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} className="custom" />,
      );
      expect((container.firstChild as HTMLElement).classList.contains("custom")).toBe(true);
    });

    it("applies custom style", () => {
      const onChange = createCallTracker<[TextBody]>();
      const { container } = render(
        <MixedTextBodyEditor value={createSingleRunTextBody()} onChange={onChange.fn} style={{ backgroundColor: "red" }} />,
      );
      expect((container.firstChild as HTMLElement).style.backgroundColor).toBe("red");
    });
  });
});
