/**
 * @file TextFormattingEditor tests
 */
// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
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

  it("renders all default controls", () => {
    const { fn: onChange } = createOnChange();
    render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Bold")).toBeDefined();
    expect(screen.getByLabelText("Italic")).toBeDefined();
    expect(screen.getByLabelText("Underline")).toBeDefined();
    expect(screen.getByLabelText("Strikethrough")).toBeDefined();
  });

  it("emits partial update on bold toggle", () => {
    const { fn: onChange, calls } = createOnChange();
    render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Bold"));
    expect(calls).toContainEqual({ bold: true });
  });

  it("emits partial update on italic toggle", () => {
    const { fn: onChange, calls } = createOnChange();
    render(<TextFormattingEditor value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Italic"));
    expect(calls).toContainEqual({ italic: true });
  });

  it("hides highlight when feature disabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <TextFormattingEditor value={defaultValue} onChange={onChange} features={{ showHighlight: false }} />,
    );

    expect(container.querySelector('[aria-label="Highlight"]')).toBeNull();
  });

  it("shows highlight when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor value={defaultValue} onChange={onChange} features={{ showHighlight: true }} />,
    );

    // Highlight section should be present (label text)
    expect(screen.getByText("Highlight")).toBeDefined();
  });

  it("shows mixed indicators", () => {
    const { fn: onChange } = createOnChange();
    const mixed = { mixedFields: new Set(["bold", "fontSize"]) };

    render(
      <TextFormattingEditor value={defaultValue} onChange={onChange} mixed={mixed} />,
    );

    expect(screen.getByLabelText("Bold (Mixed)")).toBeDefined();
    expect(screen.getByText("Size (Mixed)")).toBeDefined();
  });

  it("uses custom font family slot when provided", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderFontFamilySelect={({ value: v }) => <div data-testid="custom-font">{v}</div>}
      />,
    );

    expect(screen.getByTestId("custom-font")).toBeDefined();
    expect(screen.getByTestId("custom-font").textContent).toBe("Arial");
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
        features={{
          showBold: false,
          showItalic: false,
          showUnderline: false,
          showStrikethrough: false,
        }}
      />,
    );

    expect(container.querySelector('[aria-label="Bold"]')).toBeNull();
    expect(container.querySelector('[aria-label="Italic"]')).toBeNull();
    expect(container.querySelector('[aria-label="Underline"]')).toBeNull();
    expect(container.querySelector('[aria-label="Strikethrough"]')).toBeNull();
  });

  it("shows super/subscript when enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <TextFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showSuperSubscript: true }}
      />,
    );

    expect(screen.getByLabelText("Superscript")).toBeDefined();
    expect(screen.getByLabelText("Subscript")).toBeDefined();
  });

  it("clears subscript when superscript is toggled on", () => {
    const { fn: onChange, calls } = createOnChange();
    render(
      <TextFormattingEditor
        value={{ ...defaultValue, subscript: true }}
        onChange={onChange}
        features={{ showSuperSubscript: true }}
      />,
    );

    fireEvent.click(screen.getByLabelText("Superscript"));
    expect(calls).toContainEqual({ superscript: true, subscript: undefined });
  });
});
