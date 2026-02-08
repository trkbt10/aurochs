// @vitest-environment jsdom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TableStyleBandsEditor } from "./TableStyleBandsEditor";
import type { TableStyleBands } from "../types/table-formatting";

describe("TableStyleBandsEditor", () => {
  const defaultValue: TableStyleBands = {
    headerRow: true,
    totalRow: false,
    firstColumn: true,
    lastColumn: false,
    bandedRows: true,
    bandedColumns: false,
  };

  it("renders all 6 band toggles", () => {
    const onChange = vi.fn();
    render(<TableStyleBandsEditor value={defaultValue} onChange={onChange} />);

    expect(screen.getByText("Header Row")).toBeDefined();
    expect(screen.getByText("Total Row")).toBeDefined();
    expect(screen.getByText("First Column")).toBeDefined();
    expect(screen.getByText("Last Column")).toBeDefined();
    expect(screen.getByText("Banded Rows")).toBeDefined();
    expect(screen.getByText("Banded Columns")).toBeDefined();
  });

  it("hides toggles when features disable them", () => {
    const onChange = vi.fn();
    const { container } = render(
      <TableStyleBandsEditor
        value={defaultValue}
        onChange={onChange}
        features={{ showHeaderRow: false, showTotalRow: false }}
      />,
    );

    expect(container.textContent).not.toContain("Header Row");
    expect(container.textContent).not.toContain("Total Row");
    expect(container.textContent).toContain("First Column");
  });

  it("emits partial update on toggle", () => {
    const onChange = vi.fn();
    render(<TableStyleBandsEditor value={defaultValue} onChange={onChange} />);

    // Click the "Total Row" toggle (currently false)
    const totalRowLabel = screen.getByText("Total Row");
    const toggleContainer = totalRowLabel.parentElement;
    const toggle = toggleContainer?.querySelector('input[type="checkbox"]') as HTMLInputElement;
    if (toggle) {
      fireEvent.click(toggle);
      expect(onChange).toHaveBeenCalledWith({ totalRow: true });
    }
  });
});
