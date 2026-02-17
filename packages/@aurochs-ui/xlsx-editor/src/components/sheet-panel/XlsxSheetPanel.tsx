/**
 * @file XlsxSheetPanel
 *
 * Sidebar panel for sheet-level settings (page setup, margins, header/footer, print options).
 */

import { type CSSProperties } from "react";
import { spacingTokens, fontTokens, colorTokens } from "@aurochs-ui/ui-components";
import { useXlsxWorkbookEditor } from "../../context/workbook/XlsxWorkbookEditorContext";
import { PageSetupSection } from "./sections/PageSetupSection";
import { PageMarginsSection } from "./sections/PageMarginsSection";
import { HeaderFooterSection } from "./sections/HeaderFooterSection";
import { PrintOptionsSection } from "./sections/PrintOptionsSection";
import { PageBreaksSection } from "./sections/PageBreaksSection";
import { SheetProtectionSection } from "./sections/SheetProtectionSection";
import { WorkbookProtectionSection } from "./sections/WorkbookProtectionSection";
import { AutoFilterSection } from "./sections/AutoFilterSection";
import { DataValidationSection } from "./sections/DataValidationSection";
import { ConditionalFormattingSection } from "./sections/ConditionalFormattingSection";
import { FreezePanesSection } from "./sections/FreezePanesSection";
import { TablesSection } from "./sections/TablesSection";
import { DefinedNamesSection } from "./sections/DefinedNamesSection";
import { RowColumnSizeSection } from "./sections/RowColumnSizeSection";
import { OutlineGroupingSection } from "./sections/OutlineGroupingSection";

export type XlsxSheetPanelProps = {
  readonly sheetIndex: number;
};

const containerStyle: CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  backgroundColor: `var(--bg-primary, ${colorTokens.background.primary})`,
  overflow: "hidden",
};

const headerStyle: CSSProperties = {
  padding: `${spacingTokens.sm} ${spacingTokens.md}`,
  borderBottom: `1px solid var(--border-subtle, ${colorTokens.border.subtle})`,
  fontSize: fontTokens.size.md,
  fontWeight: fontTokens.weight.semibold,
  color: `var(--text-primary, ${colorTokens.text.primary})`,
  flexShrink: 0,
};

const contentStyle: CSSProperties = {
  flex: 1,
  overflow: "auto",
};

/**
 * Sheet settings panel for page setup, margins, header/footer, and print options.
 */
export function XlsxSheetPanel({ sheetIndex }: XlsxSheetPanelProps) {
  const { workbook, selection, dispatch } = useXlsxWorkbookEditor();
  const sheet = workbook.sheets[sheetIndex];

  if (!sheet) {
    return (
      <div style={containerStyle}>
        <div style={headerStyle}>Sheet</div>
        <div style={{ padding: spacingTokens.md, color: colorTokens.text.tertiary }}>
          No sheet selected.
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <div style={headerStyle}>Sheet</div>
      <div style={contentStyle}>
        <PageSetupSection
          disabled={false}
          pageSetup={sheet.pageSetup}
          onPageSetupChange={(pageSetup) =>
            dispatch({ type: "SET_PAGE_SETUP", sheetIndex, pageSetup })
          }
        />

        <PageMarginsSection
          disabled={false}
          pageMargins={sheet.pageMargins}
          onPageMarginsChange={(pageMargins) =>
            dispatch({ type: "SET_PAGE_MARGINS", sheetIndex, pageMargins })
          }
        />

        <HeaderFooterSection
          disabled={false}
          headerFooter={sheet.headerFooter}
          onHeaderFooterChange={(headerFooter) =>
            dispatch({ type: "SET_HEADER_FOOTER", sheetIndex, headerFooter })
          }
        />

        <PrintOptionsSection
          disabled={false}
          printOptions={sheet.printOptions}
          onPrintOptionsChange={(printOptions) =>
            dispatch({ type: "SET_PRINT_OPTIONS", sheetIndex, printOptions })
          }
        />

        <PageBreaksSection
          disabled={false}
          pageBreaks={sheet.pageBreaks}
          onPageBreaksChange={(pageBreaks) =>
            dispatch({ type: "SET_PAGE_BREAKS", sheetIndex, pageBreaks })
          }
        />

        <SheetProtectionSection
          disabled={false}
          protection={sheet.sheetProtection}
          onProtectionChange={(protection) =>
            dispatch({ type: "SET_SHEET_PROTECTION", sheetIndex, protection })
          }
        />

        <WorkbookProtectionSection
          disabled={false}
          protection={workbook.workbookProtection}
          onProtectionChange={(protection) =>
            dispatch({ type: "SET_WORKBOOK_PROTECTION", protection })
          }
        />

        <AutoFilterSection
          disabled={false}
          autoFilter={sheet.autoFilter}
          selectedRange={selection.selectedRange}
          onAutoFilterChange={(autoFilter) =>
            dispatch({ type: "SET_AUTO_FILTER", sheetIndex, autoFilter })
          }
        />

        <DataValidationSection
          disabled={false}
          validations={sheet.dataValidations}
          selectedRange={selection.selectedRange}
          onValidationAdd={(validation) =>
            dispatch({ type: "SET_DATA_VALIDATION", sheetIndex, validation })
          }
          onValidationDelete={(range) =>
            dispatch({ type: "DELETE_DATA_VALIDATION", sheetIndex, range })
          }
          onValidationsClear={() =>
            dispatch({ type: "CLEAR_DATA_VALIDATIONS", sheetIndex })
          }
        />

        <ConditionalFormattingSection
          disabled={false}
          formattings={sheet.conditionalFormattings}
          selectedRange={selection.selectedRange}
          onFormattingAdd={(formatting) =>
            dispatch({ type: "ADD_CONDITIONAL_FORMATTING", sheetIndex, formatting })
          }
          onFormattingDelete={(range) =>
            dispatch({ type: "DELETE_CONDITIONAL_FORMATTING", sheetIndex, range })
          }
          onFormattingsClear={() =>
            dispatch({ type: "CLEAR_CONDITIONAL_FORMATTINGS", sheetIndex })
          }
        />

        <FreezePanesSection
          disabled={false}
          pane={sheet.sheetView?.pane}
          activeCell={selection.activeCell}
          onFreezeRows={(rowCount) =>
            dispatch({ type: "FREEZE_ROWS", sheetIndex, rowCount })
          }
          onFreezeColumns={(colCount) =>
            dispatch({ type: "FREEZE_COLUMNS", sheetIndex, colCount })
          }
          onFreezeRowsAndColumns={(rowCount, colCount) =>
            dispatch({ type: "FREEZE_ROWS_AND_COLUMNS", sheetIndex, rowCount, colCount })
          }
          onUnfreeze={() =>
            dispatch({ type: "UNFREEZE_PANES", sheetIndex })
          }
        />

        <TablesSection
          disabled={false}
          sheetIndex={sheetIndex}
          tables={workbook.tables}
          selectedRange={selection.selectedRange}
          onCreateTable={(range, name, hasHeaderRow) =>
            dispatch({ type: "CREATE_TABLE", sheetIndex, range, name, hasHeaderRow })
          }
          onDeleteTable={(tableName) =>
            dispatch({ type: "DELETE_TABLE", tableName })
          }
        />

        <DefinedNamesSection
          disabled={false}
          sheetIndex={sheetIndex}
          sheetNames={workbook.sheets.map((s) => s.name)}
          definedNames={workbook.definedNames}
          selectedRange={selection.selectedRange}
          onAdd={(definedName) =>
            dispatch({ type: "ADD_DEFINED_NAME", definedName })
          }
          onUpdate={(oldName, oldLocalSheetId, definedName) =>
            dispatch({ type: "UPDATE_DEFINED_NAME", oldName, oldLocalSheetId, definedName })
          }
          onDelete={(name, localSheetId) =>
            dispatch({ type: "DELETE_DEFINED_NAME", name, localSheetId })
          }
        />

        <RowColumnSizeSection
          disabled={false}
          sheet={sheet}
          selectedRange={selection.selectedRange}
          onSetRowHeight={(rowIndex, height) =>
            dispatch({ type: "SET_ROW_HEIGHT", rowIndex, height })
          }
          onSetColumnWidth={(colIndex, width) =>
            dispatch({ type: "SET_COLUMN_WIDTH", colIndex, width })
          }
          onHideRows={(startRow, count) =>
            dispatch({ type: "HIDE_ROWS", startRow, count })
          }
          onUnhideRows={(startRow, count) =>
            dispatch({ type: "UNHIDE_ROWS", startRow, count })
          }
          onHideColumns={(startCol, count) =>
            dispatch({ type: "HIDE_COLUMNS", startCol, count })
          }
          onUnhideColumns={(startCol, count) =>
            dispatch({ type: "UNHIDE_COLUMNS", startCol, count })
          }
        />

        <OutlineGroupingSection
          disabled={false}
          sheet={sheet}
          selectedRange={selection.selectedRange}
          onGroupRows={(startRow, count) =>
            dispatch({ type: "GROUP_ROWS", startRow, count })
          }
          onUngroupRows={(startRow, count) =>
            dispatch({ type: "UNGROUP_ROWS", startRow, count })
          }
          onGroupColumns={(startCol, count) =>
            dispatch({ type: "GROUP_COLUMNS", startCol, count })
          }
          onUngroupColumns={(startCol, count) =>
            dispatch({ type: "UNGROUP_COLUMNS", startCol, count })
          }
        />
      </div>
    </div>
  );
}
