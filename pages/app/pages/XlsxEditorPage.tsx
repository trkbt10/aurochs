/**
 * @file XLSX editor demo page.
 *
 * Wraps XlsxWorkbookEditor with header bar, file loading, and save functionality.
 */

import { useCallback, useMemo, useState, type CSSProperties } from "react";
import { XlsxWorkbookEditor } from "@aurochs-ui/xlsx-editor";
import type { XlsxWorkbook } from "@aurochs-office/xlsx/domain/workbook";
import { createDefaultStyleSheet, type XlsxCellXf } from "@aurochs-office/xlsx/domain/style/types";
import {
  borderId,
  colIdx,
  fillId,
  fontId,
  numFmtId,
  rowIdx,
  styleId,
  type ColIndex,
  type RowIndex,
} from "@aurochs-office/xlsx/domain/types";
import type { CellAddress } from "@aurochs-office/xlsx/domain/cell/address";
import type { Formula } from "@aurochs-office/xlsx/domain/cell/formula";
import { exportXlsx } from "@aurochs-builder/xlsx/exporter";
import { EditorPageLayout } from "../components/EditorPageLayout";

type Props = {
  readonly workbook: XlsxWorkbook | null;
  readonly fileName: string | null;
  readonly onBack: () => void;
};

// =============================================================================
// Styles
// =============================================================================

const saveButtonStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "6px",
  padding: "6px 12px",
  background: "var(--accent-blue)",
  border: "1px solid var(--accent-blue)",
  borderRadius: "6px",
  color: "#fff",
  cursor: "pointer",
  fontSize: "13px",
  marginLeft: "auto",
};

// =============================================================================
// Demo Workbook
// =============================================================================

function createAddress(col: ColIndex, row: RowIndex): CellAddress {
  return { col, row, colAbsolute: false, rowAbsolute: false };
}

function createNormalFormula(expression: string): Formula {
  return { type: "normal", expression };
}

function createDemoWorkbook(): XlsxWorkbook {
  const styles = createDefaultStyleSheet();

  const redBoldFontIndex = styles.fonts.length;
  const yellowFillIndex = styles.fills.length;
  const thinBorderIndex = styles.borders.length;

  const cellXfs: readonly XlsxCellXf[] = [
    ...styles.cellXfs,
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(yellowFillIndex), borderId: borderId(0), applyFill: true },
    { numFmtId: numFmtId(0), fontId: fontId(redBoldFontIndex), fillId: fillId(0), borderId: borderId(0), applyFont: true },
    { numFmtId: numFmtId(0), fontId: fontId(0), fillId: fillId(0), borderId: borderId(thinBorderIndex), applyBorder: true },
  ];

  return {
    dateSystem: "1900",
    sheets: [
      {
        dateSystem: "1900",
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
              { address: createAddress(colIdx(1), rowIdx(3)), value: { type: "string", value: "Hello" } },
              { address: createAddress(colIdx(2), rowIdx(3)), value: { type: "boolean", value: true } },
              { address: createAddress(colIdx(3), rowIdx(3)), value: { type: "date", value: new Date("2024-01-15") } },
            ],
          },
        ],
        xmlPath: "xl/worksheets/sheet1.xml",
      },
      {
        dateSystem: "1900",
        name: "Sheet2",
        sheetId: 2,
        state: "visible",
        sheetView: { showGridLines: true, showRowColHeaders: true },
        rows: [
          {
            rowNumber: rowIdx(1),
            cells: [{ address: createAddress(colIdx(1), rowIdx(1)), value: { type: "number", value: 42 } }],
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

function downloadXlsx(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// =============================================================================
// Component
// =============================================================================

/** XLSX editor page with header, workbook editor, and save functionality. */
export function XlsxEditorPage({ workbook: inputWorkbook, fileName, onBack }: Props) {
  const initialWorkbook = useMemo(() => inputWorkbook ?? createDemoWorkbook(), [inputWorkbook]);
  const [currentWorkbook, setCurrentWorkbook] = useState<XlsxWorkbook>(initialWorkbook);
  const [workbookRevision, setWorkbookRevision] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Reset when input changes
  useMemo(() => {
    setCurrentWorkbook(initialWorkbook);
    setWorkbookRevision((v) => v + 1);
  }, [initialWorkbook]);

  const defaultSaveName = useMemo(() => {
    if (!fileName) {return "workbook.xlsx";}
    if (fileName.toLowerCase().endsWith(".xlsx")) {return fileName;}
    if (fileName.toLowerCase().endsWith(".xls")) {return fileName.replace(/\.xls$/i, ".xlsx");}
    return `${fileName}.xlsx`;
  }, [fileName]);

  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const bytes = await exportXlsx(currentWorkbook);
      downloadXlsx(bytes, defaultSaveName);
    } finally {
      setIsSaving(false);
    }
  }, [currentWorkbook, defaultSaveName]);

  const headerActions = (
    <button style={saveButtonStyle} onClick={() => void handleSave()} disabled={isSaving}>
      {isSaving ? "Saving..." : "Save XLSX"}
    </button>
  );

  return (
    <EditorPageLayout
      fileName={fileName ?? "XLSX Demo"}
      onBack={onBack}
      headerActions={headerActions}
    >
      <XlsxWorkbookEditor
        key={workbookRevision}
        workbook={initialWorkbook}
        onWorkbookChange={setCurrentWorkbook}
        grid={{
          rowCount: 1_048_576,
          colCount: 16_384,
          rowHeightPx: 22,
          colWidthPx: 120,
          headerSizePx: 32,
          colHeaderHeightPx: 22,
          rowHeaderWidthPx: 56,
          overscanRows: 4,
          overscanCols: 2,
        }}
      />
    </EditorPageLayout>
  );
}
