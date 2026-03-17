/**
 * @file MixedRunPropertiesEditor component tests
 *
 * Tests rendering, Mixed state display, and user interactions.
 *
 * The component uses react-editor-ui sections:
 * - FontSection (font family + weight selects)
 * - FontMetricsSection (size, leading, kerning, tracking)
 * - CaseTransformSection (case + underline/strikethrough/super/sub toggles)
 * Plus PPTX-specific PropertySection controls for Color, Decoration, and Spacing.
 */

// @vitest-environment jsdom

import { render, screen, fireEvent } from "@testing-library/react";
import { MixedRunPropertiesEditor } from "./MixedRunPropertiesEditor";
import type { MixedRunPropertiesEditorProps } from "./MixedRunPropertiesEditor";
import type { MixedRunProperties } from "./mixed-properties";
import type { Points, Pixels } from "@aurochs-office/drawing-ml/domain/units";

// =============================================================================
// Test Helpers
// =============================================================================

type CallTracker<Args extends readonly unknown[]> = {
  readonly calls: Args[];
  readonly fn: (...args: Args) => void;
};

function createCallTracker<Args extends readonly unknown[]>(): CallTracker<Args> {
  const calls: Args[] = [];
  return {
    calls,
    fn: (...args) => {
      calls.push(args);
    },
  };
}

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
  // eslint-disable-next-line no-restricted-syntax -- mutable test state
  let onChange: CallTracker<Parameters<MixedRunPropertiesEditorProps["onChange"]>>;

  beforeEach(() => {
    onChange = createCallTracker<Parameters<MixedRunPropertiesEditorProps["onChange"]>>();
    const fakeFonts = Object.assign([{ family: "Arial" }, { family: "Helvetica" }], {
      ready: Promise.resolve(),
      status: "loaded",
    });
    try {
      Object.defineProperty(document, "fonts", {
        value: fakeFonts,
        configurable: true,
      });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error intentionally unused, document.fonts may be non-configurable
    } catch (error: unknown) {
      // Ignore if document.fonts is non-configurable in this environment
    }
  });

  describe("rendering", () => {
    it("renders react-editor-ui section titles", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // FontSection renders "Font" title
      expect(container.textContent).toContain("Font");
      // FontMetricsSection renders "Font Metrics" title
      expect(container.textContent).toContain("Font Metrics");
      // CaseTransformSection renders "Case & Style" title
      expect(container.textContent).toContain("Case & Style");
    });

    it("renders font family and font weight selects", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // FontSection renders selects with these aria-labels
      const fontFamilySelect = screen.getByLabelText("Font family");
      const fontWeightSelect = screen.getByLabelText("Font weight");
      expect(fontFamilySelect).toBeTruthy();
      expect(fontWeightSelect).toBeTruthy();
    });

    it("renders PPTX-specific property sections", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // PropertySection titles for PPTX-specific controls
      expect(container.textContent).toContain("Color");
      expect(container.textContent).toContain("Decoration");
    });

    it("renders with disabled state", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} disabled />);

      // Font family select should be disabled
      const fontFamilySelect = screen.getByLabelText("Font family") as HTMLButtonElement;
      expect(fontFamilySelect.disabled).toBe(true);
    });

    it("renders without spacing section when showSpacing is false", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} showSpacing={false} />,
      );

      // The PPTX-specific "Spacing" PropertySection should not be present
      // (Color and Decoration should still be present)
      expect(container.textContent).toContain("Color");
      expect(container.textContent).toContain("Decoration");
      // "Spacing" as a section title should not appear (but "Spacing" as a field label inside it also gone)
      // Check that "Base" (baseline label) is not present
      expect(container.textContent).not.toContain("Kerning");
    });

    it("renders spacing section when showSpacing is true (default)", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      expect(container.textContent).toContain("Kerning");
    });
  });

  describe("same values display", () => {
    it("displays font family select with aria-label", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // FontSection renders a combobox for font family
      const fontSelect = screen.getByLabelText("Font family");
      expect(fontSelect).toBeTruthy();
    });

    it("displays underline checkbox as checked when underline is sng", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // CaseTransformSection has a TextStyleSelect with underline toggle
      // The underline checkbox (role="checkbox") should be checked since underline is "sng"
      const underlineCheckbox = screen.getByRole("checkbox", { name: /underline/i });
      expect(underlineCheckbox.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("PPTX-specific underline and strike selects", () => {
    it("displays correct underline value in Decoration section", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      // Find the underline select by looking for "Single" option
      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      // eslint-disable-next-line no-restricted-syntax -- mutable test state
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {
          break;
        }
      }
      expect(underlineSelect).toBeTruthy();
      expect(underlineSelect?.value).toBe("sng");
    });

    it("calls onChange when underline is changed", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      // eslint-disable-next-line no-restricted-syntax -- mutable test state
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {
          break;
        }
      }

      if (underlineSelect) {
        fireEvent.change(underlineSelect, { target: { value: "dbl" } });
        expect(onChange.calls.length).toBe(1);
        expect(onChange.calls[0]?.[0]).toEqual({ underline: "dbl" });
      }
    });

    it("calls onChange with undefined when underline is set to none", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      // eslint-disable-next-line no-restricted-syntax -- mutable test state
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        const options = select.querySelectorAll("option");
        for (const option of options) {
          if (option.textContent === "Single" || option.value === "sng") {
            underlineSelect = select;
            break;
          }
        }
        if (underlineSelect) {
          break;
        }
      }

      if (underlineSelect) {
        fireEvent.change(underlineSelect, { target: { value: "none" } });
        expect(onChange.calls.length).toBe(1);
        expect(onChange.calls[0]?.[0]).toEqual({ underline: undefined });
      }
    });
  });

  describe("caps select", () => {
    it("displays correct caps value via CaseTransformSection", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // CaseTransformSection renders a "Text case" segmented control
      // With caps="none", the "Normal case" radio should be selected
      const normalCaseRadio = screen.getByRole("radio", { name: /normal case/i });
      expect(normalCaseRadio.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("partially mixed properties", () => {
    it("renders without errors", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createPartiallyMixedProperties()} onChange={onChange.fn} />);

      // Should render Font section
      expect(container.textContent).toContain("Font");
      // Should render Case & Style section
      expect(container.textContent).toContain("Case & Style");
    });
  });

  describe("accessibility", () => {
    it("has proper aria labels for font selects", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      const fontFamily = screen.getByLabelText("Font family");
      const fontWeight = screen.getByLabelText("Font weight");
      expect(fontFamily).toBeTruthy();
      expect(fontWeight).toBeTruthy();
    });

    it("has proper aria labels for text style toggles", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // CaseTransformSection renders TextStyleSelect with these aria-label checkboxes
      const underline = screen.getByRole("checkbox", { name: /underline/i });
      const strikethrough = screen.getByRole("checkbox", { name: /strikethrough/i });
      expect(underline).toBeTruthy();
      expect(strikethrough).toBeTruthy();
    });

    it("has proper aria labels for case transform radios", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      const normalCase = screen.getByRole("radio", { name: /normal case/i });
      const smallCaps = screen.getByRole("radio", { name: /small caps/i });
      // "All caps" may match multiple elements due to icon rendering; use getAllByRole
      const allCapsElements = screen.getAllByRole("radio", { name: /all caps/i });
      expect(normalCase).toBeTruthy();
      expect(smallCaps).toBeTruthy();
      expect(allCapsElements.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("font weight change interaction", () => {
    it("renders font weight select", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      // FontSection renders a combobox for weight with aria-label "Font weight"
      const weightSelect = screen.getByLabelText("Font weight");
      expect(weightSelect).toBeTruthy();
      expect(weightSelect.getAttribute("role")).toBe("combobox");
    });
  });

  describe("user interactions - disabled", () => {
    it("does not call onChange when disabled font family is clicked", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} disabled />);

      const fontFamily = screen.getByLabelText("Font family") as HTMLButtonElement;
      expect(fontFamily.disabled).toBe(true);

      fireEvent.click(fontFamily);
      expect(onChange.calls.length).toBe(0);
    });
  });
});
