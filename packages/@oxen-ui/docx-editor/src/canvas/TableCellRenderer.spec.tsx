/**
 * @file TableCellRenderer unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { DocxTableCell, DocxTableCellProperties } from "@oxen/docx/domain/table";
import { gridSpan } from "@oxen/ooxml/domain/table";
import { TableCellRenderer, computeCellStyles } from "./TableCellRenderer";

// =============================================================================
// Test Fixtures
// =============================================================================

function createSimpleCell(text: string): DocxTableCell {
  return {
    type: "tableCell",
    content: [
      {
        type: "paragraph",
        content: [
          {
            type: "run",
            content: [{ type: "text", value: text }],
          },
        ],
      },
    ],
  };
}

function createEmptyCell(): DocxTableCell {
  return {
    type: "tableCell",
    content: [],
  };
}

// Helper to render cell inside table structure
function renderCell(cell: DocxTableCell, props?: Partial<Parameters<typeof TableCellRenderer>[0]>) {
  return render(
    <table>
      <tbody>
        <tr>
          <TableCellRenderer
            cell={cell}
            rowIndex={0}
            colIndex={0}
            isSelected={false}
            onClick={vi.fn()}
            {...props}
          />
        </tr>
      </tbody>
    </table>
  );
}

// =============================================================================
// computeCellStyles Tests
// =============================================================================

describe("computeCellStyles", () => {
  it("returns default styles for undefined properties", () => {
    const result = computeCellStyles(undefined);
    expect(result.padding).toBe("var(--spacing-xs) var(--spacing-sm)");
    expect(result.verticalAlign).toBe("top");
  });

  it("applies cell width in twips", () => {
    const properties: DocxTableCellProperties = {
      tcW: { type: "dxa", value: 2880 }, // 2880 twips = 144 points
    };
    const result = computeCellStyles(properties);
    expect(result.width).toBe("144pt");
  });

  it("applies cell width as percentage", () => {
    const properties: DocxTableCellProperties = {
      tcW: { type: "pct", value: 2500 }, // 2500/50 = 50%
    };
    const result = computeCellStyles(properties);
    expect(result.width).toBe("50%");
  });

  it("applies vertical alignment top", () => {
    const properties: DocxTableCellProperties = {
      vAlign: "top",
    };
    const result = computeCellStyles(properties);
    expect(result.verticalAlign).toBe("top");
  });

  it("applies vertical alignment center", () => {
    const properties: DocxTableCellProperties = {
      vAlign: "center",
    };
    const result = computeCellStyles(properties);
    expect(result.verticalAlign).toBe("middle");
  });

  it("applies vertical alignment bottom", () => {
    const properties: DocxTableCellProperties = {
      vAlign: "bottom",
    };
    const result = computeCellStyles(properties);
    expect(result.verticalAlign).toBe("bottom");
  });

  it("applies background shading", () => {
    const properties: DocxTableCellProperties = {
      shd: { fill: "FFFF00" },
    };
    const result = computeCellStyles(properties);
    expect(result.backgroundColor).toBe("#FFFF00");
  });

  it("applies no wrap", () => {
    const properties: DocxTableCellProperties = {
      noWrap: true,
    };
    const result = computeCellStyles(properties);
    expect(result.whiteSpace).toBe("nowrap");
  });

  it("uses design token border color when border color is missing", () => {
    const properties: DocxTableCellProperties = {
      tcBorders: {
        top: {
          val: "single",
        },
      },
    };
    const result = computeCellStyles(properties);
    expect(result.borderTop).toBe("1px solid var(--text-inverse)");
  });
});

// =============================================================================
// TableCellRenderer Tests
// =============================================================================

describe("TableCellRenderer", () => {
  it("renders cell with text content", () => {
    const cell = createSimpleCell("Hello");
    renderCell(cell);
    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders empty cell with non-breaking space", () => {
    const cell = createEmptyCell();
    const { container } = renderCell(cell);
    const td = container.querySelector("td");
    expect(td).not.toBeNull();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    const cell = createSimpleCell("Clickable");
    const { container } = renderCell(cell, { onClick });

    const td = container.querySelector("td");
    if (td) {
      fireEvent.click(td);
    }
    expect(onClick).toHaveBeenCalled();
  });

  it("applies colspan from gridSpan", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      properties: { gridSpan: gridSpan(3) },
      content: [],
    };
    const { container } = renderCell(cell);

    const td = container.querySelector("td");
    expect(td?.getAttribute("colspan")).toBe("3");
  });

  it("renders null for vMerge continue cells", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      properties: { vMerge: "continue" },
      content: [],
    };
    const { container } = renderCell(cell);

    const td = container.querySelector("td");
    expect(td).toBeNull();
  });

  it("sets data attributes for row and col", () => {
    const cell = createSimpleCell("Test");
    const { container } = render(
      <table>
        <tbody>
          <tr>
            <TableCellRenderer
              cell={cell}
              rowIndex={2}
              colIndex={3}
              isSelected={false}
              onClick={vi.fn()}
            />
          </tr>
        </tbody>
      </table>
    );

    const td = container.querySelector("td");
    expect(td?.getAttribute("data-row")).toBe("2");
    expect(td?.getAttribute("data-col")).toBe("3");
  });

  it("applies selection styling", () => {
    const cell = createSimpleCell("Selected");
    const { container } = renderCell(cell, { isSelected: true });

    const td = container.querySelector("td") as HTMLElement;
    expect(td.getAttribute("style") ?? "").toContain("outline: 2px solid var(--selection-primary)");
    expect(td.getAttribute("style") ?? "").toContain(
      "background-color: color-mix(in srgb, var(--selection-primary) 5%, transparent)"
    );
  });

  it("renders multiple paragraphs", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "First" }],
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "run",
              content: [{ type: "text", value: "Second" }],
            },
          ],
        },
      ],
    };
    renderCell(cell);

    expect(screen.getByText("First")).toBeDefined();
    expect(screen.getByText("Second")).toBeDefined();
  });

  it("renders nested table placeholder", () => {
    const cell: DocxTableCell = {
      type: "tableCell",
      content: [
        {
          type: "table",
          rows: [],
        },
      ],
    };
    renderCell(cell);

    const placeholder = screen.getByText("[Nested table]");
    expect(placeholder).toBeDefined();
    expect(placeholder.getAttribute("style") ?? "").toContain("border: 1px dashed var(--border-strong)");
    expect(placeholder.getAttribute("style") ?? "").toContain("padding: var(--spacing-xs)");
    expect(placeholder.getAttribute("style") ?? "").toContain("color: var(--text-secondary)");
    expect(placeholder.getAttribute("style") ?? "").toContain("font-size: var(--font-size-md)");
  });
});
