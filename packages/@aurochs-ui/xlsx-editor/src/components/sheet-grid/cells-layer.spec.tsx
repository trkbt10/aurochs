/**
 * @file XlsxSheetGridCellsLayer tests
 */

// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import type { XlsxWorkbook, XlsxWorksheet } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@aurochs-office/xlsx/domain/style/types";
import { colIdx, rowIdx, styleId, fontId, fillId, borderId, numFmtId } from "@aurochs-office/xlsx/domain/types";
import { createSheetLayout } from "../../selectors/sheet-layout";
import { createFormulaEvaluator } from "@aurochs-office/xlsx/formula/evaluator";
import { XlsxSheetGridCellsLayer } from "./cells-layer";

describe("xlsx-editor/components/sheet-grid/cells-layer", () => {
  it("renders cell text in the visible range", () => {
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [
            {
              address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              value: { type: "string", value: "Hello" },
            },
          ],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 50,
    });

    render(
      <div style={{ position: "relative", width: 200, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
        />
      </div>,
    );

    expect(screen.getByText("Hello")).toBeDefined();
  });

  it("renders very long text via canvas without inserting the full string into the DOM", () => {
    const long = "A".repeat(25_000);
    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [
            {
              address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              value: { type: "string", value: long },
            },
          ],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles: createDefaultStyleSheet(),
      sharedStrings: [],
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 50,
    });

    render(
      <div style={{ position: "relative", width: 200, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
        />
      </div>,
    );

    expect(screen.getByTestId("xlsx-cell-canvas-text")).toBeDefined();
    expect(screen.queryByText(long)).toBeNull();
  });

  it("renders header cell with theme fill as grey background, not black", () => {
    const base = createDefaultStyleSheet();
    const themeFont = { name: "Yu Gothic", size: 11, color: { type: "theme" as const, theme: 1 }, family: 2, scheme: "minor" as const };
    const themeFill = {
      type: "pattern" as const,
      pattern: {
        patternType: "solid",
        fgColor: { type: "theme" as const, theme: 0, tint: -0.1499984740745262 },
        bgColor: { type: "indexed" as const, index: 64 },
      },
    };
    const styles = {
      ...base,
      fonts: [...base.fonts, themeFont],
      fills: [...base.fills, themeFill],
      cellXfs: [
        ...base.cellXfs,
        {
          numFmtId: numFmtId(0),
          fontId: fontId(base.fonts.length),
          fillId: fillId(base.fills.length),
          borderId: borderId(0),
          applyFill: true,
          alignment: { wrapText: true },
          applyAlignment: true,
        },
      ],
    };
    const headerStyleId = styleId(styles.cellXfs.length - 1);

    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [
            {
              address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              value: { type: "string", value: "優先度" },
              styleId: headerStyleId,
            },
          ],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const colorScheme = {
      lt1: "FFFFFF", dk1: "000000", lt2: "E7E6E6", dk2: "44546A",
      accent1: "5B9BD5", accent2: "ED7D31", accent3: "A5A5A5", accent4: "FFC000",
      accent5: "4472C4", accent6: "70AD47", hlink: "0563C1", folHlink: "954F72",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles,
      sharedStrings: [],
      theme: { colorScheme, fontScheme: { majorFont: {}, minorFont: {} }, xmlPath: "xl/theme/theme1.xml" },
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 80,
    });

    render(
      <div style={{ position: "relative", width: 400, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
          colorScheme={workbook.theme?.colorScheme}
        />
      </div>,
    );

    const cell = screen.getByText("優先度");
    const cellStyle = cell.style;
    // Background must be grey (#d9d9d9), NOT black (#000000 / rgb(0,0,0))
    expect(cellStyle.backgroundColor).toBe("rgb(217, 217, 217)"); // #d9d9d9 in rgb
    // Font color must be black
    expect(cellStyle.color).toBe("rgb(0, 0, 0)");
  });

  it("falls back to ECMA-376 default theme colors when colorScheme is missing", () => {
    const base = createDefaultStyleSheet();
    const themeFill = {
      type: "pattern" as const,
      pattern: {
        patternType: "solid",
        fgColor: { type: "theme" as const, theme: 0, tint: -0.15 },
        bgColor: { type: "indexed" as const, index: 64 },
      },
    };
    const styles = {
      ...base,
      fills: [...base.fills, themeFill],
      cellXfs: [
        ...base.cellXfs,
        {
          numFmtId: numFmtId(0),
          fontId: fontId(0),
          fillId: fillId(base.fills.length),
          borderId: borderId(0),
          applyFill: true,
        },
      ],
    };

    const sheet: XlsxWorksheet = {
      dateSystem: "1900",
      name: "Sheet1",
      sheetId: 1,
      state: "visible",
      rows: [
        {
          rowNumber: rowIdx(1),
          cells: [
            {
              address: { col: colIdx(1), row: rowIdx(1), colAbsolute: false, rowAbsolute: false },
              value: { type: "string", value: "Test" },
              styleId: styleId(styles.cellXfs.length - 1),
            },
          ],
        },
      ],
      xmlPath: "xl/worksheets/sheet1.xml",
    };
    const workbook: XlsxWorkbook = {
      dateSystem: "1900",
      sheets: [sheet],
      styles,
      sharedStrings: [],
      // NO theme — colorScheme falls back to ECMA-376 default Office theme
    };
    const formulaEvaluator = createFormulaEvaluator(workbook);
    const layout = createSheetLayout(sheet, {
      rowCount: 10,
      colCount: 10,
      defaultRowHeightPx: 20,
      defaultColWidthPx: 80,
    });

    render(
      <div style={{ position: "relative", width: 400, height: 100 }}>
        <XlsxSheetGridCellsLayer
          sheetIndex={0}
          sheet={sheet}
          styles={workbook.styles}
          layout={layout}
          rowRange={{ start: 0, end: 0 }}
          colRange={{ start: 0, end: 0 }}
          scrollTop={0}
          scrollLeft={0}
          normalizedMerges={[]}
          formulaEvaluator={formulaEvaluator}
          // colorScheme intentionally NOT passed — default theme is used
        />
      </div>,
    );

    const cell = screen.getByText("Test");
    // Must NOT be black — theme=0 (lt1) with tint=-0.15 → grey even without explicit colorScheme
    expect(cell.style.backgroundColor).not.toBe("rgb(0, 0, 0)");
    expect(cell.style.backgroundColor).not.toBe("");
  });
});
