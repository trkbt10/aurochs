/**
 * @file XlsxWorkbookEditor
 *
 * Minimal workbook editor UI (sheet tabs + grid).
 */

import type { CSSProperties } from "react";
import type { XlsxWorkbook } from "../../xlsx/domain/workbook";
import { Button, Tabs, spacingTokens } from "../../office-editor-components";
import { XlsxWorkbookEditorProvider, useXlsxWorkbookEditor } from "../context/workbook/XlsxWorkbookEditorContext";
import { XlsxSheetGrid, type XlsxGridMetrics } from "./XlsxSheetGrid";
import { XlsxWorkbookToolbar } from "./toolbar/XlsxWorkbookToolbar";
import { generateUniqueName } from "../sheet/mutation";

export type XlsxWorkbookEditorProps = {
  readonly workbook: XlsxWorkbook;
  readonly grid: XlsxGridMetrics;
  readonly style?: CSSProperties;
  readonly onWorkbookChange?: (workbook: XlsxWorkbook) => void;
};

function XlsxWorkbookEditorInner({ grid }: { readonly grid: XlsxGridMetrics }) {
  const { workbook, activeSheetIndex, dispatch } = useXlsxWorkbookEditor();

  const items = workbook.sheets.map((sheet, idx) => ({
    id: String(idx),
    label: sheet.name,
    content: (
      <div style={{ display: "flex", flexDirection: "column", gap: spacingTokens.sm, minHeight: 0, flex: 1 }}>
        <XlsxWorkbookToolbar sheetIndex={idx} />
        <div style={{ flex: 1, minHeight: 0 }}>
          <XlsxSheetGrid sheetIndex={idx} metrics={grid} />
        </div>
      </div>
    ),
    disabled: false,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: spacingTokens.sm, minHeight: 0, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: spacingTokens.sm }}>
        <Button
          size="sm"
          onClick={() => {
            const suggested = generateUniqueName(workbook, "Sheet");
            const name = window.prompt("New sheet name", suggested);
            if (!name) {
              return;
            }
            dispatch({ type: "ADD_SHEET", name });
          }}
        >
          Add sheet…
        </Button>
        <Button
          size="sm"
          disabled={activeSheetIndex === undefined}
          onClick={() => {
            if (activeSheetIndex === undefined) {
              return;
            }
            const current = workbook.sheets[activeSheetIndex];
            if (!current) {
              throw new Error(`Sheet not found: index=${activeSheetIndex}`);
            }
            const name = window.prompt("Rename sheet", current.name);
            if (!name) {
              return;
            }
            dispatch({ type: "RENAME_SHEET", sheetIndex: activeSheetIndex, name });
          }}
        >
          Rename…
        </Button>
        <Button
          size="sm"
          disabled={activeSheetIndex === undefined}
          onClick={() => {
            if (activeSheetIndex === undefined) {
              return;
            }
            dispatch({ type: "DUPLICATE_SHEET", sheetIndex: activeSheetIndex });
          }}
        >
          Duplicate
        </Button>
        <Button
          size="sm"
          disabled={activeSheetIndex === undefined || workbook.sheets.length <= 1}
          onClick={() => {
            if (activeSheetIndex === undefined) {
              return;
            }
            const current = workbook.sheets[activeSheetIndex];
            if (!current) {
              throw new Error(`Sheet not found: index=${activeSheetIndex}`);
            }
            const ok = window.confirm(`Delete sheet "${current.name}"?`);
            if (!ok) {
              return;
            }
            dispatch({ type: "DELETE_SHEET", sheetIndex: activeSheetIndex });
          }}
        >
          Delete
        </Button>
        <Button
          size="sm"
          disabled={activeSheetIndex === undefined || activeSheetIndex <= 0}
          onClick={() => {
            if (activeSheetIndex === undefined || activeSheetIndex <= 0) {
              return;
            }
            dispatch({ type: "MOVE_SHEET", fromIndex: activeSheetIndex, toIndex: activeSheetIndex - 1 });
          }}
        >
          Move left
        </Button>
        <Button
          size="sm"
          disabled={activeSheetIndex === undefined || activeSheetIndex >= workbook.sheets.length - 1}
          onClick={() => {
            if (activeSheetIndex === undefined || activeSheetIndex >= workbook.sheets.length - 1) {
              return;
            }
            dispatch({ type: "MOVE_SHEET", fromIndex: activeSheetIndex, toIndex: activeSheetIndex + 1 });
          }}
        >
          Move right
        </Button>
      </div>

      <Tabs
        items={items}
        value={activeSheetIndex === undefined ? undefined : String(activeSheetIndex)}
        onChange={(value) => {
          dispatch({ type: "SELECT_SHEET", sheetIndex: Number.parseInt(value, 10) });
        }}
        size="sm"
        style={{ flex: 1, minHeight: 0 }}
      />
    </div>
  );
}

export function XlsxWorkbookEditor({ workbook, grid, style, onWorkbookChange }: XlsxWorkbookEditorProps) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        flex: 1,
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      <XlsxWorkbookEditorProvider initialWorkbook={workbook} onWorkbookChange={onWorkbookChange}>
        <XlsxWorkbookEditorInner grid={grid} />
      </XlsxWorkbookEditorProvider>
    </div>
  );
}
