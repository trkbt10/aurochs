// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FillFormattingEditor } from "./FillFormattingEditor";
import type { FillFormatting } from "../types/fill-formatting";

describe("FillFormattingEditor", () => {
  it("renders type select for none fill", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "none" };
    render(<FillFormattingEditor value={value} onChange={onChange} />);

    // Should have a select with "None" option
    expect(screen.getByDisplayValue("None")).toBeDefined();
  });

  it("renders color picker for solid fill", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "solid", color: "#FF0000" };
    render(<FillFormattingEditor value={value} onChange={onChange} />);

    expect(screen.getByDisplayValue("Solid")).toBeDefined();
  });

  it("uses custom color picker slot", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "solid", color: "#FF0000" };
    render(
      <FillFormattingEditor
        value={value}
        onChange={onChange}
        renderColorPicker={({ value: v }) => <div data-testid="custom-color">{v}</div>}
      />,
    );

    expect(screen.getByTestId("custom-color")).toBeDefined();
    expect(screen.getByTestId("custom-color").textContent).toBe("#FF0000");
  });

  it("renders advanced fill label for other type", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "other", label: "Gradient" };
    render(
      <FillFormattingEditor
        value={value}
        onChange={onChange}
        features={{ showAdvancedFill: true }}
      />,
    );

    expect(screen.getByText("Gradient")).toBeDefined();
  });

  it("renders advanced fill slot", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "other", label: "Gradient" };
    render(
      <FillFormattingEditor
        value={value}
        onChange={onChange}
        features={{ showAdvancedFill: true }}
        renderAdvancedFill={() => <div data-testid="advanced">Gradient Editor</div>}
      />,
    );

    expect(screen.getByTestId("advanced")).toBeDefined();
  });

  it("changes type from none to solid", () => {
    const onChange = vi.fn();
    const value: FillFormatting = { type: "none" };
    render(<FillFormattingEditor value={value} onChange={onChange} />);

    // Find the select and change it
    const select = screen.getByDisplayValue("None") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "solid" } });
    expect(onChange).toHaveBeenCalledWith({ type: "solid", color: "#000000" });
  });
});
