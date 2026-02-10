/**
 * @file OutlineFormattingEditor tests
 */
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { OutlineFormattingEditor } from "./OutlineFormattingEditor";
import type { OutlineFormatting } from "./types";

function createOnChange() {
  const calls: Partial<OutlineFormatting>[] = [];
  return { fn: (update: Partial<OutlineFormatting>) => { calls.push(update); }, calls };
}

describe("OutlineFormattingEditor", () => {
  const defaultValue: OutlineFormatting = {
    width: 1,
    color: "#000000",
    style: "solid",
  };

  it("renders width, style, and color controls", () => {
    const { fn: onChange } = createOnChange();
    render(<OutlineFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByText("Width")).toBeDefined();
    expect(screen.getByText("Style")).toBeDefined();
    expect(screen.getByText("Color")).toBeDefined();
  });

  it("hides width when feature disabled", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <OutlineFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showWidth: false }}
      />,
    );

    expect(container.textContent).not.toContain("Width");
  });

  it("uses custom color picker slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <OutlineFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderColorPicker={({ value: v }) => <div data-testid="custom-color">{v}</div>}
      />,
    );

    expect(screen.getByTestId("custom-color")).toBeDefined();
  });

  it("renders advanced outline slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <OutlineFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderAdvancedOutline={() => <div data-testid="advanced">Advanced</div>}
      />,
    );

    expect(screen.getByTestId("advanced")).toBeDefined();
  });
});
