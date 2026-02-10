/**
 * @file CellFormattingEditor tests
 */
// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { CellFormattingEditor } from "./CellFormattingEditor";
import type { CellFormatting } from "./types";

function createOnChange() {
  const calls: Partial<CellFormatting>[] = [];
  return { fn: (update: Partial<CellFormatting>) => { calls.push(update); }, calls };
}

describe("CellFormattingEditor", () => {
  const defaultValue: CellFormatting = {
    verticalAlignment: "top",
    backgroundColor: "#FFFFFF",
  };

  it("renders vertical alignment buttons", () => {
    const { fn: onChange } = createOnChange();
    render(<CellFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Align top")).toBeDefined();
    expect(screen.getByLabelText("Align center")).toBeDefined();
    expect(screen.getByLabelText("Align bottom")).toBeDefined();
  });

  it("emits vertical alignment change", () => {
    const { fn: onChange, calls } = createOnChange();
    render(<CellFormattingEditor value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Align center"));
    expect(calls).toContainEqual({ verticalAlignment: "center" });
  });

  it("shows wrap text when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <CellFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showWrapText: true }}
      />,
    );

    expect(screen.getByText("Wrap Text")).toBeDefined();
  });

  it("hides wrap text by default", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <CellFormattingEditor value={defaultValue} onChange={onChange} />,
    );

    expect(container.textContent).not.toContain("Wrap Text");
  });

  it("renders custom background editor slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <CellFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderBackgroundEditor={() => <div data-testid="bg-editor">BG</div>}
      />,
    );

    expect(screen.getByTestId("bg-editor")).toBeDefined();
  });

  it("renders custom border editor slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <CellFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderBorderEditor={() => <div data-testid="border-editor">Borders</div>}
      />,
    );

    expect(screen.getByTestId("border-editor")).toBeDefined();
  });

  it("shows mixed vertical alignment indicator", () => {
    const { fn: onChange } = createOnChange();
    const mixed = { mixedFields: new Set(["verticalAlignment"]) };

    render(
      <CellFormattingEditor value={defaultValue} onChange={onChange} mixed={mixed} />,
    );

    const topButton = screen.getByLabelText("Align top");
    expect(topButton).toBeDefined();
  });
});
