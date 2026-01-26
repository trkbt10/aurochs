/**
 * @file XLSX Editor Workbook Page
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { XlsxWorkbookEditor } from "@lib/xlsx-editor";
import type { XlsxWorkbook } from "@lib/xlsx/domain/workbook";
import { createDefaultStyleSheet } from "@lib/xlsx/domain/style/types";
import { borderId, colIdx, fillId, fontId, numFmtId, rowIdx, styleId, type ColIndex, type RowIndex } from "@lib/xlsx/domain/types";
import type { CellAddress } from "@lib/xlsx/domain/cell/address";
import type { Formula } from "@lib/xlsx/domain/cell/formula";
import { Button, Input } from "@lib/office-editor-components/primitives";
import { parseSpreadsheetFile, SpreadsheetParseError } from "@lib/spreadsheet";
import { exportXlsx } from "@lib/xlsx/exporter";

const controlsStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "12px",
};

const editorFrameStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  border: "1px solid var(--border-subtle)",
  borderRadius: "8px",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
};

async function parseWorkbookFromFile(file: File): Promise<XlsxWorkbook> {
  const data = await file.arrayBuffer();
  return parseSpreadsheetFile(data);
}

function downloadXlsx(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return { col, row, colAbsolute: false, rowAbsolute: false };
}

function createNormalFormula(expression: string): Formula {
  return { type: "normal", expression };
}

function createTestWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const redBoldFontIndex = styles.fonts.length;
  const yellowFillIndex = styles.fills.length;
  const thinBorderIndex = styles.borders.length;

  const cellXfs = [
    ...styles.cellXfs,
    // styleId(1): yellow fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIndex), borderId: borderId(0), applyFill: true },
    // styleId(2): red + bold font
    { numFmtId: numFmtId(0), fontId: fontId(redBoldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
    // styleId(3): thin border
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBorderIndex), applyBorder: true },
    // styleId(4): wrap + alignment
    {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { wrapText: true, horizontal: "left", vertical: "top" },
      applyAlignment: true,
    },
  ];

  return {
    sheets: [
      {
        name: "Sheet1",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 10 }, styleId: styleId(1) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 20 }, styleId: styleId(2) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "empty" }, formula: createNormalFormula("A1+B1"), styleId: styleId(3) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula('IF(A2>0,"OK","NG")') },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula("SUM(A1:B1)") },
            ],
          },
          {
            rowNumber: rowIdx(3),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "empty" }, formula: createNormalFormula("SUM(A3:A4)") },
            ],
          },
          {
            rowNumber: rowIdx(4),
            cells: [{ address: createAddress(colIdx(1), rowIdx(4)), value: { type: "number", value: 2 } }],
          },
          {
            rowNumber: rowIdx(5),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(5)), value: { type: "empty" }, formula: createNormalFormula("Sheet2!A1+1") },
              { address: createAddress(colIdx(2), rowIdx(5)), value: { type: "empty" }, formula: createNormalFormula("NoSuchSheet!A1") },
              {
                address: createAddress(colIdx(3), rowIdx(5)),
                value: { type: "string", value: "Long text wraps onto multiple lines if wrapText is applied." },
                styleId: styleId(4),
              },
            ],
          },
          {
            rowNumber: rowIdx(6),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(6)), value: { type: "string", value: "IFERROR(1/0,123)" } },
              { address: createAddress(colIdx(2), rowIdx(6)), value: { type: "empty" }, formula: createNormalFormula("IFERROR(1/0,123)") },
              { address: createAddress(colIdx(3), rowIdx(6)), value: { type: "empty" }, formula: createNormalFormula('VLOOKUP(2,{1,"A";2,"B";3,"C"},2,FALSE)') },
            ],
          },
          {
            rowNumber: rowIdx(7),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(7)), value: { type: "string", value: "OFFSET/INDIRECT demo" } },
              { address: createAddress(colIdx(2), rowIdx(7)), value: { type: "empty" }, formula: createNormalFormula("SUM(OFFSET(A8,0,0,2,1))") },
              { address: createAddress(colIdx(3), rowIdx(7)), value: { type: "empty" }, formula: createNormalFormula('INDIRECT("A8")+1') },
            ],
          },
          {
            rowNumber: rowIdx(8),
            cells: [{ address: createAddress(colIdx(1), rowIdx(8)), value: { type: "number", value: 20 } }],
          },
          {
            rowNumber: rowIdx(9),
            cells: [{ address: createAddress(colIdx(1), rowIdx(9)), value: { type: "number", value: 30 } }],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
        name: "Sheet2",
        sheetId: 2,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [{ address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 41 } }],
          },
        ],
        xmlPath: "xl/worksheets/sheet2.xml",
      },
    ],
    styles: {
      ...styles,
      fonts: [
        ...styles.fonts,
        { name: "Calibri", size: 11, scheme: "minor", bold: true, color: { type: "rgb", value: "FFFF0000" } },
      ],
      fills: [
        ...styles.fills,
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFFFFF00" } } },
      ],
      borders: [
        ...styles.borders,
        {
          left: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          right: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          top: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          bottom: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        },
      ],
      cellXfs,
    },
    sharedStrings: [],
  };
}

function createPatternWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const redBoldFontIndex = styles.fonts.length;
  const blueItalicFontIndex = styles.fonts.length + 1;
  const themeAccentFontIndex = styles.fonts.length + 2;
  const yellowFillIndex = styles.fills.length;
  const grayFillIndex = styles.fills.length + 1;
  const themeAccentFillIndex = styles.fills.length + 2;
  const indexedFillIndex = styles.fills.length + 3;
  const thinBlackBorderIndex = styles.borders.length;
  const dashedBlueBorderIndex = styles.borders.length + 1;
  const doubleRedBorderIndex = styles.borders.length + 2;

  const cellXfs = [
    ...styles.cellXfs,
    // styleId(1): yellow fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIndex), borderId: borderId(0), applyFill: true },
    // styleId(2): red + bold font
    { numFmtId: numFmtId(0), fontId: fontId(redBoldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
    // styleId(3): thin black border
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBlackBorderIndex), applyBorder: true },
    // styleId(4): wrap + alignment (top-left)
    {
      numFmtId: numFmtId(0),
      fontId: fontId(0),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { wrapText: true, horizontal: "left", vertical: "top" },
      applyAlignment: true,
    },
    // styleId(5): dashed blue border
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(dashedBlueBorderIndex), applyBorder: true },
    // styleId(6): double red border + gray fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(grayFillIndex), borderId: borderId(doubleRedBorderIndex), applyFill: true, applyBorder: true },
    // styleId(7): blue italic font + center alignment
    {
      numFmtId: numFmtId(0),
      fontId: fontId(blueItalicFontIndex),
      fillId: fillId(0),
      borderId: borderId(0),
      alignment: { horizontal: "center", vertical: "center" },
      applyFont: true,
      applyAlignment: true,
    },
    // styleId(8): theme fill (accent1 tint)
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(themeAccentFillIndex), borderId: borderId(0), applyFill: true },
    // styleId(9): indexed fill
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(indexedFillIndex), borderId: borderId(0), applyFill: true },
    // styleId(10): date (custom) yyyy-mm-dd
    { numFmtId: numFmtId(164), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true },
    // styleId(11): percent 0.00%
    { numFmtId: numFmtId(10), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true },
    // styleId(12): thousands #,##0.00
    { numFmtId: numFmtId(4), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true },
    // styleId(13): scientific 0.00E+00
    { numFmtId: numFmtId(11), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true },
    // styleId(14): datetime m/d/yy h:mm
    { numFmtId: numFmtId(22), fontId: fontId(0), fillId: fillId(0), borderId: borderId(0), applyNumberFormat: true },
    // styleId(15): theme font color
    { numFmtId: numFmtId(0), fontId: fontId(themeAccentFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
  ];

  return {
    sheets: [
      {
        name: "CellTypes",
        sheetId: 1,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "string" }, styleId: styleId(1) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 1234 }, styleId: styleId(2) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "boolean", value: true } },
              { address: createAddress(colIdx(4), rowIdx(1)), value: { type: "error", value: "#DIV/0!" } },
              { address: createAddress(colIdx(5), rowIdx(1)), value: { type: "date", value: new Date("2020-01-02T03:04:05.000Z") } },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
        name: "Styles",
        sheetId: 2,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "yellow fill" }, styleId: styleId(1) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "string", value: "red bold" }, styleId: styleId(2) },
              {
                address: createAddress(colIdx(3), rowIdx(1)),
                value: { type: "string", value: "wrapText + top-left alignment.\nSecond line." },
                styleId: styleId(4),
              },
              { address: createAddress(colIdx(4), rowIdx(1)), value: { type: "string", value: "center + italic" }, styleId: styleId(7) },
              { address: createAddress(colIdx(5), rowIdx(1)), value: { type: "string", value: "theme fill" }, styleId: styleId(8) },
              { address: createAddress(colIdx(6), rowIdx(1)), value: { type: "string", value: "indexed fill" }, styleId: styleId(9) },
              { address: createAddress(colIdx(7), rowIdx(1)), value: { type: "string", value: "theme font" }, styleId: styleId(15) },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet2.xml",
      },
      {
        name: "Borders",
        sheetId: 3,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "thin" }, styleId: styleId(3) },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "string", value: "dashed" }, styleId: styleId(5) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "string", value: "double+fill" }, styleId: styleId(6) },
              { address: createAddress(colIdx(4), rowIdx(1)), value: { type: "empty" }, styleId: styleId(6) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "empty" }, styleId: styleId(3) },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "empty" }, styleId: styleId(5) },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "empty" }, styleId: styleId(6) },
              { address: createAddress(colIdx(4), rowIdx(2)), value: { type: "empty" }, styleId: styleId(6) },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet3.xml",
      },
      {
        name: "Merges",
        sheetId: 4,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        columns: [
          { min: colIdx(1), max: colIdx(1), width: 18 },
          { min: colIdx(2), max: colIdx(2), width: 18 },
          { min: colIdx(3), max: colIdx(3), width: 18 },
        ],
        rows: [
          {
            rowNumber: rowIdx(1),
            height: 30,
            customHeight: true,
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "A1:B2 merged" }, styleId: styleId(6) },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "string", value: "C1" }, styleId: styleId(3) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "string", value: "C2" }, styleId: styleId(3) },
            ],
          },
        ],
        mergeCells: [
          { start: createAddress(colIdx(1), rowIdx(1)), end: createAddress(colIdx(2), rowIdx(2)) },
        ],
        xmlPath: "xl/worksheets/sheet4.xml",
      },
      {
        name: "Formulas",
        sheetId: 5,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 10 } },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 20 } },
              { address: createAddress(colIdx(3), rowIdx(1)), value: { type: "empty" }, formula: createNormalFormula("A1+B1"), styleId: styleId(3) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "number", value: 1 } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula('IF(A2>0,"OK","NG")') },
              { address: createAddress(colIdx(3), rowIdx(2)), value: { type: "empty" }, formula: createNormalFormula("SUM(A1:B1)") },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet5.xml",
      },
      {
        name: "NumberFormats",
        sheetId: 6,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(1)), value: { type: "string", value: "yyyy-mm-dd (custom 164)" } },
              { address: createAddress(colIdx(2), rowIdx(1)), value: { type: "number", value: 1 }, styleId: styleId(10) },
            ],
          },
          {
            rowNumber: rowIdx(2),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(2)), value: { type: "string", value: "0.00%" } },
              { address: createAddress(colIdx(2), rowIdx(2)), value: { type: "number", value: 0.1234 }, styleId: styleId(11) },
            ],
          },
          {
            rowNumber: rowIdx(3),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "string", value: "#,##0.00" } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "number", value: 1234.56 }, styleId: styleId(12) },
            ],
          },
          {
            rowNumber: rowIdx(4),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(4)), value: { type: "string", value: "0.00E+00" } },
              { address: createAddress(colIdx(2), rowIdx(4)), value: { type: "number", value: 1200 }, styleId: styleId(13) },
            ],
          },
          {
            rowNumber: rowIdx(5),
            cells: [
              { address: createAddress(colIdx(1), rowIdx(5)), value: { type: "string", value: "m/d/yy h:mm" } },
              { address: createAddress(colIdx(2), rowIdx(5)), value: { type: "number", value: 1 + (3 * 60 + 4) / (24 * 60) }, styleId: styleId(14) },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet6.xml",
      },
    ],
    styles: {
      ...styles,
      fonts: [
        ...styles.fonts,
        { name: "Calibri", size: 11, scheme: "minor", bold: true, color: { type: "rgb", value: "FFFF0000" } },
        { name: "Calibri", size: 11, scheme: "minor", italic: true, color: { type: "rgb", value: "FF0000FF" } },
        { name: "Calibri", size: 11, scheme: "minor", color: { type: "theme", theme: 4, tint: -0.25 } },
      ],
      fills: [
        ...styles.fills,
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFFFFF00" } } },
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "rgb", value: "FFDDDDDD" } } },
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "theme", theme: 4, tint: 0.5 } } },
        { type: "pattern", pattern: { patternType: "solid", fgColor: { type: "indexed", index: 27 } } },
      ],
      borders: [
        ...styles.borders,
        {
          left: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          right: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          top: { style: "thin", color: { type: "rgb", value: "FF000000" } },
          bottom: { style: "thin", color: { type: "rgb", value: "FF000000" } },
        },
        {
          left: { style: "dashed", color: { type: "theme", theme: 4 } },
          right: { style: "dashed", color: { type: "theme", theme: 4 } },
          top: { style: "dashed", color: { type: "theme", theme: 4 } },
          bottom: { style: "dashed", color: { type: "theme", theme: 4 } },
        },
        {
          left: { style: "double", color: { type: "rgb", value: "FFFF0000" } },
          right: { style: "double", color: { type: "rgb", value: "FFFF0000" } },
          top: { style: "double", color: { type: "rgb", value: "FFFF0000" } },
          bottom: { style: "double", color: { type: "rgb", value: "FFFF0000" } },
        },
      ],
      numberFormats: [
        ...styles.numberFormats,
        { numFmtId: numFmtId(164), formatCode: "yyyy-mm-dd" },
      ],
      cellXfs,
    },
    sharedStrings: [],
  };
}

/**
 * Workbook editor test page for manual verification (loading/saving + style patterns).
 */
export function XlsxWorkbookPage() {
  const [sourceName, setSourceName] = useState<string>("test-workbook.xlsx");
  const [workbookRevision, setWorkbookRevision] = useState(0);
  const [workbook, setWorkbook] = useState<XlsxWorkbook>(() => createPatternWorkbook());
  const [currentWorkbook, setCurrentWorkbook] = useState<XlsxWorkbook>(workbook);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const computeInitialGridSize = useCallback((wb: XlsxWorkbook): { rowCount: number; colCount: number } => {
    const MAX_ROWS = 1_048_576;
    const MAX_COLS = 16_384;

    void wb;
    return { rowCount: MAX_ROWS, colCount: MAX_COLS };
  }, []);

  const [{ rowCount, colCount }, setGridSize] = useState(() => computeInitialGridSize(workbook));

  const loadFile = useCallback(async (file: File) => {
    setIsBusy(true);
    setError(null);
    try {
      const parsed = await parseWorkbookFromFile(file);
      setSourceName(file.name);
      setWorkbook(parsed);
      setCurrentWorkbook(parsed);
      setGridSize(computeInitialGridSize(parsed));
      setWorkbookRevision((v) => v + 1);
    } catch (e) {
      if (e instanceof SpreadsheetParseError) {
        setError(`Failed to load ${e.fileType.toUpperCase()} file: ${e.message}`);
      } else {
        setError(e instanceof Error ? e.message : String(e));
      }
    } finally {
      setIsBusy(false);
    }
  }, [computeInitialGridSize]);

  const defaultSaveName = useMemo(() => {
    if (sourceName.toLowerCase().endsWith(".xlsx")) {
      return sourceName;
    }
    if (sourceName.toLowerCase().endsWith(".xlsm")) {
      return sourceName.replace(/\.xlsm$/i, ".xlsx");
    }
    if (sourceName.toLowerCase().endsWith(".xls")) {
      return sourceName.replace(/\.xls$/i, ".xlsx");
    }
    return `${sourceName}.xlsx`;
  }, [sourceName]);

  const saveXlsx = useCallback(async () => {
    setIsBusy(true);
    setError(null);
    try {
      const bytes = await exportXlsx(currentWorkbook);
      downloadXlsx(bytes, defaultSaveName);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setIsBusy(false);
    }
  }, [currentWorkbook, defaultSaveName]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", minHeight: 0 }}>
      <div style={controlsStyle}>
        <Button
          disabled={isBusy}
          onClick={() => {
            const demo = createPatternWorkbook();
            setSourceName("pattern-workbook.xlsx");
            setWorkbook(demo);
            setCurrentWorkbook(demo);
            setGridSize(computeInitialGridSize(demo));
            setWorkbookRevision((v) => v + 1);
          }}
        >
          Load demo (patterns)
        </Button>

        <Button
          disabled={isBusy}
          onClick={() => {
            const demo = createTestWorkbook();
            setSourceName("test-workbook.xlsx");
            setWorkbook(demo);
            setCurrentWorkbook(demo);
            setGridSize(computeInitialGridSize(demo));
            setWorkbookRevision((v) => v + 1);
          }}
        >
          Load demo (formulas)
        </Button>

        <input
          type="file"
          accept=".xlsx,.xlsm,.xls"
          disabled={isBusy}
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) {
              return;
            }
            void loadFile(file);
          }}
        />

        <Button
          disabled={isBusy}
          onClick={() => {
            void saveXlsx();
          }}
        >
          Save XLSX
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Rows</div>
          <Input
            type="number"
            value={rowCount}
            min={1}
            onChange={(v) => setGridSize((prev) => ({ ...prev, rowCount: Number(v) }))}
            width={90}
          />
          <div style={{ fontSize: 12, opacity: 0.8 }}>Cols</div>
          <Input
            type="number"
            value={colCount}
            min={1}
            onChange={(v) => setGridSize((prev) => ({ ...prev, colCount: Number(v) }))}
            width={90}
          />
        </div>

        {isBusy && <div style={{ fontSize: 12, opacity: 0.8 }}>Working…</div>}
        {error && <div style={{ fontSize: 12, color: "var(--danger)" }}>{error}</div>}
      </div>

      <div style={editorFrameStyle}>
        <XlsxWorkbookEditor
          key={workbookRevision}
          workbook={workbook}
          onWorkbookChange={setCurrentWorkbook}
          grid={{
            rowCount,
            colCount,
            rowHeightPx: 22,
            colWidthPx: 120,
            headerSizePx: 32,
            colHeaderHeightPx: 22,
            rowHeaderWidthPx: 56,
            overscanRows: 4,
            overscanCols: 2,
          }}
        />
      </div>
    </div>
  );
}
