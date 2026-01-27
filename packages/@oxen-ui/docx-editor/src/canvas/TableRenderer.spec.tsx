/**
 * @file TableRenderer unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxTable, DocxTableProperties } from "@oxen/docx/domain/table";
import { gridSpan } from "@oxen/ooxml/domain/table";
import { TableRenderer, computeTableStyles } from "./TableRenderer";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSimpleTable(rows: number, cols: number): DocxTable {
  return {
    type: "table",
    rows: Array.from({ length: rows }, (_, rowIndex) => ({
      type: "tableRow" as const,
      cells: Array.from({ length: cols }, (_, colIndex) => ({
        type: "tableCell" as const,
        content: [
          {
            type: "paragraph" as const,
            content: [
              {
                type: "run" as const,
                content: [{ type: "text" as const, value: `R${rowIndex}C${colIndex}` }],
              },
            ],
          },
        ],
      })),
    })),
  };
}

function createEmptyTable(): DocxTable {
  return {
    type: "table",
    rows: [],
  };
}

// =============================================================================
// computeTableStyles Tests
// =============================================================================

describe("computeTableStyles", () => {
  it("returns default styles for undefined properties", () => {
    const result = computeTableStyles(undefined);
    expect(result.borderCollapse).toBe("collapse");
    expect(result.width).toBe("100%");
  });

  it("applies table width in twips", () => {
    const properties: DocxTableProperties = {
      tblW: { type: "dxa", value: 7200 }, // 7200 twips = 360 points
    };
    const result = computeTableStyles(properties);
    expect(result.width).toBe("360pt");
  });

  it("applies table width as percentage", () => {
    const properties: DocxTableProperties = {
      tblW: { type: "pct", value: 5000 }, // 5000/50 = 100%
    };
    const result = computeTableStyles(properties);
    expect(result.width).toBe("100%");
  });

  it("applies auto width", () => {
    const properties: DocxTableProperties = {
      tblW: { type: "auto", value: 0 },
    };
    const result = computeTableStyles(properties);
    expect(result.width).toBe("auto");
  });

  it("applies left alignment", () => {
    const properties: DocxTableProperties = {
      jc: "left",
    };
    const result = computeTableStyles(properties);
    expect(result.marginRight).toBe("auto");
  });

  it("applies center alignment", () => {
    const properties: DocxTableProperties = {
      jc: "center",
    };
    const result = computeTableStyles(properties);
    expect(result.marginLeft).toBe("auto");
    expect(result.marginRight).toBe("auto");
  });

  it("applies right alignment", () => {
    const properties: DocxTableProperties = {
      jc: "right",
    };
    const result = computeTableStyles(properties);
    expect(result.marginLeft).toBe("auto");
  });

  it("applies table indentation", () => {
    const properties: DocxTableProperties = {
      tblInd: { type: "dxa", value: 720 }, // 720 twips = 36 points
    };
    const result = computeTableStyles(properties);
    expect(result.marginLeft).toBe("36pt");
  });

  it("applies background shading", () => {
    const properties: DocxTableProperties = {
      shd: { fill: "E0E0E0" },
    };
    const result = computeTableStyles(properties);
    expect(result.backgroundColor).toBe("#E0E0E0");
  });

  it("applies fixed table layout", () => {
    const properties: DocxTableProperties = {
      tblLayout: "fixed",
    };
    const result = computeTableStyles(properties);
    expect(result.tableLayout).toBe("fixed");
  });

  it("applies bidirectional direction", () => {
    const properties: DocxTableProperties = {
      bidiVisual: true,
    };
    const result = computeTableStyles(properties);
    expect(result.direction).toBe("rtl");
  });
});

// =============================================================================
// TableRenderer Tests
// =============================================================================

describe("TableRenderer", () => {
  const defaultProps = {
    elementId: "0",
    isSelected: false,
    onClick: vi.fn(),
  };

  it("renders table with cells", () => {
    const table = createSimpleTable(2, 3);
    render(<TableRenderer table={table} {...defaultProps} />);

    expect(screen.getByText("R0C0")).toBeDefined();
    expect(screen.getByText("R0C2")).toBeDefined();
    expect(screen.getByText("R1C1")).toBeDefined();
  });

  it("renders empty table", () => {
    const table = createEmptyTable();
    const { container } = render(<TableRenderer table={table} {...defaultProps} />);

    const tableEl = container.querySelector("table");
    expect(tableEl).not.toBeNull();
    const tbody = container.querySelector("tbody");
    expect(tbody?.children.length).toBe(0);
  });

  it("calls onClick when table is clicked", () => {
    const onClick = vi.fn();
    const table = createSimpleTable(1, 1);
    const { container } = render(
      <TableRenderer table={table} {...defaultProps} onClick={onClick} />
    );

    const div = container.firstChild as HTMLElement;
    fireEvent.click(div);
    expect(onClick).toHaveBeenCalled();
  });

  it("calls onCellClick when cell is clicked", () => {
    const onCellClick = vi.fn();
    const table = createSimpleTable(2, 2);
    const { container } = render(
      <TableRenderer table={table} {...defaultProps} onCellClick={onCellClick} />
    );

    const cells = container.querySelectorAll("td");
    if (cells[3]) {
      fireEvent.click(cells[3]);
    }
    expect(onCellClick).toHaveBeenCalled();
  });

  it("sets data-element-id attribute", () => {
    const table = createSimpleTable(1, 1);
    const { container } = render(
      <TableRenderer table={table} {...defaultProps} elementId="test-table" />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.getAttribute("data-element-id")).toBe("test-table");
  });

  it("applies selection styling", () => {
    const table = createSimpleTable(1, 1);
    const { container } = render(
      <TableRenderer table={table} {...defaultProps} isSelected={true} />
    );

    const div = container.firstChild as HTMLElement;
    expect(div.style.outline).toContain("2px solid");
  });

  it("handles table with colspan cells", () => {
    const table: DocxTable = {
      type: "table",
      rows: [
        {
          type: "tableRow",
          cells: [
            {
              type: "tableCell",
              properties: { gridSpan: gridSpan(2) },
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "run",
                      content: [{ type: "text", value: "Merged" }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    };
    const { container } = render(<TableRenderer table={table} {...defaultProps} />);

    const td = container.querySelector("td");
    expect(td?.getAttribute("colspan")).toBe("2");
  });

  it("handles hidden rows", () => {
    const table: DocxTable = {
      type: "table",
      rows: [
        {
          type: "tableRow",
          properties: { hidden: true },
          cells: [
            {
              type: "tableCell",
              content: [],
            },
          ],
        },
      ],
    };
    const { container } = render(<TableRenderer table={table} {...defaultProps} />);

    const tr = container.querySelector("tr");
    expect(tr?.style.display).toBe("none");
  });

  it("renders multiple rows correctly", () => {
    const table = createSimpleTable(3, 2);
    const { container } = render(<TableRenderer table={table} {...defaultProps} />);

    const rows = container.querySelectorAll("tr");
    expect(rows.length).toBe(3);

    const cells = container.querySelectorAll("td");
    expect(cells.length).toBe(6);
  });
});
