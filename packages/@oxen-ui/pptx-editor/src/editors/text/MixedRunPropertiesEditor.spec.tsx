/**
 * @file MixedRunPropertiesEditor component tests
 *
 * Tests rendering, Mixed state display, and user interactions.
 */

// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MixedRunPropertiesEditor } from "./MixedRunPropertiesEditor";
import type { MixedRunProperties } from "./mixed-properties";
import type { Points, Pixels } from "@oxen/ooxml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

function createAllSameProperties(): MixedRunProperties {
  return {
    fontSize: { type: "same", value: 12 as Points },
    fontFamily: { type: "same", value: "Arial" },
    fontFamilyEastAsian: { type: "notApplicable" },
    fontFamilyComplexScript: { type: "notApplicable" },
    fontFamilySymbol: { type: "notApplicable" },
    bold: { type: "same", value: true },
    italic: { type: "same", value: false },
    underline: { type: "same", value: "sng" },
    underlineColor: { type: "notApplicable" },
    strike: { type: "same", value: "noStrike" },
    caps: { type: "same", value: "none" },
    baseline: { type: "same", value: 0 },
    spacing: { type: "same", value: 0 as Pixels },
    kerning: { type: "same", value: 0 as Points },
    color: { type: "same", value: { spec: { type: "srgb", value: "000000" } } },
    fill: { type: "notApplicable" },
    highlightColor: { type: "notApplicable" },
    textOutline: { type: "notApplicable" },
    outline: { type: "notApplicable" },
    shadow: { type: "notApplicable" },
    emboss: { type: "notApplicable" },
    language: { type: "notApplicable" },
    rtl: { type: "notApplicable" },
  };
}

function createMixedProperties(): MixedRunProperties {
  return {
    fontSize: { type: "mixed" },
    fontFamily: { type: "mixed" },
    fontFamilyEastAsian: { type: "notApplicable" },
    fontFamilyComplexScript: { type: "notApplicable" },
    fontFamilySymbol: { type: "notApplicable" },
    bold: { type: "mixed" },
    italic: { type: "mixed" },
    underline: { type: "mixed" },
    underlineColor: { type: "notApplicable" },
    strike: { type: "mixed" },
    caps: { type: "mixed" },
    baseline: { type: "mixed" },
    spacing: { type: "mixed" },
    kerning: { type: "mixed" },
    color: { type: "mixed" },
    fill: { type: "notApplicable" },
    highlightColor: { type: "mixed" },
    textOutline: { type: "notApplicable" },
    outline: { type: "notApplicable" },
    shadow: { type: "notApplicable" },
    emboss: { type: "notApplicable" },
    language: { type: "notApplicable" },
    rtl: { type: "notApplicable" },
  };
}

function createPartiallyMixedProperties(): MixedRunProperties {
  return {
    fontSize: { type: "same", value: 14 as Points },
    fontFamily: { type: "mixed" },
    fontFamilyEastAsian: { type: "notApplicable" },
    fontFamilyComplexScript: { type: "notApplicable" },
    fontFamilySymbol: { type: "notApplicable" },
    bold: { type: "same", value: true },
    italic: { type: "mixed" },
    underline: { type: "same", value: "none" },
    underlineColor: { type: "notApplicable" },
    strike: { type: "same", value: "noStrike" },
    caps: { type: "same", value: "none" },
    baseline: { type: "same", value: 0 },
    spacing: { type: "same", value: 0 as Pixels },
    kerning: { type: "same", value: 0 as Points },
    color: { type: "same", value: { spec: { type: "srgb", value: "FF0000" } } },
    fill: { type: "notApplicable" },
    highlightColor: { type: "notApplicable" },
    textOutline: { type: "notApplicable" },
    outline: { type: "notApplicable" },
    shadow: { type: "notApplicable" },
    emboss: { type: "notApplicable" },
    language: { type: "notApplicable" },
    rtl: { type: "notApplicable" },
  };
}

// =============================================================================
// Tests
// =============================================================================

describe("MixedRunPropertiesEditor", () => {
  let onChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onChange = vi.fn();
    const fakeFonts = Object.assign(
      [{ family: "Arial" }, { family: "Helvetica" }],
      { ready: Promise.resolve(), status: "loaded" }
    );
    try {
      Object.defineProperty(document, "fonts", {
        value: fakeFonts,
        configurable: true,
      });
    } catch {
      // Ignore if document.fonts is non-configurable in this environment
    }
  });

  describe("rendering", () => {
    it("renders all property fields", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      // Font section
      const fontSelect = screen.getByRole("button", { name: /Arial/i });
      expect(fontSelect).toBeTruthy();

      // Style buttons
      const boldButton = screen.getByRole("button", { name: /bold/i });
      const italicButton = screen.getByRole("button", { name: /italic/i });
      expect(boldButton).toBeTruthy();
      expect(italicButton).toBeTruthy();
    });

    it("renders with disabled state", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          disabled
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i }) as HTMLButtonElement;
      expect(boldButton.disabled).toBe(true);
    });

    it("renders without spacing section when showSpacing is false", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          showSpacing={false}
        />
      );

      // Spacing label should not be present
      expect(container.textContent).not.toContain("Spacing");
      expect(container.textContent).not.toContain("Baseline");
      expect(container.textContent).not.toContain("Kerning");
    });
  });

  describe("same values display", () => {
    it("displays same font family value in input", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const fontSelect = screen.getByRole("button", { name: /arial/i });
      expect(fontSelect).toBeTruthy();
    });

    it("displays bold button as pressed when bold is true", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i });
      expect(boldButton.getAttribute("aria-pressed")).toBe("true");
    });

    it("displays italic button as not pressed when italic is false", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const italicButton = screen.getByRole("button", { name: /italic/i });
      expect(italicButton.getAttribute("aria-pressed")).toBe("false");
    });
  });

  describe("mixed values display", () => {
    it("displays Mixed placeholder for mixed font family", () => {
      render(
        <MixedRunPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
        />
      );

      const fontSelect = screen.getByRole("button", { name: "Mixed" });
      expect(fontSelect).toBeTruthy();
    });

    it("displays bold button with mixed aria-pressed state", () => {
      render(
        <MixedRunPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold.*mixed/i });
      expect(boldButton.getAttribute("aria-pressed")).toBe("mixed");
    });

    it("displays italic button with mixed aria-pressed state", () => {
      render(
        <MixedRunPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
        />
      );

      const italicButton = screen.getByRole("button", { name: /italic.*mixed/i });
      expect(italicButton.getAttribute("aria-pressed")).toBe("mixed");
    });

    it("shows (Mixed) in size label when fontSize is mixed", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
        />
      );

      expect(container.textContent).toContain("Size (Mixed)");
    });
  });

  describe("user interactions", () => {
    it("calls onChange when font family is changed", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const fontSelect = screen.getByRole("button", { name: /arial/i });
      fireEvent.click(fontSelect);
      fireEvent.click(screen.getByText("Helvetica"));

      expect(onChange).toHaveBeenCalledWith({ fontFamily: "Helvetica" });
    });

    it("calls onChange with undefined when font family is cleared", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const fontSelect = screen.getByRole("button", { name: /arial/i });
      fireEvent.click(fontSelect);
      fireEvent.click(screen.getByText("Default"));

      expect(onChange).toHaveBeenCalledWith({ fontFamily: undefined });
    });

    it("calls onChange when bold button is clicked (toggle off)", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i });
      fireEvent.click(boldButton);

      // When pressed (true) is clicked, it toggles to false (undefined)
      expect(onChange).toHaveBeenCalledWith({ bold: undefined });
    });

    it("calls onChange when italic button is clicked (toggle on)", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const italicButton = screen.getByRole("button", { name: /italic/i });
      fireEvent.click(italicButton);

      // When not pressed (false) is clicked, it toggles to true
      expect(onChange).toHaveBeenCalledWith({ italic: true });
    });

    it("calls onChange with true when mixed bold button is clicked", () => {
      render(
        <MixedRunPropertiesEditor
          value={createMixedProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold.*mixed/i });
      fireEvent.click(boldButton);

      // When mixed, clicking always sets to true
      expect(onChange).toHaveBeenCalledWith({ bold: true });
    });

    it("does not call onChange when disabled", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
          disabled
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i });
      fireEvent.click(boldButton);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("underline and strike selects", () => {
    it("displays correct underline value", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      // Find the first select (underline select comes before strike and caps)
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      // Underline select is one of the first selects in the decoration section
      // Find by checking select options for "Single" which is sng label
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {break;}
      }
      expect(underlineSelect).toBeTruthy();
      expect(underlineSelect?.value).toBe("sng");
    });

    it("calls onChange when underline is changed", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {break;}
      }

      if (underlineSelect) {
        fireEvent.change(underlineSelect, { target: { value: "dbl" } });
        expect(onChange).toHaveBeenCalledWith({ underline: "dbl" });
      }
    });

    it("calls onChange with undefined when underline is set to none", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {break;}
      }

      if (underlineSelect) {
        fireEvent.change(underlineSelect, { target: { value: "none" } });
        expect(onChange).toHaveBeenCalledWith({ underline: undefined });
      }
    });
  });

  describe("caps select", () => {
    it("displays correct caps value", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      // Find the caps select by looking for "Small Caps" option
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let capsSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Small Caps" || option.value === "small") {
            capsSelect = select;
            break;
          }
        }
        if (capsSelect) {break;}
      }
      expect(capsSelect).toBeTruthy();
      expect(capsSelect?.value).toBe("none");
    });

    it("calls onChange when caps is changed to small", () => {
      const { container } = render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let capsSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Small Caps" || option.value === "small") {
            capsSelect = select;
            break;
          }
        }
        if (capsSelect) {break;}
      }

      if (capsSelect) {
        fireEvent.change(capsSelect, { target: { value: "small" } });
        expect(onChange).toHaveBeenCalledWith({ caps: "small" });
      }
    });
  });

  describe("partially mixed properties", () => {
    it("displays same values correctly alongside mixed values", () => {
      render(
        <MixedRunPropertiesEditor
          value={createPartiallyMixedProperties()}
          onChange={onChange}
        />
      );

      // Bold should be pressed (same: true)
      const boldButton = screen.getByRole("button", { name: /bold/i });
      expect(boldButton.getAttribute("aria-pressed")).toBe("true");

      // Italic should be mixed
      const italicButton = screen.getByRole("button", { name: /italic.*mixed/i });
      expect(italicButton.getAttribute("aria-pressed")).toBe("mixed");

      // Font family should show Mixed placeholder
      const fontSelect = screen.getByRole("button", { name: "Mixed" });
      expect(fontSelect).toBeTruthy();
    });
  });

  describe("accessibility", () => {
    it("has proper aria labels for toggle buttons", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByLabelText(/bold/i);
      const italicButton = screen.getByLabelText(/italic/i);
      expect(boldButton).toBeTruthy();
      expect(italicButton).toBeTruthy();
    });

    it("has proper aria-pressed states", () => {
      render(
        <MixedRunPropertiesEditor
          value={createAllSameProperties()}
          onChange={onChange}
        />
      );

      const boldButton = screen.getByRole("button", { name: /bold/i });
      const italicButton = screen.getByRole("button", { name: /italic/i });

      expect(boldButton.getAttribute("aria-pressed")).toBeTruthy();
      expect(italicButton.getAttribute("aria-pressed")).toBeTruthy();
    });
  });
});
