/**
 * @file MixedRunPropertiesEditor component tests
 *
 * Tests rendering and user interactions. The component delegates to
 * TextFormattingEditor which uses react-editor-ui sections (FontSection,
 * FontMetricsSection, CaseTransformSection) plus PropertySection for
 * Color, Decoration, and Spacing.
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
    fn: (...args) => { calls.push(args); },
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
    ...createAllSameProperties(),
    fontFamily: { type: "mixed" },
    italic: { type: "mixed" },
    color: { type: "same", value: { spec: { type: "srgb", value: "FF0000" } } },
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
      Object.defineProperty(document, "fonts", { value: fakeFonts, configurable: true });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- error intentionally unused
    } catch (error: unknown) { /* non-configurable */ }
  });

  describe("rendering", () => {
    it("renders react-editor-ui section titles", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(container.textContent).toContain("Font");
      expect(container.textContent).toContain("Font Metrics");
      expect(container.textContent).toContain("Case & Style");
    });

    it("renders font family and font weight selects", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(screen.getByLabelText("Font family")).toBeTruthy();
      expect(screen.getByLabelText("Font weight")).toBeTruthy();
    });

    it("renders PPTX-specific property sections", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(container.textContent).toContain("Color");
      expect(container.textContent).toContain("Decoration");
    });

    it("renders with disabled state", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} disabled />);

      const fontFamilySelect = screen.getByLabelText("Font family") as HTMLButtonElement;
      expect(fontFamilySelect.disabled).toBe(true);
    });

    it("hides spacing section when showSpacing is false", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} showSpacing={false} />,
      );

      expect(container.textContent).toContain("Color");
      expect(container.textContent).toContain("Decoration");
      expect(container.textContent).not.toContain("Kerning");
    });

    it("shows spacing section by default", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      expect(container.textContent).toContain("Kerning");
    });
  });

  describe("underline and strike style selects", () => {
    it("displays correct underline style value", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        for (const option of select.querySelectorAll("option")) {
          if (option.value === "sng") { underlineSelect = select; break; }
        }
        if (underlineSelect) { break; }
      }
      expect(underlineSelect).toBeTruthy();
      expect(underlineSelect?.value).toBe("sng");
    });

    it("calls onChange when underline style is changed", () => {
      const { container } = render(
        <MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />,
      );

      const selects = container.querySelectorAll("select") as NodeListOf<HTMLSelectElement>;
      let underlineSelect: HTMLSelectElement | null = null;
      for (const select of selects) {
        for (const option of select.querySelectorAll("option")) {
          if (option.value === "sng") { underlineSelect = select; break; }
        }
        if (underlineSelect) { break; }
      }

      if (underlineSelect) {
        fireEvent.change(underlineSelect, { target: { value: "dbl" } });
        expect(onChange.calls.length).toBe(1);
        expect(onChange.calls[0]?.[0]).toEqual({ underline: "dbl" });
      }
    });
  });

  describe("caps via CaseTransformSection", () => {
    it("displays correct caps value", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      const normalCaseRadio = screen.getByRole("radio", { name: /normal case/i });
      expect(normalCaseRadio.getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("partially mixed properties", () => {
    it("renders without errors", () => {
      const { container } = render(<MixedRunPropertiesEditor value={createPartiallyMixedProperties()} onChange={onChange.fn} />);

      expect(container.textContent).toContain("Font");
      expect(container.textContent).toContain("Case & Style");
    });
  });

  describe("accessibility", () => {
    it("has proper aria labels for font selects", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(screen.getByLabelText("Font family")).toBeTruthy();
      expect(screen.getByLabelText("Font weight")).toBeTruthy();
    });

    it("has proper aria labels for text style toggles", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(screen.getByRole("checkbox", { name: /underline/i })).toBeTruthy();
      expect(screen.getByRole("checkbox", { name: /strikethrough/i })).toBeTruthy();
    });

    it("has proper aria labels for case transform radios", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      expect(screen.getByRole("radio", { name: /normal case/i })).toBeTruthy();
      expect(screen.getByRole("radio", { name: /small caps/i })).toBeTruthy();
      expect(screen.getAllByRole("radio", { name: /all caps/i }).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("font weight interaction", () => {
    it("renders font weight select", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} />);

      const weightSelect = screen.getByLabelText("Font weight");
      expect(weightSelect).toBeTruthy();
      expect(weightSelect.getAttribute("role")).toBe("combobox");
    });
  });

  describe("disabled state", () => {
    it("disables font family when disabled", () => {
      render(<MixedRunPropertiesEditor value={createAllSameProperties()} onChange={onChange.fn} disabled />);

      const fontFamily = screen.getByLabelText("Font family") as HTMLButtonElement;
      expect(fontFamily.disabled).toBe(true);
    });
  });
});
