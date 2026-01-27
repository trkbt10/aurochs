/**
 * @file TableRenderer design-token unit tests
 */

// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import type { DocxTable, DocxTableProperties } from "@oxen/docx/domain/table";
import { computeTableStyles, TableRenderer } from "./TableRenderer";

function createMinimalTable(): DocxTable {
  return {
    type: "table",
    rows: [
      {
        type: "tableRow",
        cells: [
          {
            type: "tableCell",
            content: [],
          },
        ],
      },
    ],
  };
}

describe("TableRenderer (design tokens)", () => {
  it("uses design tokens for selection outline and margin", () => {
    const table = createMinimalTable();
    const { container } = render(
      <TableRenderer
        table={table}
        elementId="0"
        isSelected={true}
        onClick={vi.fn()}
      />
    );

    const div = container.firstElementChild;
    expect(div).not.toBeNull();

    const styleAttr = div?.getAttribute("style") ?? "";
    expect(styleAttr).toContain("var(--selection-primary)");
    expect(styleAttr).toContain("var(--spacing-sm)");
  });
});

describe("computeTableStyles (design tokens)", () => {
  it("uses design token fallback for border color when edge color is missing", () => {
    const properties: DocxTableProperties = {
      tblBorders: {
        top: {
          val: "single",
        },
      },
    };

    const result = computeTableStyles(properties);
    expect(result.borderTop).toBe("1px solid var(--text-inverse)");
  });
});
