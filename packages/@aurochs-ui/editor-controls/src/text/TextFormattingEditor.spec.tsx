/**
 * @file TextFormattingEditor tests
 *
 * Tests rendering using react-editor-ui sections (FontSection,
 * FontMetricsSection, CaseTransformSection, PropertySection).
 */
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { TextFormattingEditor } from "./TextFormattingEditor";
import type { TextFormatting } from "./types";

function createOnChange() {
  const calls: Partial<TextFormatting>[] = [];
  return { fn: (update: Partial<TextFormatting>) => { calls.push(update); }, calls };
}

describe("TextFormattingEditor", () => {
  const defaultValue: TextFormatting = {
    fontFamily: "Arial",
    fontSize: 12,
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    textColor: "#000000",
  };

  beforeEach(() => {
    const fakeFonts = Object.assign([{ family: "Arial" }], {
      ready: Promise.resolve(),
      status: "loaded",
    });
    try {
      Object.defineProperty(document, "fonts", { value: fakeFonts, configurable: true });
    } catch { /* non-configurable */ }
  });

  it("renders react-editor-ui sections", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    // FontSection renders "Font" title
    expect(container.textContent).toContain("Font");
    // FontMetricsSection renders "Font Metrics" title
    expect(container.textContent).toContain("Font Metrics");
  });

  it("renders font family and font weight selects", () => {
    const { fn: onChange } = createOnChange();
    render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Font family")).toBeTruthy();
    expect(screen.getByLabelText("Font weight")).toBeTruthy();
  });

  it("hides highlight when feature disabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor value={defaultValue} onChange={onChange} features={{ showHighlight: false }} />,
    );

    expect(container.textContent).not.toContain("Highlight");
  });

  it("shows highlight when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor value={defaultValue} onChange={onChange} features={{ showHighlight: true }} />,
    );

    expect(container.textContent).toContain("Highlight");
  });

  it("renders FontFamilySelect by default", () => {
    const { fn: onChange } = createOnChange();
    render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByText("Font")).toBeDefined();
  });

  it("uses custom color picker slot when provided", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderColorPicker={({ value: v }) => <div data-testid="custom-color">{v}</div>}
      />,
    );

    expect(screen.getByTestId("custom-color")).toBeDefined();
  });

  it("renders extras slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderExtras={() => <div data-testid="extras">Extra Controls</div>}
      />,
    );

    expect(screen.getByTestId("extras")).toBeDefined();
  });

  it("hides all toggles when features disable them", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showFontFamily: false, showFontSize: false }}
      />,
    );

    expect(container.querySelector('[aria-label="Font family"]')).toBeNull();
  });

  it("shows CaseTransformSection when caps or superSubscript enabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showCaps: true, showSuperSubscript: true }}
      />,
    );

    expect(container.textContent).toContain("Case & Style");
  });

  it("shows super/subscript checkboxes via CaseTransformSection", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor
        value={{ ...defaultValue, superscript: true }}
        onChange={onChange}
        features={{ showSuperSubscript: true }}
      />,
    );

    const superCheckbox = screen.getByRole("checkbox", { name: /superscript/i });
    expect(superCheckbox).toBeTruthy();
    expect(superCheckbox.getAttribute("aria-checked")).toBe("true");
  });

  it("shows Decoration section when underline style enabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor
        value={{ ...defaultValue, underlineStyle: "single" }}
        onChange={onChange}
        features={{ showUnderlineStyle: true }}
      />,
    );

    expect(container.textContent).toContain("Decoration");
  });

  it("shows Spacing section when spacing enabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor
        value={{ ...defaultValue, letterSpacing: 2, kerning: 1 }}
        onChange={onChange}
        features={{ showSpacing: true }}
      />,
    );

    expect(container.textContent).toContain("Spacing");
    expect(container.textContent).toContain("Kerning");
  });
});
