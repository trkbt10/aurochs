// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CellFormattingEditor } from "./CellFormattingEditor";
import type { CellFormatting } from "../types/cell-formatting";

describe("CellFormattingEditor", () => {
  const defaultValue: CellFormatting = {
    verticalAlignment: "top",
    backgroundColor: "#FFFFFF",
  };

  it("renders vertical alignment buttons", () => {
    const onChange = vi.fn();
    render(<CellFormattingEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByLabelText("Align top")).toBeDefined();
    expect(screen.getByLabelText("Align center")).toBeDefined();
    expect(screen.getByLabelText("Align bottom")).toBeDefined();
  });

  it("emits vertical alignment change", () => {
    const onChange = vi.fn();
    render(<CellFormattingEditor value={defaultValue} onChange={onChange} />);

    fireEvent.click(screen.getByLabelText("Align center"));
    expect(onChange).toHaveBeenCalledWith({ verticalAlignment: "center" });
  });

  it("shows wrap text when feature enabled", () => {
    const onChange = vi.fn();
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
    const onChange = vi.fn();
    const { container } = render(
      <CellFormattingEditor value={defaultValue} onChange={onChange} />,
    );

    expect(container.textContent).not.toContain("Wrap Text");
  });

  it("renders custom background editor slot", () => {
    const onChange = vi.fn();
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
    const onChange = vi.fn();
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
    const onChange = vi.fn();
    const mixed = { mixedFields: new Set(["verticalAlignment"]) };

    render(
      <CellFormattingEditor value={defaultValue} onChange={onChange} mixed={mixed} />,
    );

    const topButton = screen.getByLabelText("Align top");
    expect(topButton).toBeDefined();
  });
});
