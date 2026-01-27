/**
 * @file MixedParagraphPropertiesEditor component tests
 *
 * Tests rendering, Mixed state display, and user interactions.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixedParagraphPropertiesEditor } from "./MixedParagraphPropertiesEditor";
import type { MixedParagraphProperties } from "./mixed-properties";
import type { Pixels } from "@oxen/ooxml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createAllSameProperties(): MixedParagraphProperties {
  return {
    level: { type: "same", value: 0 },
    alignment: { type: "same", value: "left" },
    marginLeft: { type: "same", value: 0 as Pixels },
    marginRight: { type: "same", value: 0 as Pixels },
    indent: { type: "same", value: 0 as Pixels },
    defaultTabSize: { type: "notApplicable" },
    lineSpacing: { type: "notApplicable" },
    spaceBefore: { type: "notApplicable" },
    spaceAfter: { type: "notApplicable" },
    bulletStyle: { type: "notApplicable" },
    rtl: { type: "same", value: false },
    fontAlignment: { type: "notApplicable" },
    eaLineBreak: { type: "notApplicable" },
    latinLineBreak: { type: "notApplicable" },
    hangingPunctuation: { type: "notApplicable" },
  };
}

function createMixedProperties(): MixedParagraphProperties {
  return {
    level: { type: "mixed" },
    alignment: { type: "mixed" },
    marginLeft: { type: "mixed" },
    marginRight: { type: "mixed" },
    indent: { type: "mixed" },
    defaultTabSize: { type: "notApplicable" },
    lineSpacing: { type: "mixed" },
    spaceBefore: { type: "mixed" },
    spaceAfter: { type: "mixed" },
    bulletStyle: { type: "notApplicable" },
    rtl: { type: "mixed" },
    fontAlignment: { type: "notApplicable" },
    eaLineBreak: { type: "notApplicable" },
    latinLineBreak: { type: "notApplicable" },
    hangingPunctuation: { type: "notApplicable" },
  };
}

function createPartiallyMixedProperties(): MixedParagraphProperties {
  return {
    level: { type: "same", value: 1 },
    alignment: { type: "mixed" },
    marginLeft: { type: "same", value: 20 as Pixels },
    marginRight: { type: "same", value: 0 as Pixels },
    indent: { type: "mixed" },
    defaultTabSize: { type: "notApplicable" },
    lineSpacing: { type: "same", value: { type: "percent", value: 100 as never } },
    spaceBefore: { type: "notApplicable" },
    spaceAfter: { type: "notApplicable" },
    bulletStyle: { type: "notApplicable" },
    rtl: { type: "same", value: false },
    fontAlignment: { type: "notApplicable" },
    eaLineBreak: { type: "notApplicable" },
    latinLineBreak: { type: "notApplicable" },
    hangingPunctuation: { type: "notApplicable" },
  };
}

/**
 * Helper to find the Level input specifically.
 * The level input is inside a FieldGroup with "Level" label.
 */
function findLevelInput(container: HTMLElement): HTMLInputElement | null {
  // Find all number inputs
  const inputs = container.querySelectorAll('input[type="number"]');
  for (const input of inputs) {
    // Walk up the DOM to find the label
    let parent: HTMLElement | null = input.parentElement;
    while (parent && parent !== container) {
      const spans = parent.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent?.includes("Level")) {
          return input as HTMLInputElement;
        }
      }
      parent = parent.parentElement;
    }
  }
  return null;
}

/**
 * Helper to find the RTL toggle (role="switch").
 */
function findRtlToggle(container: HTMLElement): HTMLElement | null {
  return container.querySelector('[role="switch"]');
}

// =============================================================================
// Tests
// =============================================================================

describe("MixedParagraphPropertiesEditor", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
  });

  describe("rendering", () => {
    it("renders alignment and level fields", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      // Should have alignment label
      expect(container.textContent).toContain("Align");
      // Should have level label
      expect(container.textContent).toContain("Level");
    });

    it("renders with disabled state", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          disabled
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      expect(levelInput!.disabled).toBe(true);
    });

    it("renders indentation section when showIndentation is true", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={true}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("L Margin");
      expect(container.textContent).toContain("R Margin");
      expect(container.textContent).toContain("Indent");
    });

    it("hides indentation section when showIndentation is false", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect(container.textContent).not.toContain("L Margin");
      expect(container.textContent).not.toContain("R Margin");
    });

    it("renders spacing section when showSpacing is true", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showSpacing={true}
          showIndentation={false}
        />
      );

      expect(container.textContent).toContain("Line");
      expect(container.textContent).toContain("Before");
      expect(container.textContent).toContain("After");
    });

    it("hides spacing section when showSpacing is false", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showSpacing={false}
          showIndentation={false}
        />
      );

      expect(container.textContent).not.toContain("Before");
      expect(container.textContent).not.toContain("After");
    });

    it("renders RTL toggle", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("Right-to-Left");
    });
  });

  describe("same values display", () => {
    it("displays correct alignment value", () => {
      render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const alignSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(alignSelect.value).toBe("left");
    });

    it("displays correct level value", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      expect(levelInput!.value).toBe("0");
    });

    it("displays RTL toggle as unchecked when false", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const rtlToggle = findRtlToggle(container);
      expect(rtlToggle).toBeTruthy();
      expect(rtlToggle?.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("mixed values display", () => {
    it("shows (M) in alignment label when mixed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("Align (M)");
    });

    it("shows (M) in level label when mixed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("Level (M)");
    });

    it("displays Mixed placeholder for mixed level input", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      expect(levelInput!.value).toBe(""); // Empty value
      expect(levelInput!.placeholder).toBe("Mixed");
    });

    it("shows (M) in margin labels when mixed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showIndentation={true}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("L Margin (M)");
      expect(container.textContent).toContain("R Margin (M)");
      expect(container.textContent).toContain("Indent (M)");
    });

    it("shows (M) in spacing labels when mixed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showSpacing={true}
          showIndentation={false}
        />
      );

      expect(container.textContent).toContain("Line (M)");
      expect(container.textContent).toContain("Before (M)");
      expect(container.textContent).toContain("After (M)");
    });

    it("shows (M) in RTL label when mixed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect(container.textContent).toContain("Right-to-Left (M)");
    });
  });

  describe("user interactions - alignment", () => {
    it("calls onChange when alignment is changed", () => {
      render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const alignSelect = screen.getByRole("combobox");
      fireEvent.change(alignSelect, { target: { value: "center" } });

      expect(onChange).toHaveBeenCalledWith({ alignment: "center" });
    });

    it("calls onChange with correct value when alignment is set to justify", () => {
      render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const alignSelect = screen.getByRole("combobox");
      fireEvent.change(alignSelect, { target: { value: "justify" } });

      expect(onChange).toHaveBeenCalledWith({ alignment: "justify" });
    });
  });

  describe("user interactions - level", () => {
    it("calls onChange when level is changed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      fireEvent.change(levelInput!, { target: { value: "2" } });

      expect(onChange).toHaveBeenCalledWith({ level: 2 });
    });

    it("clamps level to 0-8 range (max)", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      fireEvent.change(levelInput!, { target: { value: "10" } });

      expect(onChange).toHaveBeenCalledWith({ level: 8 });
    });

    it("clamps level to 0-8 range (min)", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      fireEvent.change(levelInput!, { target: { value: "-1" } });

      expect(onChange).toHaveBeenCalledWith({ level: 0 });
    });

    it("handles invalid level input", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      fireEvent.change(levelInput!, { target: { value: "abc" } });

      expect(onChange).toHaveBeenCalledWith({ level: 0 });
    });
  });

  describe("user interactions - RTL", () => {
    it("calls onChange when RTL is toggled on", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const rtlToggle = findRtlToggle(container);
      expect(rtlToggle).toBeTruthy();
      fireEvent.click(rtlToggle!);

      expect(onChange).toHaveBeenCalledWith({ rtl: true });
    });

    it("calls onChange with undefined when RTL is toggled off", () => {
      const props = {
        ...createAllSameProperties(),
        rtl: { type: "same" as const, value: true },
      };

      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={props}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      const rtlToggle = findRtlToggle(container);
      expect(rtlToggle).toBeTruthy();
      fireEvent.click(rtlToggle!);

      expect(onChange).toHaveBeenCalledWith({ rtl: undefined });
    });
  });

  describe("user interactions - disabled", () => {
    it("does not call onChange when disabled and alignment is clicked", () => {
      render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          disabled
          showIndentation={false}
          showSpacing={false}
        />
      );

      const alignSelect = screen.getByRole("combobox") as HTMLSelectElement;
      expect(alignSelect.disabled).toBe(true);
    });

    it("does not call onChange when disabled and level is changed", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          disabled
          showIndentation={false}
          showSpacing={false}
        />
      );

      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      expect(levelInput!.disabled).toBe(true);
    });
  });

  describe("partially mixed properties", () => {
    it("displays correct values for same properties alongside mixed indicators", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createPartiallyMixedProperties()}
          onChange={onChange}
          showIndentation={false}
          showSpacing={false}
        />
      );

      // Level should show value 1
      const levelInput = findLevelInput(container);
      expect(levelInput).toBeTruthy();
      expect(levelInput!.value).toBe("1");

      // Alignment should show Mixed indicator
      expect(container.textContent).toContain("Align (M)");

      // RTL should not be checked
      const rtlToggle = findRtlToggle(container);
      expect(rtlToggle).toBeTruthy();
      expect(rtlToggle?.getAttribute("aria-checked")).toBe("false");
    });
  });

  describe("custom styling", () => {
    it("applies custom className", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          className="custom-class"
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect((container.firstChild as HTMLElement).classList.contains("custom-class")).toBe(true);
    });

    it("applies custom style", () => {
      const { container } = render(
        <MixedParagraphPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          style={{ backgroundColor: "red" }}
          showIndentation={false}
          showSpacing={false}
        />
      );

      expect((container.firstChild as HTMLElement).style.backgroundColor).toBe("red");
    });
  });
});
