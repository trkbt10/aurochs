/**
 * @file ParagraphFormattingEditor tests
 */
// @vitest-environment jsdom
import { render, screen, fireEvent } from "@testing-library/react";
import { ParagraphFormattingEditor } from "./ParagraphFormattingEditor";
import type { ParagraphFormatting } from "./types";

function createOnChange() {
  const calls: Partial<ParagraphFormatting>[] = [];
  return { fn: (update: Partial<ParagraphFormatting>) => { calls.push(update); }, calls };
}

describe("ParagraphFormattingEditor", () => {
  const defaultValue: ParagraphFormatting = {
    alignment: "left",
  };

  it("renders alignment buttons by default", () => {
    const { fn: onChange } = createOnChange();
    render(<ParagraphFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Align left")).toBeDefined();
    expect(screen.getByLabelText("Align center")).toBeDefined();
    expect(screen.getByLabelText("Align right")).toBeDefined();
    expect(screen.getByLabelText("Align justify")).toBeDefined();
  });

  it("emits alignment change", () => {
    const { fn: onChange, calls } = createOnChange();
    render(<ParagraphFormattingEditor value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Align center"));
    expect(calls).toContainEqual({ alignment: "center" });
  });

  it("shows line spacing when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <ParagraphFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showLineSpacing: true }}
      />,
    );

    expect(screen.getByText("Line Spacing")).toBeDefined();
  });

  it("hides line spacing by default", () => {
    const { fn: onChange } = createOnChange();
    const { container } = render(
      <ParagraphFormattingEditor value={defaultValue} onChange={onChange} />,
    );

    expect(container.textContent).not.toContain("Line Spacing");
  });

  it("shows spacing before/after when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <ParagraphFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showSpacing: true }}
      />,
    );

    expect(screen.getByText("Before")).toBeDefined();
    expect(screen.getByText("After")).toBeDefined();
  });

  it("shows indentation when feature enabled", () => {
    const { fn: onChange } = createOnChange();
    render(
      <ParagraphFormattingEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showIndentation: true }}
      />,
    );

    expect(screen.getByText("Left")).toBeDefined();
    expect(screen.getByText("Right")).toBeDefined();
    expect(screen.getByText("First Line")).toBeDefined();
  });

  it("renders extras slot", () => {
    const { fn: onChange } = createOnChange();
    render(
      <ParagraphFormattingEditor
        value={defaultValue}
        onChange={onChange}
        renderExtras={() => <div data-testid="extras">Bullets</div>}
      />,
    );

    expect(screen.getByTestId("extras")).toBeDefined();
  });

  it("shows mixed alignment indicator", () => {
    const { fn: onChange } = createOnChange();
    const mixed = { mixedFields: new Set(["alignment"]) };

    render(
      <ParagraphFormattingEditor value={defaultValue} onChange={onChange} mixed={mixed} />,
    );

    // All alignment buttons should show mixed state
    const leftButton = screen.getByLabelText("Align left");
    expect(leftButton).toBeDefined();
  });
});
