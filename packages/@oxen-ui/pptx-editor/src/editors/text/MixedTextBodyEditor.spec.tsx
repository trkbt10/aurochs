/**
 * @file MixedTextBodyEditor component tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixedTextBodyEditor } from "./MixedTextBodyEditor";
import type { TextBody } from "@oxen/pptx/domain/text";
import type { Points, Pixels } from "@oxen/ooxml/domain/units";

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
          {
            type: "text" as const,
            text: "Bold text",
            properties: { bold: true, fontSize: 12 as Points },
          },
          {
            type: "text" as const,
            text: "Normal text",
            properties: { bold: false, fontSize: 14 as Points },
          },
        ],
      },
      {
        properties: { alignment: "center" },
        runs: [
          {
            type: "text" as const,
            text: "Second paragraph",
            properties: { italic: true },
          },
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
    it("renders summary with paragraph and character count", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor value={textBody} onChange={onChange} />
      );

      // Should show "1 paragraph, 11 characters"
      expect(container.textContent).toContain("1 paragraph");
      expect(container.textContent).toContain("11 characters");
    });

    it("renders plural form for multiple paragraphs", () => {
      const textBody = createMixedTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor value={textBody} onChange={onChange} />
      );

      // Should show "2 paragraphs"
      expect(container.textContent).toContain("2 paragraphs");
    });

    it("renders Character accordion", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      render(<MixedTextBodyEditor value={textBody} onChange={onChange} />);

      expect(screen.getByText("Character")).toBeTruthy();
    });

    it("renders Paragraph accordion", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      render(<MixedTextBodyEditor value={textBody} onChange={onChange} />);

      expect(screen.getByText("Paragraph")).toBeTruthy();
    });
  });

  describe("same values", () => {
    it("shows same bold value when all runs are bold", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      render(<MixedTextBodyEditor value={textBody} onChange={onChange} />);

      const boldButton = screen.getByRole("button", { name: /bold/i });
      expect(boldButton.getAttribute("aria-pressed")).toBe("true");
    });
  });

  describe("mixed values", () => {
    it("shows mixed bold indicator when runs have different bold values", () => {
      const textBody = createMixedTextBody();
      const onChange = vi.fn();

      render(<MixedTextBodyEditor value={textBody} onChange={onChange} />);

      const boldButton = screen.getByRole("button", { name: /bold/i });
      // Mixed state is represented as "mixed" in aria-pressed
      expect(boldButton.getAttribute("aria-pressed")).toBe("mixed");
    });

    it("shows mixed font size when runs have different sizes", () => {
      const textBody = createMixedTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor value={textBody} onChange={onChange} />
      );

      // Should show "Size (Mixed)" or similar indicator
      expect(container.textContent).toContain("Mixed");
    });
  });

  describe("applying properties", () => {
    it("applies bold to all runs when bold button is clicked", () => {
      const textBody = createMixedTextBody();
      const onChange = vi.fn();

      render(<MixedTextBodyEditor value={textBody} onChange={onChange} />);

      const boldButton = screen.getByRole("button", { name: /bold/i });
      fireEvent.click(boldButton);

      expect(onChange).toHaveBeenCalled();
      const newTextBody = onChange.mock.calls[0][0] as TextBody;

      // All runs should now have bold: true
      for (const para of newTextBody.paragraphs) {
        for (const run of para.runs) {
          if (run.type === "text" || run.type === "field") {
            expect(run.properties?.bold).toBe(true);
          }
        }
      }
    });

    it("applies alignment to all paragraphs when alignment is changed", () => {
      const textBody = createMixedTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor value={textBody} onChange={onChange} />
      );

      // Expand Paragraph accordion
      const paragraphAccordion = screen.getByText("Paragraph");
      fireEvent.click(paragraphAccordion);

      // Find alignment select
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let alignmentSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.value === "right" && option.textContent === "Right") {
            alignmentSelect = select;
            break;
          }
        }
        if (alignmentSelect) {break;}
      }

      if (alignmentSelect) {
        fireEvent.change(alignmentSelect, { target: { value: "right" } });

        expect(onChange).toHaveBeenCalled();
        const newTextBody = onChange.mock.calls[0][0] as TextBody;

        // All paragraphs should now have alignment: right
        for (const para of newTextBody.paragraphs) {
          expect(para.properties.alignment).toBe("right");
        }
      }
    });
  });

  describe("disabled state", () => {
    it("does not call onChange when disabled", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      render(
        <MixedTextBodyEditor value={textBody} onChange={onChange} disabled />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i });
      fireEvent.click(boldButton);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("styling", () => {
    it("applies custom className", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor
          value={textBody}
          onChange={onChange}
          className="custom-editor"
        />
      );

      expect(
        (container.firstChild as HTMLElement).classList.contains("custom-editor")
      ).toBe(true);
    });

    it("applies custom style", () => {
      const textBody = createSingleRunTextBody();
      const onChange = vi.fn();

      const { container } = render(
        <MixedTextBodyEditor
          value={textBody}
          onChange={onChange}
          style={{ backgroundColor: "red" }}
        />
      );

      expect(
        (container.firstChild as HTMLElement).style.backgroundColor
      ).toBe("red");
    });
  });
});
