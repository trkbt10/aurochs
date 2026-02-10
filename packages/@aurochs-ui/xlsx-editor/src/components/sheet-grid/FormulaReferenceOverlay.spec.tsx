/**
 * @vitest-environment jsdom
 */
/**
 * @file FormulaReferenceOverlay tests
 */

import { render, screen } from "@testing-library/react";
import { colIdx, rowIdx } from "@aurochs-office/xlsx/domain/types";
import type { FormulaReferenceToken } from "../../formula-edit/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { FormulaReferenceOverlay } from "./FormulaReferenceOverlay";

const layout = createSheetLayout(
  { dateSystem: "1900", name: "Sheet1", sheetId: 1, state: "visible", rows: [], xmlPath: "" },
  { rowCount: 20, colCount: 10, defaultRowHeightPx: 20, defaultColWidthPx: 60 },
);

describe("FormulaReferenceOverlay", () => {
  it("renders nothing when references array is empty", () => {
    const { container } = render(
      <FormulaReferenceOverlay
        references={[]}
        activeSheetName="Sheet1"
        editingSheetName="Sheet1"
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        viewportWidth={600}
        viewportHeight={400}
      />,
    );
    expect(container.querySelectorAll("[data-testid='xlsx-formula-ref-highlight']")).toHaveLength(0);
  });

  it("renders highlight divs for same-sheet references", () => {
    const refs: FormulaReferenceToken[] = [
      {
        range: {
          start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        },
        sheetName: undefined,
        startOffset: 1,
        endOffset: 3,
        colorIndex: 0,
      },
      {
        range: {
          start: { col: colIdx(2), row: rowIdx(2), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(3), row: rowIdx(3), colAbsolute: false, rowAbsolute: false },
        },
        sheetName: undefined,
        startOffset: 4,
        endOffset: 9,
        colorIndex: 1,
      },
    ];

    render(
      <FormulaReferenceOverlay
        references={refs}
        activeSheetName="Sheet1"
        editingSheetName="Sheet1"
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        viewportWidth={600}
        viewportHeight={400}
      />,
    );

    const highlights = screen.getAllByTestId("xlsx-formula-ref-highlight");
    expect(highlights).toHaveLength(2);
  });

  it("skips references on other sheets", () => {
    const refs: FormulaReferenceToken[] = [
      {
        range: {
          start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        },
        sheetName: "Sheet2",
        startOffset: 1,
        endOffset: 10,
        colorIndex: 0,
      },
    ];

    const { container } = render(
      <FormulaReferenceOverlay
        references={refs}
        activeSheetName="Sheet1"
        editingSheetName="Sheet1"
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        viewportWidth={600}
        viewportHeight={400}
      />,
    );

    expect(container.querySelectorAll("[data-testid='xlsx-formula-ref-highlight']")).toHaveLength(0);
  });

  it("assigns correct border colors from colorIndex", () => {
    const refs: FormulaReferenceToken[] = [
      {
        range: {
          start: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
          end: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
        },
        sheetName: undefined,
        startOffset: 1,
        endOffset: 3,
        colorIndex: 0,
      },
    ];

    render(
      <FormulaReferenceOverlay
        references={refs}
        activeSheetName="Sheet1"
        editingSheetName="Sheet1"
        layout={layout}
        scrollTop={0}
        scrollLeft={0}
        viewportWidth={600}
        viewportHeight={400}
      />,
    );

    const highlight = screen.getByTestId("xlsx-formula-ref-highlight");
    // colorIndex 0 → "#4472C4"
    expect(highlight.style.border).toContain("rgb(68, 114, 196)");
  });
});
